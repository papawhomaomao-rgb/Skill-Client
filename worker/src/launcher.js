import { json, readJson } from "./http.js";
import { launcherSession, userProfile, displayNameOf, primaryEmailOf } from "./clerk.js";
import { hasEntitlement } from "./entitlement.js";
import { hash } from "./tokens.js";
import { mintTokens, saveSession, revokeSession } from "./sessions.js";

/* 5. POST /auth/launcher/refresh — no bearer; the refresh token is the
   credential. Rotates on every use. A refresh token presented twice is either
   a replay or a theft, and both mean the session is compromised: kill it. */
export async function refresh(request, env) {
  const body = await readJson(request);
  const rt = body && typeof body.refresh_token === "string" ? body.refresh_token : "";
  if (!rt.startsWith("lr_")) return json({ status: "revoked" });

  const key = `lr:${await hash(rt)}`;
  const rec = await env.SKILLED.get(key, "json");
  if (!rec) return json({ status: "revoked" });

  if (rec.used) {
    await revokeSession(env, rec.session_id);
    return json({ status: "revoked" });
  }

  const session = await env.SKILLED.get(`sess:${rec.session_id}`, "json");
  if (!session || session.revoked) return json({ status: "revoked" });
  if (!(await hasEntitlement(env, session.user_id))) return json({ status: "revoked" });

  rec.used = true;
  await env.SKILLED.put(key, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 });

  const tokens = await mintTokens(env, session);

  // The profile rides along with the rotated tokens.
  //
  // A launcher only learns its user's name and picture once, at approve time,
  // and then keeps showing whatever it was told until somebody links again.
  // Returning them here means a name that was wrong -- or a picture the user
  // has since changed -- corrects itself at the next refresh instead of
  // requiring a sign-out. Once an hour per session, which is nothing.
  //
  // A null field reads as "no change" on the launcher side, so a Clerk outage
  // leaves whatever is already on screen alone rather than replacing a correct
  // name with a placeholder.
  const profile = await userProfile(env, session.user_id);
  const name = displayNameOf(profile, null);

  return json({
    status: "ok",
    ...tokens,
    display_name: name,
    email: primaryEmailOf(profile),
    avatar_url: profile?.image_url || null,
  });
}

/* 6. POST /api/launcher/heartbeat — launcher bearer, every 15s.
   revoked → the launcher ejects the DLL immediately. expired → refresh and
   resume; not a revoke. no_license → eject, but say it was the licence.

   Note the 7-day offline grace on the client side: a revoke takes effect the
   next time that machine reaches this Worker, not within 15 seconds. */
export async function heartbeat(request, env) {
  const { session, reason } = await launcherSession(request, env);
  if (!session) return json({ ok: false, reason });

  if (!(await hasEntitlement(env, session.user_id))) return json({ ok: false, reason: "no_license" });

  const body = (await readJson(request)) || {};
  session.last_seen = Date.now();
  session.injected = !!body.injected;
  if (body.client_version) session.client_version = String(body.client_version).slice(0, 32);
  if (body.install_id && !session.install_id) session.install_id = String(body.install_id).slice(0, 64);
  await saveSession(env, session);

  return json({ ok: true });
}
