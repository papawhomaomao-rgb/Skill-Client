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

/* ── who is a developer ──────────────────────────────────────────────────────

   Two ways in, and the second one is why this block exists.

   1. Clerk public_metadata.role === "dev". Granted by hand in the Clerk
      dashboard, per account, and invisible from this repo.

   2. DEV_EMAILS in wrangler.toml — a comma-separated allowlist of verified
      email addresses.

   (1) alone was the original design and it left the dev dashboard permanently
   unreachable: every piece of the developer UI was built and wired, but no
   account anywhere had the metadata key set, so `role` was "user" for
   everybody and DevDashboard never rendered. Worse, it is state that lives
   only in someone else's console — nothing in the repo records who is staff,
   and a wiped metadata field silently locks the owner out of their own
   broadcast tools.

   (2) fixes both: the roster is versioned, reviewable, and restored by a
   redeploy. (1) is kept as the escape hatch for granting dev to someone
   without a deploy.

   VERIFIED is load-bearing. The check is against addresses Clerk has confirmed
   the account actually controls, never a self-asserted one — otherwise signing
   up with an unclaimed allowlisted address would hand over staff. */
const devEmails = env =>
  String(env.DEV_EMAILS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

/* Lowercased addresses Clerk has verified for this account. Unverified rows
   are dropped rather than returned for the caller to filter — the one caller
   that matters must not be able to forget. */
function verifiedEmailsOf(profile) {
  if (!profile || !Array.isArray(profile.email_addresses)) return [];
  return profile.email_addresses
    .filter(e => e?.verification?.status === "verified" && e.email_address)
    .map(e => e.email_address.toLowerCase());
}

/* The real predicate. Takes the user object from requireUser().

   Note that requireUser().role reports only what the TOKEN asserts, because
   resolving the allowlist costs a Clerk Backend API call and every authorised
   request would pay it. So `role` is deliberately not the answer to "is this
   person staff" — this function is. Do not reintroduce `user.role === "dev"`
   as a gate; it silently ignores route (2) above.

   Ordered cheapest first: metadata needs nothing, the JWT email needs nothing
   (present only if a JWT template adds it — most tokens here carry neither),
   and only then does it go to the network. */
export async function isDev(env, user) {
  if (!user || !user.userId) return false;
  if (user.role === "dev") return true;

  const allow = devEmails(env);
  if (!allow.length) return false;
  if (user.email && allow.includes(String(user.email).toLowerCase())) return true;

  const profile = await userProfile(env, user.userId);
  return verifiedEmailsOf(profile).some(e => allow.includes(e));
}

/* Roster-shaped variant: decides the role column in the dev dashboard from a
   Clerk user record that is already in hand, with no further API calls. */
export function roleOfClerkUser(env, u) {
  if (u?.public_metadata?.role === "dev") return "dev";
  const allow = devEmails(env);
  if (allow.length && verifiedEmailsOf(u).some(e => allow.includes(e))) return "dev";
  return u?.public_metadata?.role || "user";
}

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
  if (!(await isDev(env, u))) throw new AuthError("Forbidden", 403);
  // Report the resolved role, not the one the token happened to claim, so a
  // caller that logs or displays it does not contradict the gate it just passed.
  return { ...u, role: "dev" };
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

/* Exact username -> user id. Used by config sharing, which names people the way
   one player names another.

   Deliberately username and nothing else. Falling back to matching an email
   would turn this into an oracle: anyone could type addresses at it and learn
   which ones hold an account here, and the caller does not have to know the
   person for the probe to work. A username is already public — it is the byline
   on every config they post — so confirming one exists gives nothing away.

   Note that a username is OPTIONAL in this Clerk instance (see displayNameOf,
   which falls back to a real name and then to the email local-part). An account
   that never set one simply cannot be shared with, and the caller is told so in
   those terms rather than being left to guess at a spelling that was never
   going to match. */
export async function findUserByUsername(env, username) {
  const want = String(username || "").trim();
  if (!want) return null;
  try {
    const res = await fetch(
      `https://api.clerk.com/v1/users?username=${encodeURIComponent(want)}&limit=5`,
      { headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` } },
    );
    if (!res.ok) {
      console.error("Clerk findUserByUsername failed:", res.status, await res.text());
      return null;
    }
    const list = await res.json();
    if (!Array.isArray(list)) return null;
    // The query parameter filters exactly, but confirm rather than trust: this
    // decides who can read a private config.
    const hit = list.find(u => (u.username || "").toLowerCase() === want.toLowerCase());
    return hit ? { userId: hit.id, username: hit.username } : null;
  } catch (err) {
    console.error("Clerk findUserByUsername error:", err);
    return null;
  }
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
