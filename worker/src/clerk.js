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

/* The profile behind a verified session.

   requireUser() above reads only what is inside the session JWT, and a stock
   Clerk token carries sub/sid/iat/exp and very little else -- no username, no
   name, no email, no picture, unless someone has hand-built a JWT template that
   adds them. That is why every launcher sign-in came back as "player": the
   fallback chain in device.js was being handed null, null and doing its job.

   So the profile is fetched from the Backend API, keyed by the user id the
   token *did* prove. One extra call, only on the paths that actually need a
   name to show, and it cannot be spoofed by a doctored token. */
export async function userProfile(env, userId) {
  if (!userId) return null;
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
    });
    if (!res.ok) {
      console.error("Clerk userProfile failed:", res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error("Clerk userProfile error:", err);
    return null;
  }
}

/* What the launcher should print next to the avatar.

   Ordered by what a person would recognise as themselves: the handle they
   chose, then the name they gave, then the local part of their email.

   Returns null when it genuinely has nothing, rather than inventing "player".
   That distinction matters on the refresh path, where a Clerk outage would
   otherwise hand every launcher a placeholder and overwrite a name that was
   already correct. Choosing the last-resort label is the caller's job, because
   only the caller knows whether it has an older answer worth keeping. */
export function displayNameOf(profile, fallbackEmail) {
  if (profile) {
    if (profile.username) return profile.username;
    const full = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  const email = primaryEmailOf(profile) || fallbackEmail || "";
  const at = email.indexOf("@");
  if (at > 0) return email.slice(0, at);
  return null;
}

export function primaryEmailOf(profile) {
  if (!profile || !Array.isArray(profile.email_addresses)) return null;
  const list = profile.email_addresses;
  const primary = list.find(e => e.id === profile.primary_email_address_id);
  return (primary || list[0])?.email_address || null;
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
