/* Config cloud — storage and sharing for client configs.

   Two kinds of caller reach these routes and they authenticate differently:

     the launcher   Bearer lt_…  — an opaque launcher token. This is how a
                    config posted from inside the game arrives: the DLL has no
                    network stack and no credential (see session.h), so it hands
                    the request down the pipe and SkilledInjector.exe makes the
                    call with the token it already holds.

     the website    Bearer <Clerk JWT> — someone browsing configs on the site.

   Both collapse to a user id, which is all the rest of this file cares about.

   Storage is three keys per config, because KV can only scan by prefix and
   listing must not cost one read per row:

     cfg:<id>            the record itself, body included
     cfgu:<owner>:<id>   owner index — empty value, summary in the metadata
     cfgp:<id>           public index — same, and only written when public
     cfgs:<user>:<id>    shared-with index — one key per person it is shared
                         with, so "shared with me" is a prefix list like the
                         other two rather than a scan of every config on the
                         service asking whether it names you

   The summary rides in KV metadata so a browse is one list() call rather than
   N gets. Metadata is capped at 1 KiB per key by KV, which is why only the
   four fields a row actually draws go in there. */

import { json, readJson } from "./http.js";
import {
  launcherSession, requireUser, userProfile, displayNameOf,
  findUserByUsername, AuthError,
} from "./clerk.js";
import { hasEntitlement } from "./entitlement.js";

const VISIBILITIES = ["public", "unlisted", "private"];

/* Deliberately generous on body: a config is key=value lines and even a fully
   populated one is a few KB. The cap is here to stop a bug or an abusive client
   filling KV, not to constrain real use. */
const MAX_NAME = 64;
const MAX_DESC = 512;
const MAX_BODY = 128 * 1024;
const MAX_PER_USER = 200;
const BROWSE_LIMIT = 100;
/* Sharing is "a few people I play with", not distribution -- that is what
   public is for. The cap also bounds the fan-out when a config is deleted,
   which has to clear one index key per name on the list. */
const MAX_SHARES = 50;

const HEX = "0123456789abcdef";
function newConfigId() {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += HEX[x >> 4] + HEX[x & 15];
  return s;
}

/* Whoever is calling, as a user id plus a name to stamp on new configs.

   The launcher token is tried first and its failure is not fatal, because a
   Clerk JWT is equally valid here -- only once neither matches is this a 401.
   Entitlement is checked on the launcher path for the same reason the heartbeat
   checks it: a lapsed licence should stop working everywhere at once. */
async function actor(request, env) {
  const raw = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();

  if (raw.startsWith("lt_")) {
    const { session } = await launcherSession(request, env);
    if (!session) throw new AuthError("Unauthorized", 401);
    if (!(await hasEntitlement(env, session.user_id))) throw new AuthError("Forbidden", 403);
    return { userId: session.user_id };
  }

  const user = await requireUser(request, env);
  return { userId: user.userId, fallbackEmail: user.email };
}

/* The name stamped on a config at creation, resolved once and then frozen into
   the record. Renaming yourself in Clerk does not retroactively rewrite the
   byline on configs you already posted, which is the same bargain every forum
   makes and avoids a profile fetch per row on every browse. */
async function authorName(env, a) {
  const profile = await userProfile(env, a.userId);
  return displayNameOf(profile, a.fallbackEmail) || "anonymous";
}

const summaryOf = rec => ({
  id: rec.id,
  name: rec.name,
  author: rec.author,
  visibility: rec.visibility,
  description: rec.description,
  created: rec.created,
  // Just the count. The names themselves are a separate call: they are only
  // wanted on the one config being looked at, and KV caps this metadata at
  // 1 KiB, which fifty usernames would not fit inside.
  shares: sharesOf(rec).length,
});

/* Always an array, whatever the record predates. Every config written before
   sharing existed has no `shared` field at all, and this is the only place that
   has to know it. */
const sharesOf = rec => (Array.isArray(rec.shared) ? rec.shared : []);

/* What the three sharing routes all answer with: the list as it now stands,
   names only. The caller's next move after granting or revoking is always to
   redraw this, so returning it saves a second round trip from a game client
   that has to go through the launcher for every one of them. */
