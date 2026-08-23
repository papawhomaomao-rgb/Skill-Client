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
| `src/sessions.js` | session records, token minting, revoke |
| `src/entitlement.js` | **the one function that turns Skilled paid** |
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
rl:<bucket>:<ip>:<window> rate limit counter
```

## Entitlement

`hasEntitlement()` in `src/entitlement.js` returns `true` for every signed-in
account today, per the launch position in the contract: the check is wired into
approve, refresh and heartbeat, but the gate is open because there is no
purchase flow yet. Going paid is that one function — nothing else changes, and
the `no_license` paths on approve/poll/heartbeat are already live and already
handled by `link.html` and the launcher.
