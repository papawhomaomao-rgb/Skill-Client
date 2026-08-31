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

function UserDashboard({ auth, leave }) {
  const ann = useAnnouncements();
  const [tab, setTab] = useState("inbox");

  const tabs = [
    { id: "inbox",   label: "Announcements", icon: "inbox", badge: ann.list.length || null },
    { id: "license", label: "License",       icon: "license" },
    { id: "devices", label: "Devices",       icon: "device" },
    { id: "security",label: "Security",      icon: "shield" },
  ];

  return (
    <DashShell auth={auth} onLeave={leave} tab={tab} setTab={setTab} tabs={tabs}>
      {tab === "inbox"    && <UserInbox list={ann.list} email={auth.email} />}
      {tab === "license"  && <UserLicense email={auth.email} />}
      {tab === "devices"  && <UserDevices />}
      {tab === "security" && <UserSecurity email={auth.email} />}
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

function UserLicense({ email }) {
  const licenseKey = `SKL-${(email || "").split("@")[0].toUpperCase().padEnd(4, "X").slice(0,4)}-${btoa(email || "x").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase()}-LIFETIME`;
  const [copied, setCopied] = useState(false);
  const copyKey = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(licenseKey);
      } else {
        // fallback for non-secure contexts (e.g. preview iframes)
        const ta = document.createElement("textarea");
        ta.value = licenseKey;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // last resort: show the key selected so the user can copy manually
      console.warn("Clipboard write failed", e);
    }
  };
  return (
    <>
      <DashHead title="License" sub="Your lifetime key and entitlements." />
      <div className="dash-grid-2">
        <div className="dash-card">
          <span className="dash-label">License key</span>
          <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 16, color: "var(--fg)", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ userSelect: "all" }}>SKL-<span style={{ color: "var(--acc)" }}>{(email || "").split("@")[0].toUpperCase().padEnd(4, "X").slice(0,4)}</span>-{btoa(email || "x").replace(/[^A-Z0-9]/gi, "").slice(0, 4).toUpperCase()}-LIFETIME</span>
            <button
              onClick={copyKey}
              className="btn btn-ghost"
              style={{
                height: 32, padding: "0 12px", fontSize: 12, minWidth: 78, justifyContent: "center",
                color: copied ? "var(--acc)" : undefined,
                borderColor: copied ? "var(--acc-line)" : undefined,
                background: copied ? "var(--acc-soft)" : undefined,
              }}>
              {copied ? (
                <>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
                    <path d="M3 8l3 3 7-7" />
                  </svg>
                  Copied
                </>
              ) : "Copy"}
            </button>
          </div>
          <hr style={{ border: 0, height: 1, background: "var(--line)", margin: "20px 0" }}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <KV k="Plan" v="Lifetime · Edition III"/>
            <KV k="Status" v={<span style={{ color: "var(--acc)" }}>● Active</span>}/>
            <KV k="Purchased" v={fmtDate(Date.now() - 12*86400*1000)}/>
            <KV k="Updates until" v="Forever"/>
          </div>
        </div>
        <div className="dash-card">
          <span className="dash-label">Entitlements</span>
          <ul style={{ margin: "14px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {["All current & future modules", "ConfigCloud · 1 device", "Weekly updates", "Self Destruct", "Discord access"].map(x => (
              <li key={x} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--fg-1)" }}>
                <span className="check" />
                {x === "Discord access" ? (
                  <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-1)", textDecoration: "underline", textUnderlineOffset: 3 }}>
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
  const devices = [
    { name: "DESKTOP-9F2K1L", os: "Windows 11", last: "now", active: true },
  ];
  return (
    <>
      <DashHead title="Device" sub="HWID-locked machine. One device per account." />
      <div className="dash-card" style={{ padding: 0 }}>
        <table className="dash-table">
          <thead><tr><th>Machine</th><th>OS</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {devices.map((d, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600, color: "var(--fg)" }}>{d.name}</td>
                <td>{d.os}</td>
                <td className="mono" style={{ fontSize: 12, color: "var(--fg-2)" }}>{d.last}</td>
                <td><span style={{ color: d.active ? "var(--acc)" : "var(--fg-3)" }}>{d.active ? "● Active" : "○ Idle"}</span></td>
                <td style={{ textAlign: "right" }}><button className="btn btn-ghost" style={{ height: 30, padding: "0 12px", fontSize: 11.5 }}>Unlink</button></td>
              </tr>
            ))}
            <tr>
              <td colSpan="5" style={{ color: "var(--fg-3)", fontSize: 13 }}>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  Unlink to move your licence — then run <code>skill-setup.exe</code> on the new machine
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function UserSecurity({ email }) {
  return (
    <>
      <DashHead title="Security" sub="Sign-in protection and emergency controls." />
      <div className="dash-grid-2">
        <div className="dash-card">
          <span className="dash-label">Two-factor authentication</span>
          <p style={{ marginTop: 10, color: "var(--fg-2)", fontSize: 13.5 }}>
            Protect this account with an authenticator app. Recommended for paid clients.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 14 }}>Enable 2FA</button>
        </div>
        <div className="dash-card" style={{ borderColor: "oklch(0.78 0.18 25 / 0.3)" }}>
          <span className="dash-label" style={{ color: "oklch(0.78 0.18 25)" }}>Panic / Self-Destruct</span>
          <p style={{ marginTop: 10, color: "var(--fg-2)", fontSize: 13.5 }}>
            Revoke every active session, wipe ConfigCloud, and force re-link on next launch.
          </p>
          <button className="btn" style={{
            marginTop: 14, background: "oklch(0.40 0.20 25)", color: "var(--fg)",
            borderColor: "oklch(0.55 0.20 25)",
          }}>Trigger panic</button>
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
      <DashHead title="Buyers" sub="Everyone with an account in your ledger." />
      <div className="dash-stats">
        <Stat label="Total accounts" value={users.length} />
        <Stat label="Paying buyers" value={buyers.length} accent />
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
              <th style={{ textAlign: "right" }}>Actions</th>
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
                  <td style={{ textAlign: "right" }}>
                    <button className="btn btn-ghost" style={{ height: 28, padding: "0 10px", fontSize: 11 }}>View</button>
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

function Dashboard({ auth, leave }) {
  if (auth.role === "dev") return <DevDashboard auth={auth} leave={leave} />;
  return <UserDashboard auth={auth} leave={leave} />;
}

Object.assign(window, { Dashboard });
