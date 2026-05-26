// auth.jsx — Cloudflare Worker backend auth with email verification
const { useState, useEffect } = React;

const STORAGE_JWT = "skill:jwt";
const API_URL = "https://skilled-cloud.papawhomaomao.workers.dev";

function useAuth() {
  const [email, setEmail] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateSession = async () => {
      const jwt = localStorage.getItem(STORAGE_JWT);
      if (!jwt) {
        setLoading(false);
        return;
      }
      try {
        const r = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${jwt}` }
        });
        const data = await r.json();
        if (data.ok) {
          setEmail(data.email);
          setRole(data.role || "user");
        } else {
          localStorage.removeItem(STORAGE_JWT);
        }
      } catch (e) {
        console.error("Session validation failed:", e);
        localStorage.removeItem(STORAGE_JWT);
      }
      setLoading(false);
    };
    validateSession();
  }, []);

  const signUp = async (em, pw, displayName) => {
    em = em.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) 
      return { ok: false, error: "Enter a valid email address." };
    if (pw.length < 8) 
      return { ok: false, error: "Password must be at least 8 characters." };
    
    try {
      const r = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw, displayName: displayName || em.split("@")[0] })
      });
      const data = await r.json();
      return data; // { ok, verifyToken } or { ok: false, error }
    } catch (e) {
      return { ok: false, error: "Network error. Try again." };
    }
  };

  const verify = async (verifyToken, code) => {
    try {
      const r = await fetch(`${API_URL}/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifyToken, code })
      });
      const data = await r.json();
      if (data.ok) {
        localStorage.setItem(STORAGE_JWT, data.jwt);
        setEmail(data.email);
        setRole(data.role || "user");
      }
      return data; // { ok, jwt, userId } or { ok: false, error, verifyToken, attemptsLeft }
    } catch (e) {
      return { ok: false, error: "Network error. Try again." };
    }
  };

  const resendCode = async (verifyToken) => {
    try {
      const r = await fetch(`${API_URL}/auth/resend-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifyToken })
      });
      const data = await r.json();
      return data; // { ok, verifyToken, cooldown } or { ok: false, error, expired }
    } catch (e) {
      return { ok: false, error: "Network error. Try again." };
    }
  };

  const signIn = async (em, pw) => {
    em = em.trim().toLowerCase();
    try {
      const r = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, password: pw })
      });
      const data = await r.json();
      if (data.ok) {
        localStorage.setItem(STORAGE_JWT, data.jwt);
        setEmail(em);
        setRole(data.role || "user");
      }
      return data;
    } catch (e) {
      return { ok: false, error: "Network error. Try again." };
    }
  };

  const signOut = () => {
    localStorage.removeItem(STORAGE_JWT);
    setEmail(null);
    setRole(null);
  };

  const getJWT = () => localStorage.getItem(STORAGE_JWT);

  return { email, role, loading, error, signUp, signIn, signOut, getJWT, verify, resendCode };
}

// Helper: authenticated fetch for later use
async function authenticatedFetch(path, options = {}) {
  const jwt = localStorage.getItem(STORAGE_JWT);
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${jwt}`
    }
  });
}

