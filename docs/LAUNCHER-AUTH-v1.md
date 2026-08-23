# Skilled — launcher auth contract v1.1

The wire format between `SkilledInjector.exe`, `link.html`, and the Worker.
Clerk owns identity, the Worker owns app data, no hardware fingerprinting,
device-authorization shape with a match code.

The client side of this is implemented and building. These are the endpoints it
calls.

---

## Conventions

**Base:** `https://skilled-cloud.papawhomaomao.workers.dev`

**Status codes.** Every protocol outcome returns HTTP 200 with a `status` (or
`ok`) field in the body — including `pending`, `denied`, `expired` and
`revoked`. Only genuine faults use non-2xx: 400 malformed body, 401 bad/missing
bearer, 500 server error.

This is deliberate and it is not stylistic. The launcher is .NET Framework 4.x
using `HttpWebRequest`, which throws `WebException` on any non-2xx and makes the
response body awkward to read out of the exception. "Waiting for approval" is a
normal state, not an error, and it should not surface as a thrown exception on a
5-second timer. RFC 8628 uses 400 + `error` here; we are deviating on purpose.

**Content type.** `application/json` both directions. UTF-8. No form encoding.

**Auth header.** `Authorization: Bearer <token>` where noted. Two distinct token
kinds, never interchangeable:

| Kind | Issued by | Sent by | Lifetime |
|---|---|---|---|
| Clerk session token | Clerk | `link.html` only | Clerk's own |
| Launcher token | Worker, on approve | `SkilledInjector.exe` only | 1 hour, refreshable |

**CORS.** Needed on `/auth/device/pending`, `/auth/device/approve`,
`/auth/device/deny` — those are called from `link.html` in a browser. Allow the
Vercel origin, allow `Authorization`, allow `GET, POST, OPTIONS`, handle the
preflight. The other four are called from the `.exe`, which sends no `Origin` and
needs no CORS.

---

## 1. `POST /auth/device`

Starts a link. No auth — nothing is being granted yet.

**Request**

```json
{
  "install_id": "3f2a91c4-7b0e-4d1a-9c53-8e6f204ab7d1",
  "device_name": "PAPAW-PC",
  "os": "Windows 11 (10.0.26200)",
  "client_version": "1.0.0"
}
```

`install_id` is a random UUIDv4 the launcher generates on first run and stores in
its own app data. It is a label, not a fingerprint — the user can delete it and
get a new one. Use it to collapse the Devices tab into one row per install
instead of one per launch. Absent or unrecognised is not an error.

`device_name`, `os`, `client_version` are self-reported cosmetics shown on the
approval page. **Never trust them for anything.** An attacker sets them freely;
that is exactly why the match code exists.

**Response 200**

```json
{
  "device_code": "dc_9f81a3c05e2b4d77b1c6e0f4a8d29b3e",
  "match_code": "K7-F92",
  "verify_url": "https://<your-vercel-domain>/link.html?device_code=dc_9f81...",
  "interval": 5,
  "expires_in": 600
}
```

- `device_code` — opaque, single-use, high-entropy (≥128 bits). Dead the instant
  a poll returns a token.
- `match_code` — short, human-comparable, unambiguous glyphs only. Exclude
  `O/0`, `I/1/l`, `S/5`, `B/8`. Suggest `[ACDEFGHJKMNPQRTUVWXY2346789]`, 6 chars,
  hyphenated `XX-XXX` for readability. It is compared, never typed or read aloud.
- `interval` — minimum seconds between polls.
- `expires_in` — seconds until `device_code` dies. 10 minutes is right.

---

## 2. `GET /auth/device/pending?device_code=…`

What `link.html` calls to render the approval card. No auth — the page may load
before the user signs in, and it needs to show what is asking for access.

**Response 200**

```json
{
  "status": "pending",
  "match_code": "K7-F92",
  "device_name": "PAPAW-PC",
  "os": "Windows 11 (10.0.26200)",
  "client_version": "1.0.0",
  "expires_in": 542
}
```

`status` is one of `pending`, `approved`, `denied`, `expired`. Unknown
`device_code` → `{"status":"expired"}`, **not a 404** — do not let this endpoint
distinguish "never existed" from "timed out", or it becomes an oracle for probing
valid codes.

