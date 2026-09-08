import { json, readJson } from "./http.js";
import {
  requireUser, requireDev, clerkUsers, isDev, roleOfClerkUser, findUserByEmail,
} from "./clerk.js";
import { listSessions, revokeSession } from "./sessions.js";
import {
  readEntitlement, entitlementOf, entitlementLog, grantEntitlement, revokeEntitlement,
  isEnforced,
} from "./entitlement.js";
import { PLANS } from "./plans.js";

const nowId = () => "an_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function announcements(request, env) {
  await requireUser(request, env);
  const { keys } = await env.SKILLED.list({ prefix: "ann:" });
  const out = [];
  for (const k of keys) {
    const a = await env.SKILLED.get(k.name, "json");
    if (a) out.push(a);
  }
  out.sort((a, b) => b.at - a.at);
  return json({ ok: true, announcements: out }, { request, env });
}

export async function broadcast(request, env) {
  const dev = await requireDev(request, env);
  const body = await readJson(request);
  const text = body && typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return json({ ok: false, error: "bad_request" }, { status: 400, request, env });

  const rec = { id: nowId(), at: Date.now(), from: dev.name || dev.email || "staff", body: text.slice(0, 2000) };
  await env.SKILLED.put(`ann:${rec.id}`, JSON.stringify(rec));
  return json({ ok: true, ...rec }, { request, env });
}

export async function deleteBroadcast(request, env, id) {
  await requireDev(request, env);
  await env.SKILLED.delete(`ann:${id}`);
  return json({ ok: true }, { request, env });
}

/* Dev dashboard roster: Clerk holds identity, the Worker holds last_seen and,
   since the gate closed, whether the account can actually get in.

   The licence rides along rather than being fetched per row by the dashboard.
   The roster is the screen the grant and revoke actions are driven from, and a
   table that cannot say who currently holds a licence is a table you grant from
   twice. It costs one `ent:` read per account on top of the session lookup this
   already does — the same order of work, not a new one.

   `entitlement` is the same shape /api/entitlement returns for a customer
   looking at their own Licence panel, so the two render from one set of rules.
   `licensed` is that record put through the actual predicate, which is the only
   thing that answers the question the column is asking: past_due inside its
   grace grants, an expired `until` does not, and neither is visible from
   `status` alone. */
export async function adminUsers(request, env) {
  await requireDev(request, env);
  const page = await clerkUsers(env);
  const list = Array.isArray(page) ? page : page?.data || [];
  const users = [];
  for (const u of list) {
    const sessions = await listSessions(env, u.id);
    const ent = entitlementOf(env, await env.SKILLED.get(`ent:${u.id}`, "json"));
    users.push({
      id: u.id,
      email: u.email_addresses?.[0]?.email_address || null,
      role: roleOfClerkUser(env, u),
      createdAt: u.created_at,
      lastSeen: sessions.length ? Math.max(...sessions.map(s => s.last_seen)) : null,
      sessions: sessions.length,
      licensed: ent.active,
      entitlement: {
        status: ent.status,
        plan: ent.plan,
        until: ent.until,
        renews: ent.renews,
        source: ent.source,
      },
    });
  }
  /* Once, not per row. If the gate is ever reopened every account reads as
     licensed and the column becomes a lie the dashboard has to caption rather
     than draw straight. */
  return json({ ok: true, enforced: isEnforced(env), users }, { request, env });
}

/* ── entitlement, by hand ───────────────────────────────────────────────────

   ENTITLEMENT_ENFORCED is "true", so an account with no granting ent: record
   cannot sign a launcher in. That is the point. It also means every licence
   that did not come from a Stripe webhook has to come from here:

     - staff and testers, including whoever deploys this. The gate takes a user
       id and nothing else — deliberately, so that it has one answer — which
       means being a dev grants no access on its own. Read that twice before
       the first deploy: closing the gate locks the owner out too, and this is
       the way back in.
     - anyone who bought before the gate closed and has no record yet.
     - a purchase whose webhook was lost between the provider and here.
     - goodwill at the end of a support thread.

   Dev-only, and it goes through the same write path as a real payment, so a
   grant lands in entlog: with the address of whoever made it, and a revoke
   takes the account's launcher sessions down with it. That is the difference
   between this and editing the KV key by hand, which does neither. */

/* Body or query, id or address. An address is resolved through Clerk and only
   matches an account that has VERIFIED it — granting on an unconfirmed address
   would mean anyone who typed a customer's email at a signup form could be
   handed that customer's licence. */
async function target(env, src, self) {
  const userId = String(src.user_id || "").trim();
  if (userId) return { userId };

  const email = String(src.email || "").trim();
  if (email) {
    const hit = await findUserByEmail(env, email);
    return hit ? { userId: hit.userId } : { error: "no_such_user" };
  }

  /* No target named means the caller means themselves. This is the bootstrap:
     the first thing that has to happen after the gate closes is the person who
     closed it granting themselves a record, and asking them to look up their
     own Clerk id first is how that step gets skipped. */
  return { userId: self.userId };
}