function AuthModal({ open, mode: initialMode, onClose, auth }) {
  const [mode, setMode] = useState(initialMode || "signin"); // 'signin' | 'signup' | 'verify'
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyToken, setVerifyToken] = useState(null);
  const [code, setCode] = useState("");
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (open) {
      setMode(initialMode || "signin");
      setEm(""); setPw(""); setDisplayName(""); setErr(""); setCode(""); setVerifyToken(null);
      setAttemptsLeft(5);
      setCooldown(0);
    }
  }, [open, initialMode]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSignUp = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await auth.signUp(em, pw, displayName);
    setLoading(false);
    if (r.ok) {
      setVerifyToken(r.verifyToken);
      setMode("verify");
    } else {
      setErr(r.error);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await auth.verify(verifyToken, code);
    setLoading(false);
    if (r.ok) {
      onClose();
    } else {
      if (r.expired) {
        setErr("Code expired. Request a new one.");
        setVerifyToken(null);
        setMode("signup");
      } else {
        setErr(r.error);
        if (r.verifyToken) setVerifyToken(r.verifyToken);
        if (typeof r.attemptsLeft === "number") setAttemptsLeft(r.attemptsLeft);
      }
    }
  };

  const handleResendCode = async () => {
    setErr("");
    setLoading(true);
    const r = await auth.resendCode(verifyToken);
    setLoading(false);
    if (r.ok) {
      setVerifyToken(r.verifyToken);
      setCooldown(r.cooldown);
      setCode("");
    } else {
      if (r.expired) {
        setErr("Code expired. Start over.");
        setVerifyToken(null);
        setMode("signup");
      } else {
        setErr(r.error);
      }
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const r = await auth.signIn(em, pw);
    setLoading(false);
    if (r.ok) {
      onClose();
    } else {
      setErr(r.error);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "oklch(0.04 0.012 275 / 0.85)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "grid", placeItems: "center",
      padding: 24,
      animation: "auth-fade 0.2s ease",
    }} onClick={onClose}>
      <style>{`
        @keyframes auth-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes auth-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .auth-modal input::placeholder { color: var(--fg-3); }
      `}</style>

      <div className="glass auth-modal" onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 440,
        padding: 36,
        borderRadius: 16,
        position: "relative",
        animation: "auth-rise 0.25s cubic-bezier(.2,.8,.2,1)",
        boxShadow: "0 40px 80px -20px oklch(0 0 0 / 0.6), 0 0 60px -20px var(--acc-glow)",
        borderColor: "var(--acc-line)",
        background: "linear-gradient(180deg, oklch(0.11 0.014 275 / 0.96), oklch(0.08 0.012 275 / 0.96))",
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: "absolute", top: 14, right: 14,
          width: 32, height: 32, borderRadius: 8,
          background: "transparent", border: "1px solid var(--line)",
          color: "var(--fg-2)", display: "grid", placeItems: "center",
        }}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 10, height: 10 }}>
            <path d="M2 2l8 8M10 2l-8 8" />
          </svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <div className="brand-mark" style={{ width: 30, height: 30, fontSize: 15 }}>S</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>Skill</span>
            <span className="mono" style={{ fontSize: 9.5, color: "var(--fg-3)", letterSpacing: "0.18em" }}>ACCOUNT</span>
          </div>
        </div>

        {mode !== "verify" && (
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            background: "oklch(1 0 0 / 0.04)",
            border: "1px solid var(--line)",
            borderRadius: 10, padding: 4, marginBottom: 24, position: "relative",
          }}>
            <div style={{
              position: "absolute", top: 4, bottom: 4,
              left: mode === "signin" ? 4 : "50%", width: "calc(50% - 4px)",
              background: "var(--acc-soft)",
              border: "1px solid var(--acc-line)",
              borderRadius: 7,
              transition: "left 0.2s cubic-bezier(.2,.8,.2,1)",
            }} />
            {["signin", "signup"].map(m => (
              <button key={m}
                type="button"
                onClick={() => { setMode(m); setErr(""); }}
                style={{
                  position: "relative", zIndex: 1,
                  background: "transparent", border: 0,
                  height: 36,
                  fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600,
                  color: mode === m ? "var(--acc)" : "var(--fg-2)",
                  transition: "color 0.15s ease",
                  letterSpacing: "-0.01em",
                }}>
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginBottom: 6, lineHeight: 1.15 }}>
          {mode === "signin" ? "Welcome back." : mode === "verify" ? "Verify email." : "Create an account."}
        </h2>
        <p style={{ color: "var(--fg-2)", fontSize: 14, marginBottom: 24 }}>
          {mode === "signin"
            ? "Sign in to manage your license and configs."
            : mode === "verify"
            ? <>Enter the code we sent to <span style={{ color: "var(--fg-1)", fontFamily: "var(--mono)" }}>{em}</span></>
            : "One account, three devices, lifetime updates."}
        </p>

        <form onSubmit={mode === "signin" ? handleSignIn : mode === "verify" ? handleVerify : handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {mode !== "verify" && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--fg-2)",
                }}>Email</label>
                <input
                  type="email"
                  value={em}
                  onChange={(e) => setEm(e.target.value)}
                  placeholder="you@domain.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  style={{
                    height: 44, padding: "0 14px",
                    background: "oklch(1 0 0 / 0.04)",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 9, color: "var(--fg)",
                    fontFamily: "var(--sans)", fontSize: 14, outline: "none",
                    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    opacity: loading ? 0.6 : 1,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--acc-line)"; e.target.style.boxShadow = "0 0 0 4px var(--acc-soft)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "var(--line-strong)"; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {mode === "signup" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{
                    fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                    letterSpacing: "0.18em", textTransform: "uppercase",
                    color: "var(--fg-2)",
                  }}>Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    disabled={loading}
                    style={{
                      height: 44, padding: "0 14px",
                      background: "oklch(1 0 0 / 0.04)",
                      border: "1px solid var(--line-strong)",
                      borderRadius: 9, color: "var(--fg)",
                      fontFamily: "var(--sans)", fontSize: 14, outline: "none",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      opacity: loading ? 0.6 : 1,
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--acc-line)"; e.target.style.boxShadow = "0 0 0 4px var(--acc-soft)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--line-strong)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{
                  fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                  letterSpacing: "0.18em", textTransform: "uppercase",
                  color: "var(--fg-2)",
                }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    placeholder={mode === "signup" ? "at least 8 characters" : "••••••••••"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                    disabled={loading}
                    style={{
                      width: "100%",
                      height: 44, padding: "0 44px 0 14px",
                      background: "oklch(1 0 0 / 0.04)",
                      border: "1px solid var(--line-strong)",
                      borderRadius: 9, color: "var(--fg)",
                      fontFamily: "var(--sans)", fontSize: 14, outline: "none",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                      opacity: loading ? 0.6 : 1,
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "var(--acc-line)"; e.target.style.boxShadow = "0 0 0 4px var(--acc-soft)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "var(--line-strong)"; e.target.style.boxShadow = "none"; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    disabled={loading}
                    style={{
                      position: "absolute", right: 6, top: 6,
                      width: 32, height: 32, borderRadius: 6,
                      background: "transparent", border: 0,
                      color: "var(--fg-3)",
                      display: "grid", placeItems: "center",
                      opacity: loading ? 0.5 : 1,
                    }}>
                    {showPw ? (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ width: 16, height: 16 }}>
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"/><circle cx="8" cy="8" r="2"/>
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ width: 16, height: 16 }}>
                        <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z"/><circle cx="8" cy="8" r="2"/><path d="M2 2l12 12"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === "verify" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{
                fontFamily: "var(--mono)", fontSize: 10, fontWeight: 500,
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "var(--fg-2)",
              }}>Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                required
                autoFocus
                disabled={loading}
                style={{
                  height: 56, padding: "0 14px",
                  background: "oklch(1 0 0 / 0.04)",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 9, color: "var(--fg)",
                  fontFamily: "var(--mono)", fontSize: 24, outline: "none", letterSpacing: "0.4em", textAlign: "center",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                  opacity: loading ? 0.6 : 1,
                  fontWeight: 600,
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--acc-line)"; e.target.style.boxShadow = "0 0 0 4px var(--acc-soft)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--line-strong)"; e.target.style.boxShadow = "none"; }}
              />
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                {attemptsLeft} {attemptsLeft === 1 ? "attempt" : "attempts"} remaining · 6-digit numeric code
              </div>
            </div>
          )}

          {err && (
            <div style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "oklch(0.30 0.10 25 / 0.18)",
              border: "1px solid oklch(0.60 0.18 25 / 0.4)",
              color: "oklch(0.86 0.12 25)",
              fontSize: 13,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 14, height: 14, flexShrink: 0 }}>
                <circle cx="8" cy="8" r="6.5"/><path d="M8 5v3.5M8 11v.5"/>
              </svg>
              {err}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading || (mode === "verify" && code.length < 6)} style={{
            width: "100%", justifyContent: "center", marginTop: 4,
            opacity: loading || (mode === "verify" && code.length < 6) ? 0.7 : 1,
          }}>
            {loading ? "Loading..." : (mode === "signin" ? "Sign in →" : mode === "verify" ? "Verify email →" : "Continue →")}
          </button>

          {mode === "verify" && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErr(""); setCode(""); setVerifyToken(null); }}
                disabled={loading}
                style={{
                  background: "transparent", border: 0,
                  color: "var(--fg-3)", fontSize: 12.5,
                  padding: 0,
                }}>
                ← Wrong email?
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={cooldown > 0 || loading}
                style={{
                  background: "transparent",
                  border: 0,
                  color: cooldown > 0 ? "var(--fg-3)" : "var(--acc)",
                  fontSize: 12.5,
                  cursor: cooldown > 0 ? "not-allowed" : "pointer",
                  opacity: cooldown > 0 ? 0.6 : 1,
                  padding: 0,
                }}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          )}
        </form>

        <p style={{
          textAlign: "center", marginTop: 20,
          fontSize: 12.5, color: "var(--fg-3)",
        }}>
          {mode === "signin" ? (
            <>Don't have an account?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signup"); setErr(""); }}
                 style={{ color: "var(--acc)" }}>Sign up</a></>
          ) : mode === "signup" ? (
            <>Already have one?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); setMode("signin"); setErr(""); }}
                 style={{ color: "var(--acc)" }}>Sign in</a></>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function UserMenu({ auth, onDashboard }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (!e.target.closest("[data-user-menu]")) setOpen(false);
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  const initials = (auth.email || "?").slice(0, 2).toUpperCase();
  const handle = auth.email ? auth.email.split("@")[0] : "";

  return (
    <div data-user-menu style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} className="btn btn-ghost" style={{
        height: 42, padding: "0 8px 0 6px", gap: 8,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, var(--acc), var(--acc-2))",
          color: "oklch(0.12 0.01 275)",
          display: "grid", placeItems: "center",
          fontSize: 11, fontWeight: 700,
          boxShadow: "0 0 12px var(--acc-glow)",
        }}>{initials}</span>
        <span style={{ fontSize: 13, fontWeight: 600, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {handle}
        </span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 10, height: 10, opacity: 0.6, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s" }}>
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div className="glass" style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: 240, padding: 8, zIndex: 100,
          borderRadius: 12,
          animation: "auth-rise 0.18s ease",
          boxShadow: "0 24px 60px -20px oklch(0 0 0 / 0.6)",
        }}>
          <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid var(--line)", marginBottom: 6 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--fg-3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 4 }}>Signed in as</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.email}</div>
          </div>
          <MenuItem icon="dashboard" label={auth.role === "dev" ? "Developer dashboard" : "Dashboard"} onClick={() => { setOpen(false); onDashboard && onDashboard(); }} />
          <MenuItem icon="key" label="License" />
          <MenuItem icon="device" label="Devices" badge="1/3" />
          <MenuItem icon="gear" label="Settings" />
          <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }} />
          <MenuItem icon="signout" label="Sign out" onClick={auth.signOut} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, badge, onClick, danger }) {
  const icons = {
    dashboard: <path d="M3 3h5v6H3zm7 0h3v3h-3zm0 5h3v5h-3zm-7 3h5v2H3z" />,
    key:       <><circle cx="5" cy="8" r="2.5"/><path d="M7.5 8h6m-2 0v2m2-2v3"/></>,
    device:    <><rect x="2.5" y="3" width="11" height="7" rx="1"/><path d="M5 13h6"/></>,
    gear:      <><circle cx="8" cy="8" r="2"/><path d="M8 1.5v1.8M8 12.7v1.8M14.5 8h-1.8M3.3 8H1.5M12.6 3.4l-1.3 1.3M4.7 11.3l-1.3 1.3M12.6 12.6l-1.3-1.3M4.7 4.7L3.4 3.4"/></>,
    signout:   <><path d="M9 3H4v10h5M11 5l3 3-3 3M14 8H7"/></>,
  };
  return (
    <button onClick={onClick} style={{
      width: "100%", height: 36, padding: "0 10px",
      background: "transparent", border: 0, borderRadius: 7,
      color: danger ? "oklch(0.78 0.18 25)" : "var(--fg-1)",
      display: "flex", alignItems: "center", gap: 10,
      font: "500 13px var(--sans)", textAlign: "left",
      transition: "background 0.1s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "oklch(1 0 0 / 0.05)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <svg viewBox="0 0 16 16" fill={icon === "dashboard" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" style={{ width: 14, height: 14, opacity: 0.8 }}>
        {icons[icon]}
      </svg>
      <span>{label}</span>
      {badge && (
        <span className="mono" style={{
          marginLeft: "auto", fontSize: 10,
          padding: "2px 6px", borderRadius: 4,
          background: "oklch(1 0 0 / 0.06)", color: "var(--fg-2)",
        }}>{badge}</span>
      )}
    </button>
  );
}

// Announcements (unchanged from before)
const STORAGE_ANNOUNCEMENTS = "skill:announcements";

function readAnnouncements() {
  try { return JSON.parse(localStorage.getItem(STORAGE_ANNOUNCEMENTS)) || []; }
  catch { return []; }
}
function writeAnnouncements(a) { localStorage.setItem(STORAGE_ANNOUNCEMENTS, JSON.stringify(a)); }

function useAnnouncements() {
  const [list, setList] = useState(readAnnouncements);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_ANNOUNCEMENTS) setList(readAnnouncements());
    };
    window.addEventListener("storage", onStorage);
    const onLocal = () => setList(readAnnouncements());
    window.addEventListener("skill:announcements", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("skill:announcements", onLocal);
    };
  }, []);
  const post = (from, body) => {
    const next = [{ id: Date.now() + "_" + Math.random().toString(36).slice(2,6), at: Date.now(), from, body }, ...readAnnouncements()];
    writeAnnouncements(next);
    setList(next);
    window.dispatchEvent(new Event("skill:announcements"));
  };
  const remove = (id) => {
    const next = readAnnouncements().filter(a => a.id !== id);
    writeAnnouncements(next);
    setList(next);
    window.dispatchEvent(new Event("skill:announcements"));
  };
  return { list, post, remove };
}

// Backend-backed buyers directory used by the developer dashboard.
// Calls /admin/users every 8s. Accepts both array and map shapes from the
// worker. Falls back to {} if the endpoint isn't deployed yet so the
// dashboard renders an empty buyers table instead of crashing.
function useUserDirectory() {
  const [users, setUsers] = useState({});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await authenticatedFetch("/admin/users");
        if (!r.ok) return;
        const data = await r.json();
        if (!alive || !data || !data.ok) return;
        if (Array.isArray(data.users)) {
          const map = {};
          for (const u of data.users) {
            const em = (u.email || "").toLowerCase();
            if (em) map[em] = u;
          }
          setUsers(map);
        } else if (data.users && typeof data.users === "object") {
          setUsers(data.users);
        }
      } catch (e) { /* offline / endpoint missing — leave empty */ }
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return users;
}

Object.assign(window, { useAuth, useAnnouncements, useUserDirectory, AuthModal, UserMenu, authenticatedFetch });
