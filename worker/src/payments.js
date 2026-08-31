/* Payments — checkout, webhook, and what the Licence panel reads.

   Three routes, and only one of them is interesting.

     POST /api/checkout      Clerk bearer. Mints a provider checkout with the
                             user id baked into its metadata, and hands back a
                             URL to send the browser to.

     POST /webhooks/<name>   No bearer. The signature IS the credential, which
                             is why verify() runs against the raw body before
                             anything parses it. Server-to-server, so no CORS —
                             same convention as the four .exe-facing routes.

     GET  /api/entitlement   Clerk bearer. The record behind the Licence panel,
                             plus the one place a pre-signup purchase gets
                             claimed.

   The checkout route exists because of attribution and nothing else. A webhook
   that arrives carrying only an email address is guesswork; one carrying the
   Clerk user id that /api/checkout put there is a fact. Everything downstream
   depends on that id being right — get it wrong and you have granted a
   stranger's account and taken someone's money for nothing. */

import { json, readJson, clientIp, rateLimited } from "./http.js";
import { requireUser, userProfile, primaryEmailOf } from "./clerk.js";
import { readEntitlement, claimPending, applyEntitlement } from "./entitlement.js";
import { adapterFor, anyAdapterConfigured } from "./adapters.js";
import { PLANS, publicPlans } from "./plans.js";

const ORDER_TTL = 60 * 60 * 24 * 90;   // 90d — longer than any provider retries

/* GET /api/plans — public. The pricing page renders from this so the amounts
   live in exactly one file. `configured` is false until an adapter is
   registered, which lets the page ship ahead of the processor decision with the
   buy button disabled rather than broken. */
export async function plans(request, env) {
  return json({ ok: true, plans: publicPlans(), configured: anyAdapterConfigured() }, { request, env });
}

/* POST /api/checkout — Clerk bearer. */
export async function checkout(request, env) {
  const user = await requireUser(request, env);

  if (await rateLimited(env, "checkout", clientIp(request), 10, 60))
    return json({ ok: false, error: "slow_down" }, { status: 429, request, env });

  const body = (await readJson(request)) || {};
  const plan = String(body.plan || "");
  if (!PLANS[plan]) return json({ ok: false, error: "unknown_plan" }, { status: 400, request, env });

  const provider = String(body.provider || env.PAYMENT_PROVIDER || "");
  const adapter = adapterFor(provider);
  if (!adapter)
    return json({ ok: false, error: "not_configured" }, { status: 503, request, env });

  /* The session token proves who this is and carries almost nothing else, so
     the address comes from the Backend API keyed on the id it proved — same
     reasoning as device.js:109. Providers want an email to prefill and to send
     a receipt to, and a wrong one there becomes a support ticket. */
  const profile = await userProfile(env, user.userId);
  const email = primaryEmailOf(profile) || user.email || null;

  const { url } = await adapter.createCheckout(env, {
    userId: user.userId,
    email,
    plan,
    origin: env.SITE_ORIGIN,
  });

  return json({ ok: true, url }, { request, env });
}

/* POST /webhooks/<provider> — the signature is the credential. */
export async function webhook(request, env, provider) {
  const adapter = adapterFor(provider);
  if (!adapter) return json({ ok: false, error: "unknown_provider" }, { status: 404 });

  // Raw text first, always. Parsing and re-serializing changes bytes, and every
  // signature is over the bytes the provider actually sent.
  const raw = await request.text();
  if (!(await adapter.verify(raw, request, env)))
    return json({ ok: false, error: "bad_signature" }, { status: 401 });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const ev = { provider, ...adapter.parse(parsed, raw) };
  if (!ev.id) return json({ ok: false, error: "no_event_id" }, { status: 400 });

  /* Providers retry, and a retry must be a no-op rather than a second month of
     access. KV is eventually consistent, so two retries landing within the same
     second in different colos can both miss this guard — the window is small
     and the cost is a duplicate entlog row plus, for a renewal, a period
     granted twice. If that ever matters, move this counter to a Durable Object
     keyed on the event id; nothing else in this file changes.

     Note the guard is written before the apply and deleted if the apply throws.
     Writing it after would let concurrent retries both grant; leaving it in
     place on failure would swallow the event entirely and the provider would
     never send it again. */
  const guard = `order:${provider}:${ev.id}`;
  if (await env.SKILLED.get(guard)) return json({ ok: true, duplicate: true });
  await env.SKILLED.put(guard, raw.slice(0, 24 * 1024), { expirationTtl: ORDER_TTL });

  try {
    const result = await applyEntitlement(env, ev);
    return json({ ok: true, ...result });
  } catch (err) {
    await env.SKILLED.delete(guard);
    throw err;   // → 500 → the provider retries, which is what we want here
  }
}

/* GET /api/entitlement — Clerk bearer. */
export async function mine(request, env) {
  const user = await requireUser(request, env);
  let ent = await readEntitlement(env, user.userId);

  /* Bought from a provider-hosted storefront before the account existed. The
     webhook parked it against the email; collect it here, matched against the
     address Clerk has verified rather than the one the webhook supplied. */
  if (ent.status === "none") {
    const profile = await userProfile(env, user.userId);
    const email = primaryEmailOf(profile) || user.email || null;
    if (await claimPending(env, user.userId, email)) ent = await readEntitlement(env, user.userId);
  }

  return json({ ok: true, entitlement: ent }, { request, env });
}
