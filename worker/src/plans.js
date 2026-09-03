/* The catalogue.

   One place, because a price that disagrees with itself between the pricing
   page and the checkout call is the kind of bug you find out about through a
   chargeback. The frontend reads this over GET /api/plans rather than hardcoding
   amounts in sections.jsx.

   `amount` is minor units (cents). `days` is the access window a successful
   purchase buys — null means lifetime, and null is also what a staff grant
   uses. `providerPriceId` is the only field in here that knows a processor
   exists, and it normally stays null: the deployed value belongs in
   STRIPE_PRICE_<PLAN> in wrangler.toml, because a Price id is a different
   object in test mode and in live mode and one source tree has to point at
   either.

   ONE CAVEAT, and it is the expensive kind. A Stripe Price carries its own
   amount. Once STRIPE_PRICE_<PLAN> is set, editing a number below moves what
   the site QUOTES and not what the card is CHARGED. Change both together, or
   change neither — a page advertising $20 against a Price that takes $25 is a
   chargeback with the evidence already written. With no price id set, the
   checkout is built from these amounts and the two cannot disagree. */

export const PLANS = {
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    blurb: "Every current and future module, forever.",
    amount: 2500,
    currency: "USD",
    days: null,
    providerPriceId: null,
  },
  monthly: {
    id: "monthly",
    label: "Monthly",
    blurb: "Every module, billed monthly. Cancel whenever.",
    amount: 800,
    currency: "USD",
    days: 30,
    providerPriceId: null,
  },
};

/* What the pricing page is allowed to see. providerPriceId stays server-side —
   it is not a secret, but it is a detail of a provider the frontend is
   deliberately ignorant of. */
export const publicPlans = () =>
  Object.values(PLANS).map(({ id, label, blurb, amount, currency, days }) => ({
    id,
    label,
    blurb,
    amount,
    currency,
    days,
  }));
