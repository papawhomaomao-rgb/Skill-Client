/* Entitlement — the one function that turns Skilled paid.

   It is two functions now, because going paid needs a write path as well as a
   read, but the original shape holds: everything downstream of this file — the
   no_license status on approve, the terminal no_license on poll, the ejecting
   heartbeat reason, the config-cloud gate — already exists and already works.
   Nothing in the launcher, the DLL or the wire contract changes when the gate
   closes.

   READ   hasEntitlement()   runs on approve, refresh, heartbeat and every
                             config call. One KV get against a self-contained
                             record, and no provider round trip ever: a payment
                             API having a slow afternoon must not be able to
                             make the game stutter.

   WRITE  applyEntitlement() runs only from the webhook, and every provider
                             collapses into it. That is the whole reason the
                             provider stays swappable — adapters translate, and
                             never touch KV themselves.

   KV layout

     ent:<user_id>            the hot record — status, plan, until, provenance
     pend:<sha256(email)>     bought before the account existed; claimed later
     entlog:<user_id>:<ts>    append-only, for chargebacks and "but I paid" mail

   Statuses. active and past_due grant access; refunded and revoked do not.

     active     paid and current
     past_due   renewal failed — still grants for GRACE_MS past `until`
     refunded   money went back, sessions killed
     revoked    chargeback, abuse, or a manual pull

   `until` is epoch ms, or null for lifetime and staff. A null never expires,
   which is also how you keep yourself signed in once the gate closes: write
   yourself a { plan: "staff", until: null } record rather than special-casing
   role === "dev" in here. The predicate only receives a user id, and it should
   stay that way — a gate that reads roles is a gate with two answers. */

import { hash } from "./tokens.js";
import { listSessions, revokeSession } from "./sessions.js";

/* A failed renewal should not eject someone mid-game before the provider has
   finished retrying the card. Three days is longer than every dunning schedule
   worth naming and shorter than the 7-day offline grace on the client, so it
   never becomes the thing that decides whether a lapsed account still works. */
const GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const PENDING_TTL = 60 * 60 * 24 * 90;        // 90d to sign up and claim
const LOG_TTL = 60 * 60 * 24 * 730;           // 2y — outlives every dispute window

const GRANTING = new Set(["active", "past_due"]);

const STATUS_FOR = {
  purchase: "active",
  renewal: "active",
  past_due: "past_due",
  refund: "refunded",
  dispute: "revoked",
  revoke: "revoked",
};

/* ── read path ───────────────────────────────────────────────────────────── */

/* Is the gate closed? Until ENTITLEMENT_ENFORCED is the string "true", every
   signed-in account passes — the same launch position the original file took,
   and kept for the same reason: the alternative is a deploy that instantly
   locks out every existing customer, and you along with them.

   Sequence: ship this, watch real ent: records appear in KV as real purchases
   land, backfill anyone who bought before the gate existed, and only then flip
   the flag. It is a wrangler.toml var rather than a code change so the rollback
   is one redeploy rather than a git revert under pressure. */
const enforced = env => String(env.ENTITLEMENT_ENFORCED || "").toLowerCase() === "true";

export async function hasEntitlement(env, userId) {
  if (!userId) return false;

  const rec = await env.SKILLED.get(`ent:${userId}`, "json");
  if (rec && GRANTING.has(rec.status)) {
    if (rec.until === null) return true;
    if (rec.until + (rec.status === "past_due" ? GRACE_MS : 0) > Date.now()) return true;
  }

  /* No record, expired, refunded or revoked. Genuinely unentitled — so this is
     the single line that decides whether Skilled is a paid product today. */
  return !enforced(env);
}

/* What the dashboard's Licence panel draws. Distinct from the predicate above
   because a person looking at their own account should see "past_due, expires
   Tuesday", not a boolean — and because while the gate is still open the panel
   has to say "no licence on file, but everything works" without either half
   being a lie. That is what `enforced` is doing in the payload. */
export async function readEntitlement(env, userId) {
  const rec = await env.SKILLED.get(`ent:${userId}`, "json");
  const base = rec || { status: "none", plan: null, until: null, renews: false, source: null };
  return { ...base, active: await hasEntitlement(env, userId), enforced: enforced(env) };
}

/* ── write path ──────────────────────────────────────────────────────────── */

/* One normalized event in, one entitlement record out. Adapters produce the
   event; see adapters.js for the shape. */
export async function applyEntitlement(env, ev) {
  if (!ev.userId) {
    // Bought from a provider-hosted storefront before signing up. Park it
    // against the email and let claimPending() collect it — matching on Clerk's
    // verified address later is safer than trusting an address in a webhook.
    await stashPending(env, ev);
    return { applied: false, reason: "pending_claim" };
  }
  return write(env, ev.userId, ev);
}

/* Someone signed in who had paid first. Called from GET /api/entitlement with
   the address Clerk has verified — never with one supplied by a caller. */
export async function claimPending(env, userId, email) {
  if (!email) return false;
  const key = `pend:${await hash(email.trim().toLowerCase())}`;
  const ev = await env.SKILLED.get(key, "json");
  if (!ev) return false;
  await write(env, userId, ev);
  await env.SKILLED.delete(key);
  return true;
}

async function write(env, userId, ev) {
  const prev = await env.SKILLED.get(`ent:${userId}`, "json");
  const status = STATUS_FOR[ev.type] || "active";

  /* Cancelling a subscription is not the same as losing access to it. The
     customer paid through the end of the period and keeps it until then; all
     that changes is that nothing renews. Anything that maps to a revoking
     status is a real removal and takes `until` with it. */
  const cancelling = ev.type === "cancel";
  const rec = {
    status: cancelling ? (prev?.status || "active") : status,
    plan: ev.plan || prev?.plan || null,
    until: cancelling ? (prev?.until ?? null) : (ev.until ?? null),
    renews: cancelling ? false : ev.renews !== false,
    source: ev.provider || prev?.source || null,
    order_id: ev.orderId || prev?.order_id || null,
    updated: Date.now(),
  };

  await env.SKILLED.put(`ent:${userId}`, JSON.stringify(rec));
  await env.SKILLED.put(
    `entlog:${userId}:${Date.now()}`,
    JSON.stringify({
      at: Date.now(),
      type: ev.type,
      provider: ev.provider || null,
      event_id: ev.id || null,
      order_id: ev.orderId || null,
      amount: ev.amount ?? null,
      currency: ev.currency || null,
      status: rec.status,
    }),
    { expirationTtl: LOG_TTL }
  );

  /* Money going back means the session goes with it. Without this the current
     launcher token stays valid for its full hour after a refund, and the
     7-day offline grace stretches that considerably further. */
  if (!GRANTING.has(rec.status)) {
    for (const s of await listSessions(env, userId)) await revokeSession(env, s.session_id);
  }

  return { applied: true, status: rec.status };
}

async function stashPending(env, ev) {
  if (!ev.email) return;
  await env.SKILLED.put(`pend:${await hash(ev.email.trim().toLowerCase())}`, JSON.stringify(ev), {
    expirationTtl: PENDING_TTL,
  });
}
