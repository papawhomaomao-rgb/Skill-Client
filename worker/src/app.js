import { json, readJson } from "./http.js";
import { requireUser, requireDev, clerkUsers } from "./clerk.js";
import { listSessions, revokeSession } from "./sessions.js";

const nowId = () => "an_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function announcements(request, env) {
  await requireUser(request, env);
  const { keys } = await env.SKILLED.list({ prefix: "ann:" });
  const out = [];
  for (const k of keys) {
    const a = await env.SKILLED.get(k.name, "json");
    if (a) out.push(a);
  }
  out.sort((a, b) => b.at - a.at);
  return json({ ok: true, announcements: out }, { request, env });
}

export async function broadcast(request, env) {
  const dev = await requireDev(request, env);
  const body = await readJson(request);
  const text = body && typeof body.body === "string" ? body.body.trim() : "";
  if (!text) return json({ ok: false, error: "bad_request" }, { status: 400, request, env });

  const rec = { id: nowId(), at: Date.now(), from: dev.name || dev.email || "staff", body: text.slice(0, 2000) };
  await env.SKILLED.put(`ann:${rec.id}`, JSON.stringify(rec));
  return json({ ok: true, ...rec }, { request, env });
}

export async function deleteBroadcast(request, env, id) {
  await requireDev(request, env);
  await env.SKILLED.delete(`ann:${id}`);
  return json({ ok: true }, { request, env });
}

/* Dev dashboard roster: Clerk holds identity, the Worker holds last_seen. */
export async function adminUsers(request, env) {
  await requireDev(request, env);
  const page = await clerkUsers(env);
  const list = Array.isArray(page) ? page : page?.data || [];
  const users = [];
  for (const u of list) {
    const sessions = await listSessions(env, u.id);
    users.push({
      id: u.id,
      email: u.email_addresses?.[0]?.email_address || null,
      role: u.public_metadata?.role || "user",
      createdAt: u.created_at,
      lastSeen: sessions.length ? Math.max(...sessions.map(s => s.last_seen)) : null,
      sessions: sessions.length,
    });
  }
  return json({ ok: true, users }, { request, env });
}

/* Devices tab = active launcher sessions. No HWID, so a row is a session. */
export async function mySessions(request, env) {
  const user = await requireUser(request, env);
  const sessions = (await listSessions(env, user.userId)).map(s => ({
    session_id: s.session_id,
    install_id: s.install_id,
    device_name: s.device_name,
    os: s.os,
    client_version: s.client_version,
    created: s.created,
    last_seen: s.last_seen,
    injected: s.injected,
  }));
  return json({ ok: true, sessions }, { request, env });
}

export async function revoke(request, env, sessionId) {
  const user = await requireUser(request, env);
  const s = await env.SKILLED.get(`sess:${sessionId}`, "json");
  if (!s || (s.user_id !== user.userId && user.role !== "dev"))
    return json({ ok: false }, { status: 403, request, env });
  await revokeSession(env, sessionId);
  return json({ ok: true }, { request, env });
}
