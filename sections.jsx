// sections.jsx — Features, Modules, Changelog, Download, Discord, FAQ, Footer
const { useState, useMemo } = React;



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
            <h2 className="h2">14 modules all undetectable</h2>
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


/* ═══════════ Pricing ═══════════ */

/* The buy page.

   Every number on it arrives from GET /api/plans, which serves
   worker/src/plans.js — so this page cannot advertise a price the checkout does
   not charge. Nothing in here knows which payment processor is live: the Worker
   mints a hosted checkout and hands back a URL, and this follows it.

   Three states that look alike and are not:

     error         the Worker is unreachable. Quote nothing.
     !configured   the Worker is up, the processor has no keys yet. Real prices,
                   dead buttons — the section ships before the store does.
     configured    buy. */

const INCLUDED = [
  "Every module, no tiers, nothing paywalled",
  "ConfigCloud sync",
  "Discord support",
];

function PlanCard({ plan, signedIn, owned, configured, busy, onBuy }) {
  const recurring = plan.days != null;
  const current = owned === plan.id;
  const dead = current || !configured;

  const label =
    current     ? "Your current plan"
    : !configured ? "Opening soon"
    : !signedIn   ? "Create an account"
    : busy        ? "Redirecting…"
    : recurring   ? "Subscribe"
    :               "Buy Skill";

  return (
    <div className={"card pad" + (recurring ? "" : " card-hi")}
         style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="h3" style={{ fontSize: 17 }}>{plan.label}</span>
        {!recurring && <span className="tag">Best value</span>}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 42, fontWeight: 600, letterSpacing: "-.03em", lineHeight: 1 }}>
          {formatPrice(plan.amount, plan.currency)}
        </span>
        <span style={{ fontSize: 13.5, color: "var(--fg-3)" }}>{recurring ? "per month" : "once"}</span>
      </div>

      <p className="small dim" style={{ margin: 0 }}>{plan.blurb}</p>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
        {INCLUDED.concat(
          recurring ? "Cancel any time, access runs to the end of the period"
                    : "Every future module, at no extra cost"
        ).map(x => (
          <li key={x} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, color: "var(--fg-1)" }}>
            <span className="check" />{x}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onBuy(plan.id)}
        disabled={dead || !!busy}
        className={"btn btn-lg " + (recurring ? "btn-ghost" : "btn-primary")}
        style={{ width: "100%", marginTop: "auto", opacity: dead ? 0.5 : 1, cursor: dead ? "not-allowed" : undefined }}>
        {label}
      </button>
    </div>
  );
}