Returning `match_code` here is the point of the whole flow. The browser shows it,
the launcher shows it, the human confirms they match.

---

## 3. `POST /auth/device/approve`

**Auth: Clerk session bearer.** Verified with `@clerk/backend`.

**Request** — `{"device_code": "dc_9f81…"}`

Mints a launcher token bound to the Clerk user id from the **verified claims**.
Never from the request body.

**Response 200** — `{"ok": true}`

**Response 200** — `{"ok": false, "status": "expired"}` if the code timed out
between page load and click. Likely enough to be worth handling; the page says
"this request expired, restart from the launcher."

### 3b. `POST /auth/device/deny`

Same auth and body. `{"ok": true}`. Marks the code denied so the launcher's next
poll terminates instead of spinning until timeout.

---

## 4. `POST /auth/device/poll`

No auth — `device_code` is the credential. The endpoint the launcher hits every
`interval` seconds while the user is in the browser.

**Request** — `{"device_code": "dc_9f81…"}`

**Response 200** — one of five shapes, discriminated on `status`:

```json
{ "status": "pending" }
```
```json
{ "status": "slow_down", "interval": 10 }
```
```json
{ "status": "denied" }
```
```json
{ "status": "expired" }
```
```json
{
  "status": "approved",
  "token": "lt_…",
  "refresh_token": "lr_…",
  "expires_in": 3600,
  "display_name": "papaw",
  "email": "papaw@example.com",
  "role": "dev",
  "session_id": "sess_4a1c…"
}
```

`role` is `user` or `dev`, read from Clerk public metadata — same value the
website uses, so the client doesn't need a second call to know it.

`session_id` is what appears in the dashboard's Devices tab and what a "sign out
this device" button revokes.

The launcher treats `denied` and `expired` as terminal — it starts a fresh
`/auth/device` rather than retrying a dead code.

---

## 5. `POST /auth/launcher/refresh`

No bearer — `refresh_token` is the credential.

**Request** — `{"refresh_token": "lr_…"}`

**Response 200**

```json
{ "status": "ok", "token": "lt_…", "refresh_token": "lr_…", "expires_in": 3600 }
```
```json
{ "status": "revoked" }
```

Rotate the refresh token on every use. If an already-used refresh token is
presented again, **revoke the whole session** — that is either a replay or a
stolen token, and both mean the session is compromised.

The launcher refreshes at 75% of `expires_in`, not on failure.

---

## 6. `POST /api/launcher/heartbeat`

**Auth: launcher bearer.** Every 15 seconds while the launcher is running.

**Request**

```json
{ "install_id": "3f2a91c4-…", "client_version": "1.0.0", "injected": true }
```

`injected` is whether `Skilled.dll` is currently live in a game process. Useful
for the dashboard; not a security signal.

**Response 200**

```json
{ "ok": true }
```
```json
{ "ok": false, "reason": "revoked" }
```
```json
{ "ok": false, "reason": "expired" }
```

- `revoked` → the launcher ejects the DLL from the game immediately and signs
  out. No prompt, no retry. This is the panic path.
- `expired` → refresh and resume. Not a revoke.

Also updates `last_seen` for the Devices tab.

---

## Offline behaviour — read this bit

The launcher accepts a cached token for **7 days** without a successful server
contact, then hard-stops. This is a deliberate trade: a Cloudflare outage must
not brick every customer simultaneously.

The consequence you need to know about: **a revoke does not necessarily take
effect within 15 seconds.** It takes effect the next time that machine
successfully reaches the Worker. A user who pulls their ethernet cable keeps
working for up to 7 days.

If you want revoke to be immediate, the grace period has to go, and every Worker
hiccup becomes a support ticket. Keep the 7 days. Just don't promise a customer
that a ban is instant, because it isn't.

---

## Rate limiting

- `/auth/device` — per-IP, tight. It mints state; it is the DoS surface.
- `/auth/device/poll` — respond `slow_down` rather than 429 if a launcher polls
  faster than `interval`. A misbehaving client should back off, not break.
- `/auth/device/pending` — per-IP. It is unauthenticated and takes a code
  parameter, so it is the natural target for enumeration. High entropy on
  `device_code` is the real defence; rate limiting is depth.

