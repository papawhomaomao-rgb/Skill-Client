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
approve, refresh, heartbeat and every config call. **It is enforced** as of
2026-09-07: an account with no granting `ent:` record is refused, and having
signed up no longer grants anything. Set `ENTITLEMENT_ENFORCED` to anything but
`"true"` and it reopens — the launch position in the contract, held so that
deploying the payment layer could not lock out the accounts that already
existed.

Where a refused account meets it:

| Entry point | Refusal |
| --- | --- |
| `POST /auth/device/approve` | `{"ok":false,"status":"no_license"}`, no session minted |
| `POST /auth/device/poll` | terminal `no_license` — `link.html` and the launcher both render it |
| `POST /auth/launcher/refresh` | `{"status":"revoked"}` — the hourly rotation stops |
| `POST /api/launcher/heartbeat` | `{"ok":false,"reason":"no_license"}` → the launcher ejects the DLL |
| `/api/configs*` | `403` |

The one gap is deliberate and lives on the client: the launcher's 7-day offline
grace covers an *unreachable* Worker, not a refusal, so a 5xx rides it out while
`no_license` kills the session on the spot. Someone already running who never
reaches the Worker again keeps working until that clock runs out.

Nobody is granted by accident, which cuts both ways — see **Manual grants**
below before assuming a support ticket is a bug.

## Manual grants

Not every real customer arrives through Stripe: staff, testers, a sale taken by
hand, a webhook lost in transit, goodwill after a support thread. Three dev-only
routes cover all of it.

```
GET    /admin/entitlement?user_id=...|email=...    the record, plus its audit log
POST   /admin/entitlement                          grant
DELETE /admin/entitlement?user_id=...|email=...    revoke
```

**These are what the dashboard drives.** The dev dashboard's Buyers and Licences
tabs call POST and DELETE from a right-click menu on a roster row, so day to day
nobody types any of this. `GET /admin/users` carries the licence alongside each
account for exactly that reason:

```
licensed     the Worker's own predicate, already applied — the only field that
             answers "can this person sign in", since past_due inside its grace
             grants and an elapsed `until` does not, and neither shows in status
entitlement  { status, plan, until, renews, source } for display
enforced     top level, once: false means every row reads as licensed because
             the gate is open, not because anyone paid
```

Reach for `curl` when the dashboard is the thing that is broken, or when the
account you need to fix is the one that cannot get in.

Grant takes `{ user_id | email, plan?, days?, until?, staff?, note? }`, and every
field after the target is optional — the bare call is a lifetime grant. `days`
counts from now, `until` is epoch ms and wins over it, and neither one present
means it never expires. An `email` is resolved through Clerk and matches only an
account that has **verified** it, same rule as `DEV_EMAILS` and for the same
reason.

```
curl -X POST https://skilled-cloud.papawhomaomao.workers.dev/admin/entitlement   -H "Authorization: Bearer <clerk session token>"   -H "Content-Type: application/json"   -d '{"email":"customer@example.com","note":"lost webhook, order #1234"}'
```

Naming no target grants **the caller**, which is the bootstrap: closing the gate
locks staff out along with everyone else, because there is no `role` bypass
inside the predicate — on purpose, since a gate that reads roles is a gate with
two answers. `{"staff":true}` writes a never-expiring staff record and is how
the developer account stays signed in.

### Why not just write the KV key

You still can, and it stays the break-glass for when the Worker itself is the
problem:

```
npx wrangler kv key put "ent:<clerk_user_id>" --remote   --namespace-id c058e550df6f4d028d7e31043f5d42ae   '{"status":"active","plan":"lifetime","until":null,"renews":false}'
```

It is not equivalent, though, and the gap is widest on the way out. Removing
access is `"status":"revoked"` rather than a delete either way — an absent
record and a revoked one both refuse, but the revoked one says why to whoever
reads it next. What a hand-written record does **not** do is any of the work
`write()` in `entitlement.js` does around the record:

- **It does not revoke the account's launcher sessions.** `hasEntitlement()`
  starts refusing, so the heartbeat ejects the DLL within fifteen seconds and
  refresh stops rotating within the hour — access really does stop. But the
  `sess:` records stay live, so the Devices tab goes on listing them and
  `listSessions()` goes on returning them. `DELETE /admin/entitlement` takes
  them down properly.
- **It does not write an `entlog:` row**, so an account gains or loses a licence
  with no record of who did it or why. That is the entry you want the day a
  chargeback is disputed.
- **It does not validate anything.** A misspelled `until` reads back as `null`,
  which is a lifetime licence, and nothing anywhere tells you.

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
5. Backfill anyone who bought before this existed, and grant staff:
   `POST /admin/entitlement` with `{"email":"…"}`, or `{"staff":true}` and no
   target at all for yourself. (Before those routes existed this was a raw
   `wrangler kv key put` to `ent:<their_clerk_id>`, which still works — see
   **Manual grants**.)
6. Only then flip `ENTITLEMENT_ENFORCED` to `"true"`. **Done — 2026-09-07.** It
   was flipped against an empty shelf: KV held no `ent:`, `pend:` or `order:`
   key, so the webhook had never applied an event and there was nothing to
   backfill. Four accounts that had signed in for free lost access at that
   moment, and the developer account was carried across by step 5 first.

### Attribution

`/api/checkout` writes the Clerk user id into the checkout session's metadata,
and into the PaymentIntent (one-off) or the Subscription (recurring). The
session is gone by the time a renewal or a refund happens and those events carry
the metadata of the invoice or the charge instead, so planting it in one place
only would mean guessing later. A webhook that still cannot be attributed is
shelved against the buyer's email and claimed against a Clerk-**verified**
address on their next sign-in — never matched on an address a webhook supplied.
