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

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const auth = useAuth();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [authMode, setAuthMode] = React.useState("signin");
  const [view, setView] = React.useState("home"); // 'home' | 'dashboard'
  const openAuth = (mode) => { setAuthMode(mode); setAuthOpen(true); };
  const openDashboard = () => setView("dashboard");
  const leaveDashboard = () => setView("home");

  const handleBuySkill = () => {
    if (auth.email) {
      openDashboard();
    } else {
      openAuth("signup");
    }
  };

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
