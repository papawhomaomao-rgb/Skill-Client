// dashboard.jsx — user + developer dashboards
const { useState, useMemo, useEffect, useRef } = React;

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
    case "cog":      return <svg {...props}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4"/></svg>;
    case "back":     return <svg {...props}><path d="M10 3L4 8l6 5"/></svg>;
    case "signout":  return <svg {...props}><path d="M9 3H4v10h5M11 5l3 3-3 3M14 8H7"/></svg>;
    case "send":     return <svg {...props} fill="currentColor" stroke="none"><path d="M2 8l12-5-4 12-2-5z"/></svg>;
    case "bolt":     return <svg {...props}><path d="M9 2L4 9h4l-1 5 5-7H8z" fill="currentColor"/></svg>;
    case "shield":   return <svg {...props}><path d="M8 1.5L3 3v5c0 3 2.2 5.5 5 6.5 2.8-1 5-3.5 5-6.5V3z"/></svg>;
    default:         return null;
  }
}

/* ─── USER dashboard ─── */

function UserDashboard({ auth, leave, onBuy, initialTab, justPurchased }) {
  const ann = useAnnouncements();
  const [tab, setTab] = useState(initialTab || "inbox");

  const tabs = [
    { id: "inbox",   label: "Announcements", icon: "inbox", badge: ann.list.length || null },
    { id: "license", label: "License",       icon: "license" },
    { id: "devices", label: "Devices",       icon: "device" },
    { id: "security",label: "Security",      icon: "shield" },
  ];

  return (
    <DashShell auth={auth} onLeave={leave} tab={tab} setTab={setTab} tabs={tabs}>
      {tab === "inbox"    && <UserInbox list={ann.list} email={auth.email} />}
      {tab === "license"  && <UserLicense onBuy={onBuy} justPurchased={justPurchased} />}
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
  "Every module — no tiers, nothing paywalled",
  "ConfigCloud sync",
  "Launcher sessions, listed under Devices",
  "Discord access",
];

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
          <p>Your access is unaffected — this panel just can't read the record right now. Try again in a minute.</p>
        </div>
      </>
    );
  }

  const s = ENT_STATUS[ent.status] || ENT_STATUS.none;
  const owns = ent.status === "active" || ent.status === "past_due";
  const waiting = justPurchased && ent.status === "none" && tries < 10;

  const notice =
    waiting
      ? "Payment received. Your licence normally appears within a few seconds — this page is watching for it."
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
                  Each row is one launcher sign-in. Signing one out revokes its token — the client ejects on its next heartbeat, or when that machine is next online.
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
            Revokes every launcher session on this account. The client ejects on its next heartbeat —
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
  const users = useUserDirectory();
  const [tab, setTab] = useState("buyers");

  const userList = useMemo(() => {
    return Object.entries(users)
      .map(([email, u]) => ({ email, ...u }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [users]);
  const buyerCount = userList.filter(u => u.role !== "dev").length;

  const tabs = [
    { id: "buyers",   label: "Buyers",        icon: "users", badge: buyerCount || null },
    { id: "compose",  label: "Compose",       icon: "compose" },
    { id: "history",  label: "Announcements", icon: "inbox", badge: ann.list.length || null },
  ];

  return (
    <DashShell auth={auth} onLeave={leave} tab={tab} setTab={setTab} tabs={tabs}>
      {tab === "buyers"  && <DevBuyers users={userList} />}
      {tab === "compose" && <DevCompose ann={ann} from={`Skill · ${auth.email.split("@")[0]}`} buyerCount={buyerCount} />}
      {tab === "history" && <DevHistory ann={ann} />}
    </DashShell>
  );
}

/* The roster from GET /admin/users, which is Clerk's user list merged with what
   the Worker knows. Every column below is a field that endpoint actually
   returns — the old per-row "View" button opened nothing, and the seat it took
   now shows the session count the API was already sending. */
function DevBuyers({ users }) {
  const [q, setQ] = useState("");
  const filtered = users.filter(u =>
    q === "" || u.email.toLowerCase().includes(q.toLowerCase())
  );
  const buyers = filtered.filter(u => u.role !== "dev");
  const devs   = filtered.filter(u => u.role === "dev");
  const active = users.filter(u => u.lastSeen && (Date.now() - u.lastSeen) < 5 * 60 * 1000).length;

  return (
    <>
      <DashHead title="Buyers" sub="Everyone with an account, and whether their launcher is live." />
      <div className="dash-stats">
        <Stat label="Total accounts" value={users.length} />
        {/* Named for what it counts. Whether an account has PAID is the
            entitlement record, which this endpoint does not return. */}
        <Stat label="Buyer accounts" value={buyers.length} accent />
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
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: "auto" }}>
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </span>
      </div>

      <div className="dash-card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Last seen</th>
              <th style={{ textAlign: "right" }}>Sessions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan="6" style={{ textAlign: "center", padding: 40, color: "var(--fg-3)" }}>
                {users.length === 0 ? "No accounts yet — sign up a buyer to see them here." : `No accounts match "${q}".`}
              </td></tr>
            )}
            {filtered.map(u => {
              const isLive = u.lastSeen && (Date.now() - u.lastSeen) < 5 * 60 * 1000;
              const ini = u.email.slice(0, 2).toUpperCase();
              return (
                <tr key={u.email}>
                  <td>
                    <span className="dash-avatar small">{ini}</span>
                  </td>
                  <td style={{ fontWeight: 600, color: "var(--fg)", fontFamily: "var(--mono)", fontSize: 12.5 }}>{u.email}</td>
                  <td>
                    {u.role === "dev"
                      ? <span style={{ color: "var(--acc)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase" }}>● Dev</span>
                      : <span style={{ color: "var(--fg-2)", fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.16em", textTransform: "uppercase" }}>Buyer</span>}
                  </td>
                  <td className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{u.createdAt ? fmtDate(u.createdAt) : "—"}</td>
                  <td className="mono" style={{ fontSize: 12, color: isLive ? "var(--acc)" : "var(--fg-2)" }}>
                    {isLive ? <><span className="dot-live" />now</> : (u.lastSeen ? fmtTime(u.lastSeen) : "—")}
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
    { name: "Outage",   body: "ConfigCloud is degraded — sync may take up to 5 minutes. We're working on it. No action needed." },
    { name: "Security", body: "If you see anyone selling Skill licenses outside skill.gg, they're scams. Buy only from our store. Watchdog wave is rumored — keep Self Destruct bound." },
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
          placeholder="Write something to your buyers… Release notes, outages, security advisories. Markdown isn't parsed — keep it short and direct."
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
