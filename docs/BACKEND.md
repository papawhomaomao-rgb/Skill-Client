# Skilled — backend contract

Reference for the Cloudflare Worker. Two parts: what changed when Clerk landed,
and the launcher sign-in flow.

**No hardware fingerprinting.** There is no HWID anywhere in this design. A
launcher session is just a token, the same way a browser session is.

---

## 1. Deprecated: Worker-owned auth

Clerk now owns identity. The website no longer calls any of these:

| Endpoint | Status | Replaced by |
|---|---|---|
| `POST /auth/signup` | **dead** | Clerk `<SignUp/>` in the browser |
| `POST /auth/login` | **dead** | Clerk `<SignIn/>` in the browser |
| `POST /auth/verify` | **dead** | Clerk email verification |
| `POST /auth/resend-code` | **dead** | Clerk email verification |
| `GET /auth/me` | **dead** | `clerk.user` client-side; `verifyToken()` server-side |

Password hashes and verification codes can go. Keep anything that maps a Clerk
user id to app data.

### What replaces it

Every authenticated request carries a Clerk **session token**:

```
Authorization: Bearer <clerk session token>
```

Verify it on the Worker:

```js
import { verifyToken } from "@clerk/backend";

async function requireUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
  return {
    userId: claims.sub,                             // Clerk user id — FK for all app data
    role: claims.public_metadata?.role || "user",   // "dev" | "user"
  };
}

async function requireDev(request, env) {
  const u = await requireUser(request, env);
  if (u.role !== "dev") throw new Response("Forbidden", { status: 403 });
  return u;
}
```

`wrangler secret put CLERK_SECRET_KEY` — the `sk_…` key. Never client-side.

### Developer role

Clerk dashboard → Users → *user* → Metadata → Public → `{"role":"dev"}`. It
rides in the session token as `public_metadata.role`, so no Clerk call needed
to check it.

### CORS

```js
const ALLOWED = [
  "https://<your-project>.vercel.app",
  "https://skilled.gg",
  "http://localhost:3000",
];
const origin = request.headers.get("Origin");
const cors = {
  "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};
```

Answer `OPTIONS` preflight with these and a 204.

---

## 2. App-data endpoints the website already calls

Live in the frontend today. Announcements fall back to `localStorage` until
these exist, so nothing breaks in the meantime.

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/announcements` | user | `{ ok, announcements: [{ id, at, from, body }] }` |
| `POST` | `/admin/broadcast` | **dev** | `{ ok, id, at, from }` — body `{ body: "text" }` |
| `DELETE` | `/admin/broadcast/:id` | **dev** | `{ ok }` |
| `GET` | `/admin/users` | **dev** | `{ ok, users: [{ email, role, createdAt, lastSeen }] }` |

`/admin/users` proxies Clerk's Backend API (`GET https://api.clerk.com/v1/users`)
with `CLERK_SECRET_KEY`, merging in whatever the Worker knows per user.

---

## 3. Launcher sign-in

The launcher can't host a browser session, so it uses the OAuth 2.0 Device
Authorization Grant shape (RFC 8628). Four calls, no hardware identifiers.

```
launcher                        worker                        browser (/link)
   │                              │                              │
   │ POST /auth/device ──────────▶│                              │
   │◀── device_code, match_code,  │                              │
   │    verify_url, interval      │                              │
   │                              │                              │
   │ opens verify_url in the system browser ─────────────────────▶│
   │ displays match_code          │◀── GET /auth/device/:code ────│
   │                              │──── display fields ─────────▶│
   │                              │                              │  Clerk sign-in,
   │                              │                              │  compare code,
   │                              │                              │  Approve
   │                              │◀── POST /auth/device/approve ─│
   │ POST /auth/device/poll ─────▶│  (Clerk bearer)               │
   │◀── ok, token, display_name   │                              │
```

### `POST /auth/device`

Unauthenticated — the launcher introducing itself. Everything in the body is
self-reported and used **for display only**; none of it is a credential.

```jsonc
// request
{
  "hostname": "Vens-PC",          // optional, OS-reported computer name
  "os": "Windows 11 23H2",        // optional
  "version": "1.0.4"
}

// 200
{
  "ok": true,
  "device_code": "dc_9f2k1l7ba4e6b1d3729c8d",  // opaque, single-use, 128+ bits entropy
  "match_code": "K7-F92",                       // display only, see §4
  "verify_url": "https://skilled.gg/link?device_code=dc_9f2k…",
  "expires_in": 600,
  "interval": 3
}
```

