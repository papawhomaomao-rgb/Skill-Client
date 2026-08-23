import { json, corsHeaders } from "./http.js";
import * as device from "./device.js";
import * as launcher from "./launcher.js";
import * as app from "./app.js";
import { AuthError } from "./clerk.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "") || "/";
    const m = request.method;

    if (m === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    try {
      // Device flow — .exe facing (no CORS needed)
      if (p === "/auth/device" && m === "POST") return await device.start(request, env);
      if (p === "/auth/device/poll" && m === "POST") return await device.poll(request, env);
      if (p === "/auth/launcher/refresh" && m === "POST") return await launcher.refresh(request, env);
      if (p === "/api/launcher/heartbeat" && m === "POST") return await launcher.heartbeat(request, env);

      // Device flow — link.html facing (CORS)
      if (p === "/auth/device/pending" && m === "GET") return await device.pending(request, env, url);
      if (p === "/auth/device/approve" && m === "POST") return await device.decide(request, env, true);
      if (p === "/auth/device/deny" && m === "POST") return await device.decide(request, env, false);

      // App data — website facing (CORS)
      if (p === "/announcements" && m === "GET") return await app.announcements(request, env);
      if (p === "/admin/broadcast" && m === "POST") return await app.broadcast(request, env);
      if (p.startsWith("/admin/broadcast/") && m === "DELETE")
        return await app.deleteBroadcast(request, env, p.split("/").pop());
      if (p === "/admin/users" && m === "GET") return await app.adminUsers(request, env);
      if (p === "/api/sessions" && m === "GET") return await app.mySessions(request, env);
      if (p.startsWith("/api/sessions/") && m === "DELETE")
        return await app.revoke(request, env, p.split("/").pop());

      if (p === "/health") return json({ ok: true });

      return json({ error: "not_found" }, { status: 404, request, env });
    } catch (e) {
      if (e instanceof AuthError || (e && typeof e.status === "number")) {
        return json({ error: e.message || "unauthorized" }, { status: e.status || 401, request, env });
      }
      if (e instanceof Response) {
        return json({ error: e.status === 401 ? "unauthorized" : (e.status === 403 ? "forbidden" : "error") }, { status: e.status, request, env });
      }
      console.error("Worker unhandled error:", e);
      return json({ error: "server_error", message: e?.message || String(e) }, { status: 500, request, env });
    }
  },
};
