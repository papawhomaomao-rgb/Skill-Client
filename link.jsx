// link.jsx — device linking page the launcher opens in the system browser
const { useState, useEffect, useRef, useCallback } = React;

const LINK_API = "https://skilled-cloud.papawhomaomao.workers.dev";
const DEVICE_CODE = new URLSearchParams(location.search).get("device_code");

/* Set true to exercise the page without a live Worker. */
const DEMO = new URLSearchParams(location.search).has("demo");
const DEMO_DEVICE = {
  status: "pending", match_code: "K7-F92",
  device_name: "PAPAW-PC", os: "Windows 11 (10.0.26200)", client_version: "1.0.0",
  expires_at: Date.now() + 542 * 1000,
};

/* ─────────── small pieces ─────────── */

function Row({ k, v, mono }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 16, alignItems: "baseline", padding: "9px 0", borderTop: "1px solid var(--line)" }}>
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--fg-3)" }}>{k}</span>
      <span className={mono ? "mono" : undefined} style={{ fontSize: 13.5, color: "var(--fg-1)", wordBreak: "break-all" }}>{v}</span>
    </div>
  );
}

function MatchCode({ code }) {
  return (
    <div style={{ padding: "18px 20px", borderRadius: 12, background: "var(--acc-soft)", border: "1px solid var(--acc-line)", display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--acc)", marginBottom: 7 }}>
          Confirm this matches your launcher
        </div>
        <p className="small" style={{ color: "var(--fg-2)" }}>
          This code must match the one shown in the Skilled window on your PC.
          If it doesn't, do not approve — someone else sent you this link.
        </p>
      </div>
      <span className="mono" style={{ fontSize: 30, fontWeight: 500, letterSpacing: ".06em", color: "var(--fg)", flexShrink: 0 }}>{code}</span>
    </div>
  );
}

function Countdown({ until }) {
  const [left, setLeft] = useState(Math.max(0, until - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, until - Date.now())), 1000);
    return () => clearInterval(id);
  }, [until]);
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return <span className="mono">{m}:{String(s).padStart(2, "0")}</span>;
}