---

## v1.1 — entitlement

Added after v1 shipped, because v1 has a hole: it mints a launcher token for any
Clerk account that clicks Approve. Signing up on the website is enough to get a
working client. Nothing anywhere asks whether the person paid.

That was never a decision anyone made — the licence concept exists in the
dashboard (the user's Licence panel, the dev's Buyers table) and the device flow
simply never consults it. This section closes that.

What counts as entitled is your business logic, not wire format. Subscription
active, one-time purchase, manual grant, staff account — the contract does not
care and should not encode it. It only defines what happens when the answer is
no.

### Launch position: build the check, leave the gate open

Skilled is a paid product. There is no purchase flow yet, so shipping the gate
closed would lock out everyone including you.

So: build the entitlement check properly, wired into all three endpoints, with a
predicate that currently returns `true` for every signed-in account. Sign-in then
works end to end immediately, and turning Skilled paid later is one function on
the Worker — no change to the launcher, the DLL, or this contract.

The `no_license` screens are unreachable until that predicate tightens. Build
them anyway; they are the path a customer hits the day a card expires, and that
is a bad day to discover the screen was never finished.

Two consequences worth writing down:

- The website's "free, and it stays that way" copy is wrong and has been removed.
  The `no_license` screen points at `/pricing`, a route that does not exist yet —
  correct the day it matters, harmless until then, and the screen is unreachable
  in the meantime.
- The purchase flow itself — payment provider, webhooks, writing entitlement
  somewhere the Worker can read it — is unscoped work and is its own project.
  Nothing in this contract depends on it, which is the point of leaving the gate
  open.

### One new status: `no_license`

`POST /auth/device/approve` gains a refusal:

```json
{ "ok": false, "status": "no_license" }
```

Return it when the verified Clerk user has no entitlement. `link.html` says so
plainly and links to `/pricing` — this is the moment someone finds out, so it is
worth writing well.

Also **mark the `device_code` as `no_license`** when you refuse. Otherwise the
launcher keeps polling a code that will never be approved and spins for the full
ten minutes before timing out. With the mark, `POST /auth/device/poll` returns:

```json
{ "status": "no_license" }
```

which is terminal — the launcher stops immediately and says why. Same handling as
`denied` and `expired`, different message.

### Mid-session lapse

`POST /api/launcher/heartbeat` gains a matching reason:

```json
{ "ok": false, "reason": "no_license" }
```

For a subscription that lapses while someone is playing. The launcher treats it
exactly like `revoked` — ejects the DLL immediately — but shows a message about
the licence rather than about being revoked, because those are different things
that happened and the user can act on one of them.

### What this does not cover

Nothing here validates entitlement continuously beyond the heartbeat, and the
7-day offline grace applies to a lapsed licence exactly as it applies to an
outage. Someone whose subscription ends while their machine is offline keeps
working until they reconnect or the week runs out. That is the same trade
documented above and it is the right one — just don't be surprised by it.

### Token format

Keep launcher tokens **opaque and short**. A JWT with claims can blow past
Windows Credential Manager's 2560-byte blob limit, at which point `CredWriteW`
fails and the session silently doesn't survive a restart. An opaque handle the
Worker looks up server-side avoids the ceiling entirely, and makes revocation a
delete rather than a blocklist.

---

## Client-side summary

For reference — what the `.exe` and the DLL do with all this:

- Launcher reads its launcher token from Windows Credential Manager (`CredReadW`,
  target `Skilled:Launcher`). Never a plain file.
- No token, or refresh returns `revoked` → run the device flow, show
  `match_code` in the window, open `verify_url` in the default browser, poll.
- Token in hand → INJECT unlocks. Without a session it stays disabled.
- Launcher stays resident after injecting and serves a named pipe
  (`\\.\pipe\SkilledSession`) that the DLL connects to.
- The DLL never sees a token, never makes an HTTP request, and never writes a
  token to disk. It learns three things over the pipe: authorized yes/no,
  display name, role.
- `revoked` over the pipe, or the pipe dropping at all, sets `g_selfDestruct` —
  the DLL disables every module, saves config, returns the mouse to the game,
  restores the window procedure, and unloads.
- `token` has been removed from the DLL's on-disk config entirely.
