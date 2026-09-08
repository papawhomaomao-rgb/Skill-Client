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

   WRITE  grantEntitlement() the by-hand path, dev-only at the route. Staff,
          revokeEntitlement() testers, the pre-enforcement backfill, and every
                             sale that happened somewhere Stripe was not. Goes
                             through the same write(), so it inherits the same
                             audit log and the same session revocation.

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
  /* Written by hand through /admin/entitlement, never by a provider. Two types
     rather than one because the audit log is the only thing that later answers
     "why does this account hold a licence nobody paid for", and "staff" and "a
     support thread" are different answers. */
  manual: "active",
  staff: "active",
};

/* What a WEBHOOK is allowed to act on at all; everything else stops in
   payments.js. Written out rather than derived from STATUS_FOR, which is how
   it used to be built: the two manual types above must not be reachable from a
   provider payload, and a derived set would have admitted them silently the
   moment they were declared. The lookup in write() falls back to "active", so
   a type that gets past this gate without a mapping is a free licence. */
export const KNOWN_EVENT_TYPES = new Set([
  "purchase",
  "renewal",
  "past_due",
  "refund",
  "dispute",
  "revoke",
  "cancel",
]);

/* And of those, the ones worth parking against an email when they turn up with
   no user id attached. A purchase made before the account existed is the entire
   point of the pending shelf. A refund or a chargeback nobody can be matched to
   is just an event we cannot act on — shelving it would mean the next person to
   sign up with that address claims someone else's revocation. */
const CLAIMABLE = new Set(["purchase", "renewal"]);

/* ── read path ───────────────────────────────────────────────────────────── */

/* Is the gate closed? It is: ENTITLEMENT_ENFORCED went to "true" on 2026-09-07
   and an account with no granting record is now refused. Anything other than
   that string reopens it and lets every signed-in account through, which was
   the launch position — held while the payment layer went in so that deploying
   it could not lock out existing accounts on the way through.

   It stays a wrangler.toml var rather than a code change because that makes the
   rollback one redeploy rather than a git revert under pressure. Reopening it
   is a business decision, not a fix: the first thing to check when someone who
   paid cannot get in is whether their ent: record exists, not this flag. */
const enforced = env => String(env.ENTITLEMENT_ENFORCED || "").toLowerCase() === "true";

/* Exported so a screen can caption itself honestly. The dev roster draws a
   Licence column, and if the gate is ever reopened every row in it reads as
   granted for a reason that has nothing to do with the record beside it. */
export const isEnforced = enforced;

/* The decision itself, over a record already in hand.

   Pure and synchronous on purpose: it is the one place that knows a granting
   status from a lapsed one, and every caller that needs the answer alongside
   the record it just read can have it without a second KV get. `env` is here
   only for the flag — nothing else about the caller reaches this. */
export function grantsAccess(env, rec) {
  if (rec && GRANTING.has(rec.status)) {
    if (rec.until === null) return true;
    if (rec.until + (rec.status === "past_due" ? GRACE_MS : 0) > Date.now()) return true;
  }

  /* No record, expired, refunded or revoked. Genuinely unentitled — so this is
     the single line that decides whether Skilled is a paid product, and today
     it answers false. */
  return !enforced(env);
}

export async function hasEntitlement(env, userId) {
  if (!userId) return false;
  return grantsAccess(env, await env.SKILLED.get(`ent:${userId}`, "json"));
}

/* What a Licence panel draws, for the account's own dashboard and for the dev
   roster alike. Distinct from the predicate above because a person looking at
   their own account should see "past_due, expires Tuesday", not a boolean —
   and because if the gate ever reopens the panel has to say "no licence on
   file, but everything works" without either half being a lie. That is what
   `enforced` is doing in the payload. */
export async function readEntitlement(env, userId) {
  return entitlementOf(env, await env.SKILLED.get(`ent:${userId}`, "json"));
}

/* Same payload, from a record the caller already has. /admin/users reads the
   whole roster a row at a time and would otherwise pay twice per account: once
   for the record and once more inside the predicate. */
export function entitlementOf(env, rec) {
  const base = rec || { status: "none", plan: null, until: null, renews: false, source: null };
  return { ...base, active: grantsAccess(env, rec), enforced: enforced(env) };
}

/* ── write path ──────────────────────────────────────────────────────────── */