function Shell({ children, footer }) {
  return (
    <>
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <a href="index.html" className="brand" style={{ marginBottom: 26, display: "inline-flex" }}>
            <div className="brand-mark"></div>Skilled
          </a>
          <div className="card" style={{ padding: 30 }}>{children}</div>
          {footer !== false && (
            <p className="small dim" style={{ textAlign: "center", marginTop: 18 }}>
              Opened by the Skilled launcher. You can close this tab once linking finishes.
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function Status({ tone, title, body, action }) {
  const c = tone === "bad" ? "oklch(0.70 0.21 25)" : tone === "good" ? "oklch(0.78 0.19 148)" : "var(--fg-2)";
  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 20px", display: "grid", placeItems: "center", background: `color-mix(in oklab, ${c} 14%, transparent)`, border: `1px solid color-mix(in oklab, ${c} 34%, transparent)` }}>
        {tone === "good" ? (
          <svg viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="2" style={{ width: 22, height: 22 }}><path d="m4 10 4 4 8-8" /></svg>
        ) : tone === "bad" ? (
          <svg viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.8" style={{ width: 22, height: 22 }}><circle cx="10" cy="10" r="7.5" /><path d="M10 6v5M10 13.5v.5" /></svg>
        ) : (
          <svg viewBox="0 0 20 20" fill="none" stroke={c} strokeWidth="1.6" style={{ width: 22, height: 22 }}><circle cx="10" cy="10" r="7.5" /><path d="M10 6v4l3 2" /></svg>
        )}
      </div>
      <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>{title}</h1>
      <p className="body" style={{ marginTop: 10 }}>{body}</p>
      {action}
    </div>
  );
}

/* ─────────── page ─────────── */

function LinkPage() {
  const [clerk, setClerk] = useState(null);
  const [user, setUser] = useState(null);
  const [clerkFailed, setClerkFailed] = useState(false);
  const [device, setDevice] = useState(null);
  const [phase, setPhase] = useState("loading"); // loading | need-auth | review | approved | denied | error
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signInSlot = useRef(null);

  /* Clerk */
  useEffect(() => {
    let alive = true;
    (window.__clerkReady || Promise.reject(new Error("no clerk")))
      .then(c => {
        if (!alive) return;
        setClerk(c); setUser(c.user || null);
        c.addListener(({ user: u }) => { if (alive) setUser(u || null); });
      })
      .catch(() => { if (alive) setClerkFailed(true); });
    return () => { alive = false; };
  }, []);

  /* Load the pending request. Contract v1: every protocol outcome is HTTP 200,
     discriminated on `status`. An unknown device_code answers "expired". */
  const load = useCallback(async () => {
    if (!DEVICE_CODE) { setPhase("error"); setError("missing"); return; }
    if (DEMO) { setDevice(DEMO_DEVICE); return; }
    try {
      const r = await fetch(`${LINK_API}/auth/device/pending?device_code=${encodeURIComponent(DEVICE_CODE)}`);
      const d = await r.json().catch(() => null);
      if (!r.ok || !d || !d.status) { setPhase("error"); setError("offline"); return; }
      if (d.status === "expired") { setPhase("error"); setError("expired"); return; }
      if (d.status === "denied") { setPhase("denied"); return; }
      if (d.status === "no_license") { setPhase("no-license"); return; }
      if (d.status === "approved") { setPhase("approved"); return; }
      setDevice({ ...d, expires_at: d.expires_in ? Date.now() + d.expires_in * 1000 : null });
    } catch (e) {
      setPhase("error"); setError("offline");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Decide phase once both Clerk and the device record settle */
  useEffect(() => {
    if (phase === "approved" || phase === "denied" || phase === "error") return;
    if (!device) return;
    if (clerkFailed) { setPhase("error"); setError("clerk"); return; }
    if (!clerk) return;
    setPhase(user ? "review" : "need-auth");
  }, [device, clerk, user, clerkFailed, phase]);

  /* Mount Clerk sign-in when unauthenticated */
  useEffect(() => {
    if (phase !== "need-auth" || !clerk || !signInSlot.current) return;
    const node = signInSlot.current;
    clerk.mountSignIn(node, { appearance: window.clerkAppearance ? window.clerkAppearance() : undefined, routing: "virtual" });
    return () => { try { clerk.unmountSignIn(node); } catch (e) {} };
  }, [phase, clerk]);

  const decide = async (approve) => {
    setBusy(true); setError("");
    if (DEMO) {
      await new Promise(r => setTimeout(r, 700));
      setPhase(approve ? "approved" : "denied"); setBusy(false); return;
    }
    try {
      const token = clerk.session ? await clerk.session.getToken() : null;
      const r = await fetch(`${LINK_API}/auth/device/${approve ? "approve" : "deny"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ device_code: DEVICE_CODE }),
      });
      const d = await r.json().catch(() => null);
      if (d && d.ok) {
        setPhase(approve ? "approved" : "denied");
      } else if (d && d.status === "no_license") {
        setPhase("no-license");
      } else if (d && d.status === "expired") {
        // timed out between page load and click
        setPhase("error"); setError("expired");
      } else if (r.status === 401) {
        setError("Your sign-in expired. Reload this page and sign in again.");
      } else {
        setError("Could not complete that. Restart the launcher and try again.");
      }
    } catch (e) {
      setError("Network error. Check your connection and try again.");
    }
    setBusy(false);
  };

  /* ── render ── */

  if (phase === "loading") {
    return <Shell><Status title="Checking the request…" body="One moment while we look up the device that opened this page." /></Shell>;
  }

  if (phase === "error") {
    const copy = {
      missing: ["No launcher request", "This page is opened by the Skilled launcher. Start the launcher and it will bring you back here."],
      expired: ["This link has expired", "Sign-in links are valid for ten minutes. Restart the Skilled launcher to get a fresh one."],
      offline: ["Can't reach Skilled", "We couldn't talk to the sign-in service. Check your connection, then reload this page."],
      clerk:   ["Sign-in unavailable", "The authentication service failed to load. Disable any script blockers for this page and reload."],
    }[error] || ["Something went wrong", "Restart the Skilled launcher and try again."];
    return <Shell><Status tone="bad" title={copy[0]} body={copy[1]} action={
      <a href="index.html" className="btn btn-ghost" style={{ marginTop: 22 }}>Back to skilled.gg</a>
    } /></Shell>;
  }

  if (phase === "approved") {
    return <Shell><Status tone="good" title="Launcher signed in" body="You're all set. The launcher will pick this up in a few seconds — you can close this tab." action={
      <div style={{ marginTop: 22, display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>
        <a href="index.html" className="btn btn-primary">Open dashboard</a>
      </div>
    } /></Shell>;
  }

  if (phase === "no-license") {
    return (
      <Shell>
        <Status
          tone="bad"
          title="No active licence on this account"
          body={`${user?.primaryEmailAddress?.emailAddress || "This account"} doesn't have a Skilled licence yet, so the launcher can't be signed in. Once a licence is active, restart the launcher and this will go through.`}
          action={
            <div style={{ marginTop: 22, display: "flex", gap: 9, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="/pricing" className="btn btn-primary">Get a licence</a>
              <a href="index.html" className="btn btn-ghost">Open dashboard</a>
            </div>
          }
        />
      </Shell>
    );
  }

  if (phase === "denied") {
    return <Shell><Status tone="bad" title="Request denied" body="No token was issued and nothing was signed in. If you didn't start this, you can safely ignore it." action={
      <a href="index.html" className="btn btn-ghost" style={{ marginTop: 22 }}>Back to skilled.gg</a>
    } /></Shell>;
  }

  if (phase === "need-auth") {
    return (
      <Shell>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: "-.02em", margin: "0 0 8px" }}>Sign in to continue</h1>
          <p className="body">Your launcher is waiting. Sign in and we'll show you what it's asking to approve.</p>
        </div>
        <div ref={signInSlot} />
      </Shell>
    );
  }

  /* review */
  return (
    <Shell>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.022em", margin: "0 0 8px" }}>Sign in this launcher?</h1>
        <p className="body">
          Signed in as <span style={{ color: "var(--fg-1)" }}>{user.primaryEmailAddress?.emailAddress}</span>.
          Approving signs the Skilled launcher below into your account.
        </p>
      </div>

      {device.match_code && <div style={{ marginBottom: 22 }}><MatchCode code={device.match_code} /></div>}

      <div style={{ marginBottom: 22 }}>
        {device.device_name && <Row k="Computer" v={device.device_name} />}
        {device.os && <Row k="System" v={device.os} />}
        {device.client_version && <Row k="Client" v={`Skilled ${device.client_version}`} />}
        {device.expires_at && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 0", borderTop: "1px solid var(--line)", marginTop: 2 }}>
            <span className="small dim">Request expires in</span>
            <span className="small" style={{ color: "var(--fg-1)" }}><Countdown until={device.expires_at} /></span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: "11px 14px", borderRadius: 9, marginBottom: 16, background: "oklch(0.30 0.10 25 / 0.16)", border: "1px solid oklch(0.62 0.18 25 / 0.4)", color: "oklch(0.86 0.12 25)", fontSize: 13 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 9 }}>
        <button className="btn btn-ghost" style={{ flex: 1 }} disabled={busy} onClick={() => decide(false)}>Deny</button>
        <button className="btn btn-primary" style={{ flex: 2 }} disabled={busy} onClick={() => decide(true)}>
          {busy ? "Signing in…" : "Approve and sign in"}
        </button>
      </div>

      <p className="small dim" style={{ marginTop: 16, textAlign: "center" }}>
        Didn't open this from your own launcher? Deny the request and change your password.
      </p>
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<LinkPage />);
