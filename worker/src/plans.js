/* The catalogue.

   One place, because a price that disagrees with itself between the pricing
   page and the checkout call is the kind of bug you find out about through a
   chargeback. The frontend reads this over GET /api/plans rather than hardcoding
   amounts in sections.jsx.

   `amount` is minor units (cents). `days` is the access window a successful
   purchase buys — null means lifetime, and null is also what a staff grant
   uses. `providerPriceId` is filled in per-provider once one is chosen; it is
   the only field in here that knows a processor exists.

   PRICES BELOW ARE PLACEHOLDERS. Nothing on the site currently quotes a number
   — sections.jsx:209 is named Pricing() but renders the download cards — so
   there was no existing figure to carry over. Set these before launch. */

export const PLANS = {
  lifetime: {
    id: "lifetime",
    label: "Lifetime",
    blurb: "Every current and future module, forever.",
    amount: 2999,
    currency: "USD",
    days: null,
    providerPriceId: null,
  },
  monthly: {
    id: "monthly",
    label: "Monthly",
    blurb: "Every module, billed monthly. Cancel whenever.",
    amount: 799,
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
