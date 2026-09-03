# skilled-cloud — Worker

Implements `docs/LAUNCHER-AUTH-v1.md` (v1.1, entitlement included) plus the
app-data endpoints in `docs/BACKEND.md`.

## Deploy

```bash
cd worker
npm install
npx wrangler kv namespace create SKILLED          # paste id into wrangler.toml
npx wrangler kv namespace create SKILLED --preview # paste preview_id
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler deploy
```

Then set `SITE_ORIGIN` and `ALLOWED_ORIGINS` in `wrangler.toml` to the real
Vercel domain — `SITE_ORIGIN` is what `verify_url` is built from, so until it is
real the launcher opens a browser at nowhere.

## Files

| File | What |
|---|---|
| `src/index.js` | Router, CORS preflight, error → Response mapping |
| `src/device.js` | `/auth/device`, `/pending`, `/approve`, `/deny`, `/poll` |
| `src/launcher.js` | `/auth/launcher/refresh`, `/api/launcher/heartbeat` |
| `src/app.js` | announcements, broadcast, admin users, sessions |
| `src/configs.js` | config cloud — create, list, share |
| `src/sessions.js` | session records, token minting, revoke |
| `src/entitlement.js` | **the one function that turns Skilled paid** |
| `src/payments.js` | `/api/plans`, `/api/checkout`, `/webhooks/<provider>`, `/api/entitlement` |
| `src/adapters.js` | the Stripe adapter, and the contract a second one would meet |
| `src/plans.js` | the catalogue — the only place a price is written down |
| `src/clerk.js` | Clerk token verification, Backend API |
| `src/tokens.js` | opaque credential + match code generation |
| `src/http.js` | JSON helpers, CORS, per-IP rate limiting |

## Two things that are deliberate

**Every protocol outcome is HTTP 200** with a `status`/`ok` field — `pending`,
`denied`, `expired`, `revoked`, `no_license` included. Only genuine faults are
non-2xx. The launcher is .NET `HttpWebRequest`, which throws on any non-2xx;
"waiting for approval" must not arrive as an exception every 5 seconds.

**Launcher credentials are opaque, not JWTs.** `lt_` / `lr_` + 32 hex = 35
chars, 128 bits. Long blobs get truncated by Windows Credential Manager and the
session dies silently on the next restart. They are stored in KV under their
SHA-256, so a KV dump is not a pile of live credentials.

## KV layout

```
dc:<device_code>          device link record, TTL 10 min, deleted on token handoff
lt:<sha256(token)>        { session_id, user_id, expires }   TTL 1 h
lr:<sha256(refresh)>      { session_id, user_id, used }      TTL 30 d, rotated
sess:<session_id>         session record, last_seen, revoked
usess:<user_id>:<sess>    index for the Devices tab
ann:<id>                  announcement
ent:<user_id>             entitlement — status, plan, until, provenance
pend:<sha256(email)>      bought before signing up; claimed on first sign-in
entlog:<user_id>:<ts>     append-only money log, TTL 2 y
order:<provider>:<evt>    webhook idempotency guard, TTL 90 d
rl:<bucket>:<ip>:<window> rate limit counter
```

## Entitlement

`hasEntitlement()` in `src/entitlement.js` is the gate, and it is wired into
approve, refresh, heartbeat and every config call. It returns `true` for every
signed-in account until `ENTITLEMENT_ENFORCED` is `"true"` — the launch position
in the contract, kept so that deploying the payment layer cannot lock out the
accounts that already exist. The `no_license` paths on approve/poll/heartbeat
are live and already handled by `link.html` and the launcher, so flipping that
one var is the whole of going paid.

## Stripe

The provider sits behind `src/adapters.js` and nothing else in the Worker knows
which one is live — `PAYMENT_PROVIDER` in `wrangler.toml` picks the adapter for
`/api/checkout`, and `/webhooks/stripe` reaches it by URL segment.

### Turning it on

```bash
npx wrangler secret put STRIPE_SECRET_KEY       # sk_test_… to begin with
npx wrangler secret put STRIPE_WEBHOOK_SECRET   # whsec_…, from the step below
```

Both, or neither: with only the key set, `/api/plans` reports
`configured: false` and `/api/checkout` answers 503. A checkout with no webhook
secret behind it takes the money and grants nothing.

Then add an endpoint in the Stripe dashboard at
`https://<worker-domain>/webhooks/stripe`, subscribed to:

| Stripe event | Becomes | Effect |
|---|---|---|
| `checkout.session.completed` | `purchase` | grants |
| `checkout.session.async_payment_succeeded` | `purchase` | grants — bank debits complete the session before the money moves |
| `invoice.paid` | `renewal` | extends to the invoice's own period end |
| `invoice.payment_failed` | `past_due` | still grants, for 3 days past the period end |
| `customer.subscription.deleted` | `cancel` | keeps the period already paid for, stops renewing |
| `customer.subscription.updated` | `cancel` | only when `cancel_at_period_end` is set; otherwise ignored |
| `charge.refunded` | `refund` | revokes and signs out every launcher session — full refunds only |
| `charge.dispute.created` | `dispute` | same, and costs one API lookup: a Dispute names a charge and nothing else |

Everything else that endpoint receives gets a 200 and is dropped, so
over-subscribing is harmless. `invoice.payment_succeeded` is accepted as a
synonym for `invoice.paid`; subscribing to both just makes the second a no-op.

The catalogue is $25 lifetime and $8/month, in `src/plans.js`. That is all the
Worker needs: with `STRIPE_PRICE_LIFETIME` / `STRIPE_PRICE_MONTHLY` left empty,
each checkout is built inline from those amounts and the site cannot quote a
number Stripe does not charge.

Setting real Price ids in `wrangler.toml` is still worth doing before launch —
otherwise Stripe accrues a throwaway Product per checkout and its reporting is
unusable. Just make the Price match `src/plans.js` to the cent, and move them
together afterwards: a Price carries its own amount, so once an id is set,
editing `plans.js` changes only what the page advertises.

### Going live

1. Deploy on test keys with `ENTITLEMENT_ENFORCED = "false"`.
2. Buy with `4242 4242 4242 4242`. An `ent:<user_id>` record should appear in KV
   and come back from `GET /api/entitlement`.
3. `npx wrangler tail` through a refund and a `customer.subscription.deleted` in
   the Stripe dashboard. Both should revoke; the refund should also drop the
   Devices list to empty.
4. Swap in the live key and the live endpoint's secret — they are different
   secrets, and a test-mode secret silently fails every live signature.
5. Backfill anyone who bought before this existed: write
   `{"status":"active","plan":"lifetime","until":null,"renews":false}` to
   `ent:<their_clerk_id>`. Same trick keeps staff signed in — `"plan":"staff"`.
6. Only then flip `ENTITLEMENT_ENFORCED` to `"true"`.

### Attribution

`/api/checkout` writes the Clerk user id into the checkout session's metadata,
and into the PaymentIntent (one-off) or the Subscription (recurring). The
session is gone by the time a renewal or a refund happens and those events carry
the metadata of the invoice or the charge instead, so planting it in one place
only would mean guessing later. A webhook that still cannot be attributed is
shelved against the buyer's email and claimed against a Clerk-**verified**
address on their next sign-in — never matched on an address a webhook supplied.
