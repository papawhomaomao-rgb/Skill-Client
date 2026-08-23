import { newLauncherToken, newRefreshToken, newSessionId, hash } from "./tokens.js";

export const TOKEN_TTL = 3600;           // seconds — launcher refreshes at 75%
const REFRESH_TTL = 60 * 60 * 24 * 30;   // 30 days
const SESSION_TTL = 60 * 60 * 24 * 90;

/* Mint a launcher token + refresh token against a session. Used by approve
   (new session) and by refresh (rotation on an existing one). */
export async function mintTokens(env, session) {
  const token = newLauncherToken();
  const refresh = newRefreshToken();
  const expires = Date.now() + TOKEN_TTL * 1000;

  await env.SKILLED.put(
    `lt:${await hash(token)}`,
    JSON.stringify({ session_id: session.session_id, user_id: session.user_id, expires }),
    { expirationTtl: TOKEN_TTL + 60 }
  );
  await env.SKILLED.put(
    `lr:${await hash(refresh)}`,
    JSON.stringify({ session_id: session.session_id, user_id: session.user_id, used: false }),
    { expirationTtl: REFRESH_TTL }
  );
  return { token, refresh_token: refresh, expires_in: TOKEN_TTL };
}

export async function createSession(env, { userId, device }) {
  const session = {
    session_id: newSessionId(),
    user_id: userId,
    install_id: device.install_id || null,
    device_name: device.device_name || null,
    os: device.os || null,
    client_version: device.client_version || null,
    created: Date.now(),
    last_seen: Date.now(),
    injected: false,
    revoked: false,
  };
  await saveSession(env, session);
  await env.SKILLED.put(`usess:${userId}:${session.session_id}`, "1", { expirationTtl: SESSION_TTL });
  return session;
}

export const saveSession = (env, session) =>
  env.SKILLED.put(`sess:${session.session_id}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });

export async function revokeSession(env, sessionId) {
  const s = await env.SKILLED.get(`sess:${sessionId}`, "json");
  if (!s) return false;
  s.revoked = true;
  s.revoked_at = Date.now();
  await saveSession(env, s);
  return true;
}

export async function listSessions(env, userId) {
  const { keys } = await env.SKILLED.list({ prefix: `usess:${userId}:` });
  const out = [];
  for (const k of keys) {
    const s = await env.SKILLED.get(`sess:${k.name.split(":").pop()}`, "json");
    if (s && !s.revoked) out.push(s);
  }
  return out.sort((a, b) => b.last_seen - a.last_seen);
}
