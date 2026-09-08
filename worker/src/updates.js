/* Update delivery. The launcher's only source of Skilled.dll, and of its own
   next version — the payload is no longer embedded in the exe, so a client with
   no session and no entitlement has nothing to inject. See UPDATE-v1.md in the
   client repo for the contract and the reasoning behind it.

   Two routes, both launcher-facing and both paid-only:

     GET /api/update/manifest?channel=…   what to run
     GET /api/update/artifact/<sha256>    the bytes

   The security property worth stating once: the Worker is NOT trusted here. The
   manifest is signed offline with a key that never reaches Cloudflare, and the
   artifact route is addressed by content hash, so the worst this Worker can do
   if it is fully compromised is refuse to serve. It cannot hand the launcher
   bytes the signed manifest did not already name. Every design choice below
   defers to that. */

import { json, rateLimited } from "./http.js";
import { launcherSession } from "./clerk.js";
import { hasEntitlement } from "./entitlement.js";

const HEX64 = /^[0-9a-f]{64}$/;
const CHANNELS = new Set(["stable", "beta"]);

/* Bearer + entitlement, the same pair the heartbeat and the config cloud apply.
   Gating updates on entitlement is what makes a copied exe inert: it can ask,
   and it is told no, and it has no payload of its own to fall back on. */
async function gate(request, env) {
  const { session, reason } = await launcherSession(request, env);
  if (!session) return { reason };
  if (!(await hasEntitlement(env, session.user_id))) return { reason: "no_license" };
  return { session };
}

/* Which channel this request actually gets. Asking for `beta` without the flag
   is answered with stable rather than refused -- a client asking for a channel
   it is not on is not a thing to put in front of a user, and silently serving
   the safe one is what they wanted anyway. */
async function channelFor(env, url, userId) {
  let channel = String(url.searchParams.get("channel") || "stable").toLowerCase();
  if (!CHANNELS.has(channel)) channel = "stable";
  if (channel === "beta" && !(await env.SKILLED.get(`beta:${userId}`))) channel = "stable";
  return channel;
}

/* GET /api/update/manifest?channel=stable — launcher bearer.

   Protocol outcomes are 200 with a status field, as everywhere else the .exe is
   the caller: HttpWebRequest throws on any non-2xx, and "your licence lapsed"
   must not arrive as an exception that the launcher then cannot tell apart from
   the network being down. Those two lead to opposite behaviour -- hard stop
   versus fall back to the cached manifest -- so the distinction has to survive
   the transport.

   On success the body is the stored envelope, returned VERBATIM:

     {"status":"ok","manifest":"<base64 of the manifest JSON>","sig":"<base64>"}

   The signed bytes travel base64-encoded inside a flat JSON object for two
   reasons. Json.Parse in Auth.cs is a flat parser -- it skips nested containers
   and stores an empty string, so a nested shape would fail as silence rather
   than as an error -- and base64 means no JSON serializer anywhere on the path
   can reorder, reindent or re-escape the bytes the signature covers. There is
   no canonicalization rule to get wrong because there is nothing to canonicalize. */
export async function manifest(request, env, url) {
  const { session, reason } = await gate(request, env);
  if (!session) return json({ status: reason });

  const channel = await channelFor(env, url, session.user_id);

  let stored = await env.SKILLED.get(`update:${channel}`);
  if (!stored && channel !== "stable") stored = await env.SKILLED.get("update:stable");
  if (!stored) return json({ status: "unavailable" });

  // Parse to validate, then serve the ORIGINAL string. A malformed publish
  // should read as "nothing to update to" rather than as a manifest the
  // launcher cannot verify and has to guess about.
  try {
    const p = JSON.parse(stored);
    if (!p || typeof p.manifest !== "string" || typeof p.sig !== "string") {
      console.error(`update:${channel} is published but malformed`);
      return json({ status: "unavailable" });
    }
  } catch {
    console.error(`update:${channel} is published but is not JSON`);
    return json({ status: "unavailable" });
  }

  return new Response(stored, {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/* GET /api/update/artifact/<sha256> — launcher bearer.

   Binary, so this one cannot use the 200-with-a-status envelope and uses real
   status codes. That is fine: the download path in the launcher is its own code
   with its own error handling, and a failed download is an error there in a way
   that "waiting for approval" never was.

   The bytes live in KV, under `artifact:<sha256>` in the same namespace as
   everything else. That is a deliberate compromise and not the end state: R2 is
   the right store for binaries, but activating it means a subscription with a
   card on file, and KV needs neither. A 2.4 MB DLL sits well inside KV's 25 MB
   value ceiling, so this works today.

   What it costs, so nobody has to rediscover it: the free plan gives 1 GB of KV
   storage against R2's 10 GB, and nothing here is ever deleted, so at roughly
   5 MB a release the ceiling is a couple of hundred releases away rather than a
   couple of thousand. Moving to R2 later is this function and one line of
   release tooling -- the manifest, the signing, and the contract do not know
   where the bytes came from. */
export async function artifact(request, env, hashHex) {
  const { session, reason } = await gate(request, env);
  if (!session) {
    return json({ error: reason }, { status: reason === "no_license" ? 403 : 401 });
  }

  // Validated before it is interpolated into a key, so a path fragment cannot
  // reach R2. 64 lowercase hex or nothing.
  if (!HEX64.test(String(hashHex || ""))) {
    return json({ error: "bad_hash" }, { status: 400 });
  }

  // Per session, not per IP: a household behind one address is normal, and the
  // thing being protected here is bandwidth, which is a property of the account.
  // A legitimate client fetches each hash once, ever -- two per release -- so
  // twelve an hour is already generous. This costs one KV write per download,
  // which is affordable precisely because downloads are rare; the same limiter
  // on the manifest would not be.
  if (await rateLimited(env, "artifact", session.session_id, 12, 3600)) {
    return json({ error: "rate_limited" }, { status: 429 });
  }

  // Streamed, not buffered. Reading this as an arrayBuffer would hold 2.4 MB of
  // Worker memory per concurrent download to no purpose -- the response is a
  // straight copy of the value and never looks at its contents.
  const body = await env.SKILLED.get(`artifact:${hashHex}`, { type: "stream" });
  if (!body) return json({ error: "not_found" }, { status: 404 });

  return new Response(body, {
    headers: {
      "Content-Type": "application/octet-stream",
      // No Content-Length. The launcher already knows the exact size from the
      // signed manifest and checks it there, alongside the hash, before any of
      // this goes near the payload directory -- so a length header here would
      // be an unsigned claim about bytes that are already accounted for.
      //
      // The value is immutable (its key is its hash) but the URL is bearer
      // gated, so no shared cache should be keeping a copy of the response.
      "Cache-Control": "no-store",
    },
  });
}

/* What the heartbeat reports, and why it is a separate key.

   The heartbeat runs every 15 seconds per client. Reading the full envelope
   there would mean a base64 decode and a JSON parse on the hottest path in the
   Worker to recover one short string. `update:<channel>:version` is that string,
   written at publish time alongside the envelope.

   It is deliberately only a version. The heartbeat response is not signed, so it
   must never be able to steer a download -- all it can do is say that something
   changed, after which the launcher goes and asks the signed endpoint what. */
export async function currentVersion(env, channel) {
  const c = CHANNELS.has(channel) ? channel : "stable";
  return (await env.SKILLED.get(`update:${c}:version`)) || null;
}
