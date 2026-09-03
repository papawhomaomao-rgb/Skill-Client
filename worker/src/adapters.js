/* Payment provider adapters.

   The provider is the one part of this system chosen under commercial pressure
   rather than technical, and it is the part most likely to be replaced — this
   product category gets reviewed off card rails regularly enough that the
   second adapter is a continuity plan, not a nice-to-have. So the provider
   lives behind four functions and touches nothing else. Adapters translate;
   applyEntitlement() in entitlement.js does every write.

   An adapter is:

     configured(env) -> boolean                                      (optional)

        Are the keys this adapter needs actually set? /api/plans reports it as
        `configured` and /api/checkout refuses on it, so the pricing page can
        ship ahead of the processor with the button disabled rather than broken.
        An adapter that omits this is assumed ready.

     createCheckout(env, { userId, email, plan, origin }) -> { url }

        Creates a hosted checkout and returns somewhere to send the browser.
        MUST carry `userId` in whatever the provider calls its metadata field
        (Stripe: client_reference_id / metadata; PayPal: custom_id; Square:
        reference_id). This is the entire attribution story — a webhook that
        arrives holding only an email address is guesswork, and guessing which
        account just paid is the one mistake here that costs real money.

        Plant it on the object that OUTLIVES the checkout, too. The session is
        gone by the time a renewal or a refund happens, and those events carry
        the metadata of a subscription or a charge, not of the session that
        started them.

     verify(raw, request, env) -> boolean

        Is this really from the provider? Verify against the RAW BODY TEXT,
        before anything parses it — re-serializing JSON changes bytes and every
        signature over it fails. Compare in constant time; see timingSafeEqual.

     parse(body, raw, env) -> normalized event                    (may be async)

        {
          id,        provider's event id — the idempotency key, must be stable
                     across the provider's own retries of the same event
          type,      purchase | renewal | past_due | refund | dispute | cancel.
                     Anything else — including omitting it — means "not ours":
                     payments.js answers 200 and writes nothing. Providers send
                     an endpoint far more event types than this list, so most
                     of them land there, and that is the intended path.
          userId,    from checkout metadata. null is survivable on a purchase
                     (parked against email as a pending claim), wrong is not.
          email,     fallback attribution only
          plan,      a key of PLANS below
          until,     epoch ms of expiry, or null for lifetime. Read that twice
                     before returning null on anything recurring: hasEntitlement
                     treats a null as never-expires.
          renews,    false if this is the last period
          orderId, amount, currency        — for the audit log
        }

        It may return a promise: some events (a chargeback, say) carry only a
        reference and have to be resolved against the provider's API before they
        can be attributed. Nobody is waiting on a webhook, so a round trip there
        is cheap. Reading from the provider is fine; writing to KV is not —
        that stays in entitlement.js so it happens once, in one place.

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

/* ── Stripe ──────────────────────────────────────────────────────────────── */

const STRIPE_API = "https://api.stripe.com/v1";

/* Stripe's own tolerance on a webhook timestamp: long enough for a slow retry,
   short enough that a captured body is worthless by the time anyone replays
   it. */
const SIGNATURE_TOLERANCE_SEC = 300;

/* There is deliberately no Stripe-Version header on any call in here. Outbound
   requests then use the account's default version, which is the same version
   the webhooks arrive in — pin one side and not the other and you end up
   parsing an invoice shape that never occurs in production. Where a field has
   moved between versions (the 2025-03-31 invoice restructure) both spellings
   are read below, so this survives the account being upgraded underneath it. */
