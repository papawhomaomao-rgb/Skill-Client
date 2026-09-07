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
    case "themes":   return <svg {...p}><circle cx="8" cy="8" r="5"/><path d="M8 3v10M3 8h10"/></svg>;
    case "profiles": return <svg {...p}><path d="M2 12V5l3-2h9v9H5z"/></svg>;
    case "settings": return <svg {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1.6v1.7M8 12.7v1.7M14.4 8h-1.7M3.3 8H1.6M12.5 3.5l-1.2 1.2M4.7 11.3l-1.2 1.2M12.5 12.5l-1.2-1.2M4.7 4.7 3.5 3.5"/></svg>;
    default: return null;
  }
}

function GuiToggle({ on }) {
  return (
    <div style={{ width: 30, height: 17, borderRadius: 10, flexShrink: 0, position: "relative", background: on ? "var(--acc)" : "oklch(1 0 0 / 0.09)", transition: "background .18s" }}>
      <div style={{ position: "absolute", top: 2.5, left: on ? 15.5 : 2.5, width: 12, height: 12, borderRadius: "50%", background: on ? "oklch(1 0 0)" : "oklch(0.44 0 0)", transition: "left .18s" }} />
    </div>
  );
}

function GuiModuleCard({ name, desc, on }) {
  return (
    <div style={{ padding: "11px 13px", borderRadius: 9, background: on ? "oklch(1 0 0 / 0.045)" : "oklch(1 0 0 / 0.022)", border: `1px solid ${on ? "var(--acc-line)" : "var(--line-2)"}`, display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
      <div style={{ width: 27, height: 27, borderRadius: 7, background: on ? "var(--acc-soft)" : "oklch(1 0 0 / 0.04)", border: `1px solid ${on ? "var(--acc-line)" : "var(--line-2)"}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
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
  const [mode, setMode] = useState("image"); // "image" | "interactive"
  const [selectedModule, setSelectedModule] = useState("Auto Clicker");
  const [moduleStates, setModuleStates] = useState({
    "Auto Clicker": true,
    "Right Clicker": true,
    "W-Tap": true,
    "Aim Assist": true,
    "Anti-Bot": true,
    "Auto Sprint": true,
    "Bridge Assist": true,
    "ESP": true,
  });
  const [slowestCps, setSlowestCps] = useState(13.2);
  const [fastestCps, setFastestCps] = useState(19.9);
  const [delaySec, setDelaySec] = useState(0.16);
  const [swordOnly, setSwordOnly] = useState(true);

  const toggleModule = (name, e) => {
    if (e) e.stopPropagation();
    setModuleStates(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const navItems = [
    { name: "Modules", icon: "modules", group: "WORKSPACE", desc: "Toggle and configure", active: true },
    { name: "Cloud", icon: "cloud", group: "WORKSPACE", desc: "Browse shared configs" },
    { name: "Themes", icon: "themes", group: "WORKSPACE", desc: "Recolour the interface" },
    { name: "Scripts", icon: "scripts", group: "WORKSPACE", desc: "Scripting ecosystem" },
    { name: "Profiles", icon: "profiles", group: "CLIENT", desc: "Save and load setups" },
    { name: "Settings", icon: "settings", group: "CLIENT", desc: "Workspace and safety" },
  ];

  return (
    <div className="frame" style={{ background: "#121212", border: "1px solid var(--line-3)", boxShadow: "var(--sh-4)", overflow: "hidden", borderRadius: 12 }}>
      {/* Top Window Navigation Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--line)", background: "rgba(0,0,0,0.4)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--fg-2)", marginLeft: 6 }}>SKILL Client — In-Game GUI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", padding: 2, borderRadius: 6, gap: 2 }}>
            <button 
              onClick={() => setMode("image")} 
              style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: mode === "image" ? "var(--acc-soft)" : "transparent", color: mode === "image" ? "var(--acc)" : "var(--fg-3)", border: mode === "image" ? "1px solid var(--acc-line)" : "1px solid transparent", transition: "all .15s" }}>
              Screenshot View
            </button>
            <button 
              onClick={() => setMode("interactive")} 
              style={{ padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 500, background: mode === "interactive" ? "var(--acc-soft)" : "transparent", color: mode === "interactive" ? "var(--acc)" : "var(--fg-3)", border: mode === "interactive" ? "1px solid var(--acc-line)" : "1px solid transparent", transition: "all .15s" }}>
              Interactive View
            </button>
          </div>
        </div>
      </div>

      {mode === "image" ? (
        <div style={{ width: "100%", background: "#181818", display: "flex", justifyContent: "center", alignItems: "center" }}>
          <img 
            src="uploads/skill_gui_clean.png" 
            alt="Skilled GUI Interface" 
            style={{ width: "100%", height: "auto", display: "block" }} 
          />
        </div>
      ) : (
        /* Interactive 3-column Client GUI replica matching the screenshot */
        <div style={{ display: "grid", gridTemplateColumns: "200px 320px 1fr", minHeight: 520, background: "#161616", fontSize: 12, color: "#d0d0d0" }}>
          {/* Column 1: Sidebar */}
          <div style={{ borderRight: "1px solid var(--line)", padding: "14px 12px", display: "flex", flexDirection: "column", background: "#141414" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--line)", marginBottom: 12 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#ffffff", display: "grid", placeItems: "center", color: "#000", fontWeight: 800, fontSize: 11 }}>
                SK
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.05em", color: "#fff" }}>SKILL</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
              <div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>WORKSPACE</span>
                {navItems.filter(i => i.group === "WORKSPACE").map(i => (
                  <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 6, background: i.active ? "rgba(255,255,255,0.06)" : "transparent", color: i.active ? "#fff" : "var(--fg-3)", cursor: "pointer", marginBottom: 2 }}>
                    <SidebarIcon name={i.icon} active={i.active} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 11.5, fontWeight: i.active ? 600 : 400 }}>{i.name}</span>
                      <span style={{ fontSize: 9, color: "var(--fg-3)" }}>{i.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>CLIENT</span>
                {navItems.filter(i => i.group === "CLIENT").map(i => (
                  <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px", borderRadius: 6, color: "var(--fg-3)", cursor: "pointer", marginBottom: 2 }}>
                    <SidebarIcon name={i.icon} active={false} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 11.5 }}>{i.name}</span>
                      <span style={{ fontSize: 9, color: "var(--fg-3)" }}>{i.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>LOAD OUT</span>
                <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div key={idx} style={{ flex: 1, height: 4, borderRadius: 2, background: idx < 10 ? "var(--acc)" : "rgba(255,255,255,0.1)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-3)", marginBottom: 6 }}>
                  <span>10 of 12 active</span>
                </div>
                <div style={{ fontSize: 10, color: "var(--fg-3)", display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Combat</span><span>5/5</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Movement</span><span>2/2</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Visual</span><span>4/4</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Legit</span><span>1/1</span></div>
                </div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "var(--fg-3)" }}>
                  <span>Menu key</span>
                  <span style={{ padding: "1px 5px", background: "rgba(255,255,255,0.08)", borderRadius: 4 }}>Right Shift</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, padding: "8px 10px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#333", color: "#fff", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 700 }}>SK</div>
              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff" }}>qinnn</span>
                <span style={{ fontSize: 9, color: "#4cd964" }}>Connected</span>
              </div>
            </div>
          </div>

          {/* Column 2: Catalogue */}
          <div style={{ borderRight: "1px solid var(--line)", padding: "14px 14px", display: "flex", flexDirection: "column", background: "#181818" }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              {["All 12", "Combat 5", "Movement 2", "Visual 4", "Legit 1", "Misc 0"].map((t, idx) => (
                <span key={t} style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10.5, background: idx === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)", color: idx === 0 ? "#fff" : "var(--fg-3)", cursor: "pointer" }}>
                  {t}
                </span>
              ))}
            </div>

            <div style={{ fontSize: 9.5, fontWeight: 600, color: "var(--fg-3)", letterSpacing: "0.08em", marginBottom: 10 }}>
              CATALOGUE · 12 shown · All modules
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1, overflowY: "auto" }}>
              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>COMBAT 5</span>
                {[
                  { name: "Auto Clicker", sub: "13.2-19.9 per sec" },
                  { name: "Right Clicker", sub: "10.0-15.7 per sec · Blocks only" },
                  { name: "W-Tap", sub: "1 tick · Tape back" },
                  { name: "Aim Assist", sub: "Gently pulls your crosshair toward a target" },
                  { name: "Anti-Bot", sub: "Stops other features targeting fake players" },
                ].map(m => (
                  <div key={m.name} onClick={() => setSelectedModule(m.name)} style={{ padding: "8px 10px", borderRadius: 7, background: selectedModule === m.name ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedModule === m.name ? "rgba(255,255,255,0.15)" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff" }}>{m.name}</span>
                      <span style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{m.sub}</span>
                    </div>
                    <GuiToggle on={!!moduleStates[m.name]} />
                  </div>
                ))}
              </div>

              <div>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>MOVEMENT 2</span>
                {[
                  { name: "Auto Sprint", sub: "Holds sprint for you · Game's own rules" },
                  { name: "Bridge Assist", sub: "Sneaks early · Holds 25 ms" },
                ].map(m => (
                  <div key={m.name} onClick={() => setSelectedModule(m.name)} style={{ padding: "8px 10px", borderRadius: 7, background: selectedModule === m.name ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedModule === m.name ? "rgba(255,255,255,0.15)" : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff" }}>{m.name}</span>
                      <span style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{m.sub}</span>
                    </div>
                    <GuiToggle on={!!moduleStates[m.name]} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Inspector Panel */}
          <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", background: "#161616" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.08em" }}>COMBAT</span>
              <div style={{ cursor: "pointer" }} onClick={(e) => toggleModule(selectedModule, e)}>
                <GuiToggle on={!!moduleStates[selectedModule]} />
              </div>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>{selectedModule}</h3>
            <p style={{ fontSize: 11, color: "var(--fg-3)", margin: "0 0 20px" }}>Clicks for you while you hold left mouse</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <span style={{ fontSize: 10, color: "var(--fg-3)", display: "block", marginBottom: 6 }}>Speed</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", display: "block", marginBottom: 8 }}>Clicks Per Second</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", textAlign: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--fg-3)", display: "block" }}>Slowest</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{slowestCps}</span>
                  </div>
                  <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", textAlign: "center" }}>
                    <span style={{ fontSize: 10, color: "var(--fg-3)", display: "block" }}>Fastest</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{fastestCps}</span>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 8 }}>
                  <span style={{ color: "var(--fg-3)" }}>Delay</span>
                  <span style={{ fontWeight: 600, color: "#fff" }}>{delaySec} s</span>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="0.5" 
                  step="0.01" 
                  value={delaySec} 
                  onChange={e => setDelaySec(parseFloat(e.target.value))} 
                  style={{ width: "100%", accentColor: "var(--acc)", cursor: "pointer" }} 
                />
              </div>

              <div>
                <span style={{ fontSize: 10, color: "var(--fg-3)", display: "block", marginBottom: 8 }}>When It Runs</span>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "#fff", cursor: "pointer" }}>
                  <input type="checkbox" checked={swordOnly} onChange={e => setSwordOnly(e.target.checked)} style={{ accentColor: "var(--acc)" }} />
                  Only With A Sword
                </label>
              </div>

              <div style={{ marginTop: 10, padding: 14, borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px dashed var(--line)" }}>
                <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.08em", display: "block", textAlign: "center", marginBottom: 10 }}>HOW IT BEHAVES</span>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10.5, color: "var(--fg-2)", display: "flex", flexDirection: "column", gap: 6, lineHeight: 1.4 }}>
                  <li>Runs while you hold left mouse. Let go to stop.</li>
                  <li>A fresh speed is drawn from your range for every click.</li>
                  <li>Waits {delaySec}s after you press before the first click.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── in-game HUD overlay ─────────── */

function HudModuleList() {
  const active = ["Right Clicker", "Trajectories", "AutoClicker", "Auto Sprint", "Player ESP", "AimAssist", "Scaffold", "Freelook", "NameTags", "Antibot", "W-Tap"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 12px", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 7 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--acc)" }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "-.012em" }}>Skilled</span>
        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{active.length}</span>
      </div>
      {active.map(m => (
        <div key={m} style={{ padding: "5px 13px", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 7, fontSize: 12.5, fontWeight: 500, letterSpacing: "-.012em", color: "var(--fg-1)" }}>{m}</div>
      ))}
    </div>
  );
}

/* ─────────── hero ─────────── */

function Hero({ onBuySkill }) {
  return (
    <section style={{ padding: "84px 0 0", position: "relative" }}>
      <div className="shell">
        <div className="rise" style={{ maxWidth: 880, margin: "0 auto", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="pill" style={{ marginBottom: 26 }}>
            <span className="dot" />Version 1.0 is out now
          </span>

          <h1 className="h-display">
            The cheapest and most undetectable client on the market.
          </h1>

          <p className="lead" style={{ maxWidth: 540 }}>
            Built for subtle advantages allowing skill into your gameplay.
          </p>

          <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap", justifyContent: "center" }}>
            <button onClick={onBuySkill} className="btn btn-primary btn-lg">
              Buy Skill
            </button>
            <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer" className="btn btn-blue btn-lg">
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 15, height: 15 }}><path d="M13.5 3a13.4 13.4 0 0 0-3.3-1l-.2.3a12 12 0 0 0-4 0l-.2-.3a13.4 13.4 0 0 0-3.3 1A14 14 0 0 0 .3 11a13.5 13.5 0 0 0 4 2l.3-.4a8.6 8.6 0 0 1-1.4-.7c.1-.1.2-.2.3-.2a9.6 9.6 0 0 0 8.2 0l.3.2a8.6 8.6 0 0 1-1.4.7l.4.4a13.5 13.5 0 0 0 4-2 13.9 13.9 0 0 0-2.4-8ZM5.4 9.4c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Zm5.2 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Z"/></svg>
              Join Discord
            </a>
          </div>

          <p className="small dim" style={{ marginTop: 18 }}>
            Windows · Minecraft 1.8.9 and 1.7.10
          </p>
        </div>

        <div className="rise" style={{ position: "relative", marginTop: 72, animationDelay: ".12s" }}>
          <ClickGuiShot />
        </div>
      </div>

      <div className="shell" style={{ marginTop: 88 }}>
        <div className="spec">
          {[
            { k: "14", v: "Modules, all included" },
            { k: "Lua", v: "Scripting API" },
            { k: "1.8.9 / 1.7.10", v: "Supported versions" },
            { k: "1 device", v: "Per account, cloud synced" },
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