const shareNames = rec => sharesOf(rec).map(s => ({ username: s.username }));

/* Who may read the body.

   Unlisted is deliberately not an ACL: holding the id IS the permission, and
   that is what the word means here. Private is owner plus the named list. */
function canRead(rec, userId) {
  if (rec.visibility !== "private") return true;
  if (userId && userId === rec.owner) return true;
  return sharesOf(rec).some(s => s.id === userId);
}

/* Rewrites every index that points at this record.

   Called after any change to visibility or the share list, because the summary
   the indexes carry in their metadata contains both -- a row left behind with
   stale metadata is a row that draws the wrong badge, or worse, a config that
   still appears in the public browse after being made private.

   `before` is the share list as it was, so names dropped from it can have their
   index key removed. Pass the current list on create, where nothing was. */
async function reindex(env, rec, before = []) {
  const meta = summaryOf(rec);
  const now = sharesOf(rec);

  await env.SKILLED.put(`cfgu:${rec.owner}:${rec.id}`, "", { metadata: meta });

  if (rec.visibility === "public") await env.SKILLED.put(`cfgp:${rec.id}`, "", { metadata: meta });
  else                             await env.SKILLED.delete(`cfgp:${rec.id}`);

  for (const s of before)
    if (!now.some(n => n.id === s.id)) await env.SKILLED.delete(`cfgs:${s.id}:${rec.id}`);
  for (const s of now)
    await env.SKILLED.put(`cfgs:${s.id}:${rec.id}`, "", { metadata: meta });
}

/* POST /api/configs — create. */
export async function create(request, env) {
  const a = await actor(request, env);
  const body = (await readJson(request)) || {};

  const name = String(body.name || "").trim().slice(0, MAX_NAME);
  if (!name) return json({ ok: false, error: "A config needs a name." }, { status: 400, request, env });

  const text = typeof body.body === "string" ? body.body : "";
  if (!text) return json({ ok: false, error: "The config was empty." }, { status: 400, request, env });
  if (text.length > MAX_BODY)
    return json({ ok: false, error: "That config is too large to upload." }, { status: 400, request, env });

  // Accepts the index the client sends (0/1/2) or the word, so the wire format
  // can carry whichever is natural at the call site.
  let visibility = "public";
  if (typeof body.visibility === "number") visibility = VISIBILITIES[body.visibility & 3] || "public";
  else if (typeof body.visibility === "string" && VISIBILITIES.includes(body.visibility)) visibility = body.visibility;

  const owned = await env.SKILLED.list({ prefix: `cfgu:${a.userId}:`, limit: MAX_PER_USER + 1 });
  if (owned.keys.length > MAX_PER_USER)
    return json({ ok: false, error: `You can store ${MAX_PER_USER} configs. Delete one first.` }, { status: 400, request, env });

  const rec = {
    id: newConfigId(),
    owner: a.userId,
    author: await authorName(env, a),
    name,
    description: String(body.description || "").slice(0, MAX_DESC),
    visibility,
    shared: [],
    body: text,
    created: Date.now(),
    updated: Date.now(),
  };

  await env.SKILLED.put(`cfg:${rec.id}`, JSON.stringify(rec));
  await reindex(env, rec);

  return json({ ok: true, ...summaryOf(rec) }, { request, env });
}

/* GET /api/configs?search= — the public browse.

   Search is a substring match done here rather than in KV, which has no query
   language. At the scale this list is drawn at that is the right trade; if it
   ever stops being one, the answer is an index, not a bigger list(). */
export async function listPublic(request, env, url) {
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const listed = await env.SKILLED.list({ prefix: "cfgp:", limit: 1000 });

  const items = listed.keys
    .map(k => k.metadata)
    .filter(Boolean)
    .filter(m => !search || String(m.name || "").toLowerCase().includes(search))
    .sort((x, y) => (y.created || 0) - (x.created || 0))
    .slice(0, BROWSE_LIMIT);

  return json({ ok: true, items }, { request, env });
}

