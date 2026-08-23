// hero.jsx — centered hero with the real Skilled ClickGUI as the anchor
const { useState } = React;

/* ─────────── product recreation: Skilled ClickGUI ─────────── */

function SidebarIcon({ name, active }) {
  const c = active ? "var(--fg)" : "var(--fg-3)";
  const p = { viewBox: "0 0 16 16", fill: "none", stroke: c, strokeWidth: 1.4, style: { width: 14, height: 14 } };
  switch (name) {
    case "modules":  return <svg {...p}><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>;
    case "cloud":    return <svg {...p}><path d="M5 11H4a3 3 0 1 1 .5-5.95A4 4 0 0 1 12.5 6a2.5 2.5 0 0 1 .5 5H11"/></svg>;
    case "alts":     return <svg {...p}><circle cx="6" cy="6" r="2.5"/><path d="M2 14a4 4 0 0 1 8 0M11 7a2 2 0 1 0 0-4M12 14a3 3 0 0 0-2-2.8"/></svg>;
    case "scripts":  return <svg {...p}><path d="M6 4 3 8l3 4M10 4l3 4-3 4"/></svg>;
    case "profiles": return <svg {...p}><path d="M2 12V5l3-2h9v9H5z"/></svg>;
    case "settings": return <svg {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1.6v1.7M8 12.7v1.7M14.4 8h-1.7M3.3 8H1.6M12.5 3.5l-1.2 1.2M4.7 11.3l-1.2 1.2M12.5 12.5l-1.2-1.2M4.7 4.7 3.5 3.5"/></svg>;
    default: return null;
  }
}

function GuiToggle({ on }) {
  return (
    <div style={{ width: 30, height: 17, borderRadius: 10, flexShrink: 0, position: "relative", background: on ? "var(--acc)" : "oklch(1 0 0 / 0.07)", boxShadow: on ? "0 0 12px -2px var(--acc-glow)" : "none", transition: "background .18s" }}>
      <div style={{ position: "absolute", top: 2.5, left: on ? 15.5 : 2.5, width: 12, height: 12, borderRadius: "50%", background: on ? "oklch(1 0 0)" : "oklch(0.44 0 0)", transition: "left .18s" }} />
    </div>
  );
}

function GuiModuleCard({ name, desc, on }) {
  return (
    <div style={{ padding: "11px 13px", borderRadius: 11, background: on ? "oklch(1 0 0 / 0.045)" : "oklch(1 0 0 / 0.022)", border: `1px solid ${on ? "var(--acc-line)" : "var(--line-2)"}`, display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <div style={{ width: 27, height: 27, borderRadius: 8, background: on ? "var(--acc-soft)" : "oklch(1 0 0 / 0.04)", border: `1px solid ${on ? "var(--acc-line)" : "var(--line-2)"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <svg viewBox="0 0 12 12" fill="none" stroke={on ? "var(--acc)" : "var(--fg-3)"} strokeWidth="1.2" style={{ width: 11, height: 11 }}>
          <circle cx="6" cy="6" r="3.6"/><circle cx="6" cy="6" r="1" fill={on ? "var(--acc)" : "var(--fg-3)"}/>
        </svg>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-.012em", color: "var(--fg)" }}>{name}</span>
        <span style={{ fontSize: 11, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</span>
      </div>
      <GuiToggle on={on} />
    </div>
  );
}

function ClickGuiShot() {
  const modules = [
    { name: "AutoClicker",   desc: "CPS synthesis on primary input",       on: true  },
    { name: "Right Clicker", desc: "Synthetic R2 while holding M1",        on: true  },
    { name: "Reach",         desc: "Extended entity hit distance",         on: false },
    { name: "W-Tap",         desc: "Sprint-reset for max knockback",       on: true  },
    { name: "AimAssist",     desc: "Smooth snap to closest target",        on: true  },
    { name: "Antibot",       desc: "Filter bots from all targeting",       on: true  },
  ];
  const tabs = [
    { name: "All", count: 14, active: true }, { name: "Combat", count: 6 },
    { name: "Movement", count: 3 }, { name: "Visual", count: 4 },
    { name: "Legit", count: 1 }, { name: "Misc", count: 0 },
  ];
  const nav = [
    { name: "Modules", icon: "modules", active: true }, { name: "Cloud", icon: "cloud" },
    { name: "Alts", icon: "alts" }, { name: "Scripts", icon: "scripts" },
    { name: "Profiles", icon: "profiles" }, { name: "Settings", icon: "settings" },
  ];

  return (
    <div className="frame" style={{ display: "grid", gridTemplateColumns: "204px 1fr", minHeight: 470 }}>
      {/* sidebar */}
      <div style={{ borderRight: "1px solid var(--line)", padding: 16, display: "flex", flexDirection: "column", background: "oklch(0.075 0.016 292 / 0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "4px 4px 18px", borderBottom: "1px solid var(--line)", marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid var(--acc-line)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--acc)", boxShadow: "0 0 10px var(--acc-glow)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.015em" }}>Skilled</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--fg-3)" }}>v1.0 · premium</span>
          </div>
        </div>
        <span className="label" style={{ fontSize: 10, paddingLeft: 4, marginBottom: 9 }}>Menu</span>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {nav.map(i => (
            <div key={i.name} style={{ height: 34, padding: "0 11px", borderRadius: 9, display: "flex", alignItems: "center", gap: 10, background: i.active ? "oklch(1 0 0 / 0.055)" : "transparent", color: i.active ? "var(--fg)" : "var(--fg-2)", fontSize: 13, fontWeight: i.active ? 600 : 500, letterSpacing: "-.012em" }}>
              <SidebarIcon name={i.icon} active={i.active} />{i.name}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 11, background: "oklch(1 0 0 / 0.03)", border: "1px solid var(--line-2)", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "oklch(0.74 0.19 148)", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Offline</span>
            <span style={{ fontSize: 10, color: "var(--fg-3)" }}>Not signed in</span>
          </div>
        </div>
      </div>

      {/* main */}
      <div style={{ padding: "18px 22px 22px", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-.02em", marginBottom: 4 }}>Modules</div>
            <div style={{ fontSize: 12.5, color: "var(--fg-3)" }}>Toggle, configure, manage features</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 32, width: 172, borderRadius: 9, background: "oklch(1 0 0 / 0.04)", border: "1px solid var(--line-2)", flexShrink: 0 }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--fg-3)" strokeWidth="1.4" style={{ width: 12, height: 12 }}><circle cx="7" cy="7" r="4.5"/><path d="m11 11 3 3"/></svg>
            <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>Search…</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, marginBottom: 18, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <div key={t.name} style={{ padding: "5px 11px", borderRadius: 7, background: t.active ? "var(--acc-soft)" : "transparent", border: `1px solid ${t.active ? "var(--acc-line)" : "var(--line-2)"}`, color: t.active ? "var(--acc)" : "var(--fg-2)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
              {t.name}<span style={{ opacity: .6 }}>{t.count}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 11 }}>
          <span className="label" style={{ fontSize: 10 }}>Combat</span>
          <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          {modules.map(m => <GuiModuleCard key={m.name} {...m} />)}
        </div>
      </div>
    </div>
  );
}

/* ─────────── in-game HUD overlay ─────────── */

function HudModuleList() {
  const active = ["Right Clicker", "Trajectories", "AutoClicker", "Auto Sprint", "Player ESP", "AimAssist", "Scaffold", "Freelook", "NameTags", "Antibot", "W-Tap"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "oklch(0.06 0.014 290 / 0.92)", border: "1px solid var(--acc-line)", borderRadius: 14, boxShadow: "0 2px 12px oklch(0 0 0 / 0.5)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--acc)", boxShadow: "0 0 7px var(--acc-glow)" }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-.012em" }}>Skilled</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{active.length}</span>
      </div>
      {active.map(m => (
        <div key={m} style={{ padding: "5px 13px", background: "oklch(0.06 0.014 290 / 0.9)", border: "1px solid var(--line-2)", borderRadius: 14, fontSize: 12.5, fontWeight: 500, letterSpacing: "-.012em", color: "var(--fg-1)", boxShadow: "0 2px 8px oklch(0 0 0 / 0.4)" }}>{m}</div>
      ))}
    </div>
  );
}

/* ─────────── hero ─────────── */

function Hero() {
  return (
    <section style={{ padding: "84px 0 0", position: "relative" }}>
      <div className="shell">
        <div className="rise" style={{ maxWidth: 780, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="pill" style={{ marginBottom: 26 }}>
            <span className="dot" />Version 1.0 is out now
          </span>

          <h1 className="h-display grad-txt">
            The ghost client<br/>built for 1.8&nbsp;PvP.
          </h1>

          <p className="lead" style={{ maxWidth: 540 }}>
            Fourteen tuned modules, cloud-synced configs, and a scripting API —
            wrapped in an interface that stays out of your way. Free, with no tiers.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
            <a href="#download" className="btn btn-primary btn-lg">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ width: 14, height: 14 }}><path d="M8 2v9m0 0-3-3m3 3 3-3M3 14h10"/></svg>
              Download for free
            </a>
            <a href="#modules" className="btn btn-ghost btn-lg">Browse modules</a>
          </div>

          <p className="small dim" style={{ marginTop: 18 }}>
            Windows, macOS and Linux · Minecraft 1.8.9 and 1.7.10
          </p>
        </div>

        <div className="rise" style={{ position: "relative", marginTop: 72, animationDelay: ".12s" }}>
          <div className="glow-under" />
          <ClickGuiShot />
        </div>
      </div>

      <div className="shell" style={{ marginTop: 88 }}>
        <div className="spec">
          {[
            { k: "14", v: "Modules, all unlocked" },
            { k: "Free", v: "No tiers or paywalls" },
            { k: "1.8.9 / 1.7.10", v: "Supported versions" },
            { k: "3 devices", v: "Per account, cloud synced" },
          ].map(s => (
            <div key={s.v}>
              <span className="k">{s.k}</span>
              <span className="v">{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Hero, ClickGuiShot, HudModuleList, GuiToggle, GuiModuleCard });
