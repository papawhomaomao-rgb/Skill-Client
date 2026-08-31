/* Payment provider adapters.

   The provider is the one part of this system chosen under commercial pressure
   rather than technical, and it is the part most likely to be replaced — this
   product category gets reviewed off card rails regularly enough that the
   second adapter is a continuity plan, not a nice-to-have. So the provider
   lives behind three functions and touches nothing else. Adapters translate;
   applyEntitlement() in entitlement.js does every write.

   An adapter is:

     createCheckout(env, { userId, email, plan, origin }) -> { url }

        Creates a hosted checkout and returns somewhere to send the browser.
        MUST carry `userId` in whatever the provider calls its metadata field
        (Stripe: client_reference_id / metadata; PayPal: custom_id; Square:
        reference_id). This is the entire attribution story — a webhook that
        arrives holding only an email address is guesswork, and guessing which
        account just paid is the one mistake here that costs real money.

     verify(raw, request, env) -> boolean

        Is this really from the provider? Verify against the RAW BODY TEXT,
        before anything parses it — re-serializing JSON changes bytes and every
        signature over it fails. Compare in constant time; see timingSafeEqual.

     parse(body, raw) -> normalized event

        {
          id,        provider's event id — the idempotency key, must be stable
                     across the provider's own retries of the same event
          type,      purchase | renewal | past_due | refund | dispute | cancel
          userId,    from checkout metadata. null is survivable (parked against
                     email as a pending claim), wrong is not.
          email,     fallback attribution only
          plan,      a key of PLANS below
          until,     epoch ms of expiry, or null for lifetime
          renews,    false if this is the last period
          orderId, amount, currency        — for the audit log
        }

   Register the finished adapter in ADAPTERS and the route works. Nothing else
   in the Worker knows which provider is live, including the frontend. */

import { PLANS } from "./plans.js";

/* ── helpers every adapter wants ─────────────────────────────────────────── */

/* Constant-time compare. A === on a signature leaks its bytes through timing,
   one position at a time, to anyone patient enough to measure. */
export function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export const untilFor = plan => {
  const days = PLANS[plan]?.days;
  return days == null ? null : Date.now() + days * 24 * 60 * 60 * 1000;
};

/* ── the stub ────────────────────────────────────────────────────────────── */

/* Replace the three bodies below once the processor is chosen. Everything
   downstream of them is finished and tested; this file is the whole diff.

   Worked example — Stripe, for shape only:

     createCheckout: async (env, { userId, email, plan, origin }) => {
       const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
         method: "POST",
         headers: {
           Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
           "Content-Type": "application/x-www-form-urlencoded",
         },
         body: new URLSearchParams({
           mode: PLANS[plan].days == null ? "payment" : "subscription",
           "line_items[0][price]": PLANS[plan].providerPriceId,
           "line_items[0][quantity]": "1",
           client_reference_id: userId,          // <- attribution
           "metadata[user_id]": userId,          // <- survives into the event
           customer_email: email || "",
           success_url: `${origin}/index.html?checkout=done`,
           cancel_url: `${origin}/index.html?checkout=cancelled`,
         }),
       });
       if (!res.ok) throw new Error(`stripe checkout ${res.status}`);
       return { url: (await res.json()).url };
     },

     verify: async (raw, request, env) => {
       const header = request.headers.get("Stripe-Signature") || "";
       const parts = Object.fromEntries(header.split(",").map(kv => kv.split("=")));
       if (!parts.t || !parts.v1) return false;
       // Reject replays of a genuinely-signed old body.
       if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
       const expected = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, `${parts.t}.${raw}`);
       return timingSafeEqual(expected, parts.v1);
     },

     parse: body => ({ ... })

   PayPal is the odd one out: it signs with a rotating cert rather than a shared
   secret, so `verify` is a POST to /v1/notifications/verify-webhook-signature
   with the five PAYPAL-* headers. It costs a round trip. Take it — the offline
   path means implementing crc32 and cert-chain validation in a Worker to save
   80ms on a request nobody is waiting for. */

export const ADAPTERS = {
  // provider name in the URL -> adapter
  //   stripe: { createCheckout, verify, parse },
  //   paypal: { createCheckout, verify, parse },
  //   square: { createCheckout, verify, parse },
};

export const adapterFor = name => ADAPTERS[name] || null;

/* True once at least one adapter is registered. /api/checkout answers a clean
   "not configured yet" rather than a 500 until then, which keeps the pricing
   page shippable ahead of the processor decision. */
export const anyAdapterConfigured = () => Object.keys(ADAPTERS).length > 0;