/* GET /api/configs/mine — everything the caller owns, all visibilities. */
export async function listMine(request, env) {
  const a = await actor(request, env);
  const listed = await env.SKILLED.list({ prefix: `cfgu:${a.userId}:`, limit: 1000 });

  const items = listed.keys
    .map(k => k.metadata)
    .filter(Boolean)
    .sort((x, y) => (y.created || 0) - (x.created || 0));

  return json({ ok: true, items }, { request, env });
}

/* GET /api/configs/shared — everything shared WITH the caller.

   Sits on its own index, so this is one list() like /mine rather than a scan of
   the service. Must be routed before the /<id> catch-all. */
export async function listSharedWithMe(request, env) {
  const a = await actor(request, env);
  const listed = await env.SKILLED.list({ prefix: `cfgs:${a.userId}:`, limit: 1000 });

  const items = listed.keys
    .map(k => k.metadata)
    .filter(Boolean)
    .sort((x, y) => (y.created || 0) - (x.created || 0));

  return json({ ok: true, items }, { request, env });
}

/* GET /api/configs/<id> — the record, body included.

   Private configs are readable by their owner and by anyone on the share list.
   Unlisted ones are readable by anyone holding the id, which is what "unlisted"
   means: the id is the capability, and it is 64 bits of entropy rather than a
   guessable counter. */
export async function get(request, env, id) {
  const rec = await env.SKILLED.get(`cfg:${id}`, "json");
  if (!rec) return json({ ok: false, error: "That config no longer exists." }, { status: 404, request, env });

  if (rec.visibility === "private") {
    const a = await actor(request, env);
    if (!canRead(rec, a.userId))
      return json({ ok: false, error: "That config is private." }, { status: 403, request, env });
  }

  return json({ ok: true, ...summaryOf(rec), body: rec.body }, { request, env });
}

/* PATCH /api/configs/<id> — owner only. Visibility, name and description.

   The body is not editable here on purpose: re-uploading is what changes a
   config's contents, and letting a PATCH swap the body underneath people it is
   already shared with is a different, more surprising thing than renaming it. */
export async function update(request, env, id) {
  const a = await actor(request, env);
  const rec = await env.SKILLED.get(`cfg:${id}`, "json");
  if (!rec) return json({ ok: false, error: "That config no longer exists." }, { status: 404, request, env });
  if (rec.owner !== a.userId)
    return json({ ok: false, error: "That is not your config." }, { status: 403, request, env });

  const body = (await readJson(request)) || {};

  if (body.visibility !== undefined) {
    let v = null;
    if (typeof body.visibility === "number") v = VISIBILITIES[body.visibility & 3] || null;
    else if (typeof body.visibility === "string" && VISIBILITIES.includes(body.visibility)) v = body.visibility;
    if (!v) return json({ ok: false, error: "Unknown visibility." }, { status: 400, request, env });
    rec.visibility = v;
  }
  if (typeof body.name === "string") {
    const n = body.name.trim().slice(0, MAX_NAME);
    if (!n) return json({ ok: false, error: "A config needs a name." }, { status: 400, request, env });
    rec.name = n;
  }
  if (typeof body.description === "string") rec.description = body.description.slice(0, MAX_DESC);

  rec.updated = Date.now();
  await env.SKILLED.put(`cfg:${id}`, JSON.stringify(rec));
  // The share list is unchanged, so it is its own `before`: reindex still has
  // to run, because the visibility in every index's metadata just moved.
  await reindex(env, rec, sharesOf(rec));

  return json({ ok: true, ...summaryOf(rec) }, { request, env });
}

/* GET /api/configs/<id>/shares — who it is shared with. Owner only.

   Kept off the summary metadata deliberately: fifty usernames do not fit in the
   1 KiB KV allows, and the list is only ever wanted for the one config actually
   open in front of someone. */
export async function listShares(request, env, id) {
  const a = await actor(request, env);
  const rec = await env.SKILLED.get(`cfg:${id}`, "json");
  if (!rec) return json({ ok: false, error: "That config no longer exists." }, { status: 404, request, env });
  if (rec.owner !== a.userId)
    return json({ ok: false, error: "That is not your config." }, { status: 403, request, env });

  return json({ ok: true, items: shareNames(rec) }, { request, env });
}

