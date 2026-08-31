// sections.jsx — Features, Modules, Changelog, Download, Discord, FAQ, Footer
const { useState, useMemo } = React;

/* ═══════════ Features ═══════════ */

function FeatureIcon({ name }) {
  const p = { viewBox: "0 0 20 20", fill: "none", stroke: "var(--acc)", strokeWidth: 1.5, style: { width: 18, height: 18 } };
  switch (name) {
    case "gui":    return <svg {...p}><rect x="2.5" y="3" width="15" height="14" rx="2"/><path d="M7.5 3v14M2.5 7h5"/></svg>;
    case "cloud":  return <svg {...p}><path d="M6.5 14H5a3.5 3.5 0 0 1 .6-6.95A5 5 0 0 1 15.5 8a3 3 0 0 1 .5 6h-2.5"/><path d="M10 10v6m0 0-2-2m2 2 2-2"/></svg>;
    case "script": return <svg {...p}><path d="M7.5 5 4 10l3.5 5M12.5 5l3.5 5-3.5 5"/></svg>;
    default: return null;
  }
}

function Features() {
  const cards = [
    { icon: "gui",    title: "An interface that respects you", body: "Search-first navigation, keyboard shortcuts for every action, and a module list you can read at a glance. No animation gimmicks, nothing on screen that gives you away in a screenshare.", meta: "Right Shift to open" },
    { icon: "cloud",  title: "Configs that follow you around", body: "Every profile you save syncs the moment you save it. Reinstall Windows, move to a new PC, or hand a friend a link — your setup is there the next time you launch.", meta: "One device per account" },
    { icon: "script", title: "A real scripting API",           body: "Write your own modules in JavaScript against the same API the built-in ones use. Hot-reload while the game runs, no recompile and no restart.", meta: "JavaScript, hot-reloaded" },
  ];

  return (
    <section id="features" className="sec">
      <div className="shell">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(288px,1fr))", gap: 16 }}>
          {cards.map(c => (
            <div key={c.title} className="card card-hover pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "oklch(1 0 0 / 0.04)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center" }}>
                <FeatureIcon name={c.icon} />
              </div>
              <h3 className="h3">{c.title}</h3>
              <p className="body" style={{ flex: 1 }}>{c.body}</p>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)", paddingTop: 14, borderTop: "1px solid var(--line)" }}>{c.meta}</span>
            </div>
          ))}
        </div>

        {/* wide HUD row */}
        <div className="card" style={{ marginTop: 16, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr)", gap: 0, overflow: "hidden" }}>
          <div style={{ padding: "40px 36px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
            <span className="tag" style={{ alignSelf: "flex-start" }}>In-game overlay</span>
            <h3 className="h2" style={{ fontSize: "clamp(26px,2.6vw,36px)" }}>Know what's on without opening anything.</h3>
            <p className="body">The heads-up list mirrors exactly what's enabled, sorted by name length so it never reflows mid-fight. Drag it anywhere, hide it per-screen, or turn it off entirely.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <span className="tag tag-flat">Draggable</span>
              <span className="tag tag-flat">Zero frame cost</span>
              <span className="tag tag-flat">Per-screen visibility</span>
            </div>
          </div>
          <div style={{ padding: 32, display: "flex", justifyContent: "flex-end", alignItems: "flex-start", borderLeft: "1px solid var(--line)", background: "oklch(0 0 0 / 0.18)", minHeight: 400 }}>
            <HudModuleList />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ Modules ═══════════ */

const MODULES = [
  { name: "AutoClicker",   cat: "Combat",   desc: "CPS synthesis on primary input",         kbd: "R" },
  { name: "Right Clicker", cat: "Combat",   desc: "Synthetic R2 while holding M1",          kbd: "—" },
  { name: "Reach",         cat: "Combat",   desc: "Extended entity hit distance",           kbd: "—" },
  { name: "W-Tap",         cat: "Combat",   desc: "Sprint-reset for max knockback",         kbd: "—" },
  { name: "AimAssist",     cat: "Combat",   desc: "Smooth snap to the closest target",      kbd: "—" },
  { name: "Antibot",       cat: "Combat",   desc: "Filter bots from all targeting",         kbd: "—" },
  { name: "Auto Sprint",   cat: "Movement", desc: "Continuous sprint injection",            kbd: "F" },
  { name: "Scaffold",      cat: "Movement", desc: "Speedbridge shift timing and placement", kbd: "Z" },
  { name: "Clutch",        cat: "Movement", desc: "Auto-place to prevent fatal falls",      kbd: "—" },
  { name: "Player ESP",    cat: "Visual",   desc: "Entity bounding render overlay",         kbd: "G" },
  { name: "Trajectories",  cat: "Visual",   desc: "Bow projectile path preview",            kbd: "—" },
  { name: "Freelook",      cat: "Visual",   desc: "Detached camera, aim unaffected",        kbd: "—" },
  { name: "NameTags",      cat: "Visual",   desc: "Health, ping and armour overlay",        kbd: "—" },
  { name: "Legit Mode",    cat: "Legit",    desc: "Tournament-safe behaviour profile",      kbd: "—" },
];
const CATS = ["All", "Combat", "Movement", "Visual", "Legit"];

function ModuleBrowser() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() => MODULES.filter(m =>
    (cat === "All" || m.cat === cat) &&
    (q === "" || m.name.toLowerCase().includes(q.toLowerCase()) || m.desc.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat]);

  const counts = useMemo(() => CATS.reduce((a, c) => {
    a[c] = c === "All" ? MODULES.length : MODULES.filter(m => m.cat === c).length; return a;
  }, {}), []);

  return (
    <section id="modules" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32, flexWrap: "wrap", marginBottom: 32 }}>
          <div style={{ maxWidth: 520 }}>
            <span className="eyebrow"><span className="bead" />Modules</span>
            <h2 className="h2">Fourteen modules. Every one of them bound for a reason.</h2>
          </div>
          <div style={{ position: "relative", width: 260, maxWidth: "100%" }}>
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--fg-3)" strokeWidth="1.4" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, pointerEvents: "none" }}>
              <circle cx="7" cy="7" r="4.5"/><path d="m11 11 3 3"/>
            </svg>
            <input className="input" style={{ paddingLeft: 34 }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search modules" />
          </div>
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 20 }}>
          {CATS.map(c => {
            const on = cat === c;
            return (
              <button key={c} onClick={() => setCat(c)} style={{ height: 32, padding: "0 13px", borderRadius: 8, background: on ? "var(--acc-soft)" : "transparent", border: `1px solid ${on ? "var(--acc-line)" : "var(--line-2)"}`, color: on ? "var(--acc)" : "var(--fg-2)", fontSize: 13.5, fontWeight: 500, letterSpacing: "-.01em", display: "inline-flex", alignItems: "center", gap: 7, transition: "background .12s, border-color .12s, color .12s" }}>
                {c}<span style={{ opacity: .6 }}>{counts[c]}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(268px,1fr))", gap: 12 }}>
          {filtered.map(m => (
            <div key={m.name} className="card card-hover" style={{ padding: "15px 17px", display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "oklch(1 0 0 / 0.04)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 12 12" fill="none" stroke="var(--fg-2)" strokeWidth="1.2" style={{ width: 12, height: 12 }}>
                  <circle cx="6" cy="6" r="3.6"/><circle cx="6" cy="6" r="1" fill="var(--fg-2)"/>
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                <span className="h4">{m.name}</span>
                <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{m.desc}</span>
              </div>
              {m.kbd !== "—" && (
                <span className="mono" style={{ fontSize: 11, color: "var(--acc)", background: "var(--acc-soft)", border: "1px solid var(--acc-line)", borderRadius: 5, padding: "3px 7px", flexShrink: 0 }}>{m.kbd}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card pad" style={{ gridColumn: "1 / -1", textAlign: "center", color: "var(--fg-3)" }}>
              No modules match “{q}”.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ Changelog ═══════════ */

const CHANGELOG = [
  { v: "1.0.4", tag: "Latest", items: ["Antibot retuned for ranked Bedwars lobbies", "Cloud configs resolve faster on a cold launch", "Fixed a Scaffold desync after teleporting"] },
  { v: "1.0.2", tag: null,     items: ["Cloud — share a profile with a short link", "Command palette, opens with ⌘K anywhere", "Reach now tunes per game mode"] },
  { v: "1.0.1", tag: null,     items: ["Signed the Windows installer", "Rewrote the AimAssist smoothing curve"] },
  { v: "1.0.0", tag: "Initial",items: ["Clutch — auto-places to prevent fatal falls", "Drag-and-drop HUD editor", "Scaffold speedbridge timing"] },
];

function Changelog() {
  return (
    <section id="changelog" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap", marginBottom: 36 }}>
          <div style={{ maxWidth: 520 }}>
            <span className="eyebrow"><span className="bead" />Changelog</span>
            <h2 className="h2">Shipped often, written down every time.</h2>
          </div>
          <a href="#" className="btn btn-ghost">Full changelog</a>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          {CHANGELOG.map((c, i) => (
            <div key={c.v} style={{ padding: "24px 26px", borderTop: i === 0 ? "none" : "1px solid var(--line)", display: "grid", gridTemplateColumns: "132px 1fr", gap: 28, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span className="mono" style={{ fontSize: 15, fontWeight: 500, color: "var(--fg)" }}>v{c.v}</span>
                {c.tag && <span className="tag" style={{ alignSelf: "flex-start", height: 22, fontSize: 10.5 }}>{c.tag}</span>}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                {c.items.map((it, j) => (
                  <li key={j} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 10, fontSize: 14.5, lineHeight: 1.55, color: "var(--fg-1)" }}>
                    <span className="mono" style={{ color: "var(--fg-3)", fontSize: 13 }}>+</span>{it}
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

/* ═══════════ Download ═══════════ */

function PlatformIcon({ name }) {
  const p = { viewBox: "0 0 20 20", fill: "none", stroke: "var(--fg-1)", strokeWidth: 1.4, style: { width: 20, height: 20 } };
  switch (name) {
    case "win":   return <svg {...p}><rect x="2.5" y="3" width="6" height="6" rx=".8"/><rect x="11.5" y="3" width="6" height="6" rx=".8"/><rect x="2.5" y="11" width="6" height="6" rx=".8"/><rect x="11.5" y="11" width="6" height="6" rx=".8"/></svg>;
    default: return null;
  }
}

function Pricing() {
  const platforms = [
    { os: "Windows", ver: "10 and 11, 64-bit", file: "skilled-setup.exe", ic: "win" },
  ];
  return (
    <section id="download" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div className="sec-head center">
          <span className="eyebrow" style={{ justifyContent: "center" }}><span className="bead" />Download</span>
          <p className="lead">No tiers, no paywalled modules, no nag screens. Create an account, link your device, then run the installer.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14, maxWidth: 460, margin: "0 auto" }}>
          {platforms.map(p => (
            <a key={p.os} href="#" className="card card-hover pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: "oklch(1 0 0 / 0.04)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <PlatformIcon name={p.ic} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <span className="h3" style={{ fontSize: 17 }}>{p.os}</span>
                  <span style={{ fontSize: 12.5, color: "var(--fg-3)" }}>{p.ver}</span>
                </div>
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{p.file}</span>
              <span className="btn btn-ghost" style={{ width: "100%" }}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ width: 13, height: 13 }}><path d="M8 2v9m0 0-3-3m3 3 3-3M3 14h10"/></svg>
                Download
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ Discord ═══════════ */

function Discord() {
  const msgs = [
    { u: "ven",   ch: "announcements",   t: "12m", c: "var(--fg)",   msg: "1.0.4 is live. Antibot retuned, configs unaffected." },
    { u: "kael",  ch: "configs-bedwars", t: "1h",  c: "var(--fg-1)", msg: "Uploaded ranked-bw-v4 — slower attack, tighter strafe." },
    { u: "miso",  ch: "bug-reports",     t: "3h",  c: "var(--fg-1)", msg: "Scaffold drift on Lunar, server #42. Looking now." },
    { u: "rin",   ch: "general",         t: "5h",  c: "var(--fg-1)", msg: "Freelook alone is worth the install." },
  ];
  return (
    <section id="discord" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div className="card" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", overflow: "hidden" }}>
          <div style={{ padding: "44px 40px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
            <span className="eyebrow" style={{ margin: 0 }}><span className="bead" />Community</span>
            <h2 className="h2" style={{ fontSize: "clamp(28px,2.8vw,40px)" }}>Support happens in Discord.</h2>
            <p className="body">Bug reports, shared configs, ranked queues, and direct contact with the people writing the code. Tickets get triaged in minutes, not days.</p>
            <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ alignSelf: "flex-start", marginTop: 6 }}>
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 15, height: 15 }}><path d="M13.5 3a13.4 13.4 0 0 0-3.3-1l-.2.3a12 12 0 0 0-4 0l-.2-.3a13.4 13.4 0 0 0-3.3 1A14 14 0 0 0 .3 11a13.5 13.5 0 0 0 4 2l.3-.4a8.6 8.6 0 0 1-1.4-.7c.1-.1.2-.2.3-.2a9.6 9.6 0 0 0 8.2 0l.3.2a8.6 8.6 0 0 1-1.4.7l.4.4a13.5 13.5 0 0 0 4-2 13.9 13.9 0 0 0-2.4-8ZM5.4 9.4c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Zm5.2 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Z"/></svg>
              Join the Discord
            </a>
          </div>
          <div style={{ borderLeft: "1px solid var(--line)", padding: 24, display: "flex", flexDirection: "column", gap: 10, background: "oklch(0 0 0 / 0.18)" }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ padding: "13px 15px", borderRadius: 8, background: "oklch(1 0 0 / 0.03)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: m.c }}>{m.u}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>#{m.ch}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)", marginLeft: "auto" }}>{m.t}</span>
                </div>
                <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "var(--fg-1)" }}>{m.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ FAQ ═══════════ */

const FAQS = [
  { q: "How does licensing work?", a: "One licence covers your account. Every module is included — there are no tiers and no premium-only features. Sign in on the website, approve your launcher once, and the licence is tied to that machine." },
  { q: "Is it detectable on Hypixel?", a: "No client is permanently undetected, and anyone who tells you otherwise is selling something. We rebuild the detection-sensitive parts regularly and patch quickly when a wave lands. Treat any client as a risk to the account you use it on." },
  { q: "Which versions are supported?", a: "Minecraft 1.8.9 and 1.7.10 on Windows, across Vanilla, Forge, LabyMod, Lunar and Badlion (not BAC). Those are where the competitive scene still plays, so that's where we focus." },
  { q: "Do I need an account?", a: "Yes — the account links your device and powers config sync. Signup takes about thirty seconds and needs nothing but an email address." },
  { q: "Can I share my account?", a: "No. One account, one device. Sharing is detected automatically and gets the account revoked." },
];

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.7fr)", gap: 64, alignItems: "start" }}>
        <div style={{ position: "sticky", top: 100 }}>
          <span className="eyebrow"><span className="bead" />FAQ</span>
          <h2 className="h2" style={{ fontSize: "clamp(28px,2.8vw,40px)" }}>Questions worth answering.</h2>
          <p className="body" style={{ marginTop: 16, maxWidth: 280 }}>Anything else, ask in <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-1)", textDecoration: "underline", textUnderlineOffset: 3 }}>Discord</a> — first reply is usually inside fifteen minutes.</p>
        </div>
        <div className="card" style={{ overflow: "hidden" }}>
          {FAQS.map((it, i) => {
            const isOpen = open === i;
            return (
              <div key={i} style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)" }}>
                <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", padding: "22px 26px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, textAlign: "left", fontSize: 16, fontWeight: 600, letterSpacing: "-.016em", color: isOpen ? "var(--fg)" : "var(--fg-1)" }}>
                  {it.q}
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: `1px solid ${isOpen ? "var(--acc-line)" : "var(--line-2)"}`, background: isOpen ? "var(--acc-soft)" : "transparent", color: isOpen ? "var(--acc)" : "var(--fg-3)", display: "grid", placeItems: "center", transform: isOpen ? "rotate(45deg)" : "none", transition: "all .2s" }}>
                    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 11, height: 11 }}><path d="M6 1v10M1 6h10"/></svg>
                  </span>
                </button>
                <div style={{ maxHeight: isOpen ? 260 : 0, opacity: isOpen ? 1 : 0, overflow: "hidden", transition: "max-height .3s ease, opacity .22s ease, padding .22s ease", padding: isOpen ? "0 26px 24px" : "0 26px" }}>
                  <p className="body" style={{ maxWidth: 620 }}>{it.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ Footer ═══════════ */

function Footer() {
  const cols = [
    { h: "Product", links: ["Features", "Modules", "Changelog", "Download"] },
    { h: "Community", links: [{ name: "Discord", href: "https://discord.gg/aRF6EwaD7" }, { name: "YouTube", href: "#" }, { name: "X", href: "#" }, { name: "TikTok", href: "#" }] },
    { h: "Legal", links: ["Terms", "Privacy", "Contact"] },
  ];
  return (
    <footer>
      <div className="shell">
        <div className="foot-grid">
          <div>
            <div className="brand" style={{ marginBottom: 14 }}>
              <div className="brand-mark"></div>Skilled
            </div>
            <p className="small dim" style={{ maxWidth: 270 }}>
              A ghost client for Minecraft 1.8.9 and 1.7.10.
            </p>
          </div>
          {cols.map(c => (
            <div key={c.h} className="foot-col">
              <span className="label" style={{ marginBottom: 3 }}>{c.h}</span>
              {c.links.map(l => {
                if (typeof l === "string") {
                  return <a key={l} href="#">{l}</a>;
                }
                return (
                  <a key={l.name} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel={l.href.startsWith("http") ? "noopener noreferrer" : undefined}>
                    {l.name}
                  </a>
                );
              })}
            </div>
          ))}
        </div>
        <hr className="rule" />
        <div className="foot-bottom">
          <span>© Skilled</span>
          <span>Not affiliated with Mojang or Microsoft.</span>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Features, ModuleBrowser, Changelog, Pricing, Discord, FAQ, Footer });
