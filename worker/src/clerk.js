import { verifyToken } from "@clerk/backend";
import { hash } from "./tokens.js";

export class AuthError extends Error {
  constructor(message = "Unauthorized", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const bearer = request => (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

/* A Clerk session token. Sent by the website and by link.html on approve/deny. */
export async function requireUser(request, env) {
  const token = bearer(request);
  if (!token) throw new AuthError("Unauthorized", 401);
  let claims;
  try {
    claims = await verifyToken(token, { secretKey: env.CLERK_SECRET_KEY });
  } catch (err) {
    console.error("Clerk verifyToken error:", err);
    throw new AuthError("Unauthorized", 401);
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
  if (u.role !== "dev") throw new AuthError("Forbidden", 403);
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
