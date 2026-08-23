import { json, corsHeaders } from "./http.js";
import * as device from "./device.js";
import * as launcher from "./launcher.js";
import * as app from "./app.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const p = url.pathname.replace(/\/+$/, "") || "/";
    const m = request.method;

    if (m === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request, env) });

    try {
      // Device flow — .exe facing (no CORS needed)
      if (p === "/auth/device" && m === "POST") return device.start(request, env);
      if (p === "/auth/device/poll" && m === "POST") return device.poll(request, env);
      if (p === "/auth/launcher/refresh" && m === "POST") return launcher.refresh(request, env);
      if (p === "/api/launcher/heartbeat" && m === "POST") return launcher.heartbeat(request, env);

      // Device flow — link.html facing (CORS)
      if (p === "/auth/device/pending" && m === "GET") return device.pending(request, env, url);
      if (p === "/auth/device/approve" && m === "POST") return device.decide(request, env, true);
      if (p === "/auth/device/deny" && m === "POST") return device.decide(request, env, false);

      // App data — website facing (CORS)
      if (p === "/announcements" && m === "GET") return app.announcements(request, env);
      if (p === "/admin/broadcast" && m === "POST") return app.broadcast(request, env);
      if (p.startsWith("/admin/broadcast/") && m === "DELETE")
        return app.deleteBroadcast(request, env, p.split("/").pop());
      if (p === "/admin/users" && m === "GET") return app.adminUsers(request, env);
      if (p === "/api/sessions" && m === "GET") return app.mySessions(request, env);
      if (p.startsWith("/api/sessions/") && m === "DELETE")
        return app.revoke(request, env, p.split("/").pop());

      if (p === "/health") return json({ ok: true });

      return json({ error: "not_found" }, { status: 404, request, env });
    } catch (e) {
      if (e instanceof Response) {
        const h = corsHeaders(request, env);
        return new Response(e.body, { status: e.status, headers: { ...Object.fromEntries(e.headers), ...h } });
      }
      console.error(e);
      return json({ error: "server_error" }, { status: 500, request, env });
    }
  },
};