Store under `device_code` with a 10-minute TTL: display fields, `match_code`,
`status: "pending"`.

The launcher **must** show `match_code` in its own window while waiting.

### `GET /auth/device/:device_code`

Unauthenticated — the `/link` page reads this to render before sign-in. Return
only display-safe fields.

```jsonc
// 200
{
  "ok": true,
  "status": "pending",            // pending | approved | denied | expired
  "match_code": "K7-F92",
  "hostname": "Vens-PC",
  "os": "Windows 11 23H2",
  "version": "1.0.4",
  "expires_at": 1755900000000
}

// 404
{ "ok": false, "error": "This link has expired. Restart the launcher." }
```

### `POST /auth/device/approve`

**Requires a Clerk bearer token** — this is where the account attaches.

```jsonc
// request  { "device_code": "dc_9f2k…" }
// 200      { "ok": true }
```

On success: mint a launcher token bound to `claims.sub`, mark the record
`approved`, stash the token for the poll to collect.

`POST /auth/device/deny` — same body, marks `denied`, issues nothing.

### `POST /auth/device/poll`

Unauthenticated — `device_code` is the credential. Polled every `interval`.

```jsonc
// request  { "device_code": "dc_9f2k…" }

{ "status": "pending" }

// approved — return ONCE, then invalidate device_code
{
  "ok": true,
  "status": "approved",
  "token": "<launcher jwt>",
  "refresh_token": "<opaque>",
  "display_name": "ven",
  "email": "ven@example.com",
  "role": "user",
  "expires_in": 86400
}

{ "status": "denied" }
{ "status": "expired" }
{ "status": "slow_down" }   // polled faster than interval
```

### Launcher token

Separate from Clerk session tokens, which are browser-scoped and short-lived.

- Payload: `{ sub: clerk_user_id, sid: <session id>, role, iat, exp }`
- 24-hour expiry, refreshed via `refresh_token`
- Stored in the OS keychain (Windows Credential Manager / macOS Keychain / libsecret)
- Revocable server-side by `sid`, which is what powers remote sign-out and panic

### `POST /api/launcher/heartbeat`

```jsonc
// header: Authorization: Bearer <launcher token>
{ "fps": 287, "server": "hypixel.net", "activeModules": ["AutoClicker","W-Tap"], "version": "1.0.4" }

// 200
{ "ok": true }

// revoked — launcher unloads itself immediately
{ "ok": false, "revoked": true, "reason": "panic" | "signed_out" | "banned" }
```

Every 15 seconds. Feeds "last seen" in the dashboard and the remote-revoke half
of panic.

---

## 4. Why `match_code` exists

`device_code` travels in a URL, and a URL can be forwarded. Without a
confirmation step the attack is trivial and needs no hardware knowledge:

1. Attacker runs the launcher on their machine, gets a `verify_url`
2. Sends it to a victim who is already signed in to skilled.gg
3. Victim clicks Approve — the attacker's launcher now polls out a valid token
   on the victim's account

Nothing on the page can catch this, because the self-reported hostname and OS
are the attacker's and look entirely normal. The fix is that the code shown in
the launcher must equal the code shown in the browser. Nothing is typed and
nothing is read aloud — it's the same number-matching pattern as a modern MFA
prompt, and it's the only thing standing between a forwarded link and a stolen
session. Roughly fifteen lines on the Worker.

Other invariants worth holding:

- **`device_code` is single-use.** Invalidate on first successful poll, on deny,
  and on expiry. Never issue two tokens from one code.
- **Sessions, not devices.** With no HWID there is no per-machine identity, so a
  cap has to be a cap on *active launcher tokens*. Enforce it at approve time
  and list sessions (name, last seen, sign-out button) in the dashboard rather
  than "devices".
- **Optional: `install_id`.** If you want the session list to feel stable across
  restarts, have the launcher generate a random UUID on first run, store it in
  its own app data, and send it with `POST /auth/device`. It's a name, not a
  fingerprint — resettable by the user, no hardware involved.