/* POST /api/configs/<id>/shares — grant one username. Owner only.

   The username is stored beside the id it resolved to. The id is what the
   permission check uses, because it is the thing that cannot be reassigned;
   the username is kept only so the list can be drawn back without a Clerk
   lookup per row. If someone later renames themselves, the grant follows the
   account and the label goes stale -- the same bargain the author byline makes
   at the top of this file. */
export async function addShare(request, env, id) {
  const a = await actor(request, env);
  const rec = await env.SKILLED.get(`cfg:${id}`, "json");
  if (!rec) return json({ ok: false, error: "That config no longer exists." }, { status: 404, request, env });
  if (rec.owner !== a.userId)
    return json({ ok: false, error: "That is not your config." }, { status: 403, request, env });

  const body = (await readJson(request)) || {};
  const username = String(body.username || "").trim();
  if (!username) return json({ ok: false, error: "Type a username to share with." }, { status: 400, request, env });

  const found = await findUserByUsername(env, username);
  if (!found)
    return json({ ok: false, error: `No account with the username "${username}".` }, { status: 404, request, env });
  if (found.userId === rec.owner)
    return json({ ok: false, error: "That config is already yours." }, { status: 400, request, env });

  const before = sharesOf(rec);
  if (before.some(s => s.id === found.userId))
    return json({ ok: true, items: shareNames(rec) }, { request, env });  // already there; not an error
  if (before.length >= MAX_SHARES)
    return json({ ok: false, error: `A config can be shared with ${MAX_SHARES} people.` }, { status: 400, request, env });

  rec.shared = [...before, { id: found.userId, username: found.username }];
  rec.updated = Date.now();
  await env.SKILLED.put(`cfg:${id}`, JSON.stringify(rec));
  await reindex(env, rec, before);

  return json({ ok: true, items: shareNames(rec) }, { request, env });
}

/* DELETE /api/configs/<id>/shares/<username> — revoke one. Owner only. */
export async function removeShare(request, env, id, username) {
  const a = await actor(request, env);
  const rec = await env.SKILLED.get(`cfg:${id}`, "json");
  if (!rec) return json({ ok: false, error: "That config no longer exists." }, { status: 404, request, env });
  if (rec.owner !== a.userId)
    return json({ ok: false, error: "That is not your config." }, { status: 403, request, env });

  // Matched on the stored username rather than by resolving it again: revoking
  // has to keep working for an account that has since been renamed or deleted,
  // which is exactly when a fresh lookup would fail.
  const want = String(username || "").trim().toLowerCase();
  const before = sharesOf(rec);
  rec.shared = before.filter(s => (s.username || "").toLowerCase() !== want);
  rec.updated = Date.now();

  await env.SKILLED.put(`cfg:${id}`, JSON.stringify(rec));
  await reindex(env, rec, before);

  return json({ ok: true, items: shareNames(rec) }, { request, env });
}

/* DELETE /api/configs/<id> — owner only.

   Deletes the indexes first. If this fails halfway the record is orphaned but
   invisible, which is the harmless direction; the other order would leave a row
   in the browse list pointing at nothing. */
export async function remove(request, env, id) {
  const a = await actor(request, env);
  const rec = await env.SKILLED.get(`cfg:${id}`, "json");
  if (!rec) return json({ ok: true }, { request, env });
  if (rec.owner !== a.userId)
    return json({ ok: false, error: "That is not your config." }, { status: 403, request, env });

  await env.SKILLED.delete(`cfgp:${id}`);
  // Every recipient's index key, or the config haunts their "Shared with me"
  // list forever -- a row that lists fine from metadata and 404s on open,
  // which is the one failure this index layout can produce on its own.
  for (const s of sharesOf(rec)) await env.SKILLED.delete(`cfgs:${s.id}:${id}`);
  await env.SKILLED.delete(`cfgu:${rec.owner}:${id}`);
  await env.SKILLED.delete(`cfg:${id}`);

  return json({ ok: true }, { request, env });
}
