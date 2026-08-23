# Skilled — backend contract

The launcher auth flow is specified by **`docs/LAUNCHER-AUTH-v1.md`** (wire
contract v1). The client half is implemented against that document; the website
half is implemented against it too. Treat it as authoritative for anything under
`/auth/device`, `/auth/launcher` or `/api/launcher`.

This file covers the rest: what Clerk replaced, and the app-data endpoints the
website calls.

---

## 1. Deprecated: Worker-owned auth

Clerk owns identity. The website no longer calls any of these:

| Endpoint | Status | Replaced by |
|---|---|---|
| `POST /auth/signup` | **dead** | Clerk `<SignUp/>` in the browser |
| `POST /auth/login` | **dead** | Clerk `<SignIn/>` in the browser |
| `POST /auth/verify` | **dead** | Clerk email verification |
| `POST /auth/resend-code` | **dead** | Clerk email verification |
| `GET /auth/me` | **dead** | `clerk.user` client-side; `verifyToken()` server-side |

Password hashes and verification codes can go. Keep anything mapping a Clerk
user id to app data.

## 2. Verifying a Clerk session token

Sent by the website — and by `link.html` on approve/deny — as
`Authorization: Bearer <clerk session token>`.

```js
import { verifyToken } from "@clerk/backend";

async function requireUser(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
  return {
    userId: claims.sub,                             // FK for all app data
    role: claims.public_metadata?.role || "user",   // "dev" | "user"
  };
}

async function requireDev(request, env) {
  const u = await requireUser(request, env);
  if (u.role !== "dev") throw new Response("Forbidden", { status: 403 });
  return u;
}
```

`wrangler secret put CLERK_SECRET_KEY`. Never client-side.

**Roles** live in Clerk: Users → *user* → Metadata → Public → `{"role":"dev"}`.
The value rides in the session token, so checking it costs no extra request. It
is also what `/auth/device/poll` returns to the launcher on approval.

## 3. CORS

Needed on the browser-facing routes — the app-data endpoints below, plus
`/auth/device/pending`, `/auth/device/approve`, `/auth/device/deny`. The four
`.exe`-facing routes send no `Origin` and need none.

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

Answer `OPTIONS` with these and a 204.

## 4. App-data endpoints the website calls

Live in the frontend today. Announcements fall back to `localStorage` until
these exist, so the dashboard stays usable in the meantime.

| Method | Path | Auth | Returns |
|---|---|---|---|
| `GET` | `/announcements` | user | `{ ok, announcements: [{ id, at, from, body }] }` |
| `POST` | `/admin/broadcast` | **dev** | `{ ok, id, at, from }` — body `{ body: "text" }` |
| `DELETE` | `/admin/broadcast/:id` | **dev** | `{ ok }` |
| `GET` | `/admin/users` | **dev** | `{ ok, users: [{ email, role, createdAt, lastSeen }] }` |

`/admin/users` proxies Clerk's Backend API (`GET https://api.clerk.com/v1/users`)
with `CLERK_SECRET_KEY`, merged with whatever the Worker knows per user.

### Sessions, not devices

With no HWID there is no per-machine identity, so the dashboard's Devices tab is
a list of active launcher sessions. Each row is a `session_id` from
`/auth/device/poll`, labelled by the `install_id` and `device_name` the launcher
self-reported, with `last_seen` from the heartbeat. A "sign out this device"
button revokes that `session_id`, which the launcher observes on its next
heartbeat.