function Pricing({ auth, onRequireAuth }) {
  const { plans, configured, loading, error } = usePlans();
  const { start, busy, error: checkoutError } = useCheckout();

  const signedIn = !!(auth && auth.email);
  const { ent } = useEntitlement(signedIn);

  /* While ENTITLEMENT_ENFORCED is "false" the Worker reports active for every
     signed-in account, so `active` cannot answer "has this person bought
     anything". The status can. */
  const owned = ent && (ent.status === "active" || ent.status === "past_due") ? ent.plan : null;

  const buy = (id) => (signedIn ? start(id) : onRequireAuth && onRequireAuth());

  return (
    <section id="pricing" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div className="sec-head center">
          <span className="eyebrow" style={{ justifyContent: "center" }}><span className="bead" />Pricing</span>
          <h2 className="h2" style={{ fontSize: "clamp(28px,2.8vw,40px)" }}>One licence. Every module.</h2>
          <p className="lead">No tiers, no paywalled modules, no nag screens. Buy it once or pay monthly. Both unlock all fourteen.</p>
        </div>

        {error ? (
          <div className="card pad" style={{ maxWidth: 460, margin: "0 auto", textAlign: "center" }}>
            <p className="body" style={{ margin: 0 }}>
              The store is unreachable right now. Try again shortly, or ask in{" "}
              <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer"
                 style={{ color: "var(--fg-1)", textDecoration: "underline", textUnderlineOffset: 3 }}>Discord</a>.
            </p>
          </div>
        ) : loading ? (
          <p className="small dim" style={{ textAlign: "center" }}>Loading plans…</p>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16, maxWidth: 720, margin: "0 auto" }}>
              {plans.map(p => (
                <PlanCard key={p.id} plan={p} signedIn={signedIn} owned={owned}
                          configured={configured} busy={busy === p.id} onBuy={buy} />
              ))}
            </div>

            <p className="small dim" style={{ textAlign: "center", marginTop: 20, maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>
              {checkoutError
                ? <span style={{ color: "oklch(0.75 0.18 25)" }}>{checkoutError}</span>
                : !configured
                  ? "Checkout opens shortly. The prices above are final."
                  : owned
                    ? "You already hold a licence. Manage it from your dashboard."
                    : "You will be taken to our payment provider to pay, and returned here. Card details never touch this site."}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/* ═══════════ Discord ═══════════ */

function Discord() {
  return (
    <section id="discord" className="sec" style={{ paddingTop: 0 }}>
      <div className="shell">
        <div className="card pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 720, margin: "0 auto", padding: "52px 40px", gap: 20 }}>
          <span className="eyebrow" style={{ margin: 0 }}><span className="bead" />Community</span>
          <h2 className="h2" style={{ fontSize: "clamp(28px,2.8vw,40px)" }}>Support happens in Discord.</h2>
          <p className="body" style={{ maxWidth: 540 }}>Bug reports, shared configs, ranked queues, and direct contact with the people writing the code. Tickets get triaged in minutes, not days.</p>
          <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
            <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 15, height: 15 }}><path d="M13.5 3a13.4 13.4 0 0 0-3.3-1l-.2.3a12 12 0 0 0-4 0l-.2-.3a13.4 13.4 0 0 0-3.3 1A14 14 0 0 0 .3 11a13.5 13.5 0 0 0 4 2l.3-.4a8.6 8.6 0 0 1-1.4-.7c.1-.1.2-.2.3-.2a9.6 9.6 0 0 0 8.2 0l.3.2a8.6 8.6 0 0 1-1.4.7l.4.4a13.5 13.5 0 0 0 4-2 13.9 13.9 0 0 0-2.4-8ZM5.4 9.4c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Zm5.2 0c-.8 0-1.4-.7-1.4-1.6s.6-1.6 1.4-1.6 1.4.7 1.4 1.6c0 .9-.6 1.6-1.4 1.6Z"/></svg>
            Join the Discord
          </a>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ FAQ ═══════════ */

const FAQS = [
  { q: "How does licensing work?", a: "One licence covers your account. Every module is included, there are no tiers and no premium-only features. Sign in on the website, approve your launcher once, and the licence is tied to that machine." },
  { q: "Is it detectable on Hypixel?", a: "No client is permanently undetected, and anyone who tells you otherwise is selling something. We rebuild the detection-sensitive parts regularly and patch quickly when a wave lands. Treat any client as a risk to the account you use it on." },
  { q: "Which versions are supported?", a: "Minecraft 1.8.9 and 1.7.10 on Windows, across Vanilla, Forge, LabyMod, Lunar and Badlion (not BAC). Those are where the competitive scene still plays, so that's where we focus." },
  { q: "Do I need an account?", a: "Yes, the account links your device and powers config sync. Signup takes about thirty seconds and needs nothing but an email address." },
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
          <p className="body" style={{ marginTop: 16, maxWidth: 280 }}>Anything else, ask in <a href="https://discord.gg/aRF6EwaD7" target="_blank" rel="noopener noreferrer" style={{ color: "var(--fg-1)", textDecoration: "underline", textUnderlineOffset: 3 }}>Discord</a>, first reply is usually inside fifteen minutes.</p>
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

function Footer({ onTerms }) {
  const cols = [
    { h: "Product", links: [{ name: "Modules", href: "#modules" }, { name: "Buy", href: "#buy" }] },
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
                  if (l === "Terms") {
                    return <a key={l} href="#" onClick={(e) => { e.preventDefault(); onTerms && onTerms(); }}>{l}</a>;
                  }
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

Object.assign(window, { ModuleBrowser, Pricing, PlanCard, Discord, FAQ, Footer });