/* One normalized event in, one entitlement record out. Adapters produce the
   event; see adapters.js for the shape. */
export async function applyEntitlement(env, ev) {
  if (!ev.userId) {
    if (!CLAIMABLE.has(ev.type)) return { applied: false, reason: "unattributed" };
    // Bought from a provider-hosted storefront before signing up. Park it
    // against the email and let claimPending() collect it — matching on Clerk's
    // verified address later is safer than trusting an address in a webhook.
    await stashPending(env, ev);
    return { applied: false, reason: "pending_claim" };
  }
  return write(env, ev.userId, ev);
}

/* Someone signed in who had paid first.

   Takes a LIST, and that list has to be the addresses Clerk has VERIFIED for
   the account — never a primary address, never one supplied by a caller.

   It used to take the single primary address, which was wrong twice over. The
   small half: people buy under one address and sign in under another, and a
   verified secondary proves control exactly as well as a primary does. The
   expensive half: primaryEmailOf() returns whichever row Clerk marked primary
   without asking whether it was ever confirmed, so an unverified address on an
   attacker's own account was enough to claim a stranger's purchase off the
   shelf. That cost nothing while the gate was open and every account worked
   regardless. With the gate closed it is a licence someone else paid for. */
export async function claimPending(env, userId, emails) {
  for (const email of (Array.isArray(emails) ? emails : [emails]).filter(Boolean)) {
    const key = `pend:${await hash(String(email).trim().toLowerCase())}`;
    const ev = await env.SKILLED.get(key, "json");
    if (!ev) continue;
    await write(env, userId, ev);
    await env.SKILLED.delete(key);
    return true;
  }
  return false;
}

/* ── manual grants ─────────────────────────────────────────────────────────

   A closed gate needs a way to open it by hand. Staff and testers, the
   backfill for anyone who bought before enforcement, a customer whose webhook
   was lost somewhere between Stripe and here, goodwill after a support thread
   — none of those arrive as a payment event, and every one of them is real.

   These exist rather than a raw `wrangler kv key put` because a hand-written
   ent: record is a JSON blob typed at a shell prompt: it skips the audit log,
   it skips the session revocation a removal has to carry, and a misspelled
   field reads back as an account with no licence — or, for `until`, as one
   that never expires. Same write path as the webhook, same log, same
   consequences. Only the provenance differs.

   Dev-only at the route; see app.js. */

export function grantEntitlement(env, userId, opts = {}) {
  const { plan = "lifetime", days = null, staff = false, by = null, note = null } = opts;

  /* An explicit `until` wins, including an explicit null meaning lifetime.
     Otherwise `days` counts from now, and no `days` at all is a lifetime grant
     — a safe default only because the sole caller is staff and the route says
     so. None of it is reachable from a payload. */
  const until =
    "until" in opts ? opts.until
    : days == null ? null
    : Date.now() + Number(days) * 24 * 60 * 60 * 1000;

  return write(env, userId, {
    type: staff ? "staff" : "manual",
    plan,
    until,
    renews: false,
    provider: "manual",
    id: `manual_${Date.now()}`,
    by,
    note,
  });
}

export function revokeEntitlement(env, userId, { by = null, note = null } = {}) {
  return write(env, userId, {
    type: "revoke",
    provider: "manual",
    id: `manual_${Date.now()}`,
    // Said out loud rather than left to default true. Nothing reads it on a
    // revoked record, but a stored row claiming a dead licence still renews is
    // the kind of thing that misleads whoever opens it next.
    renews: false,
    by,
    note,
  });
}

/* The append-only history for one account, newest first — what a support reply
   gets written from. Keys are `entlog:<user>:<epoch ms>` and KV lists
   lexicographically, which for equal-width decimal timestamps is chronological.
   True until the year 2286, when millisecond timestamps gain a digit. */
export async function entitlementLog(env, userId, limit = 25) {
  const { keys } = await env.SKILLED.list({ prefix: `entlog:${userId}:` });
  const out = [];
  for (const k of keys.slice(-limit).reverse()) {
    const row = await env.SKILLED.get(k.name, "json");
    if (row) out.push(row);
  }
  return out;
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
      // Null on anything a provider sent. Set on a manual grant or revoke,
      // which is the only case where "who did this" is not "the customer".
      by: ev.by || null,
      note: ev.note || null,
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
