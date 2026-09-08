// dashboard.jsx — user + developer dashboards
const { useState, useMemo, useEffect, useRef, useCallback } = React;

/* ─── shared chrome ─── */

function fmtTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = (now - ts) / 1000;
  if (diff < 60)      return "just now";
  if (diff < 3600)    return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)   return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400*7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function DashShell({ auth, onLeave, tab, setTab, tabs, children }) {
  const initials = (auth.email || "?").slice(0, 2).toUpperCase();
  const handle = auth.email ? auth.email.split("@")[0] : "";
  return (
    <div className="dash-root">
      <aside className="dash-side">
        <div className="dash-side-brand">
          <div className="brand-mark" style={{ width: 28, height: 28, fontSize: 14 }}>S</div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.02em" }}>Skill</span>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.11em", marginTop: 3 }}>
              {auth.role === "dev" ? "DEVELOPER" : "ACCOUNT"}
            </span>
          </div>
        </div>

        <nav className="dash-nav">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? "active" : ""}>
              <DashIcon name={t.icon} />
              <span>{t.label}</span>
              {t.badge != null && <span className="dash-badge">{t.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="dash-side-foot">
          <button className="dash-link" onClick={onLeave}>
            <DashIcon name="back" />
            <span>Back to site</span>
          </button>
          <div className="dash-user">
            <span className="dash-avatar">{initials}</span>
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 12.5, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{handle}</span>
              <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.email}</span>
            </div>
            <button onClick={auth.signOut} title="Sign out" style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: "transparent", border: "1px solid var(--line)",
              color: "var(--fg-3)", display: "grid", placeItems: "center",
            }}>
              <DashIcon name="signout" size={12} />
            </button>
          </div>
        </div>
      </aside>

      <main className="dash-main">{children}</main>
    </div>
  );
}

function DashIcon({ name, size = 14 }) {
  const props = {
    viewBox: "0 0 16 16", fill: "none", stroke: "currentColor",
    strokeWidth: 1.5, style: { width: size, height: size, flexShrink: 0 },
  };
  switch (name) {
    case "home":     return <svg {...props}><path d="M2 7l6-5 6 5v7H2z"/></svg>;
    case "inbox":    return <svg {...props}><path d="M2 9l2-6h8l2 6v4H2zM2 9h4l1 2h2l1-2h4"/></svg>;
    case "users":    return <svg {...props}><circle cx="6" cy="6" r="2.5"/><path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4M11 7a2 2 0 100-4M11 13c0-1.5-.6-2.8-1.5-3.5a4 4 0 015 3.5"/></svg>;
    case "compose":  return <svg {...props}><path d="M2 13l1.5-4 7-7 3 3-7 7L2 13zM9 4l3 3"/></svg>;
    case "license":  return <svg {...props}><circle cx="5" cy="8" r="2.2"/><path d="M7.2 8h6m-2.5 0v2.5m2.5-2.5v3.2"/></svg>;
    case "device":   return <svg {...props}><rect x="2.5" y="3" width="11" height="7" rx="1"/><path d="M5 13h6M8 10v3"/></svg>;
    case "download": return <svg {...props}><path d="M8 2v7.5M5 7l3 3 3-3M3 13h10"/></svg>;
    case "cog":      return <svg {...props}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4"/></svg>;
    case "back":     return <svg {...props}><path d="M10 3L4 8l6 5"/></svg>;
    case "signout":  return <svg {...props}><path d="M9 3H4v10h5M11 5l3 3-3 3M14 8H7"/></svg>;
    case "send":     return <svg {...props} fill="currentColor" stroke="none"><path d="M2 8l12-5-4 12-2-5z"/></svg>;
    case "bolt":     return <svg {...props}><path d="M9 2L4 9h4l-1 5 5-7H8z" fill="currentColor"/></svg>;
    case "shield":   return <svg {...props}><path d="M8 1.5L3 3v5c0 3 2.2 5.5 5 6.5 2.8-1 5-3.5 5-6.5V3z"/></svg>;
    case "buy":      return <svg {...props}><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M2.5 6.5h11M5.5 9.5h2.5"/></svg>;
    default:         return null;
  }
}

/* ─── USER dashboard ─── */

function UserDashboard({ auth, leave, onBuy, initialTab, justPurchased }) {
  const ann = useAnnouncements();
  const [tab, setTab] = useState(initialTab || "inbox");

  const tabs = [
    { id: "inbox",   label: "Announcements", icon: "inbox", badge: ann.list.length || null },
    { id: "buy",     label: "Buy",           icon: "buy" },
    { id: "license", label: "License",       icon: "license" },
    { id: "download",label: "Download",      icon: "download" },
    { id: "devices", label: "Devices",       icon: "device" },
    { id: "security",label: "Security",      icon: "shield" },
  ];

  const handleBuy = () => setTab("buy");

  return (
    <DashShell auth={auth} onLeave={leave} tab={tab} setTab={setTab} tabs={tabs}>
      {tab === "inbox"    && <UserInbox list={ann.list} email={auth.email} />}
      {tab === "buy"      && <UserBuy auth={auth} />}
      {tab === "license"  && <UserLicense onBuy={handleBuy} justPurchased={justPurchased} />}
      {tab === "download" && <UserDownload onBuy={handleBuy} />}
      {tab === "devices"  && <UserDevices />}
      {tab === "security" && <UserSecurity auth={auth} />}
    </DashShell>
  );
}

