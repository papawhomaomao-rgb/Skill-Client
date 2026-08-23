# Skilled — how it fits together

Plain-English companion to `BACKEND.md`. No design decisions here, just what
exists and how the pieces talk.

---

## The website

Two pages, both static HTML with React loaded from a CDN. No build step — Vercel
serves the files as-is.

**`index.html`** — the marketing site plus the signed-in dashboard, in one page.
It swaps between them in memory rather than routing:

- Not signed in → marketing sections (hero, features, modules, changelog,
  download, Discord, FAQ) with **Sign in** / **Get Skilled** in the nav.
- Signed in → nav shows an avatar menu instead. Choosing *Dashboard* replaces the
  whole page with the dashboard shell; *Back to site* returns.
- The dashboard renders one of two ways depending on the account's role:
  - **user** — announcements inbox, license, devices, security
  - **dev** — buyers table, broadcast composer, announcement history

**`link.html`** — a standalone page the desktop launcher opens in the default
browser. Nothing links to it; it only works with a `?device_code=` parameter.
Add `&demo=1` to click through every state without a live backend. It is
implemented against `LAUNCHER-AUTH-v1.md`.

### Files

| File | What it holds |
|---|---|
| `index.html` | Entry point, font + Clerk script tags, script load order |
| `styles.css` | Design tokens (`--acc`, `--bg`, `--fg`, spacing, shadows) and shared classes |
| `dashboard.css` | Dashboard-only layout |
| `hero.jsx` | Hero, the ClickGUI recreation, the in-game HUD list |
| `sections.jsx` | Features, modules, changelog, download, Discord, FAQ, footer |
| `auth.jsx` | All auth: Clerk wiring, `useAuth`, sign-in modal, user menu, API helpers |
| `dashboard.jsx` | Both dashboards |
| `app.jsx` | Top-level shell — nav, view switching, accent tweak |
| `tweaks-panel.jsx` | The accent-colour picker (dev tool, safe to delete in prod) |

Load order matters: `auth.jsx` and `hero.jsx` must come before `app.jsx`, since
each file exports onto `window` for the next one to pick up.

### Theming

Everything reads from CSS custom properties in `styles.css`. Change `--acc` and
the entire site follows — including Clerk's forms, which are themed by reading
those same variables at mount time.

---

## How the website authenticates

**Clerk owns identity. The Worker owns app data.** No passwords, sessions, or
verification codes live in our code.

1. User clicks Sign in → our modal opens and mounts Clerk's own form inside it.
   Clerk handles email + password, Google, email verification, and password
   reset. We supply the surrounding chrome and the theme.
2. On success Clerk stores a session and `useAuth` re-renders with the user.
   Refreshes and new tabs restore it automatically.
3. Any call to the Worker goes through `authenticatedFetch`, which attaches the
   current Clerk session token as `Authorization: Bearer …`.
4. The Worker verifies that token with `@clerk/backend` and reads the user id
   plus role from the claims.

**Roles** are set in the Clerk dashboard — Users → *user* → Metadata → Public →
`{"role":"dev"}`. That value arrives inside the session token, so both the
website and the Worker can check it without an extra request.

---

## How the client should authenticate

Specified in full by `LAUNCHER-AUTH-v1.md`. The short version:

The launcher can't host a browser session, so it can't ask for a password. It
uses **device authorization** — the same flow a TV app uses when it sends you to
a URL to sign in. There is **no hardware fingerprinting**; a launcher session is
a token, like a browser session.

### The flow

1. **Launcher starts with no token.** `POST /auth/device`, sending an
   `install_id` (a random UUID it wrote on first run — a label the user can
   delete, not a fingerprint) plus self-reported cosmetics: `device_name`, `os`,
   `client_version`. None of it is a credential.

2. **Worker replies** with a `device_code` (opaque, single-use), a short
   `match_code` like `K7-F92`, a `verify_url`, an `interval` and `expires_in`.

3. **Launcher shows the `match_code`** as the loudest thing on its window and
   opens `verify_url` in the default browser.

4. **`link.html` loads** and calls `GET /auth/device/pending?device_code=…` —
   unauthenticated, because the page may load before the user has signed in and
   still needs to show what is asking for access. Then:
   - not signed in → mounts Clerk sign-in
   - signed in → shows the `match_code` alongside computer name, OS and client
     version, with Approve / Deny

5. **User compares the two codes.** Matching means the request came from the
   launcher in front of them. This is the whole security model — see below.

6. **Approve** calls `POST /auth/device/approve` with the Clerk session token.
   The Worker mints a launcher token bound to the Clerk user id from the
   *verified claims*, never from the request body.

7. **Launcher has been polling** `POST /auth/device/poll` every `interval`
   seconds. Next poll returns `token`, `refresh_token`, `display_name`, `email`,
   `role` and `session_id`. `device_code` is dead afterwards.

8. **Launcher stores the token in Windows Credential Manager**, never a plain
   file. It refreshes at 75% of `expires_in` via `POST /auth/launcher/refresh`.

9. **Heartbeat every 15s** to `POST /api/launcher/heartbeat`. Normally
   `{ok:true}`. A `revoked` response ejects the DLL from the game immediately —
   no prompt, no retry. That's the panic path.

Every protocol outcome above is **HTTP 200** with a `status` field. Pending,
denied, expired and revoked are all normal states, not errors — the launcher is
.NET Framework on `HttpWebRequest`, which throws on any non-2xx and buries the
body in the exception. Only genuine faults use non-2xx.

### Why the match code is not optional

`device_code` travels in a URL, and URLs get forwarded. Without a confirmation
step: an attacker starts a launcher on their own machine, sends the victim the
`verify_url`, the victim is already signed in and clicks Approve, and the
attacker's launcher polls out a valid token on the victim's account.

Nothing on the page can catch that, because the computer name and OS shown are
the attacker's and look perfectly ordinary. The only defence is that the code in
the launcher must equal the code in the browser. Nothing is typed and nothing is
read aloud — it's number-matching, like a modern MFA prompt.

### The DLL never sees a token

The launcher stays resident after injecting and serves a named pipe the DLL
connects to. The DLL learns three things over it — authorized, display name,
role — and never makes an HTTP request or touches a token. If the pipe drops, or
carries `revoked`, every module disables, config saves, the mouse returns to the
game, and it unloads.

### Revokes are not instant

The launcher accepts a cached token for 7 days without successful server contact,
then hard-stops. A deliberate trade: a Cloudflare outage must not brick every
customer at once. The consequence is that a revoke lands the next time that
machine reaches the Worker — someone who pulls their ethernet cable keeps working
for up to a week. Don't promise a customer that a ban is immediate.

### Consequence of no HWID

There's no per-machine identity, so a cap can only be a cap on **active launcher
sessions**. The dashboard's "Devices" tab is a sessions list keyed on
`session_id`, labelled by `install_id` / `device_name`, with `last_seen` from the
heartbeat and a sign-out button that revokes the session.

---

## Current status

**Website auth is complete.** Sign-up, sign-in, Google, email verification,
password reset, sessions, roles, account management, and all five states of the
launcher sign-in page work today.

**Everything remaining is Worker work.** Four of the six launcher endpoints in
`LAUNCHER-AUTH-v1.md` don't exist yet, plus from `BACKEND.md`:

1. Verify Clerk tokens with `CLERK_SECRET_KEY`
2. `/announcements`, `/admin/broadcast`, `/admin/users`
3. CORS allowing the Vercel origin on the browser-facing routes, with
   `Authorization` permitted

Announcements fall back to `localStorage` until the endpoint exists, so the
dashboard stays usable in the meantime.
