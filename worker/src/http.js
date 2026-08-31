/* Responses, CORS, rate limiting.

   Protocol outcomes are HTTP 200 with a status/ok field in the body — including
   pending, denied, expired, revoked and no_license. The launcher is .NET
   Framework HttpWebRequest, which throws on any non-2xx; "waiting for approval"
   is a normal state and must not arrive as an exception on a 5-second timer.
   Only genuine faults are non-2xx: 400 malformed, 401 bad bearer, 403 not dev,
   500 server. This deviates from RFC 8628 on purpose. */

export function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : (allowed[0] || "*"),
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function json(body, { status = 200, request, env } = {}) {
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  if (request && env) Object.assign(headers, corsHeaders(request, env));
  return new Response(JSON.stringify(body), { status, headers });
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

export const clientIp = request =>
  request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";

/* Best-effort per-IP limiter. KV is eventually consistent, so this is depth,
   not the primary defence — that is 128 bits of entropy on device_code. */
export async function rateLimited(env, bucket, ip, limit, windowSec) {
  const key = `rl:${bucket}:${ip}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const n = parseInt((await env.SKILLED.get(key)) || "0", 10) + 1;

  // Once the count is already past the limit there is nothing left to learn by
  // counting higher, and every further write is one the daily quota does not
  // get back. Stopping here means a client hammering an endpoint costs reads
  // rather than writes -- which matters, because the free tier is 1000 writes
  // a day against 100k reads, so the write budget is what actually falls over.
  if (n > limit + 1) return true;

  await env.SKILLED.put(key, String(n), { expirationTtl: Math.max(60, windowSec * 2) });
  return n > limit;
}