function UserInbox({ list, email }) {
  return (
    <>
      <DashHead title="Announcements" sub={`Messages from the Skill team. ${list.length === 0 ? "Nothing yet." : ""}`} />

      {list.length === 0 ? (
        <div className="dash-empty">
          <DashIcon name="inbox" size={28} />
          <h3>No announcements yet</h3>
          <p>When the team posts a release note, security advisory, or downtime alert, it'll show up here in real time.</p>
        </div>
      ) : (
        <div className="ann-list">
          {list.map((a, i) => (
            <article key={a.id} className="ann-card" style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="ann-meta">
                <span className="ann-avatar">S</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--fg)" }}>{a.from}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.06em" }}>
                    {fmtTime(a.at)} · {new Date(a.at).toLocaleString()}
                  </span>
                </div>
                <span className="ann-tag">official</span>
              </div>
              <div className="ann-body">{a.body}</div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* Licence.

   Everything drawn here is the record from GET /api/entitlement, and nothing
   else. Two things this panel deliberately does NOT have:

   No licence key. There is no key anywhere in this product — the launcher signs
   in through device authorization and holds a session token, so a key would be
   a string with nothing on the other end of it.

   No hardcoded status. "Active" has to come from the Worker or it is a claim,
   and a page that tells a refunded account it is active generates the support
   ticket it was trying to avoid. */

const ENT_STATUS = {
  active:   { text: "Active",     tone: "var(--acc)" },
  past_due: { text: "Past due",   tone: "oklch(0.80 0.16 75)" },
  refunded: { text: "Refunded",   tone: "oklch(0.72 0.19 25)" },
  revoked:  { text: "Revoked",    tone: "oklch(0.72 0.19 25)" },
  none:     { text: "No licence", tone: "var(--fg-3)" },
};

const PLAN_LABEL = { lifetime: "Lifetime", monthly: "Monthly", staff: "Staff" };

const ENT_INCLUDED = [
  "Every module, no tiers, nothing paywalled",
  "ConfigCloud sync",
  "Launcher sessions, listed under Devices",
  "Discord access",
];

function UserBuy({ auth, onRequireAuth }) {
  const { plans, configured, loading, error } = usePlans();
  const { start, busy, error: checkoutError } = useCheckout();
  const signedIn = !!(auth && auth.email);
  const { ent } = useEntitlement(signedIn);

  const owned = ent && (ent.status === "active" || ent.status === "past_due") ? ent.plan : null;
  const buy = (id) => (signedIn ? start(id) : onRequireAuth && onRequireAuth());

  return (
    <>
      <DashHead title="Buy" sub="One licence. Every module included." />
      {error ? (
        <div className="dash-empty">
          <DashIcon name="buy" size={28} />
          <h3>Store unreachable</h3>
          <p>The store is unreachable right now. Try again in a minute or ask in Discord.</p>
        </div>
      ) : loading ? (
        <p className="small dim">Loading plans…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginTop: 14 }}>
            {plans.map(p => (
              <PlanCard key={p.id} plan={p} signedIn={signedIn} owned={owned}
                        configured={configured} busy={busy === p.id} onBuy={buy} />
            ))}
          </div>
          <p className="small dim" style={{ marginTop: 20 }}>
            {checkoutError
              ? <span style={{ color: "oklch(0.75 0.18 25)" }}>{checkoutError}</span>
              : !configured
                ? "Checkout opens shortly. The prices above are final."
                : owned
                  ? "You already hold an active licence. Manage it from your License tab."
                  : "You will be taken to our payment provider to pay, and returned here. Card details never touch this site."}
          </p>
        </>
      )}
    </>
  );
}

function UserLicense({ onBuy, justPurchased }) {
  const { ent, loading, reload } = useEntitlement(true);
  const [tries, setTries] = useState(0);

  /* The redirect back from the payment provider beats its own webhook by a
     second or two, so someone who has just paid would otherwise land on "no
     licence" and reasonably panic. Watch for it for half a minute instead of
     asking them to refresh. */
  useEffect(() => {
    if (!justPurchased || loading || tries >= 10) return;
    if (ent && ent.status !== "none") return;
    const id = setTimeout(() => { setTries(t => t + 1); reload(); }, 3000);
    return () => clearTimeout(id);
  }, [justPurchased, loading, ent, tries, reload]);

  if (loading) {
    return (
      <>
        <DashHead title="License" sub="Your plan and what it covers." />
        <p className="small dim">Loading…</p>
      </>
    );
  }

  /* The endpoint is unreachable — say so plainly. Access does not depend on
     this panel rendering, and implying otherwise starts a panic. */
  if (!ent) {
    return (
      <>
        <DashHead title="License" sub="Your plan and what it covers." />
        <div className="dash-empty">
          <DashIcon name="license" size={28} />
          <h3>Can't reach the licence server</h3>
          <p>Your access is unaffected. This panel just can't read the record right now. Try again in a minute.</p>
        </div>
      </>
    );
  }

  const s = ENT_STATUS[ent.status] || ENT_STATUS.none;
  const owns = ent.status === "active" || ent.status === "past_due";
  const waiting = justPurchased && ent.status === "none" && tries < 10;

  const notice =
    waiting
      ? "Payment received. Your licence normally appears within a few seconds. This page is watching for it."
    : ent.status === "past_due"
      ? "The last renewal did not go through. Access continues for a few days while the card is retried; the receipt email has the link to fix it."
    : ent.status === "refunded" || ent.status === "revoked"
      ? "This licence is no longer active, and every launcher session on it has been signed out."
    : ent.status === "none"
      ? (ent.enforced
          ? "No licence on this account yet."
          : "No licence on this account yet. The client still runs for signed-in accounts while the store is opening.")
    : ent.renews === false && ent.until
      ? "Cancelled. This will not renew, and access runs to the date above."
    : null;

  return (
    <>
      <DashHead title="License" sub="Your plan and what it covers." />
      <div className="dash-grid-2">
        <div className="dash-card">
          <span className="dash-label">Licence</span>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
            <KV k="Status" v={<span style={{ color: s.tone }}>● {s.text}</span>} />
            <KV k="Plan" v={ent.plan ? (PLAN_LABEL[ent.plan] || ent.plan) : "—"} />
            <KV
              k={ent.renews ? "Renews" : "Expires"}
              v={ent.until == null ? (owns ? "Never" : "—") : fmtDate(ent.until)}
            />
            <KV k="Updated" v={ent.updated ? fmtDate(ent.updated) : "—"} />
          </div>

          {ent.order_id && (
            <>
              <hr style={{ border: 0, height: 1, background: "var(--line)", margin: "20px 0" }} />
              <span className="dash-label">Order reference</span>
              <div className="mono" style={{ marginTop: 8, fontSize: 12, color: "var(--fg-2)", userSelect: "all", wordBreak: "break-all" }}>
                {ent.order_id}
              </div>
            </>
          )}

          {notice && (
            <p style={{ marginTop: 20, marginBottom: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--fg-2)" }}>
              {notice}
            </p>
          )}

          {!owns && !waiting && onBuy && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onBuy}>See plans</button>
          )}
        </div>

        <div className="dash-card">
          <span className="dash-label">Included</span>
          <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {ENT_INCLUDED.map(x => (
              <li key={x} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--fg-1)" }}>
                <span className="check" />
                {x === "Discord access" ? (
                  <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer"
                     style={{ color: "var(--fg-1)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    Discord access
                  </a>
                ) : x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

/* Download.

   The build, behind the same record the Licence panel reads. `owns` comes from
   GET /api/entitlement rather than a local flag, so a refunded account loses
   this on its next page load without anyone deploying anything.

   Be clear about what this gate is. The file sits on the CDN under a URL anyone
   holding it can pass on, so hiding the button does not make the binary secret
   — and it does not have to be. The launcher signs in through device
   authorization and the Worker re-checks hasEntitlement() on approve, refresh
   and every heartbeat, so a shared .exe is a copy of a program that will not
   run for an account that has not paid.

   That is true the moment ENTITLEMENT_ENFORCED is "true" in the Worker, and not
   before. While it is "false" every signed-in account passes that check, so
   today this button is the only thing standing between a free sign-up and a
   working client. */

const DOWNLOAD = {
  url: "/downloads/Skilled-1.0.0.exe",
  name: "Skilled.exe",
  version: "1.0.0",
  size: "2.4 MB",     // Written down rather than measured: a HEAD request per
                      // render buys nothing a human cannot read off a label.
  updated: 1788832433020,
};

/* Keeping this block honest is a release step, not a deploy detail. The file is
   served straight off the CDN, so a stale `url` here points at a build that is
   no longer the one the updater will immediately replace — the client still
   self-corrects on first run, but the user downloads twice for no reason.

   The exe carries Skilled.dll embedded, which is what makes a fresh download
   work before it has ever reached the update endpoint. It also means this URL
   hands out a complete DLL to anyone holding it, signed in or not. That is a
   known and accepted trade — see docs/UPDATE-v1.md in the client repo, under
   "The decision taken" — and the reason it is survivable is that the bytes were
   never the secret: without a launcher holding a live session, an injected
   Skilled.dll gets no handoff and unloads itself. */

const FIRST_RUN = [
  "Run the file. Windows may warn about an unknown publisher. That is SmartScreen not recognising a new signature, not a detection.",
  "The launcher opens your browser to link the device. Approve it there.",
  "Pick a version and launch. The session is kept in Windows Credential Manager, so this is once per machine.",
];

function UserDownload({ onBuy }) {
  const { ent, loading } = useEntitlement(true);

  if (loading) {
    return (
      <>
        <DashHead title="Download" sub="The Windows client." />
        <p className="small dim">Loading…</p>
      </>
    );
  }

  /* Same reasoning as the Licence panel: an unreachable endpoint is not the
     same as owning nothing, and saying otherwise starts a panic. */
  if (!ent) {
    return (
      <>
        <DashHead title="Download" sub="The Windows client." />
        <div className="dash-empty">
          <DashIcon name="download" size={28} />
          <h3>Can't reach the licence server</h3>
          <p>The download is gated on your licence, and this page can't read it right now. Try again in a minute.</p>
        </div>
      </>
    );
  }

  const owns = ent.status === "active" || ent.status === "past_due";

  if (!owns) {
    return (
      <>
        <DashHead title="Download" sub="The Windows client." />
        <div className="dash-empty">
          <DashIcon name="download" size={28} />
          <h3>No licence on this account</h3>
          <p>The client unlocks here as soon as you own a licence, on every machine you sign in on.</p>
          {onBuy && <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onBuy}>See plans</button>}
        </div>
      </>
    );
  }

  /* Entitled, but nothing to hand over yet. Saying so is better than a dead
     button, and better than hiding a tab the licence says you paid for. */
  if (!DOWNLOAD.url) {
    return (
      <>
        <DashHead title="Download" sub="The Windows client." />
        <div className="dash-empty">
          <DashIcon name="download" size={28} />
          <h3>No build published yet</h3>
          <p>Your licence is active. The first build appears here the moment it goes up, and Announcements will say so.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <DashHead title="Download" sub="The Windows client." />
      <div className="dash-grid-2">
        <div className="dash-card">
          <span className="dash-label">Windows</span>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14 }}>
            <KV k="Version" v={DOWNLOAD.version || "—"} />
            <KV k="Size" v={DOWNLOAD.size || "—"} />
            <KV k="Updated" v={DOWNLOAD.updated ? fmtDate(DOWNLOAD.updated) : "—"} />
            <KV k="Requires" v="Windows 10 or 11" />
          </div>

          <a className="btn btn-primary" href={DOWNLOAD.url} download={DOWNLOAD.name}
             style={{ marginTop: 20 }}>
            <DashIcon name="download" size={14} />
            Download {DOWNLOAD.name}
          </a>

          {ent.status === "past_due" && (
            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13.5, lineHeight: 1.55, color: "var(--fg-2)" }}>
              The last renewal did not go through. This still works for a few days while the card is retried.
            </p>
          )}
        </div>

        <div className="dash-card">
          <span className="dash-label">First run</span>
          <ol style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
            {FIRST_RUN.map((x, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-1)" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", flexShrink: 0, paddingTop: 2 }}>{i + 1}</span>
                {x}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}

function UserDevices() {
  const { sessions, loading, revoke } = useDevices();

  return (
    <>
      <DashHead title="Devices" sub="Active launcher sessions linked to your account." />
      <div className="dash-card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead><tr><th>Machine</th><th>OS</th><th>Version</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading && (
              <tr><td colSpan="6" style={{ color: "var(--fg-3)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>Loading devices…</td></tr>
            )}
            {!loading && sessions.length === 0 && (
              <tr><td colSpan="6" style={{ color: "var(--fg-3)", fontSize: 13, textAlign: "center", padding: "28px 0" }}>No devices linked yet. Run the launcher to link this machine.</td></tr>
            )}
            {sessions.map((s) => (
              <tr key={s.session_id}>
                <td style={{ fontWeight: 600, color: "var(--fg)" }}>{s.device_name || s.install_id || "Unknown"}</td>
                <td>{s.os || "—"}</td>
                <td className="mono" style={{ fontSize: 12, color: "var(--fg-3)" }}>{s.client_version || "—"}</td>
                <td className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{s.last_seen ? fmtTime(s.last_seen) : "—"}</td>
                <td><span style={{ color: s.injected ? "var(--acc)" : "var(--fg-3)" }}>{s.injected ? "● In-game" : "○ Idle"}</span></td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ height: 30, padding: "0 12px", fontSize: 11.5 }}
                    onClick={() => revoke(s.session_id)}
                  >Sign out</button>
                </td>
              </tr>
            ))}
            {/* A row is a launcher session, not a machine — there is no hardware
                identity anywhere in this system, so the old "unlink to move your
                licence" line described a thing that does not exist. */}
            {!loading && sessions.length > 0 && (
              <tr>
                <td colSpan="6" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                  Each row is one launcher sign-in. Signing one out revokes its token. The client ejects on its next heartbeat, or when that machine is next online.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* Security.

   Both controls here were dead buttons. They are wired to the two things that
   genuinely exist: Clerk owns every credential on the account, and revoking a
   session is the documented panic path — the launcher sees `revoked` on its
   next heartbeat and ejects the DLL without prompting.

   What is NOT offered is a "wipe ConfigCloud" button, because no endpoint does
   that. A control that quietly does nothing is worse than no control. */
function UserSecurity({ auth }) {
  const { sessions, revoke, reload } = useDevices();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  const signOutEverywhere = async () => {
    if (!sessions.length || pending) return;
    setPending(true);
    for (const s of sessions) await revoke(s.session_id);
    await reload();
    setPending(false);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  };

  return (
    <>
      <DashHead title="Security" sub="Credentials and emergency controls." />
      <div className="dash-grid-2">
        <div className="dash-card">
          <span className="dash-label">Sign-in and two-factor</span>
          <p style={{ marginTop: 10, color: "var(--fg-2)", fontSize: 13.5, lineHeight: 1.55 }}>
            Password, connected accounts and two-factor authentication all live with Clerk, which owns
            identity for this site. This opens the same panel as “Manage account”.
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: 14 }}
            disabled={!auth.clerk}
            onClick={() => auth.clerk && auth.clerk.openUserProfile({ appearance: clerkModalAppearance() })}>
            Open account security
          </button>
        </div>

        <div className="dash-card" style={{ borderColor: "oklch(0.78 0.18 25 / 0.3)" }}>
          <span className="dash-label" style={{ color: "oklch(0.78 0.18 25)" }}>Sign out everywhere</span>
          <p style={{ marginTop: 10, color: "var(--fg-2)", fontSize: 13.5, lineHeight: 1.55 }}>
            Revokes every launcher session on this account. The client ejects on its next heartbeat:
            about fifteen seconds on a machine that is online, and the moment it reconnects on one that is not.
          </p>
          <button
            onClick={signOutEverywhere}
            disabled={pending || sessions.length === 0}
            className="btn"
            style={{
              marginTop: 14,
              background: sessions.length ? "oklch(0.40 0.20 25)" : "transparent",
              color: sessions.length ? "var(--fg)" : "var(--fg-3)",
              borderColor: sessions.length ? "oklch(0.55 0.20 25)" : "var(--line)",
              cursor: sessions.length ? undefined : "not-allowed",
            }}>
            {pending ? "Signing out…"
              : done ? "Done"
              : sessions.length === 0 ? "No active sessions"
              : `Sign out ${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── DEV dashboard ─── */

function DevDashboard({ auth, leave }) {
  const ann = useAnnouncements();
  const dir = useUserDirectory();
  const [tab, setTab] = useState("buyers");

  const userList = useMemo(() => {
    return Object.entries(dir.users)
      .map(([email, u]) => ({ email, ...u }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [dir.users]);
  const buyerCount = userList.filter(u => u.role !== "dev").length;
  const licensed = userList.filter(u => u.licensed).length;

  const tabs = [
    { id: "buyers",   label: "Buyers",        icon: "users",   badge: buyerCount || null },
    { id: "licences", label: "Licences",      icon: "license", badge: licensed || null },
    { id: "compose",  label: "Compose",       icon: "compose" },
    { id: "history",  label: "Announcements", icon: "inbox",   badge: ann.list.length || null },
  ];

  return (
    <DashShell auth={auth} onLeave={leave} tab={tab} setTab={setTab} tabs={tabs}>
      {tab === "buyers"   && <DevBuyers users={userList} dir={dir} me={auth.email} />}
      {tab === "licences" && <DevLicences users={userList} dir={dir} me={auth.email} />}
      {tab === "compose"  && <DevCompose ann={ann} from={`Skill · ${auth.email.split("@")[0]}`} buyerCount={buyerCount} />}
      {tab === "history"  && <DevHistory ann={ann} />}
    </DashShell>
  );
}

/* ─── licences: the grant surface ───────────────────────────────────────────

   Two ways in, because they answer different questions. The Buyers roster is
   for "this person, right now" — right-click the row and grant. This tab is
   for "who currently holds what", and it is where a grant starts when you have
   a name off a support thread rather than a row already under the cursor.

   Both drive the same two endpoints through the same hook, so neither can
   drift into being the one that works. */

const PLAN_PRESETS = [
  { id: "lifetime", label: "Lifetime", detail: "Never expires",  body: { plan: "lifetime" } },
  { id: "monthly",  label: "Monthly",  detail: "30 days",        body: { plan: "monthly", days: 30 } },
];

/* What a row's licence actually is, in the four words a table cell has room
   for. `licensed` is the Worker's own predicate — an expired `until` and a
   past_due inside its grace both land somewhere `status` alone does not. */
function licenceOf(u) {
  const e = u.entitlement || {};
  if (u.licensed) {
    const plan = e.plan === "staff" ? "Staff" : (e.plan ? e.plan[0].toUpperCase() + e.plan.slice(1) : "Active");
    return {
      on: true,
      label: e.status === "past_due" ? `${plan} · past due` : plan,
      detail: e.until ? `until ${fmtDate(e.until)}` : "never expires",
      tone: e.status === "past_due" ? "warn" : "ok",
    };
  }
  if (e.status === "revoked")  return { on: false, label: "Revoked",  detail: "access removed", tone: "off" };
  if (e.status === "refunded") return { on: false, label: "Refunded", detail: "money returned", tone: "off" };
  if (e.until && e.until < Date.now())
    return { on: false, label: "Expired", detail: `ended ${fmtDate(e.until)}`, tone: "off" };
  return { on: false, label: "None", detail: "cannot sign in", tone: "none" };
}

function LicenceChip({ u }) {
  const l = licenceOf(u);
  const colour = {
    ok:   { fg: "var(--acc)",             bg: "var(--acc-soft)",            line: "var(--acc-line)" },
    warn: { fg: "oklch(0.80 0.15 75)",    bg: "oklch(0.80 0.15 75 / 0.10)", line: "oklch(0.80 0.15 75 / 0.28)" },
    off:  { fg: "oklch(0.72 0.19 25)",    bg: "oklch(0.72 0.19 25 / 0.10)", line: "oklch(0.72 0.19 25 / 0.26)" },
    none: { fg: "var(--fg-3)",            bg: "oklch(1 0 0 / 0.03)",        line: "var(--line)" },
  }[l.tone];

  return (
    <span title={l.detail} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      height: 22, padding: "0 9px", borderRadius: 5,
      background: colour.bg, border: `1px solid ${colour.line}`, color: colour.fg,
      fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%", background: "currentColor",
        opacity: l.on ? 1 : 0.55,
      }} />
      {l.label}
    </span>
  );
}

/* A short-lived confirmation line. Every write here is one click away from
   changing whether a real person can start the game, so each one says what it
   did rather than leaving the table to be re-read. */
function useToast() {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((text, ok = true) => {
    clearTimeout(timer.current);
    setMsg({ text, ok, id: Date.now() });
    timer.current = setTimeout(() => setMsg(null), 4000);
  }, []);
  const node = msg ? (
    <div className="toast" key={msg.id}>
      <DashIcon name={msg.ok ? "bolt" : "shield"} size={14} />
      {msg.text}
    </div>
  ) : null;
  return { show, node };
}

/* ─── right-click menu ───────────────────────────────────────────────────────

   Anchored to the pointer rather than to the row, because that is where the
   hand already is. It closes on Escape, on a click anywhere outside it, and on
   any scroll — a menu pinned to a viewport coordinate while the table moves
   underneath points at the wrong person, which on a revoke matters.

   Revoke is the one item that does not fire on the first click. It swaps the
   menu for a confirm strip naming the account, so the destructive path costs
   one more click than the reversible ones and reads back who it is about. */
function RowMenu({ at, user, dir, onClose, onCustom, onToast }) {
  const ref = useRef(null);
  const [confirm, setConfirm] = useState(false);
  const [pos, setPos] = useState(at);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 10;
    setPos({
      x: Math.max(pad, Math.min(at.x, window.innerWidth - r.width - pad)),
      y: Math.max(pad, Math.min(at.y, window.innerHeight - r.height - pad)),
    });
  }, [at.x, at.y, confirm]);

  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const key = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", key);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", key);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);

  const who = user.email || user.id;
  const l = licenceOf(user);

  const run = async (fn, done) => {
    onClose();
    const ok = await fn();
    onToast(ok ? done : "That did not go through. The error above the table says why.", ok);
  };

  const copy = (text, what) => {
    try {
      navigator.clipboard.writeText(text);
      onToast(`${what} copied.`);
    } catch (e) { onToast("Clipboard blocked by the browser.", false); }
    onClose();
  };

  return (
    <div ref={ref} className="row-menu" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      <div className="row-menu-head">
        <span className="dash-avatar small">{who.slice(0, 2).toUpperCase()}</span>
        <div style={{ minWidth: 0 }}>
          <div className="row-menu-who">{who}</div>
          <div className="row-menu-sub">{l.label} · {l.detail}</div>
        </div>
      </div>

      {confirm ? (
        <div className="row-menu-confirm">
          <p>
            Remove access for <b>{who}</b>? Their licence is revoked and every
            launcher session signs out, so the client ejects within 15 seconds.
            You can grant it back at any time.
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="rm-btn rm-danger" onClick={() => run(() => dir.revoke(user.id, `removed from dashboard`), `Access removed for ${who}.`)}>
              Remove access
            </button>
            <button className="rm-btn" onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="row-menu-items">
          {PLAN_PRESETS.map(p => (
            <button key={p.id} onClick={() => run(() => dir.grant(user.id, p.body), `${p.label} licence granted to ${who}.`)}>
              <DashIcon name="license" size={13} />
              <span>Grant {p.label}</span>
              <em>{p.detail}</em>
            </button>
          ))}
          <button onClick={() => { onClose(); onCustom(user); }}>
            <DashIcon name="cog" size={13} />
            <span>Custom grant…</span>
            <em>plan, days, note</em>
          </button>

          <div className="row-menu-rule" />

          <button
            className={l.on || (user.entitlement && user.entitlement.status !== "none") ? "rm-danger-item" : "rm-disabled"}
            disabled={!l.on && !(user.entitlement && user.entitlement.status !== "none")}
            onClick={() => setConfirm(true)}
          >
            <DashIcon name="signout" size={13} />
            <span>Remove access</span>
            <em>{l.on ? "revoke + sign out" : "no licence"}</em>
          </button>

          <div className="row-menu-rule" />

          <button onClick={() => copy(user.email || "", "Email")}>
            <DashIcon name="compose" size={13} /><span>Copy email</span>
          </button>
          <button onClick={() => copy(user.id || "", "User ID")}>
            <DashIcon name="compose" size={13} /><span>Copy user ID</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── the grant panel ────────────────────────────────────────────────────────

   The long way round, for when the quick presets are not what you want: pick
   anyone in the roster, pick a plan, set how long, and leave a note that ends
   up in the account's audit log next to who granted it.

   Expiry is a plain choice between "never" and a day count rather than a date
   picker, because the Worker takes `days` and counts from now — a date field
   would only be a day count with an extra timezone bug in it. */
function GrantDialog({ user, users, dir, onClose, onToast }) {
  const [targetId, setTargetId] = useState(user ? user.id : "");
  const [plan, setPlan] = useState("lifetime");
  const [forever, setForever] = useState(true);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const key = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  /* Picking the plan moves the expiry to what that plan normally means, and
     leaves it editable. Choosing "Monthly" and silently writing a permanent
     licence is the mistake this exists to stop. */
  const choosePlan = (id) => {
    setPlan(id);
    if (id === "monthly") { setForever(false); setDays(30); }
    else setForever(true);
  };

  const target = users.find(u => u.id === targetId) || null;
  const matches = q.trim() === "" ? users.slice(0, 6)
    : users.filter(u => (u.email || "").toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6);

  const submit = async () => {
    if (!target || saving) return;
    setSaving(true);
    const body = plan === "staff" ? { staff: true } : { plan };
    /* Only ever send `days` when it is meant. The Worker treats an absent
       expiry as a lifetime grant, and an explicit undefined is not the same
       thing as leaving the key off. */
    if (plan !== "staff" && !forever) body.days = Number(days);
    if (note.trim()) body.note = note.trim();

    const ok = await dir.grant(target.id, body);
    setSaving(false);
    if (ok) {
      const span = plan === "staff" || forever ? "never expires" : `${days} days`;
      onToast(`${plan === "staff" ? "Staff" : plan[0].toUpperCase() + plan.slice(1)} licence granted to ${target.email}, ${span}.`);
      onClose();
    } else {
      onToast("Grant failed. The error above the table says why.", false);
    }
  };

  return (
    <div className="dlg-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" role="dialog" aria-modal="true">
        <div className="dlg-head">
          <div>
            <h3>Grant a licence</h3>
            <p>Writes the entitlement record directly. No payment, no Stripe. The account can sign a launcher in the moment it lands.</p>
          </div>
          <button className="dlg-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="dlg-body">
          <div className="dlg-field">
            <label className="dash-label">Account</label>
            {target ? (
              <div className="dlg-target">
                <span className="dash-avatar small">{(target.email || "?").slice(0, 2).toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12.5, color: "var(--fg)", overflow: "hidden", textOverflow: "ellipsis" }}>{target.email}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{licenceOf(target).label} · {licenceOf(target).detail}</div>
                </div>
                <button className="rm-btn" onClick={() => { setTargetId(""); setQ(""); }}>Change</button>
              </div>
            ) : (
              <>
                <input
                  className="dlg-input mono" autoFocus
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search accounts by email…"
                />
                <div className="dlg-picker">
                  {matches.length === 0 && <div className="dlg-picker-empty">No account matches “{q}”.</div>}
                  {matches.map(u => (
                    <button key={u.id} onClick={() => setTargetId(u.id)}>
                      <span className="dash-avatar small">{(u.email || "?").slice(0, 2).toUpperCase()}</span>
                      <span className="mono" style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
                      <LicenceChip u={u} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="dlg-field">
            <label className="dash-label">Plan</label>
            <div className="dlg-plans">
              {[
                { id: "lifetime", label: "Lifetime", sub: "Every module, forever" },
                { id: "monthly",  label: "Monthly",  sub: "Every module, 30 days" },
                { id: "staff",    label: "Staff",    sub: "Internal, never expires" },
              ].map(p => (
                <button key={p.id} className={plan === p.id ? "dlg-plan on" : "dlg-plan"} onClick={() => choosePlan(p.id)}>
                  <b>{p.label}</b>
                  <em>{p.sub}</em>
                </button>
              ))}
            </div>
          </div>

          {plan !== "staff" && (
            <div className="dlg-field">
              <label className="dash-label">Expires</label>
              <div className="dlg-expiry">
                <button className={forever ? "rm-btn on" : "rm-btn"} onClick={() => setForever(true)}>Never</button>
                <button className={!forever ? "rm-btn on" : "rm-btn"} onClick={() => setForever(false)}>After</button>
                <input
                  className="dlg-input mono" type="number" min="1" max="3650"
                  value={days} disabled={forever}
                  onChange={(e) => setDays(e.target.value)}
                  style={{ width: 84, opacity: forever ? 0.4 : 1 }}
                />
                <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                  {forever ? "no expiry is written" : `ends ${fmtDate(Date.now() + Number(days || 0) * 86400000)}`}
                </span>
              </div>
            </div>
          )}

          <div className="dlg-field">
            <label className="dash-label">Note <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--fg-3)" }}>(optional, kept in the audit log)</span></label>
            <input
              className="dlg-input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. beta tester, or lost webhook order #1234"
              maxLength={500}
            />
          </div>
        </div>

        <div className="dlg-foot">
          <button className="rm-btn" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={!target || saving}
            style={{ opacity: target && !saving ? 1 : 0.4, pointerEvents: target && !saving ? "auto" : "none" }}
          >
            <DashIcon name="license" size={13} />
            {saving ? "Granting…" : "Grant licence"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── licences tab ─── */

function DevLicences({ users, dir, me }) {
  const toast = useToast();
  const [dialog, setDialog] = useState(null);   // null | { user }
  const [menu, setMenu] = useState(null);

  const holders = users.filter(u => u.licensed);
  const none    = users.filter(u => !u.licensed);
  const staff   = users.filter(u => u.entitlement && u.entitlement.plan === "staff");
  const soon    = users.filter(u => {
    const t = u.entitlement && u.entitlement.until;
    return u.licensed && t && t - Date.now() < 7 * 86400000;
  });

  return (
    <>
      <DashHead
        title="Licences"
        sub="Who can actually sign a launcher in, and the panel that decides it. A grant here takes effect on their next heartbeat."
      />

      {!dir.enforced && (
        <div className="dash-warn">
          <b>The gate is open.</b> ENTITLEMENT_ENFORCED is not "true", so every
          signed-in account can use the client regardless of what is below.
          Grants still write real records. They just are not what is letting
          anyone in right now.
        </div>
      )}

      <div className="dash-stats">
        <Stat label="Licensed" value={holders.length} accent subtle={`of ${users.length} accounts`} />
        <Stat label="No licence" value={none.length} subtle="cannot sign in" />
        <Stat label="Expiring in 7d" value={soon.length} subtle={soon.length === 1 ? "account" : "accounts"} />
        <Stat label="Staff" value={staff.length} subtle="never expire" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24, marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>Current licence holders</h3>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setDialog({ user: null })}>
          <DashIcon name="license" size={13} />
          Grant a licence
        </button>
      </div>

      {dir.error && (
        <div className="dash-error">
          <span>Last write failed: <span className="mono">{dir.error}</span></span>
          <button className="rm-btn" onClick={dir.clearError}>Dismiss</button>
        </div>
      )}

      <div className="dash-card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Email</th>
              <th>Licence</th>
              <th>Expires</th>
              <th>Source</th>
              <th style={{ textAlign: "right" }}>Devices</th>
            </tr>
          </thead>
          <tbody>
            {holders.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>
                Nobody holds a licence yet. Grant one, or wait for a Stripe purchase to land.
              </td></tr>
            )}
            {holders.map(u => (
              <tr
                key={u.id}
                onContextMenu={(e) => { e.preventDefault(); setMenu({ at: { x: e.clientX, y: e.clientY }, user: u }); }}
                style={{ cursor: "context-menu", opacity: dir.busy === u.id ? 0.5 : 1 }}
              >
                <td><span className="dash-avatar small">{(u.email || "?").slice(0, 2).toUpperCase()}</span></td>
                <td className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--fg)" }}>
                  {u.email}{u.email === me && <span style={{ color: "var(--fg-3)", fontWeight: 400 }}> · you</span>}
                </td>
                <td><LicenceChip u={u} /></td>
                <td className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>
                  {u.entitlement && u.entitlement.until ? fmtDate(u.entitlement.until) : "Never"}
                </td>
                <td className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                  {(u.entitlement && u.entitlement.source) || "—"}
                </td>
                <td className="mono" style={{ textAlign: "right", fontSize: 12, color: u.sessions ? "var(--fg-1)" : "var(--fg-3)" }}>
                  {u.sessions || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 12 }}>
        Right-click any row to grant, change or remove a licence.
      </p>

      {menu && (
        <RowMenu
          at={menu.at} user={menu.user} dir={dir}
          onClose={() => setMenu(null)}
          onCustom={(u) => setDialog({ user: u })}
          onToast={toast.show}
        />
      )}
      {dialog && (
        <GrantDialog
          user={dialog.user} users={users} dir={dir}
          onClose={() => setDialog(null)}
          onToast={toast.show}
        />
      )}
      {toast.node}
    </>
  );
}

/* The roster from GET /admin/users, which is Clerk's user list merged with what
   the Worker knows. Every column below is a field that endpoint actually
   returns — the old per-row "View" button opened nothing, and the seat it took
   now shows the session count the API was already sending.

   Since the gate closed the roster also carries the licence, which is what the
   right-click menu acts on. It is the same menu the Licences tab uses; this is
   just the other place you already have the person on screen. */
function DevBuyers({ users, dir, me }) {
  const [q, setQ] = useState("");
  const toast = useToast();
  const [menu, setMenu] = useState(null);       // null | { at, user }
  const [dialog, setDialog] = useState(null);   // null | { user }

  const filtered = users.filter(u =>
    q === "" || u.email.toLowerCase().includes(q.toLowerCase())
  );
  const devs     = filtered.filter(u => u.role === "dev");
  const active   = users.filter(u => u.lastSeen && (Date.now() - u.lastSeen) < 5 * 60 * 1000).length;
  const licensed = users.filter(u => u.licensed).length;

  return (
    <>
      <DashHead title="Buyers" sub="Everyone with an account, whether their launcher is live, and whether they are allowed in." />
      <div className="dash-stats">
        <Stat label="Total accounts" value={users.length} />
        {/* Now the count that matters: an account without a licence cannot
            sign a launcher in, so this is buyers rather than sign-ups. */}
        <Stat label="Licensed" value={licensed} accent subtle={`${users.length - licensed} without`} />
        <Stat label="Active now"  value={active} subtle={`${active === 1 ? "user" : "users"} in last 5m`} />
        <Stat label="Developers"  value={devs.length} subtle="incl. you" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, marginTop: 24 }}>
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email…"
          style={{
            flex: 1, maxWidth: 320, height: 38, padding: "0 14px",
            background: "oklch(1 0 0 / 0.04)", border: "1px solid var(--line-strong)",
            borderRadius: 9, color: "var(--fg)",
            fontFamily: "var(--mono)", fontSize: 13, outline: "none",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--acc-line)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--line-strong)"; }}
        />
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setDialog({ user: null })}>
          <DashIcon name="license" size={13} />
          Grant a licence
        </button>
      </div>

      {dir.error && (
        <div className="dash-error">
          <span>Last write failed: <span className="mono">{dir.error}</span></span>
          <button className="rm-btn" onClick={dir.clearError}>Dismiss</button>
        </div>
      )}

      <div className="dash-card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Email</th>
              <th>Licence</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Last seen</th>
              <th style={{ textAlign: "right" }}>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="7" style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>
                {users.length === 0 ? "No accounts yet, sign up a buyer to see them here." : `No accounts match "${q}".`}
              </td></tr>
            )}
            {filtered.map(u => {
              const isLive = u.lastSeen && (Date.now() - u.lastSeen) < 5 * 60 * 1000;
              const ini = u.email.slice(0, 2).toUpperCase();
              return (
                <tr
                  key={u.email}
                  onContextMenu={(e) => { e.preventDefault(); setMenu({ at: { x: e.clientX, y: e.clientY }, user: u }); }}
                  style={{ cursor: "context-menu", opacity: dir.busy === u.id ? 0.5 : 1 }}
                >
                  <td>
                    <span className="dash-avatar small">{ini}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--fg)", fontFamily: "var(--mono)", fontSize: 12.5 }}>
                    {u.email}{u.email === me && <span style={{ color: "var(--fg-3)", fontWeight: 400 }}> · you</span>}
                  </td>
                  <td><LicenceChip u={u} /></td>
                  <td>
                    {u.role === "dev"
                      ? <span style={{ color: "var(--acc)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase" }}>● Dev</span>
                      : <span style={{ color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase" }}>Buyer</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{u.createdAt ? fmtDate(u.createdAt) : "None"}</td>
                  <td className="mono" style={{ fontSize: 12, color: isLive ? "var(--acc)" : "var(--fg-2)" }}>
                    {isLive ? <><span className="dot-live" />now</> : (u.lastSeen ? fmtTime(u.lastSeen) : "None")}
                  </td>
                  <td className="mono" style={{ textAlign: "right", fontSize: 12, color: u.sessions ? "var(--fg-1)" : "var(--fg-3)" }}>
                    {u.sessions || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 12 }}>
        Right-click a row to grant a licence, or to remove someone's access.
      </p>

      {menu && (
        <RowMenu
          at={menu.at} user={menu.user} dir={dir}
          onClose={() => setMenu(null)}
          onCustom={(u) => setDialog({ user: u })}
          onToast={toast.show}
        />
      )}
      {dialog && (
        <GrantDialog
          user={dialog.user} users={users} dir={dir}
          onClose={() => setDialog(null)}
          onToast={toast.show}
        />
      )}
      {toast.node}
    </>
  );
}

function DevCompose({ ann, from, buyerCount }) {
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  const taRef = useRef(null);

  // grow textarea
  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "auto";
    taRef.current.style.height = Math.max(180, taRef.current.scrollHeight) + "px";
  }, [body]);

  const send = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    ann.post(from, trimmed);
    setBody("");
    setSent(true);
    setTimeout(() => setSent(false), 2400);
  };

  const templates = [
    { name: "Release",  body: "v3.7.2 is live. AntiBot retuned for ranked bedwars. ConfigCloud syncs faster on cold launch. Update via the launcher." },
    { name: "Outage",   body: "ConfigCloud is degraded, sync may take up to 5 minutes. We're working on it. No action needed." },
    { name: "Security", body: "If you see anyone selling Skill licenses outside skill.gg, they're scams. Buy only from our store. Watchdog wave is rumored, keep Self Destruct bound." },
  ];

  return (
    <>
      <DashHead
        title="Compose announcement"
        sub={`Broadcast to every account. ${buyerCount} ${buyerCount === 1 ? "buyer" : "buyers"} will see this in their dashboard.`}
      />

      <div className="dash-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{
          padding: "12px 18px", borderBottom: "1px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "oklch(1 0 0 / 0.02)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ann-avatar small">S</span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{from}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>Posting as developer</span>
            </div>
          </div>
          <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
            broadcast · all buyers
          </span>
        </div>

        <textarea
          ref={taRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write something to your buyers… Release notes, outages, security advisories. Markdown isn't parsed. Keep it short and direct."
          style={{
            width: "100%", minHeight: 180, padding: 20,
            background: "transparent", border: 0,
            color: "var(--fg)", font: "400 15px/1.55 var(--sans)",
            outline: "none", resize: "none", display: "block",
          }}
        />

        <div style={{
          padding: "14px 18px", borderTop: "1px solid var(--line)",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {templates.map(t => (
              <button key={t.name} onClick={() => setBody(t.body)} style={{
                height: 28, padding: "0 10px",
                background: "oklch(1 0 0 / 0.04)", border: "1px solid var(--line)",
                borderRadius: 6, color: "var(--fg-2)",
                fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.06em",
              }}>{t.name}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="mono" style={{ fontSize: 11, color: body.length > 800 ? "oklch(0.78 0.16 25)" : "var(--fg-3)" }}>
              {body.length} chars
            </span>
            <button
              onClick={send}
              disabled={!body.trim()}
              className="btn btn-primary"
              style={{ opacity: body.trim() ? 1 : 0.4, pointerEvents: body.trim() ? "auto" : "none" }}
            >
              <DashIcon name="send" size={13} />
              Send to {buyerCount} {buyerCount === 1 ? "buyer" : "buyers"}
            </button>
          </div>
        </div>
      </div>

      {sent && (
        <div className="toast">
          <DashIcon name="bolt" size={14} />
          Broadcast sent. Every buyer's dashboard updated in real time.
        </div>
      )}

      {ann.list.length > 0 && (
        <>
          <h3 style={{ marginTop: 40, marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Recent broadcasts</h3>
          <div className="ann-list">
            {ann.list.slice(0, 3).map(a => (
              <article key={a.id} className="ann-card">
                <div className="ann-meta">
                  <span className="ann-avatar small">S</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{a.from}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>{fmtTime(a.at)}</span>
                  </div>
                  <button onClick={() => ann.remove(a.id)} style={{
                    height: 26, padding: "0 10px",
                    background: "transparent", border: "1px solid var(--line)",
                    borderRadius: 6, color: "var(--fg-3)",
                    fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em",
                  }}>delete</button>
                </div>
                <div className="ann-body" style={{ fontSize: 13.5 }}>{a.body}</div>
              </article>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function DevHistory({ ann }) {
  return (
    <>
      <DashHead title="Announcement history" sub={`${ann.list.length} ${ann.list.length === 1 ? "broadcast" : "broadcasts"} on record.`} />
      {ann.list.length === 0 ? (
        <div className="dash-empty">
          <DashIcon name="inbox" size={28} />
          <h3>No broadcasts yet</h3>
          <p>Anything you send from the Compose tab will appear here and in every buyer's dashboard.</p>
        </div>
      ) : (
        <div className="ann-list">
          {ann.list.map(a => (
            <article key={a.id} className="ann-card">
              <div className="ann-meta">
                <span className="ann-avatar small">S</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.from}</span>
                  <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>
                    {new Date(a.at).toLocaleString()} · {fmtTime(a.at)}
                  </span>
                </div>
                <button onClick={() => ann.remove(a.id)} style={{
                  height: 26, padding: "0 10px",
                  background: "transparent", border: "1px solid var(--line)",
                  borderRadius: 6, color: "var(--fg-3)",
                  fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em",
                }}>delete</button>
              </div>
              <div className="ann-body">{a.body}</div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

/* ─── reusable bits ─── */

function DashHead({ title, sub }) {
  return (
    <header className="dash-head">
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  );
}

function Stat({ label, value, subtle, accent }) {
  return (
    <div className="dash-card" style={{ padding: 20 }}>
      <span className="dash-label">{label}</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
        <span style={{
          fontSize: 30, fontWeight: 600, letterSpacing: "-0.028em",
          color: accent ? "var(--acc)" : "var(--fg)",
        }}>{value}</span>
        {subtle && <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{subtle}</span>}
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-3)" }}>{k}</span>
      <span style={{ fontSize: 14, color: "var(--fg-1)", fontWeight: 500 }}>{v}</span>
    </div>
  );
}

/* ─── ROUTER ─── */

function Dashboard({ auth, leave, onBuy, initialTab, justPurchased }) {
  if (auth.role === "dev") return <DevDashboard auth={auth} leave={leave} />;
  return (
    <UserDashboard
      auth={auth}
      leave={leave}
      onBuy={onBuy}
      initialTab={initialTab}
      justPurchased={justPurchased}
    />
  );
}

Object.assign(window, { Dashboard });
