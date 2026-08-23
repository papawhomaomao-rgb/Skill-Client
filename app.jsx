// app.jsx — top-level App with Tweaks
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "violet"
}/*EDITMODE-END*/;

const ACCENTS = {
  violet:{ acc:"oklch(0.70 0.22 305)", acc2:"oklch(0.60 0.24 305)", soft:"oklch(0.70 0.22 305 / 0.14)", line:"oklch(0.70 0.22 305 / 0.34)", glow:"oklch(0.70 0.22 305 / 0.45)" },
  blue:  { acc:"oklch(0.72 0.17 250)", acc2:"oklch(0.63 0.19 252)", soft:"oklch(0.72 0.17 250 / 0.14)", line:"oklch(0.72 0.17 250 / 0.34)", glow:"oklch(0.72 0.17 250 / 0.45)" },
  green: { acc:"oklch(0.80 0.20 148)", acc2:"oklch(0.71 0.22 150)", soft:"oklch(0.80 0.20 148 / 0.14)", line:"oklch(0.80 0.20 148 / 0.34)", glow:"oklch(0.80 0.20 148 / 0.45)" },
  red:   { acc:"oklch(0.70 0.22 25)",  acc2:"oklch(0.61 0.24 25)",  soft:"oklch(0.70 0.22 25 / 0.15)",  line:"oklch(0.70 0.22 25 / 0.36)",  glow:"oklch(0.70 0.22 25 / 0.45)" },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const auth = useAuth();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState("signin");
  const [view, setView] = React.useState("home"); // 'home' | 'dashboard'
  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const openDashboard = () => setView("dashboard");
  const leaveDashboard = () => setView("home");

  // If user signs out from inside the dashboard, kick back to home.
  useEffect(() => { if (!auth.email && view === "dashboard") setView("home"); }, [auth.email, view]);

  // Close the auth modal as soon as Clerk reports a signed-in user.
  useEffect(() => { if (auth.email) setAuthOpen(false); }, [auth.email]);

  useEffect(() => {
    const a = ACCENTS[t.accent] || ACCENTS.violet;
    const r = document.documentElement;
    r.style.setProperty("--acc",      a.acc);
    r.style.setProperty("--acc-2",    a.acc2);
    r.style.setProperty("--acc-soft", a.soft);
    r.style.setProperty("--acc-line", a.line);
    r.style.setProperty("--acc-glow", a.glow);
  }, [t.accent]);

  if (view === "dashboard" && auth.email) {
    return (
      <>
        <Dashboard auth={auth} leave={leaveDashboard} />
        <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} auth={auth} />
      </>
    );
  }

  return (
    <div>
      <div className="bg-lines" />
      <div className="grain" />

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
            <a href="#download">Download</a>
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

      <Hero />
      <Features />
      <ModuleBrowser />
      <Changelog />
      <Pricing />
      <Discord />
      <FAQ />
      <Footer />

      <AuthModal open={authOpen} mode={authMode} onClose={() => setAuthOpen(false)} auth={auth} />

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
