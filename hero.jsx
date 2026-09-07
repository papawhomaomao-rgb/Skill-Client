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
  const [selectedModule, setSelectedModule] = useState("Auto Clicker");
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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

  const allModules = [
    { name: "Auto Clicker", cat: "Combat", sub: "13.2-19.9 per sec", desc: "Clicks for you while you hold left mouse" },
    { name: "Right Clicker", cat: "Combat", sub: "10.0-15.7 per sec · Blocks only", desc: "Synthetic secondary input while holding main click" },
    { name: "W-Tap", cat: "Combat", sub: "1 tick · Tape back", desc: "Sprint-reset timing for maximum knockback output" },
    { name: "Aim Assist", cat: "Combat", sub: "Gently pulls your crosshair toward a target", desc: "Smooth subtle target tracking with custom FOV" },
    { name: "Anti-Bot", cat: "Combat", sub: "Stops other features targeting fake players", desc: "Filters out server bot entities automatically" },
    { name: "Auto Sprint", cat: "Movement", sub: "Holds sprint for you · Game's own rules", desc: "Continuous sprint injection respecting game mechanics" },
    { name: "Bridge Assist", cat: "Movement", sub: "Sneaks early · Holds 25 ms", desc: "Timing assistance for safe fast-bridging" },
    { name: "ESP", cat: "Visual", sub: "2D box · Health bar", desc: "Renders clean entity overlays and health indicators" },
  ];

  const filteredModules = allModules.filter(m => {
    const matchesCat = activeTab === "All" || activeTab.startsWith(m.cat);
    const matchesQuery = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.sub.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const activeCount = Object.values(moduleStates).filter(Boolean).length;

  const currentModObj = allModules.find(m => m.name === selectedModule) || allModules[0];

  return (
    <div className="frame" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 70px -15px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)", overflowX: "auto", borderRadius: 14 }}>
      {/* Top Application Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.35)", minWidth: 740 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: "#ffffff", display: "grid", placeItems: "center", color: "#000", fontWeight: 900, fontSize: 10, letterSpacing: "-.05em" }}>
              SK
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.02em", color: "#ffffff" }}>SKILL</span>
          </div>
          <div style={{ height: 14, width: 1, background: "rgba(255,255,255,0.12)" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#ffffff", letterSpacing: "-.01em" }}>Modules</span>
            <span style={{ fontSize: 10.5, color: "var(--fg-3)" }}>Browse features, then tune one focused setting panel</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, fontWeight: 600, color: "var(--fg-1)", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--acc)" }} />
            {activeCount} enabled
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 32, width: 180, borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--fg-3)" strokeWidth="1.4" style={{ width: 12, height: 12 }}>
              <circle cx="7" cy="7" r="4.5"/><path d="m11 11 3 3"/>
            </svg>
            <input 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              placeholder="Search modules..." 
              style={{ background: "none", border: "none", outline: "none", color: "#fff", fontSize: 11.5, width: "100%" }} 
            />
          </div>
        </div>
      </div>

      {/* 3-Column Layout Showcase */}
      <div style={{ display: "grid", gridTemplateColumns: "205px 330px 1fr", minHeight: 510, minWidth: 740, background: "#111111", fontSize: 12, color: "#d0d0d0" }}>
        
        {/* Column 1: Sidebar */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", padding: "16px 14px", display: "flex", flexDirection: "column", background: "#0d0d0d" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.09em", display: "block", marginBottom: 8 }}>WORKSPACE</span>
              {navItems.filter(i => i.group === "WORKSPACE").map(i => (
                <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, background: i.active ? "rgba(255,255,255,0.07)" : "transparent", border: `1px solid ${i.active ? "rgba(255,255,255,0.1)" : "transparent"}`, color: i.active ? "#fff" : "var(--fg-3)", cursor: "pointer", marginBottom: 3, transition: "all .12s" }}>
                  <SidebarIcon name={i.icon} active={i.active} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12, fontWeight: i.active ? 600 : 400 }}>{i.name}</span>
                    <span style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{i.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.09em", display: "block", marginBottom: 8 }}>CLIENT</span>
              {navItems.filter(i => i.group === "CLIENT").map(i => (
                <div key={i.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 7, color: "var(--fg-3)", cursor: "pointer", marginBottom: 3 }}>
                  <SidebarIcon name={i.icon} active={false} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 12 }}>{i.name}</span>
                    <span style={{ fontSize: 9.5, color: "var(--fg-3)" }}>{i.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "auto", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12 }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.09em", display: "block", marginBottom: 8 }}>LOAD OUT</span>
              <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                {Array.from({ length: 12 }).map((_, idx) => (
                  <div key={idx} style={{ flex: 1, height: 4, borderRadius: 2, background: idx < activeCount ? "var(--acc)" : "rgba(255,255,255,0.08)" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--fg-3)", marginBottom: 8 }}>
                <span>{activeCount} of 12 active</span>
              </div>
              <div style={{ fontSize: 10.5, color: "var(--fg-3)", display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Combat</span><span style={{ color: "#fff" }}>5/5</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Movement</span><span style={{ color: "#fff" }}>2/2</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Visual</span><span style={{ color: "#fff" }}>4/4</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Legit</span><span style={{ color: "#fff" }}>1/1</span></div>
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "var(--fg-3)" }}>
                <span>Menu key</span>
                <span style={{ padding: "2px 6px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: "#fff", fontWeight: 500 }}>Right Shift</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "9px 11px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#222", color: "#fff", display: "grid", placeItems: "center", fontSize: 9.5, fontWeight: 700, border: "1px solid rgba(255,255,255,0.15)" }}>SK</div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#fff" }}>qinnn</span>
              <span style={{ fontSize: 9.5, color: "oklch(0.74 0.19 148)", fontWeight: 500 }}>Connected</span>
            </div>
          </div>
        </div>

        {/* Column 2: Catalogue */}
        <div style={{ borderRight: "1px solid rgba(255,255,255,0.07)", padding: "16px 16px", display: "flex", flexDirection: "column", background: "#131313" }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
            {[
              { label: "All", count: 12 },
              { label: "Combat", count: 5 },
              { label: "Movement", count: 2 },
              { label: "Visual", count: 4 },
              { label: "Legit", count: 1 },
              { label: "Misc", count: 0 },
            ].map(t => {
              const fullTag = `${t.label} ${t.count}`;
              const isSelected = activeTab === t.label || activeTab === fullTag;
              return (
                <button 
                  key={t.label} 
                  onClick={() => setActiveTab(t.label)} 
                  style={{ padding: "4px 9px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: isSelected ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${isSelected ? "rgba(255,255,255,0.2)" : "transparent"}`, color: isSelected ? "#fff" : "var(--fg-3)", cursor: "pointer", transition: "all .12s" }}>
                  {t.label} <span style={{ opacity: 0.6, fontSize: 10 }}>{t.count}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.09em", marginBottom: 12 }}>
            CATALOGUE · {filteredModules.length} shown · All modules
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto", paddingRight: 2 }}>
            {["Combat", "Movement", "Visual"].map(catName => {
              const modsInCat = filteredModules.filter(m => m.cat === catName);
              if (modsInCat.length === 0) return null;
              return (
                <div key={catName}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.09em", display: "block", marginBottom: 7 }}>
                    {catName.toUpperCase()} {modsInCat.length}
                  </span>
                  {modsInCat.map(m => {
                    const isSelected = selectedModule === m.name;
                    const isOn = !!moduleStates[m.name];
                    return (
                      <div 
                        key={m.name} 
                        onClick={() => setSelectedModule(m.name)} 
                        style={{ padding: "10px 12px", borderRadius: 8, background: isSelected ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.025)", border: `1px solid ${isSelected ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.04)"}`, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 5, transition: "all .12s" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#ffffff" }}>{m.name}</span>
                          <span style={{ fontSize: 10, color: "var(--fg-3)" }}>{m.sub}</span>
                        </div>
                        <GuiToggle on={isOn} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Inspector Panel */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", background: "#111111" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.09em", textTransform: "uppercase" }}>
              {currentModObj.cat}
            </span>
            <div style={{ cursor: "pointer" }} onClick={(e) => toggleModule(currentModObj.name, e)}>
              <GuiToggle on={!!moduleStates[currentModObj.name]} />
            </div>
          </div>

          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", margin: "0 0 4px", letterSpacing: "-.02em" }}>{currentModObj.name}</h3>
          <p style={{ fontSize: 11.5, color: "var(--fg-3)", margin: "0 0 24px" }}>{currentModObj.desc}</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div>
              <span style={{ fontSize: 10, color: "var(--fg-3)", display: "block", marginBottom: 4 }}>Speed</span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#ffffff", display: "block", marginBottom: 10 }}>Clicks Per Second</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
                  <span style={{ fontSize: 10.5, color: "var(--fg-3)", display: "block", marginBottom: 2 }}>Slowest</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{slowestCps}</span>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
                  <span style={{ fontSize: 10.5, color: "var(--fg-3)", display: "block", marginBottom: 2 }}>Fastest</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>{fastestCps}</span>
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 10 }}>
                <span style={{ color: "var(--fg-3)" }}>Delay</span>
                <span style={{ fontWeight: 600, color: "#ffffff" }}>{delaySec} s</span>
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
              <span style={{ fontSize: 10, color: "var(--fg-3)", display: "block", marginBottom: 10 }}>When It Runs</span>
              <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "#ffffff", cursor: "pointer", userSelect: "none" }}>
                <input 
                  type="checkbox" 
                  checked={swordOnly} 
                  onChange={e => setSwordOnly(e.target.checked)} 
                  style={{ accentColor: "var(--acc)", width: 14, height: 14, cursor: "pointer" }} 
                />
                Only With A Sword
              </label>
            </div>

            <div style={{ marginTop: 6, padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.025)", border: "1px dashed rgba(255,255,255,0.12)" }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--fg-3)", letterSpacing: "0.1em", display: "block", textAlign: "center", marginBottom: 12 }}>HOW IT BEHAVES</span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "var(--fg-2)", display: "flex", flexDirection: "column", gap: 7, lineHeight: 1.45 }}>
                <li>Runs while you hold left mouse. Let go to stop.</li>
                <li>A fresh speed is drawn from your range for every click.</li>
                <li>Waits {delaySec}s after you press before the first click.</li>
              </ul>
            </div>
          </div>
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
