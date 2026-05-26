// sections.jsx — tighter, less marketing-deck
const { useState, useMemo, useEffect } = React;

/* ─── Features (3 cards, minimal chrome) ─── */

function FeatureSelfDestructVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 22, overflow: "hidden" }}>
      <div className="mono" style={{ fontSize: 11, lineHeight: 1.65, color: "var(--fg-1)" }}>
        <div style={{ color: "var(--fg-3)" }}>$ skill panic</div>
        <div style={{ color: "var(--acc)" }}>› erase config        ok</div>
        <div style={{ color: "var(--acc)" }}>› clear hooks         ok</div>
        <div style={{ color: "var(--acc)" }}>› drop session        ok</div>
        <div style={{ color: "var(--acc)" }}>› unload native       ok</div>
        <div style={{ color: "var(--acc)" }}>› self-overwrite      ok</div>
        <div style={{ marginTop: 6, color: "var(--fg-3)" }}>done in 387ms</div>
      </div>
    </div>
  );
}

function FeatureCleanGuiVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 16, overflow: "hidden" }}>
      <div style={{
        height: "100%", display: "grid", gridTemplateColumns: "62px 1fr", gap: 0,
        border: "1px solid var(--line-strong)", borderRadius: 6,
        background: "oklch(0.07 0.012 250)", overflow: "hidden",
      }}>
        <div style={{ borderRight: "1px solid var(--line)", padding: "6px 0", fontSize: 9, fontFamily: "var(--mono)", display: "flex", flexDirection: "column", gap: 1 }}>
          {["combat", "move", "render", "player", "misc"].map((c, i) => (
            <div key={c} style={{
              padding: "4px 8px",
              color: i === 0 ? "var(--acc)" : "var(--fg-3)",
              borderLeft: i === 0 ? "2px solid var(--acc)" : "2px solid transparent",
              background: i === 0 ? "var(--acc-soft)" : "transparent",
            }}>{c}</div>
          ))}
        </div>
        <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 3 }}>
          {[["killaura", true], ["reach", true], ["antibot", true], ["velocity", false]].map(([n, on]) => (
            <div key={n} style={{
              padding: "4px 7px", borderRadius: 3, fontSize: 9.5, fontFamily: "var(--mono)",
              background: on ? "var(--acc-soft)" : "transparent",
              border: `1px solid ${on ? "var(--acc-line)" : "var(--line)"}`,
              color: on ? "var(--fg)" : "var(--fg-3)",
            }}>{n}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureConfigCloudVisual() {
  return (
    <div style={{ position: "absolute", inset: 0, padding: 22, overflow: "hidden" }}>
      {[
        { name: "ranked-bw-v4", time: "now", me: true },
        { name: "skywars-strafe", time: "yesterday", me: true },
        { name: "uhc-classic", time: "3d · @kael", me: false },
        { name: "tower-rush", time: "1w · @vex", me: false },
      ].map((c, i) => (
        <div key={c.name} style={{
          padding: "8px 11px", borderRadius: 5, marginBottom: 5,
          background: "oklch(0.10 0.014 250)", border: "1px solid var(--line-strong)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontFamily: "var(--mono)", fontSize: 10.5,
          transform: `translateX(${i * 4}px)`,
          opacity: 1 - i * 0.1,
        }}>
          <span style={{ color: c.me ? "var(--acc)" : "var(--fg-1)" }}>{c.name}.cfg</span>
          <span style={{ color: "var(--fg-3)", fontSize: 9.5 }}>{c.time}</span>
        </div>
      ))}
    </div>
  );
}

function Features() {
  return (
    <section id="features">
      <div className="shell">
        <div style={{ marginBottom: 56, maxWidth: 720 }}>
          <h2 style={{ fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: 0.98, letterSpacing: "-0.04em", fontWeight: 700 }}>
            in-game.<br/>
            <span style={{ color: "var(--fg-3)" }}>not in the way.</span>
          </h2>
          <p style={{ marginTop: 18, fontSize: 15, color: "var(--fg-2)", maxWidth: 480 }}>
            the heads-up module list lives in the corner. toggles persist, colors
            follow your accent, frame cost is zero. screenshots taken on a stock 1.8.9 build.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)",
          gap: 40, alignItems: "start",
        }}>
          {/* in-game HUD overlay mock — matches the screenshot exactly */}
          <div className="surface" style={{
            padding: 0, overflow: "hidden",
            display: "flex", flexDirection: "column",
            background: "linear-gradient(135deg, oklch(0.10 0.020 285), oklch(0.07 0.014 285))",
          }}>
            <div style={{
              padding: "12px 14px", borderBottom: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--fg-3)",
            }}>
              <span>// in-game hud</span>
              <span>top-right corner</span>
            </div>

            {/* render area with the floating module list pinned right */}
            <div style={{
              padding: 24,
              minHeight: 380,
              display: "flex", justifyContent: "flex-end", alignItems: "flex-start",
              background: "repeating-linear-gradient(45deg, transparent 0 14px, oklch(1 0 0 / 0.015) 14px 15px)",
            }}>
              <HudModuleList />
            </div>
          </div>

          {/* explainer column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              { kbd: "L+R",   title: "watcher",  body: "the floating module list mirrors what's bound. drag to move, toggle visibility per-screen." },
              { kbd: "⌘+K",   title: "command",  body: "command palette opens anywhere. type a module name, hit enter. closes itself." },
              { kbd: "END",   title: "panic",    body: "under 400ms, the client erases itself and your config. screenshare-safe by default." },
              { kbd: "⌘+\\",  title: "profiles", body: "profiles are real configs, not theme presets. switch via the sidebar or a script." },
            ].map((f, i) => (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "60px 1fr", gap: 18,
                paddingBottom: 24,
                borderBottom: i < 3 ? "1px solid var(--line)" : "none",
              }}>
                <span className="mono" style={{
                  fontSize: 11, color: "var(--acc)",
                  background: "var(--acc-soft)",
                  border: "1px solid var(--acc-line)",
                  borderRadius: 6, padding: "4px 0",
                  textAlign: "center", alignSelf: "flex-start",
                }}>{f.kbd}</span>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.02em", marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* In-game heads-up module list — matches the screenshot pill style */
function HudModuleList() {
  const active = [
    "Right Clicker", "Trajectories", "AutoClicker", "Auto Sprint",
    "Player ESP", "AimAssist", "Scaffold", "Freelook",
    "NameTags", "Antibot", "W-Tap",
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
      {/* header pill with brand + count */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "4px 10px",
        background: "oklch(0.06 0.014 285 / 0.9)",
        border: "1px solid var(--acc-line)",
        borderRadius: 14,
        fontFamily: "var(--mono)", fontSize: 12,
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--acc)", boxShadow: "0 0 6px var(--acc-glow)" }} />
        <span style={{ color: "var(--fg)" }}>Skilled</span>
        <span style={{ color: "var(--fg-3)" }}>{active.length}</span>
      </div>

      {/* module pills, stacked */}
      {active.map(m => (
        <div key={m} style={{
          padding: "5px 14px",
          background: "oklch(0.06 0.014 285 / 0.92)",
          border: "1px solid var(--line-strong)",
          borderRadius: 14,
          fontFamily: "var(--mono)", fontSize: 12.5,
          color: "var(--fg)",
          fontWeight: 500,
          lineHeight: 1.2,
        }}>
          {m}
        </div>
      ))}
    </div>
  );
}

/* ─── Modules ─── */

const MODULES = [
  { name: "AutoClicker",   cat: "Combat",   desc: "CPS synthesis on primary input",       kbd: "R"   },
  { name: "Right Clicker", cat: "Combat",   desc: "Synthetic R2 while holding M1",        kbd: "—"   },
  { name: "Reach",         cat: "Combat",   desc: "Extended entity hit distance",          kbd: "—"   },
  { name: "W-Tap",         cat: "Combat",   desc: "Sprint-reset for max knockback",         kbd: "—"   },
  { name: "AimAssist",     cat: "Combat",   desc: "Smooth crosshair-snap to closest target", kbd: "—"   },
  { name: "Antibot",       cat: "Combat",   desc: "Filter bots from all feature targeting", kbd: "—"   },
  { name: "Auto Sprint",   cat: "Movement", desc: "Continuous sprint injection",            kbd: "F"   },
  { name: "Scaffold",      cat: "Movement", desc: "Speedbridge shift timing + place",       kbd: "Z"   },
  { name: "Clutch",        cat: "Movement", desc: "Auto-place block to prevent fatal falls", kbd: "—"   },
  { name: "Player ESP",    cat: "Visual",   desc: "Entity bounding render overlay",         kbd: "G"   },
  { name: "Trajectories",  cat: "Visual",   desc: "Bow projectile path preview",            kbd: "—"   },
  { name: "Freelook",      cat: "Visual",   desc: "Detached look-camera, no aim shift",     kbd: "—"   },
  { name: "NameTags",      cat: "Visual",   desc: "Health, ping, armor overlay",            kbd: "—"   },
  { name: "Legit Mode",    cat: "Legit",    desc: "Tournament-safe behavior profile",       kbd: "—"   },
];
const CATS = ["All", "Combat", "Movement", "Visual", "Legit", "Misc"];

function ModuleBrowser() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const filtered = useMemo(() => MODULES.filter(m =>
    (cat === "All" || m.cat === cat) &&
    (q === "" || m.name.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat]);
  const counts = useMemo(() => CATS.reduce((acc, c) => {
    acc[c] = c === "All" ? MODULES.length : MODULES.filter(m => m.cat === c).length;
    return acc;
  }, {}), []);

  return (
    <section id="modules">
      <div className="shell">
        <div style={{
          display: "flex", alignItems: "flex-end", justifyContent: "space-between",
          flexWrap: "wrap", gap: 24, marginBottom: 40,
        }}>
          <h2 style={{ fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: 0.98, letterSpacing: "-0.04em", fontWeight: 700, maxWidth: 600 }}>
            {MODULES.length} modules.<br/>
            <span style={{ color: "var(--fg-3)" }}>all bound for a reason.</span>
          </h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
                  style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "var(--fg-3)" }}>
                <circle cx="7" cy="7" r="4.5" /><path d="M11 11l3 3" />
              </svg>
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="search…"
                style={{
                  width: 200, height: 36, padding: "0 14px 0 32px",
                  background: "oklch(1 0 0 / 0.03)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 7, color: "var(--fg)",
                  fontFamily: "var(--mono)", fontSize: 12, outline: "none",
                }}
                onFocus={(e) => e.target.style.borderColor = "var(--acc-line)"}
                onBlur={(e) => e.target.style.borderColor = "var(--line-strong)"}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 16, borderBottom: "1px solid var(--line)" }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              height: 36, padding: "0 14px",
              background: "transparent",
              border: 0,
              borderBottom: `2px solid ${cat === c ? "var(--acc)" : "transparent"}`,
              color: cat === c ? "var(--acc)" : "var(--fg-2)",
              fontFamily: "var(--mono)", fontSize: 12,
              marginBottom: -1,
            }}>
              {c.toLowerCase()} <span style={{ opacity: 0.55, marginLeft: 6 }}>{counts[c]}</span>
            </button>
          ))}
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          borderLeft: "1px solid var(--line)", borderTop: "1px solid var(--line)",
        }}>
          {filtered.map((m, i) => (
            <div key={m.name} style={{
              padding: "14px 18px",
              borderRight: "1px solid var(--line)",
              borderBottom: "1px solid var(--line)",
              display: "flex", flexDirection: "column", gap: 4,
              transition: "background 0.12s ease",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "oklch(1 0 0 / 0.025)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "var(--fg)", fontFamily: "var(--mono)" }}>{m.name}</span>
                <span className="mono" style={{ fontSize: 10, color: m.kbd === "—" ? "var(--fg-3)" : "var(--acc)" }}>{m.kbd}</span>
              </div>
              <span style={{ fontSize: 11.5, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>{m.desc}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 48, gridColumn: "1 / -1", color: "var(--fg-3)", textAlign: "center", fontFamily: "var(--mono)", fontSize: 12.5 }}>
              no modules match "{q}"
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Changelog (replaces themes / testimonials) ─── */

const CHANGELOG = [
  { v: "3.7.2", date: "latest", items: ["antibot retuned for ranked bedwars", "configcloud sync faster on cold start", "fixed autoarmor desync after teleport"] },
  { v: "3.7.0", date: "recent", items: ["configcloud — share builds via short link", "clickgui keyboard nav, ⌘k palette", "reach: per-mode tuning curves"] },
  { v: "3.6.4", date: "recent", items: ["1.7.10 launcher signed for macos", "velocity per-source vector pipeline"] },
  { v: "3.6.0", date: "older",  items: ["clutch module — auto-place to prevent fatal falls", "drag-and-drop hud editor", "scaffold: speedbridge timing"] },
];

function Changelog() {
  return (
    <section id="changelog">
      <div className="shell">
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: 40, flexWrap: "wrap", gap: 16,
        }}>
          <h2 style={{ fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: 0.98, letterSpacing: "-0.04em", fontWeight: 700 }}>
            shipped often.<br/>
            <span style={{ color: "var(--fg-3)" }}>read the diffs.</span>
          </h2>
          <a href="#" className="mono" style={{ color: "var(--fg-2)", fontSize: 12, borderBottom: "1px solid var(--fg-3)" }}>
            full changelog →
          </a>
        </div>

        <div style={{ borderTop: "1px solid var(--line)" }}>
          {CHANGELOG.map((c) => (
            <div key={c.v} style={{
              padding: "22px 0",
              borderBottom: "1px solid var(--line)",
              display: "grid", gridTemplateColumns: "100px 120px 1fr",
              gap: 28, alignItems: "baseline",
            }}>
              <span className="mono" style={{ fontSize: 15, fontWeight: 500, color: "var(--fg)" }}>
                v{c.v}
              </span>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{c.date}</span>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {c.items.map((it, j) => (
                  <li key={j} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 8, color: "var(--fg-1)", fontSize: 13.5, fontFamily: "var(--mono)" }}>
                    <span style={{ color: "var(--acc)" }}>+</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Download (replaces Pricing — client is free) ─── */

function Pricing() {
  const platforms = [
    { os: "Windows",  ver: "10 / 11 · 64-bit",     file: "skilled-setup.exe",   ic: "win"   },
    { os: "macOS",    ver: "12 Monterey or newer", file: "skilled-setup.dmg",   ic: "mac"   },
    { os: "Linux",    ver: "Ubuntu / Arch / Fedora", file: "skilled-setup.AppImage", ic: "linux" },
  ];
  return (
    <section id="download">
      <div className="shell">
        <h2 style={{ fontSize: "clamp(36px, 4.6vw, 64px)", lineHeight: 0.98, letterSpacing: "-0.04em", fontWeight: 700, marginBottom: 40 }}>
          free.<br/>
          <span style={{ color: "var(--fg-3)" }}>now and always.</span>
        </h2>

        <div style={{
          display: "grid", gridTemplateColumns: "minmax(0, 5fr) minmax(0, 7fr)",
          gap: 32, alignItems: "flex-start",
        }}>
          {/* left — what's included */}
          <div className="surface" style={{ padding: 28 }}>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 14 }}>
              what you get
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "every module, current and future",
                "configcloud sync, up to 3 devices",
                "clickgui, scripts api, profiles",
                "discord community access",
                "1.8.9 + 1.7.10 — win, mac, linux",
                "no paywalls, no tiers, no nag screens",
              ].map((it, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "14px 1fr", gap: 10, fontSize: 13.5, color: "var(--fg-1)", lineHeight: 1.55, fontFamily: "var(--mono)" }}>
                  <span style={{ color: "var(--acc)", fontWeight: 600 }}>+</span>
                  {it}
                </li>
              ))}
            </ul>
          </div>

          {/* right — platform downloads */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {platforms.map(p => (
              <a key={p.os} href="#" className="surface" style={{
                padding: "18px 22px",
                display: "grid",
                gridTemplateColumns: "40px 1fr auto",
                alignItems: "center", gap: 18,
                textDecoration: "none",
                transition: "border-color 0.15s, background 0.15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--acc-line)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line-strong)"; }}>
                <PlatformIcon name={p.ic} />
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
                  <span style={{ fontSize: 16, fontWeight: 600, color: "var(--fg)", letterSpacing: "-0.01em" }}>{p.os}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>{p.ver} · {p.file}</span>
                </div>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 14px",
                  background: "var(--acc-soft)",
                  border: "1px solid var(--acc-line)",
                  borderRadius: 8,
                  color: "var(--acc)",
                  fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500,
                }}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 12, height: 12 }}>
                    <path d="M8 2v9m0 0l-3-3m3 3l3-3M3 14h10" />
                  </svg>
                  download
                </span>
              </a>
            ))}
            <div className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", textAlign: "center", marginTop: 4 }}>
              sign in after install to link your device.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformIcon({ name }) {
  const props = { viewBox: "0 0 16 16", fill: "none", stroke: "var(--fg-1)", strokeWidth: 1.4, style: { width: 22, height: 22 } };
  switch (name) {
    case "win":   return <svg {...props}><rect x="2" y="3" width="5" height="5" /><rect x="9" y="3" width="5" height="5" /><rect x="2" y="10" width="5" height="5" /><rect x="9" y="10" width="5" height="5" /></svg>;
    case "mac":   return <svg {...props}><path d="M11 5.5c-1 0-2 0.5-2.5 1.2-0.5-0.7-1.5-1.2-2.5-1.2-1.7 0-3 1.5-3 3.5 0 2.5 2.5 5 5.5 5s5.5-2.5 5.5-5c0-2-1.3-3.5-3-3.5z"/><path d="M9 4.5C9 3 10 2 11 2"/></svg>;
    case "linux": return <svg {...props}><ellipse cx="8" cy="6" rx="3" ry="4"/><circle cx="6.8" cy="5" r="0.6" fill="var(--fg-1)"/><circle cx="9.2" cy="5" r="0.6" fill="var(--fg-1)"/><path d="M5 10c-1 2-2 4-1 4.5s2-0.5 3-0.5 2 1 3 0.5-1-2.5-2-4.5"/></svg>;
    default: return null;
  }
}

/* ─── Discord ─── */

function Discord() {
  return (
    <section id="discord">
      <div className="shell" style={{
        display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
        gap: 48, alignItems: "flex-start",
      }}>
        <div style={{ position: "sticky", top: 110 }}>
          <h2 style={{ fontSize: "clamp(36px, 4.6vw, 56px)", lineHeight: 0.98, letterSpacing: "-0.04em", fontWeight: 700 }}>
            ask in discord.<br/>
            <span style={{ color: "var(--fg-3)" }}>we answer.</span>
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--fg-2)", maxWidth: 360, marginTop: 18, lineHeight: 1.5 }}>
            bug reports, config sharing, ranked queues. tickets get triaged in minutes, not days. we don't do email.
          </p>
          <div style={{ display: "flex", gap: 28, marginTop: 24, color: "var(--fg-2)", fontSize: 13.5, fontFamily: "var(--mono)" }}>
            an active community of pvp players sharing configs, queueing ranked, and posting bug reports.
          </div>
          <button className="btn btn-primary" style={{ marginTop: 28 }}>
            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
              <path d="M13.5 3a13.4 13.4 0 0 0-3.3-1l-.2.3a12 12 0 0 0-4 0l-.2-.3a13.4 13.4 0 0 0-3.3 1A14 14 0 0 0 .3 11a13.5 13.5 0 0 0 4 2l.3-.4a8.6 8.6 0 0 1-1.4-.7c.1-.1.2-.2.3-.2a9.6 9.6 0 0 0 8.2 0l.3.2a8.6 8.6 0 0 1-1.4.7l.4.4a13.5 13.5 0 0 0 4-2 13.9 13.9 0 0 0-2.4-8zM5.4 9.4c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6zm5.2 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6z"/>
            </svg>
            join discord
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            { ch: "announcements", msg: "v3.7.2 out. antibot retuned. configs unaffected.", u: "ven",    c: "var(--acc)", t: "12m" },
            { ch: "configs-bedwars", msg: "uploaded ranked-bw-v4 — slower attack, tighter strafe", u: "kael_",  c: "oklch(0.78 0.14 200)", t: "1h" },
            { ch: "bug-reports", msg: "scaffold drift on lunar, server #42, looking now", u: "miso", c: "oklch(0.82 0.14 80)", t: "3h" },
            { ch: "general", msg: "lifetime was the right call", u: "rin_",   c: "oklch(0.78 0.14 350)", t: "5h" },
            { ch: "general", msg: "anyone got the strafe shape that worked on euw hyp before the patch", u: "vex.7", c: "oklch(0.74 0.16 290)", t: "9h" },
          ].map((m, i) => (
            <div key={i} style={{
              padding: "16px 0",
              borderTop: i === 0 ? "1px solid var(--line)" : "none",
              borderBottom: "1px solid var(--line)",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ color: m.c, fontFamily: "var(--mono)", fontSize: 12, fontWeight: 500 }}>@{m.u}</span>
                <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10.5 }}>#{m.ch}</span>
                <span className="mono" style={{ color: "var(--fg-3)", fontSize: 10.5, marginLeft: "auto" }}>{m.t}</span>
              </div>
              <span style={{ fontSize: 13.5, color: "var(--fg-1)" }}>{m.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */

const FAQS = [
  { q: "is it really free?",                       a: "yes. skilled is free. no tiers, no paywalls, no nag screens, no premium-only modules. download, sign in, run." },
  { q: "is it detectable on hypixel or watchdog?", a: "no client is permanently undetected. anyone who promises that is lying. we rebuild detection-sensitive subsystems regularly and patch on banwaves." },
  { q: "which versions are supported?",            a: "1.8.9 and 1.7.10. vanilla, forge, labymod, lunar, badlion (not bac). we focus on these because the competitive scene still lives there." },
  { q: "do i need an account to use it?",          a: "yes — the account links your devices and syncs configcloud. signup is free and takes about 30 seconds." },
  { q: "can i share or resell my account?",        a: "no. one account, three personal devices, your hands only. our system detects sharing." },
];

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq">
      <div className="shell" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)", gap: 64, alignItems: "flex-start" }}>
        <div style={{ position: "sticky", top: 110 }}>
          <h2 style={{ fontSize: "clamp(36px, 4.6vw, 56px)", lineHeight: 0.98, letterSpacing: "-0.04em", fontWeight: 700 }}>
            faq.
          </h2>
          <p style={{ marginTop: 18, fontSize: 14, color: "var(--fg-2)", maxWidth: 280 }}>
            if it isn't here, ask in discord. first reply usually under 15 minutes.
          </p>
        </div>
        <div style={{ borderTop: "1px solid var(--line)" }}>
          {FAQS.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
                  width: "100%", padding: "20px 0",
                  background: "none", border: 0, color: "var(--fg)",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24,
                  textAlign: "left", fontSize: 16, fontWeight: 600, letterSpacing: "-0.015em",
                  fontFamily: "var(--sans)",
                }}>
                  <span>{it.q}</span>
                  <span className="mono" style={{
                    flexShrink: 0, fontSize: 16,
                    color: isOpen ? "var(--acc)" : "var(--fg-3)",
                    transition: "color 0.15s",
                  }}>{isOpen ? "−" : "+"}</span>
                </button>
                <div style={{
                  maxHeight: isOpen ? 280 : 0,
                  opacity: isOpen ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.3s, opacity 0.2s, padding 0.2s",
                  paddingBottom: isOpen ? 20 : 0,
                  color: "var(--fg-1)", fontSize: 14, lineHeight: 1.6, maxWidth: 640,
                }}>{it.a}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */

function Footer() {
  return (
    <footer>
      <div className="shell" style={{
        display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
        gap: 32, marginBottom: 40,
      }}>
        <div>
          <div className="brand" style={{ marginBottom: 12 }}>
            <div className="brand-mark"></div>
            <span style={{ color: "var(--fg)", fontSize: 17 }}>Skilled</span>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--fg-3)", maxWidth: 260, lineHeight: 1.5, fontFamily: "var(--mono)" }}>
            ghost client for 1.8.9 / 1.7.10. free to use.
          </p>
        </div>
        {[
          { h: "sitemap", links: ["home", "features", "modules", "changelog", "pricing"] },
          { h: "socials", links: ["discord", "youtube", "twitter", "tiktok"] },
          { h: "legal",   links: ["terms", "privacy", "refunds", "contact"] },
        ].map((col, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{col.h}</span>
            {col.links.map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: "var(--fg-2)", lineHeight: 1.4, fontFamily: "var(--mono)" }}
                 onMouseEnter={(e) => e.currentTarget.style.color = "var(--fg)"}
                 onMouseLeave={(e) => e.currentTarget.style.color = "var(--fg-2)"}>{l}</a>
            ))}
          </div>
        ))}
      </div>
      <hr style={{ border: 0, height: 1, background: "var(--line)" }} />
      <div className="shell" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 20, flexWrap: "wrap", gap: 12,
        fontSize: 11.5, color: "var(--fg-3)", fontFamily: "var(--mono)",
      }}>
        <span>skilled</span>
        <span>not affiliated with mojang / microsoft</span>
      </div>
    </footer>
  );
}

Object.assign(window, { Features, ModuleBrowser, Changelog, Pricing, Discord, FAQ, Footer });
