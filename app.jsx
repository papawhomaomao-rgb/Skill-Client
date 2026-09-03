// app.jsx — top-level App with Tweaks
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "violet"
}/*EDITMODE-END*/;

const ACCENTS = {
  violet:{ acc:"oklch(0.64 0.15 293)", acc2:"oklch(0.56 0.16 293)", soft:"oklch(0.64 0.15 293 / 0.12)", line:"oklch(0.64 0.15 293 / 0.30)" },
  blue:  { acc:"oklch(0.65 0.13 250)", acc2:"oklch(0.57 0.14 252)", soft:"oklch(0.65 0.13 250 / 0.12)", line:"oklch(0.65 0.13 250 / 0.30)" },
  green: { acc:"oklch(0.70 0.13 155)", acc2:"oklch(0.62 0.14 155)", soft:"oklch(0.70 0.13 155 / 0.12)", line:"oklch(0.70 0.13 155 / 0.30)" },
  red:   { acc:"oklch(0.64 0.16 25)",  acc2:"oklch(0.56 0.17 25)",  soft:"oklch(0.64 0.16 25 / 0.12)",  line:"oklch(0.64 0.16 25 / 0.30)" },
};

/* Where the provider sends the browser back to. The Worker builds these two
   URLs from SITE_ORIGIN, and they have to be fixed addresses — the checkout is
   created before anyone knows how it ends, so it cannot point at a dashboard
   tab. This reads the parameter and does the routing here instead. */
function readCheckoutParam() {
  const v = new URLSearchParams(window.location.search).get("checkout");
  return v === "done" || v === "cancelled" ? v : null;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const auth = useAuth();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState("signin");
  const [view, setView] = React.useState("home"); // 'home' | 'dashboard'
  const [dashTab, setDashTab] = React.useState(null);
  const [checkout, setCheckout] = React.useState(readCheckoutParam);

  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const openDashboard = () => { setDashTab(null); setView("dashboard"); };
  const leaveDashboard = () => setView("home");

  /* The section has to exist before it can be scrolled to, and leaving the
     dashboard is what mounts it — so this runs after the render that swaps the
     view, not during it. */
  const scrollToPricing = () => {
    setTimeout(() => {
      const el = document.getElementById("pricing");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleBuySkill = () => { setView("home"); scrollToPricing(); };

  // If user signs out from inside the dashboard, kick back to home.
  useEffect(() => { if (!auth.email && view === "dashboard") setView("home"); }, [auth.email, view]);

  // Close the auth modal as soon as Clerk reports a signed-in user.
  useEffect(() => { if (auth.email) setAuthOpen(false); }, [auth.email]);

  /* Drop the parameter immediately, so a refresh does not replay the banner or
     re-open the dashboard on a purchase that happened yesterday. */
  useEffect(() => {
    if (!checkout) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [checkout]);

  /* A completed purchase lands on the Licence panel — but only once Clerk has
     finished deciding who is signed in, or this fires against a null user and
     goes nowhere. */
  useEffect(() => {
    if (checkout !== "done" || auth.loading || !auth.email) return;
    setDashTab("license");
    setView("dashboard");
  }, [checkout, auth.loading, auth.email]);

  useEffect(() => {
    const a = ACCENTS[t.accent] || ACCENTS.violet;
    const r = document.documentElement;
    r.style.setProperty("--acc",      a.acc);
    r.style.setProperty("--acc-2",    a.acc2);
    r.style.setProperty("--acc-soft", a.soft);
    r.style.setProperty("--acc-line", a.line);
  }, [t.accent]);

  const toast = checkout && (
    <div className="toast" onClick={() => setCheckout(null)} style={{ cursor: "pointer", fontSize: 13.5 }}>
      {checkout === "done"
        ? "Payment complete — thank you. Your licence is on the dashboard."
        : "Checkout cancelled. Nothing was charged."}
      <span style={{ color: "var(--fg-3)", fontSize: 12 }}>Dismiss</span>
    </div>
  );

  if (view === "dashboard" && auth.email) {
    return (
      <>
        <Dashboard
          auth={auth}
          leave={leaveDashboard}
          onBuy={handleBuySkill}
          initialTab={dashTab}
          justPurchased={checkout === "done"}
        />
        <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} auth={auth} />
        {toast}
      </>
    );
  }

  return (
    <div>
      <nav className="nav">
        <div className="shell nav-inner">
          <div className="brand">
            <div className="brand-mark"></div>
            <span>Skilled</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#modules">Modules</a>
            <a href="#changelog">Changelog</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-cta">
            {auth.email ? (
              <UserMenu auth={auth} onDashboard={openDashboard} />
            ) : (
              <>
                <button className="btn btn-quiet" onClick={() => openAuth("signin")}>Sign in</button>
                <button className="btn btn-primary" onClick={() => openAuth("signup")}>Get Skilled</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <Hero onBuySkill={handleBuySkill} />
      <Features />
      <ModuleBrowser />
      <Changelog />
      <Pricing auth={auth} onRequireAuth={() => openAuth("signup")} />
      <Discord />
      <FAQ />
      <Footer />

      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} auth={auth} />
      {toast}

      <TweaksPanel>
        <TweakSection label="Accent" />
        <TweakColor
          label="Colour"
          value={ACCENTS[t.accent].acc}
          options={[ACCENTS.violet.acc, ACCENTS.blue.acc, ACCENTS.green.acc, ACCENTS.red.acc]}
          onChange={(v) => {
            const key = Object.keys(ACCENTS).find(k => ACCENTS[k].acc === v) || "violet";
            setTweak("accent", key);
          }}
        />
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
