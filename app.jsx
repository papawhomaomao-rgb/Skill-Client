// app.jsx — top-level App with Tweaks
const { useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "blue"
}/*EDITMODE-END*/;

const ACCENTS = {
  blue:  { acc:"oklch(0.75 0.16 240)", acc2:"oklch(0.66 0.18 245)", soft:"oklch(0.75 0.16 240 / 0.14)", line:"oklch(0.75 0.16 240 / 0.35)", glow:"oklch(0.75 0.16 240 / 0.45)" },
  green: { acc:"oklch(0.80 0.20 145)", acc2:"oklch(0.72 0.22 145)", soft:"oklch(0.80 0.20 145 / 0.14)", line:"oklch(0.80 0.20 145 / 0.35)", glow:"oklch(0.80 0.20 145 / 0.45)" },
  red:   { acc:"oklch(0.70 0.22 25)",  acc2:"oklch(0.60 0.24 25)",  soft:"oklch(0.70 0.22 25 / 0.15)",  line:"oklch(0.70 0.22 25 / 0.38)",  glow:"oklch(0.70 0.22 25 / 0.45)" },
  violet:{ acc:"oklch(0.70 0.22 295)", acc2:"oklch(0.60 0.24 295)", soft:"oklch(0.70 0.22 295 / 0.15)", line:"oklch(0.70 0.22 295 / 0.38)", glow:"oklch(0.70 0.22 295 / 0.45)" },
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

  useEffect(() => {
    const a = ACCENTS[t.accent] || ACCENTS.blue;
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
            <a href="#features">features</a>
            <a href="#modules">modules</a>
            <a href="#changelog">changelog</a>
            <a href="#download">download</a>
            <a href="#discord">discord</a>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {auth.email ? (
              <UserMenu auth={auth} onDashboard={openDashboard} />
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => openAuth("signin")}>sign in</button>
                <button className="btn btn-primary" onClick={() => openAuth("signup")}>get skilled</button>
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
          options={[ACCENTS.blue.acc, ACCENTS.green.acc, ACCENTS.red.acc, ACCENTS.violet.acc]}
          onChange={(v) => {
            const key = Object.keys(ACCENTS).find(k => ACCENTS[k].acc === v) || "blue";
            setTweak("accent", key);
          }}
        />
      </TweaksPanel>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
