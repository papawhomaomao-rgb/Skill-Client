import { json, readJson, clientIp, rateLimited } from "./http.js";
import { requireUser } from "./clerk.js";
import { hasEntitlement } from "./entitlement.js";
import { newDeviceCode, newMatchCode } from "./tokens.js";
import { createSession, mintTokens } from "./sessions.js";

const CODE_TTL = 600;      // seconds — 10 minutes
const POLL_INTERVAL = 5;   // seconds

const load = (env, code) => env.SKILLED.get(`dc:${code}`, "json");
const save = (env, rec) =>
  env.SKILLED.put(`dc:${rec.device_code}`, JSON.stringify(rec), {
    expirationTtl: Math.max(60, Math.ceil((rec.expires - Date.now()) / 1000) + 120),
  });

const secondsLeft = rec => Math.max(0, Math.round((rec.expires - Date.now()) / 1000));

/* 1. POST /auth/device — starts a link. No auth; nothing is granted yet. */
export async function start(request, env) {
  const ip = clientIp(request);
  if (await rateLimited(env, "device", ip, 20, 60)) return json({ status: "slow_down", interval: 30 });

  const body = (await readJson(request)) || {};
  const rec = {
    device_code: newDeviceCode(),
    match_code: newMatchCode(),
    status: "pending",
    // Self-reported cosmetics. Shown on the approval page, trusted for nothing.
    install_id: String(body.install_id || "").slice(0, 64) || null,
    device_name: String(body.device_name || "").slice(0, 64) || null,
    os: String(body.os || "").slice(0, 64) || null,
    client_version: String(body.client_version || "").slice(0, 32) || null,
    created: Date.now(),
    expires: Date.now() + CODE_TTL * 1000,
    last_poll: 0,
  };
  await save(env, rec);

  return json({
    device_code: rec.device_code,
    match_code: rec.match_code,
    verify_url: `${env.SITE_ORIGIN}/link.html?device_code=${rec.device_code}`,
    interval: POLL_INTERVAL,
    expires_in: CODE_TTL,
  });
}

/* 2. GET /auth/device/pending?device_code=… — what link.html renders the card
   from. No auth: the page may load before the user has signed in, and it must
   show what is asking for access. Unknown code → expired, never 404: this
   endpoint must not become an oracle for probing valid codes. */
export async function pending(request, env, url) {
  if (await rateLimited(env, "pending", clientIp(request), 60, 60))
    return json({ status: "expired" }, { request, env });

  const rec = await load(env, url.searchParams.get("device_code") || "");
  if (!rec || rec.expires < Date.now()) return json({ status: "expired" }, { request, env });

  return json(
    {
      status: rec.status,
      match_code: rec.match_code,
      device_name: rec.device_name,
      os: rec.os,
      client_version: rec.client_version,
      expires_in: secondsLeft(rec),
    },
    { request, env }
  );
}

/* 3 / 3b. POST /auth/device/approve|deny — Clerk session bearer. The token is
   bound to the user id from the verified claims, never from the body. */
export async function decide(request, env, approve) {
  const user = await requireUser(request, env);
  const body = await readJson(request);
  if (!body || typeof body.device_code !== "string")
    return json({ ok: false, error: "bad_request" }, { status: 400, request, env });

  const rec = await load(env, body.device_code);
  if (!rec || rec.expires < Date.now() || rec.status === "expired")
    return json({ ok: false, status: "expired" }, { request, env });
  if (rec.status !== "pending")
    return json({ ok: false, status: rec.status }, { request, env });

  if (!approve) {
    rec.status = "denied";
    await save(env, rec);
    return json({ ok: true }, { request, env });
  }

  // Entitlement gate. Predicate is open today; the refusal path is live.
  if (!(await hasEntitlement(env, user.userId))) {
    rec.status = "no_license";
    await save(env, rec);
    return json({ ok: false, status: "no_license" }, { request, env });
  }

  const session = await createSession(env, { userId: user.userId, device: rec });
  const tokens = await mintTokens(env, session);

  rec.status = "approved";
  rec.user_id = user.userId;
  rec.session_id = session.session_id;
  rec.grant = {
    ...tokens,
    display_name: user.name || (user.email ? user.email.split("@")[0] : "player"),
    email: user.email,
    role: user.role,
    session_id: session.session_id,
  };
  await save(env, rec);

  return json({ ok: true }, { request, env });
}

/* 4. POST /auth/device/poll — no auth; device_code is the credential. */
export async function poll(request, env) {
  const body = await readJson(request);
  if (!body || typeof body.device_code !== "string")
    return json({ status: "expired" });

  const rec = await load(env, body.device_code);
  if (!rec || rec.expires < Date.now()) return json({ status: "expired" });

  if (rec.status === "denied") return json({ status: "denied" });
  if (rec.status === "no_license") return json({ status: "no_license" });

  if (rec.status === "approved" && rec.grant) {
    // device_code is single-use: dead the instant a token goes out.
    const grant = rec.grant;
    await env.SKILLED.delete(`dc:${rec.device_code}`);
    return json({ status: "approved", ...grant });
  }

  // Polling faster than interval backs the client off; it does not break it.
  const now = Date.now();
  if (rec.last_poll && now - rec.last_poll < POLL_INTERVAL * 1000 - 500)
    return json({ status: "slow_down", interval: POLL_INTERVAL * 2 });

  rec.last_poll = now;
  await save(env, rec);
  return json({ status: "pending" });
}
