// hero.jsx — uses the real Skilled ClickGUI from the screenshots
const { useState, useEffect } = React;

/* The actual Skilled ClickGUI — recreated to match the product screenshot */
function ClickGuiShot() {
  const modules = [
    { name: "AutoClicker",   desc: "CPS synthesis on primary input",       cat: "Combat",   on: true  },
    { name: "Right Clicker", desc: "Synthetic R2 while holding M1",        cat: "Combat",   on: true  },
    { name: "Reach",         desc: "Extended entity hit distance",          cat: "Combat",   on: false },
    { name: "W-Tap",         desc: "Sprint-reset for max knockback every hit", cat: "Combat", on: true  },
    { name: "AimAssist",     desc: "Smooth crosshair-snap to closest target",  cat: "Combat", on: true  },
    { name: "Antibot",       desc: "Filter bots from all feature targeting",   cat: "Combat", on: true  },
  ];
  const tabs = [
    { name: "All",     count: 14, active: true  },
    { name: "Combat",  count: 6,  active: false },
    { name: "Movement",count: 3,  active: false },
    { name: "Visual",  count: 4,  active: false },
    { name: "Legit",   count: 1,  active: false },
    { name: "Misc",    count: 0,  active: false },
  ];

  return (
    <div style={{
      width: "100%",
      borderRadius: 16,
      background: "linear-gradient(180deg, oklch(0.13 0.025 290), oklch(0.10 0.02 290))",
      border: "1px solid oklch(1 0 0 / 0.08)",
      boxShadow: "0 60px 120px -40px oklch(0 0 0 / 0.85), 0 0 0 1px oklch(1 0 0 / 0.04), 0 0 80px -20px var(--acc-glow)",
      overflow: "hidden",
      display: "grid",
      gridTemplateColumns: "200px 1fr",
      minHeight: 480,
    }}>
      {/* ─── sidebar ─── */}
      <div style={{
        borderRight: "1px solid oklch(1 0 0 / 0.06)",
        padding: 18,
        display: "flex", flexDirection: "column",
        background: "oklch(0.10 0.018 290 / 0.5)",
      }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 4px 22px", borderBottom: "1px solid oklch(1 0 0 / 0.06)", marginBottom: 18 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            border: "1.5px solid oklch(0.45 0.20 305)",
            display: "grid", placeItems: "center",
          }}>
            <div style={{ width: 13, height: 13, borderRadius: "50%", background: "var(--acc)" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>Skilled</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--fg-3)", marginTop: 3 }}>v1.0 · premium</span>
          </div>
        </div>

        <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.18em", marginBottom: 10, paddingLeft: 4 }}>MENU</div>

        {/* nav items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          {[
            { name: "Modules",  icon: "modules",  active: true  },
            { name: "Cloud",    icon: "cloud",    active: false },
            { name: "Alts",     icon: "alts",     active: false },
            { name: "Scripts",  icon: "scripts",  active: false },
            { name: "Profiles", icon: "profiles", active: false },
            { name: "Settings", icon: "settings", active: false },
          ].map(item => (
            <div key={item.name} style={{
              height: 36, padding: "0 12px",
              borderRadius: 8,
              display: "flex", alignItems: "center", gap: 10,
              background: item.active ? "oklch(1 0 0 / 0.05)" : "transparent",
              color: item.active ? "var(--fg)" : "var(--fg-2)",
              fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: item.active ? 500 : 400,
            }}>
              <SidebarIcon name={item.icon} active={item.active} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>

        {/* offline pill at bottom */}
        <div style={{
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          background: "oklch(1 0 0 / 0.03)",
          border: "1px solid oklch(1 0 0 / 0.05)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "oklch(0.72 0.20 145)" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500 }}>Offline</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--fg-3)", marginTop: 2 }}>Not signed in</span>
          </div>
        </div>
      </div>

      {/* ─── main panel ─── */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 16, fontWeight: 500, color: "var(--fg)", marginBottom: 4 }}>Modules</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-3)" }}>Toggle, configure, manage features</div>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 12px",
            background: "oklch(1 0 0 / 0.04)",
            border: "1px solid oklch(1 0 0 / 0.06)",
            borderRadius: 10,
            width: 180,
          }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ width: 12, height: 12, color: "var(--fg-3)" }}>
              <circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" />
            </svg>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--fg-3)" }}>Search...</span>
          </div>
        </div>

        {/* tab pills */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {tabs.map(t => (
            <div key={t.name} style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: t.active ? "var(--acc)" : "oklch(1 0 0 / 0.04)",
              border: `1px solid ${t.active ? "var(--acc)" : "oklch(1 0 0 / 0.06)"}`,
              color: t.active ? "oklch(0.10 0.01 285)" : "var(--fg-2)",
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>{t.name}</span>
              <span style={{ opacity: t.active ? 0.65 : 0.7 }}>{t.count}</span>
            </div>
          ))}
        </div>

        {/* category divider — COMBAT */}
        <div style={{
          fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--fg-3)",
          letterSpacing: "0.18em", padding: "8px 0",
          borderLeft: "2px solid oklch(1 0 0 / 0.1)", paddingLeft: 10,
          marginBottom: 10,
        }}>
          COMBAT
        </div>

        {/* module grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {modules.map(m => (
            <ModuleCard key={m.name} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ name, desc, on }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 10,
      background: "oklch(1 0 0 / 0.03)",
      border: "1px solid oklch(1 0 0 / 0.06)",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <ModuleIcon />
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, lineHeight: 1.2 }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 500, color: "var(--fg)", marginBottom: 3 }}>{name}</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</span>
      </div>
      <Toggle on={on} />
    </div>
  );
}

function Toggle({ on }) {
  return (
    <div style={{
      width: 30, height: 16, borderRadius: 10, position: "relative", flexShrink: 0,
      background: on ? "var(--acc)" : "oklch(1 0 0 / 0.06)",
      transition: "background 0.2s",
    }}>
      <div style={{
        position: "absolute", top: 2, left: on ? 16 : 2,
        width: 12, height: 12, borderRadius: "50%",
        background: on ? "oklch(0.98 0 0)" : "oklch(0.4 0 0)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

function ModuleIcon() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 7,
      background: "oklch(1 0 0 / 0.04)",
      border: "1px solid oklch(1 0 0 / 0.05)",
      display: "grid", placeItems: "center", flexShrink: 0,
    }}>
      <svg viewBox="0 0 12 12" fill="none" stroke="var(--fg-2)" strokeWidth="1.2" style={{ width: 11, height: 11 }}>
        <circle cx="6" cy="6" r="3.5" />
        <circle cx="6" cy="6" r="1" fill="var(--fg-2)" />
      </svg>
    </div>
  );
}

function SidebarIcon({ name, active }) {
  const color = active ? "var(--fg)" : "var(--fg-3)";
  const sw = 1.4;
  switch (name) {
    case "modules":
      return <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw} style={{ width: 14, height: 14 }}>
        <rect x="2" y="2" width="5" height="5" rx="0.8" /><rect x="9" y="2" width="5" height="5" rx="0.8" />
        <rect x="2" y="9" width="5" height="5" rx="0.8" /><rect x="9" y="9" width="5" height="5" rx="0.8" />
      </svg>;
    case "cloud":
      return <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw} style={{ width: 14, height: 14 }}>
        <path d="M5 11H4a3 3 0 1 1 0.5-5.95A4 4 0 0 1 12.5 6a2.5 2.5 0 0 1 0.5 5H11" />
      </svg>;
    case "alts":
      return <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw} style={{ width: 14, height: 14 }}>
        <circle cx="6" cy="6" r="2.5" /><path d="M2 14a4 4 0 0 1 8 0M11 7a2 2 0 1 0 0-4M12 14a3 3 0 0 0-2-2.8" />
      </svg>;
    case "scripts":
      return <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw} style={{ width: 14, height: 14 }}>
        <path d="M6 4L3 8l3 4M10 4l3 4-3 4" />
      </svg>;
    case "profiles":
      return <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw} style={{ width: 14, height: 14 }}>
        <path d="M2 12V5l3-2h9v9H5z" />
      </svg>;
    case "settings":
      return <svg viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth={sw} style={{ width: 14, height: 14 }}>
        <circle cx="8" cy="8" r="2" /><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4" />
      </svg>;
    default: return null;
  }
}

function Hero() {
  return (
    <section style={{ paddingTop: 48, paddingBottom: 100, position: "relative" }}>
      <div className="shell" style={{ position: "relative" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 4fr) minmax(0, 7fr)",
          gap: 64, alignItems: "center",
          minHeight: 540,
        }}>
          {/* left — copy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22, animation: "drift-up 0.6s ease both" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
              fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-2)",
            }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)" }} />
              v1.0 · premium
            </span>

            <h1 style={{
              fontSize: "clamp(48px, 7.4vw, 108px)",
              lineHeight: 0.94, letterSpacing: "-0.05em",
              fontWeight: 700,
            }}>
              the ghost client<br/>
              <span style={{ color: "var(--fg-3)" }}>for </span><span style={{ color: "var(--acc)" }}>1.8.9</span><br/>
              <span style={{ color: "var(--fg-3)" }}>pvp.</span>
            </h1>

            <p style={{
              fontSize: 16, maxWidth: 380, color: "var(--fg-1)",
              lineHeight: 1.55,
            }}>
              fourteen modules. cloud configs. scripts api. free, forever.
            </p>

            <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary btn-lg">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                  <path d="M8 2v9m0 0l-3-3m3 3l3-3M3 14h10" />
                </svg>
                download skilled
              </button>
              <button className="btn btn-ghost btn-lg">
                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 11, height: 11 }}>
                  <path d="M5 3v10l8-5z" />
                </svg>
                trailer
              </button>
            </div>

            <div style={{
              display: "flex", gap: 18, marginTop: 16,
              paddingTop: 16, borderTop: "1px solid var(--line)",
              color: "var(--fg-3)", fontSize: 12.5, fontFamily: "var(--mono)",
              flexWrap: "wrap",
            }}>
              <span><span style={{ color: "var(--fg)" }}>free</span> to use</span>
              <span><span style={{ color: "var(--fg)" }}>1.8.9</span> / <span style={{ color: "var(--fg)" }}>1.7.10</span></span>
              <span><span style={{ color: "var(--fg)" }}>win</span> · <span style={{ color: "var(--fg)" }}>mac</span> · <span style={{ color: "var(--fg)" }}>linux</span></span>
            </div>
          </div>

          {/* right — actual ClickGUI */}
          <div style={{ animation: "drift-up 0.7s ease 0.1s both" }}>
            <ClickGuiShot />
          </div>
        </div>
      </div>
    </section>
  );
}

window.Hero = Hero;
window.ClickGuiShot = ClickGuiShot;
window.ModuleCard = ModuleCard;
window.Toggle = Toggle;