async function stripeFetch(env, path, { method = "GET", form } = {}) {
  if (!env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");

  const res = await fetch(STRIPE_API + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: form ? form.toString() : undefined,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new Error(`stripe ${method} ${path} ${res.status}: ${body?.error?.message || "unknown"}`);
  return body;
}

/* A price id is a different object in test mode and in live mode, so it is env
   config rather than a constant: STRIPE_PRICE_LIFETIME / STRIPE_PRICE_MONTHLY,
   falling back to plans.js. With neither set the line item is built inline from
   the PLANS amount, which means a checkout works before anyone has opened the
   Stripe dashboard — at the cost of a throwaway Product per session, which
   makes the reporting there worthless. Set the ids before launch. */
const priceIdFor = (env, plan) =>
  env[`STRIPE_PRICE_${String(plan).toUpperCase()}`] || PLANS[plan]?.providerPriceId || null;

/* The reverse, for an event that reaches us without our metadata on it. */
const planForPrice = (env, priceId) =>
  priceId ? Object.keys(PLANS).find(p => priceIdFor(env, p) === priceId) || null : null;

/* Every id this file needs is one checkout put there itself. It is read back
   from four places because Stripe copies metadata onto some objects and not
   others, and because the 2025-03-31 API version moved the invoice's copy under
   `parent`. Object.assign skips absent sources and later ones win, so an
   object's own metadata beats anything inherited. */
const planted = obj =>
  Object.assign(
    {},
    obj.lines?.data?.[0]?.metadata,
    obj.subscription_details?.metadata,
    obj.parent?.subscription_details?.metadata,
    obj.metadata
  );

const emailOf = obj =>
  obj.customer_details?.email ||
  obj.customer_email ||
  obj.billing_details?.email ||
  obj.receipt_email ||
  null;

const msOf = sec => (typeof sec === "number" && sec > 0 ? sec * 1000 : null);

/* The end of the period this invoice actually paid for. Better than
   now + PLANS.days because it survives proration, coupons, a trial, and a
   billing anchor that has been moved. */
const invoiceUntil = inv => msOf(inv.lines?.data?.[0]?.period?.end) || msOf(inv.period_end) || null;

/* An invoice attached to no subscription is a manual or one-off invoice, which
   is not something this catalogue sells. Ignoring those matters more than it
   looks: falling through with an unrecognised plan writes `until: null`, and a
   null until is lifetime. */
const subscriptionOf = inv =>
  inv.parent?.subscription_details?.subscription || inv.subscription || null;

const priceOfLine = line => line?.pricing?.price_details?.price || line?.price?.id || null;

/* The shortest metered window in the catalogue — the floor for any grant we
   know is recurring but cannot pin to a plan. Never null, for the reason
   above. */
const SHORTEST_PERIOD_MS =
  Math.min(31, ...Object.values(PLANS).filter(p => p.days != null).map(p => p.days)) *
  24 * 60 * 60 * 1000;

const stripeAdapter = {
  /* Both, not just the key. A checkout that succeeds with no webhook secret
     behind it takes the money and grants nothing, which is worse than a button
     that says the shop is shut. */
  configured: env => Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET),

  async createCheckout(env, { userId, email, plan, origin }) {
    const p = PLANS[plan];
    const recurring = p.days != null;

    const form = new URLSearchParams({
      mode: recurring ? "subscription" : "payment",
      "line_items[0][quantity]": "1",
      client_reference_id: userId,
      "metadata[user_id]": userId,
      "metadata[plan]": plan,
      success_url: `${origin}/index.html?checkout=done`,
      cancel_url: `${origin}/index.html?checkout=cancelled`,
    });

    const priceId = priceIdFor(env, plan);
    if (priceId) {
      form.set("line_items[0][price]", priceId);
    } else {
      form.set("line_items[0][price_data][currency]", String(p.currency || "USD").toLowerCase());
      form.set("line_items[0][price_data][unit_amount]", String(p.amount));
      form.set("line_items[0][price_data][product_data][name]", `Skilled — ${p.label}`);
      if (recurring) {
        form.set("line_items[0][price_data][recurring][interval]", p.days >= 365 ? "year" : "month");
        form.set("line_items[0][price_data][recurring][interval_count]", "1");
      }
    }

    if (email) form.set("customer_email", email);

    /* The session's own metadata does not travel anywhere. A renewal arrives as
       an invoice and a refund as a charge, and neither has ever heard of the
       session — so the id goes onto the one object that outlives it in each
       mode. This is the whole attribution story; the rest of this file is
       bookkeeping. */
    const carrier = recurring ? "subscription_data" : "payment_intent_data";
    form.set(`${carrier}[metadata][user_id]`, userId);
    form.set(`${carrier}[metadata][plan]`, plan);

    const session = await stripeFetch(env, "/checkout/sessions", { method: "POST", form });
    if (!session?.url) throw new Error("stripe checkout returned no url");
    return { url: session.url };
  },

  async verify(raw, request, env) {
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return false;

    /* t=<unix>,v1=<hex>[,v1=<hex>…]. More than one v1 is normal while an
       endpoint secret is being rolled — both are valid through the overlap, so
       any match counts. v0 is a test-mode scheme and is not accepted. */
    let t = null;
    const sigs = [];
    for (const part of (request.headers.get("Stripe-Signature") || "").split(",")) {
      const i = part.indexOf("=");
      if (i < 0) continue;
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      if (k === "t") t = v;
      else if (k === "v1") sigs.push(v);
    }
    if (!t || !/^\d+$/.test(t) || sigs.length === 0) return false;
    if (Math.abs(Date.now() / 1000 - Number(t)) > SIGNATURE_TOLERANCE_SEC) return false;

    const expected = await hmacSha256Hex(secret, `${t}.${raw}`);
    return sigs.some(s => timingSafeEqual(expected, s));
  },

  /* Async, and handed `env`, because two of these events cannot be attributed
     from their own payload. Nothing is waiting on a webhook. */
  async parse(event, raw, env) {
    const obj = event?.data?.object || {};
    const id = event?.id;

    /* No `type` — payments.js answers 200 and touches no record. Stripe sends
       an endpoint everything it is subscribed to, and the default subscription
       is a lot. */
    const ignore = { id };

    switch (event?.type) {
      /* Money landed. In payment mode this is the entire purchase; in
         subscription mode it is the first period and invoice.paid carries the
         rest. Both events arrive for a new subscription and both write the same
         record, which is fine — the idempotency key is the event, not the
         outcome. */
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        /* Bank debits and the other async methods complete the session before
           the money moves. "unpaid" here is an order, not a payment. */
        if (obj.payment_status !== "paid" && obj.payment_status !== "no_payment_required")
          return ignore;

        const meta = planted(obj);
        const plan = PLANS[meta.plan] ? meta.plan : null;
        const recurring = obj.mode === "subscription";

        return {
          id,
          type: "purchase",
          /* client_reference_id is the same value sent a second way. It is the
             fallback for a session created outside this Worker — a Payment
             Link, say — where the plan is unknown but the money is real, and
             dropping it on the floor is not an option. */
          userId: meta.user_id || obj.client_reference_id || null,
          email: emailOf(obj),
          plan,
          until: plan ? untilFor(plan) : recurring ? Date.now() + SHORTEST_PERIOD_MS : null,
          renews: recurring,
          orderId: obj.id,
          amount: obj.amount_total ?? null,
          currency: obj.currency || null,
        };
      }

      /* Renewals. The first invoice of a subscription lands here too, right
         behind the session above, and writes the same record. Both spellings
         are handled because both are commonly subscribed to and they describe
         the same money. */
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        if (!subscriptionOf(obj)) return ignore;
        const meta = planted(obj);

        return {
          id,
          type: "renewal",
          userId: meta.user_id || null,
          email: emailOf(obj),
          plan: PLANS[meta.plan] ? meta.plan : planForPrice(env, priceOfLine(obj.lines?.data?.[0])),
          until: invoiceUntil(obj) || Date.now() + SHORTEST_PERIOD_MS,
          renews: true,
          orderId: obj.id,
          amount: obj.amount_paid ?? null,
          currency: obj.currency || null,
        };
      }

      /* A failed renewal. past_due still grants, for GRACE_MS past `until` — so
         `until` has to be a real timestamp here. A null would read as lifetime,
         and the payment that failed would have bought permanent access. */
      case "invoice.payment_failed": {
        if (!subscriptionOf(obj)) return ignore;
        const meta = planted(obj);

        return {
          id,
          type: "past_due",
          userId: meta.user_id || null,
          email: emailOf(obj),
          plan: PLANS[meta.plan] ? meta.plan : null,
          until: invoiceUntil(obj) || Date.now(),
          renews: true,
          orderId: obj.id,
          amount: obj.amount_due ?? null,
          currency: obj.currency || null,
        };
      }

      /* Cancelling is not losing access — write() keeps the period already paid
         for and only clears `renews`. */
      case "customer.subscription.updated":
        /* The only interesting update is a cancellation being scheduled.
           Renewals and failures both reach us as invoices instead. */
        if (!obj.cancel_at_period_end) return ignore;
      // falls through
      case "customer.subscription.deleted": {
        const meta = planted(obj);
        return {
          id,
          type: "cancel",
          userId: meta.user_id || null,
          email: null,
          plan: PLANS[meta.plan] ? meta.plan : null,
          orderId: obj.id,
        };
      }

      /* A full refund. A partial one is goodwill on top of a working licence,
         not a return of the product, so it does not pull access. */
      case "charge.refunded": {
        if (!obj.refunded) return ignore;
        let meta = planted(obj);

        /* A charge raised by a subscription invoice never carried our metadata
           — the Subscription did. One hop recovers it. Without it the refund is
           unattributable and quietly does nothing, which is the outcome most
           worth a round trip to avoid. */
        if (!meta.user_id && typeof obj.invoice === "string") {
          const inv = await stripeFetch(env, `/invoices/${encodeURIComponent(obj.invoice)}`);
          meta = { ...planted(inv), ...meta };
        }

        return {
          id,
          type: "refund",
          userId: meta.user_id || null,
          email: emailOf(obj),
          plan: PLANS[meta.plan] ? meta.plan : null,
          orderId: obj.payment_intent || obj.id,
          amount: obj.amount_refunded ?? null,
          currency: obj.currency || null,
        };
      }

      /* A chargeback. The Dispute object carries neither our metadata nor an
         email — only the charge it is against — so this is the event that has
         to go and ask. If the lookup fails this throws, the webhook 500s and
         Stripe retries, which is the right answer: a chargeback that quietly
         leaves access switched on is the expensive failure here. */
      case "charge.dispute.created": {
        const chargeId = typeof obj.charge === "string" ? obj.charge : null;
        const charge = chargeId
          ? await stripeFetch(env, `/charges/${encodeURIComponent(chargeId)}`)
          : null;

        let meta = charge ? planted(charge) : {};
        if (!meta.user_id && typeof charge?.invoice === "string") {
          const inv = await stripeFetch(env, `/invoices/${encodeURIComponent(charge.invoice)}`);
          meta = { ...planted(inv), ...meta };
        }

        return {
          id,
          type: "dispute",
          userId: meta.user_id || null,
          email: charge ? emailOf(charge) : null,
          plan: PLANS[meta.plan] ? meta.plan : null,
          orderId: obj.payment_intent || chargeId || obj.id,
          amount: obj.amount ?? null,
          currency: obj.currency || null,
        };
      }
    }

    /* Winning a dispute does not put the record back — `charge.dispute.closed`
       is deliberately unhandled. Someone who charged back and then lost the
       claim gets their access returned by hand, if at all. */
    return ignore;
  },
};

export const ADAPTERS = {
  // provider name in the URL -> adapter
  stripe: stripeAdapter,
  //   paypal: { createCheckout, verify, parse },
  //   square: { createCheckout, verify, parse },
};

export const adapterFor = name => ADAPTERS[name] || null;

/* True once at least one registered adapter has the keys it needs — what
   /api/plans reports, and what keeps the pricing page shippable ahead of the
   processor going live. An adapter in the table with nothing behind it is worse
   than an empty table: the button looks alive and the checkout 500s in front of
   the customer. */
export const anyAdapterConfigured = env =>
  Object.values(ADAPTERS).some(a => (typeof a.configured === "function" ? a.configured(env) : true));