export async function adminEntitlementGet(request, env, url) {
  await requireDev(request, env);
  const who = await target(env, Object.fromEntries(url.searchParams), { userId: "" });
  if (who.error || !who.userId)
    return json({ ok: false, error: who.error || "no_target" }, { status: 404, request, env });

  return json({
    ok: true,
    user_id: who.userId,
    entitlement: await readEntitlement(env, who.userId),
    log: await entitlementLog(env, who.userId),
  }, { request, env });
}

/* POST /admin/entitlement
     { user_id | email, plan?, days?, until?, staff?, note? }

   Everything after the target is optional, and the defaults are the common
   case: a lifetime grant on the lifetime plan. `days` counts from now; `until`
   is epoch ms and wins over it; either one absent means it never expires. */
export async function adminEntitlementGrant(request, env) {
  const dev = await requireDev(request, env);
  const body = (await readJson(request)) || {};

  const who = await target(env, body, dev);
  if (who.error || !who.userId)
    return json({ ok: false, error: who.error || "no_target" }, { status: 404, request, env });

  const staff = body.staff === true;
  const plan = body.plan == null ? (staff ? "staff" : "lifetime") : String(body.plan);
  /* A plan the catalogue has never heard of would render raw in the customer's
     own Licence panel, so it is a 400 rather than something to discover there. */
  if (!PLANS[plan] && plan !== "staff")
    return json({ ok: false, error: "unknown_plan" }, { status: 400, request, env });

  const opts = { plan, staff, by: dev.email || dev.userId, note: body.note ? String(body.note).slice(0, 500) : null };

  /* Only ever SET on the options object when supplied. grantEntitlement reads
     `"until" in opts` so that an explicit null can mean lifetime, which makes
     a stray undefined the difference between 30 days and forever. */
  if (body.until !== undefined) {
    if (body.until !== null && !Number.isFinite(Number(body.until)))
      return json({ ok: false, error: "bad_until" }, { status: 400, request, env });
    opts.until = body.until === null ? null : Number(body.until);
  } else if (body.days != null) {
    const days = Number(body.days);
    if (!Number.isFinite(days) || days <= 0)
      return json({ ok: false, error: "bad_days" }, { status: 400, request, env });
    opts.days = days;
  }

  await grantEntitlement(env, who.userId, opts);
  return json({
    ok: true,
    user_id: who.userId,
    entitlement: await readEntitlement(env, who.userId),
  }, { request, env });
}

/* DELETE /admin/entitlement?user_id=…|email=…

   A query rather than a path segment because the useful key here is usually an
   address off a receipt, and an address in a path is an encoding problem for
   no gain. Revoking kills the account's launcher sessions on the way out —
   see write() in entitlement.js — so the DLL is ejected within a heartbeat
   rather than at the end of the current token's hour. */
export async function adminEntitlementRevoke(request, env, url) {
  const dev = await requireDev(request, env);
  const q = Object.fromEntries(url.searchParams);

  /* No implicit self here. Revoking is destructive and "no target" must never
     resolve to the person holding the keys. */
  if (!q.user_id && !q.email)
    return json({ ok: false, error: "no_target" }, { status: 400, request, env });

  const who = await target(env, q, { userId: "" });
  if (who.error || !who.userId)
    return json({ ok: false, error: who.error || "no_target" }, { status: 404, request, env });

  await revokeEntitlement(env, who.userId, {
    by: dev.email || dev.userId,
    note: q.note ? String(q.note).slice(0, 500) : null,
  });
  return json({
    ok: true,
    user_id: who.userId,
    entitlement: await readEntitlement(env, who.userId),
  }, { request, env });
}

/* Devices tab = active launcher sessions. No HWID, so a row is a session. */
export async function mySessions(request, env) {
  const user = await requireUser(request, env);
  const sessions = (await listSessions(env, user.userId)).map(s => ({
    session_id: s.session_id,
    install_id: s.install_id,
    device_name: s.device_name,
    os: s.os,
    client_version: s.client_version,
    created: s.created,
    last_seen: s.last_seen,
    injected: s.injected,
  }));
  return json({ ok: true, sessions }, { request, env });
}

export async function revoke(request, env, sessionId) {
  const user = await requireUser(request, env);
  const s = await env.SKILLED.get(`sess:${sessionId}`, "json");
  // Revoking your own device is the common case and stays a single KV read;
  // only reaching for someone else's pays for the staff check.
  const allowed = !!s && (s.user_id === user.userId || (await isDev(env, user)));
  if (!allowed) return json({ ok: false }, { status: 403, request, env });
  await revokeSession(env, sessionId);
  return json({ ok: true }, { request, env });
}
