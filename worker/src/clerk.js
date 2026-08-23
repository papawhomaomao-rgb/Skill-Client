import { verifyToken } from "@clerk/backend";
import { hash } from "./tokens.js";

const bearer = request => (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

/* A Clerk session token. Sent by the website and by link.html on approve/deny.
   Throws a Response on failure — the router catches it. */
export async function requireUser(request, env) {
  const token = bearer(request);
  if (!token) throw new Response("Unauthorized", { status: 401 });
  let claims;
  try {
    claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
  } catch {
    throw new Response("Unauthorized", { status: 401 });
  }
  return {
    userId: claims.sub,
    role: claims.public_metadata?.role || "user",
    email: claims.email || claims.primary_email_address || null,
    name: claims.name || claims.username || null,
  };
}

export async function requireDev(request, env) {
  const u = await requireUser(request, env);
  if (u.role !== "dev") throw new Response("Forbidden", { status: 403 });
  return u;
}

/* A launcher token (lt_…). Sent by SkilledInjector.exe only. Opaque — the
   record lives in KV under the token's hash, so a KV dump is not credentials.
   Returns null rather than throwing: heartbeat answers 200 {ok:false,reason}. */
export async function launcherSession(request, env) {
  const token = bearer(request);
  if (!token.startsWith("lt_")) return { reason: "expired" };
  const rec = await env.SKILLED.get(`lt:${await hash(token)}`, "json");
  if (!rec) return { reason: "expired" };
  if (rec.expires < Date.now()) return { reason: "expired" };
  const sess = await env.SKILLED.get(`sess:${rec.session_id}`, "json");
  if (!sess || sess.revoked) return { reason: "revoked" };
  return { session: sess, rec };
}

/* Clerk Backend API — used by /admin/users, which needs the full roster
   including accounts that have never touched the Worker. */
export async function clerkUsers(env, limit = 100) {
  const res = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&order_by=-created_at`, {
    headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
  });
  if (!res.ok) return [];
  return res.json();
}
