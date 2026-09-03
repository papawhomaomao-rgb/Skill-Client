// auth.jsx — Clerk-backed auth.
// Clerk owns identity (users, passwords, Google OAuth, email verification, sessions).
// The Cloudflare Worker owns app data and verifies Clerk session tokens.

const { useState, useEffect, useRef, useCallback } = React;

const API_URL = "https://skilled-cloud.papawhomaomao.workers.dev";

/* Developer accounts.

   Keep in sync with DEV_EMAILS in worker/wrangler.toml. This copy is cosmetic:
   it decides whether the browser draws the developer dashboard instead of the
   buyer one, and nothing more. Every privilege behind that UI — broadcasting,
   the account roster, revoking someone else's session — is re-checked by the
   Worker against the same list on its side, so editing this array in devtools
   gets you an empty dashboard and a wall of 403s, not access.

   Matched case-insensitively against the account's primary email, which Clerk
   has already verified. */
const DEV_EMAILS = ["papawhomaomao@gmail.com"];

const isDevEmail = (email) =>
  !!email && DEV_EMAILS.includes(String(email).trim().toLowerCase());

/* ─────────── Clerk bootstrap ─────────── */

// Resolves once window.Clerk exists and has finished loading.
function clerkReady() {
  return window.__clerkReady || Promise.reject(new Error("Clerk script not loaded"));
}

/* Reads the live accent from CSS so Clerk's UI follows the Tweaks panel. */
function readTheme() {
  const s = getComputedStyle(document.documentElement);
  const v = (n, f) => (s.getPropertyValue(n) || f).trim();
  return {
    acc: v("--acc", "oklch(0.70 0.22 305)"),
    bg: v("--bg-1", "oklch(0.085 0.016 290)"),
    fg: v("--fg", "oklch(0.99 0.003 290)"),
    fg2: v("--fg-2", "oklch(0.60 0.014 290)"),
    line: v("--line-2", "oklch(1 0 0 / 0.11)"),
  };
}

function clerkAppearance() {
  const t = readTheme();
  return {
    variables: {
      colorPrimary: t.acc,
      colorBackground: "transparent",
      colorText: t.fg,
      colorTextSecondary: t.fg2,
      colorInputBackground: "oklch(1 0 0 / 0.04)",
      colorInputText: t.fg,
      colordanger: "oklch(0.70 0.21 25)",
      colorSuccess: "oklch(0.78 0.19 148)",
      borderRadius: "8px",
      fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif',
      fontSize: "14px",
    },
    elements: {
      rootBox: { width: "100%" },
      cardBox: { width: "100%", boxShadow: "none", border: "none" },
      card: { background: "transparent", boxShadow: "none", border: "none", padding: 0, width: "100%" },
      header: { display: "none" },
      footer: { background: "transparent", borderTop: `1px solid ${t.line}`, marginTop: 18, paddingTop: 14 },
      footerAction: { justifyContent: "center" },
      formButtonPrimary: {
        height: 40, borderRadius: 8, fontSize: 14, fontWeight: 600,
        textTransform: "none", letterSpacing: "-0.006em",
        boxShadow: "none", border: "none",
        "&:hover": { filter: "brightness(1.08)" },
        "&:focus": { boxShadow: "none" },
      },
      socialButtonsBlockButton: {
        height: 40, borderRadius: 8, border: `1px solid ${t.line}`,
        background: "transparent", color: t.fg, fontSize: 14, fontWeight: 500,
        "&:hover": { background: "oklch(1 0 0 / 0.045)" },
      },
      socialButtonsBlockButtonText: { fontSize: 14, fontWeight: 500 },
      dividerLine: { background: t.line },
      dividerText: { color: t.fg2, fontSize: 12 },
      formFieldLabel: { color: t.fg2, fontSize: 12, fontWeight: 500 },
      formFieldInput: { height: 40, borderRadius: 8, border: `1px solid ${t.line}`, fontSize: 14 },
      identityPreview: { background: "oklch(1 0 0 / 0.04)", border: `1px solid ${t.line}` },
      otpCodeFieldInput: { border: `1px solid ${t.line}`, borderRadius: 8, color: t.fg },
      formFieldAction: { color: t.acc },
      footerActionLink: { color: t.acc, "&:hover": { color: t.acc } },
      formResendCodeLink: { color: t.acc },
      logoBox: { display: "none" },
    },
    layout: { socialButtonsPlacement: "top", showOptionalFields: false },
  };
}

/* Appearance for Clerk's OWN modals (user profile, etc). Unlike the embedded
   sign-in form, these render their own card + backdrop, so they need opaque
   surfaces — reusing the embedded theme makes them see-through. */
function clerkModalAppearance() {
  const t = readTheme();
  const surface = "oklch(0.105 0.016 292)";
  const surfaceAlt = "oklch(0.082 0.014 292)";
  return {
    variables: {
      colorPrimary: t.acc,
      colorBackground: surface,
      colorText: t.fg,
      colorTextSecondary: t.fg2,
      colorInputBackground: "oklch(1 0 0 / 0.045)",
      colorInputText: t.fg,
      colorDanger: "oklch(0.70 0.21 25)",
      colorSuccess: "oklch(0.78 0.19 148)",
      colorShimmer: "oklch(1 0 0 / 0.06)",
      borderRadius: "8px",
      fontFamily: '"Geist", ui-sans-serif, system-ui, sans-serif',
      fontSize: "14px",
    },
    elements: {
      modalBackdrop: { background: "oklch(0.08 0 0 / 0.72)" },
      modalContent: { boxShadow: "0 16px 40px -16px oklch(0 0 0 / 0.6)" },
      cardBox: { background: surface, border: `1px solid ${t.line}`, borderRadius: "12px", boxShadow: "0 16px 40px -16px oklch(0 0 0 / 0.6)", overflow: "hidden" },
      card: { background: surface, boxShadow: "none", border: "none" },
      navbar: { background: surfaceAlt, borderRight: `1px solid ${t.line}`, backgroundImage: "none" },
      navbarButton: { color: t.fg2, "&:hover": { background: "oklch(1 0 0 / 0.05)", color: t.fg } },
      navbarButtonIcon: { opacity: 0.8 },
      scrollBox: { background: surface },
      pageScrollBox: { background: surface },
      profileSectionContent: { background: "transparent" },
      profileSection: { borderColor: t.line },
      profileSectionPrimaryButton: { color: t.acc },
      headerTitle: { color: t.fg, fontWeight: 600, letterSpacing: "-0.02em" },
      headerSubtitle: { color: t.fg2 },
      formButtonPrimary: { height: 38, borderRadius: 8, fontSize: 14, fontWeight: 600, textTransform: "none", boxShadow: "none", border: "none" },
      formButtonReset: { color: t.fg2 },
      formFieldInput: { height: 38, borderRadius: 8, border: `1px solid ${t.line}`, fontSize: 14 },
      formFieldLabel: { color: t.fg2, fontSize: 12, fontWeight: 500 },
      badge: { background: "oklch(1 0 0 / 0.06)", color: t.fg2 },
      avatarBox: { borderRadius: "10px" },
      dividerLine: { background: t.line },
      dividerText: { color: t.fg2 },
      footer: { display: "none" },
    },
  };
}

/* ─────────── useAuth ─────────── */

function useAuth() {
  const [clerk, setClerk] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    clerkReady()
      .then((c) => {
        if (!alive) return;
        setClerk(c);
        setUser(c.user || null);
        setLoading(false);
        // fires on sign-in, sign-out, and user updates
        c.addListener(({ user: u }) => { if (alive) setUser(u || null); });
      })
      .catch((e) => {
        console.error("[auth] Clerk failed to load:", e);
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  const signOut = useCallback(() => {
    if (clerk) clerk.signOut();
  }, [clerk]);

  const getToken = useCallback(async () => {
    if (!clerk || !clerk.session) return null;
    return clerk.session.getToken();
  }, [clerk]);

  const email = user ? (user.primaryEmailAddress?.emailAddress || null) : null;
  const role = user ? (isDevEmail(email) ? "dev" : (user.publicMetadata?.role || "user")) : null;
  const name = user ? (user.username || user.firstName || (email ? email.split("@")[0] : null)) : null;
  const avatar = user ? user.imageUrl : null;

  return { clerk, user, email, role, name, avatar, loading, signOut, getToken };
}

/* Authenticated call to the Worker, using the Clerk session token. */
async function authenticatedFetch(path, options = {}) {
  let token = null;
  try {
    const c = await clerkReady();
    token = c.session ? await c.session.getToken() : null;
  } catch (e) { /* not signed in */ }
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/* ─────────── AuthModal — our chrome, Clerk's form ─────────── */

function AuthModal({ open, mode, onClose, auth }) {
  const slot = useRef(null);
  const mounted = useRef(null);
  const isSignUp = mode === "signup";

  useEffect(() => {
    if (!open || !auth.clerk || !slot.current) return;
    const c = auth.clerk;
    const node = slot.current;
    const appearance = clerkAppearance();

    if (isSignUp) {
      c.mountSignUp(node, { appearance, signInUrl: "#", routing: "virtual" });
      mounted.current = () => c.unmountSignUp(node);
    } else {
      c.mountSignIn(node, { appearance, signUpUrl: "#", routing: "virtual" });
      mounted.current = () => c.unmountSignIn(node);
    }
    return () => {
      try { mounted.current && mounted.current(); } catch (e) {}
      mounted.current = null;
    };
  }, [open, isSignUp, auth.clerk]);

  // close once signed in
  useEffect(() => { if (open && auth.email) onClose(); }, [open, auth.email, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "oklch(0.08 0 0 / 0.72)",
      display: "grid", placeItems: "center", padding: 24,
      animation: "auth-fade .18s ease",
    }}>
      <style>{`
        @keyframes auth-fade{from{opacity:0}to{opacity:1}}
        @keyframes auth-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .cl-internal-b3fm6y,.cl-logoBox{display:none!important}
      `}</style>

      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 400, padding: "28px 28px 24px",
        borderRadius: 12, position: "relative",
        background: "var(--bg-1)",
        border: "1px solid var(--line-2)",
        boxShadow: "var(--sh-4)",
        animation: "auth-rise .22s cubic-bezier(.2,.8,.2,1)",
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: "absolute", top: 14, right: 14, width: 28, height: 28,
          borderRadius: 6, border: "1px solid var(--line-2)", color: "var(--fg-3)",
          display: "grid", placeItems: "center",
        }}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}>
            <path d="m2 2 8 8M10 2l-8 8" />
          </svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div className="brand-mark" style={{ width: 26, height: 26 }}></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: "-.018em" }}>
              {isSignUp ? "Create your account" : "Sign in to Skilled"}
            </span>
            <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
              {isSignUp ? "One account, one device." : "Welcome back."}
            </span>
          </div>
        </div>

        {/* Clerk mounts here */}
        <div ref={slot} />

        {!auth.clerk && (
          <div style={{ padding: "28px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── UserMenu ─────────── */

function UserMenu({ auth, onDashboard }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (!e.target.closest("[data-user-menu]")) setOpen(false); };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, [open]);

  const initials = (auth.name || auth.email || "?").slice(0, 2).toUpperCase();
  const isDev = auth.role === "dev";

  return (
    <div data-user-menu style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} className="btn btn-ghost" style={{ height: 36, padding: "0 8px 0 5px", gap: 8 }}>
        {auth.avatar ? (
          <img src={auth.avatar} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--bg-2)", border: "1px solid var(--line-2)", color: "var(--fg-1)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</span>
        )}
        <span style={{ fontSize: 13.5, fontWeight: 500, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.name}</span>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10, opacity: .55, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: 236, padding: 7, zIndex: 100,
          borderRadius: 10, background: "var(--bg-1)",
          border: "1px solid var(--line-2)", boxShadow: "var(--sh-4)",
          animation: "auth-rise .16s ease",
        }}>
          <div style={{ padding: "9px 11px 11px", borderBottom: "1px solid var(--line)", marginBottom: 5 }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--fg-3)", fontWeight: 600, marginBottom: 5 }}>Signed in as</div>
            <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{auth.email}</div>
            {isDev && <div style={{ marginTop: 7 }}><span className="tag" style={{ height: 20, fontSize: 10 }}>Developer</span></div>}
          </div>
          <MenuItem icon="dashboard" label={isDev ? "Developer dashboard" : "Dashboard"} onClick={() => { setOpen(false); onDashboard && onDashboard(); }} />
          <MenuItem icon="gear" label="Manage account" onClick={() => { setOpen(false); auth.clerk && auth.clerk.openUserProfile({ appearance: clerkModalAppearance() }); }} />
          <div style={{ height: 1, background: "var(--line)", margin: "5px 0" }} />
          <MenuItem icon="signout" label="Sign out" onClick={auth.signOut} danger />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  const icons = {
    dashboard: <path d="M3 3h5v6H3zm7 0h3v3h-3zm0 5h3v5h-3zm-7 3h5v2H3z" />,
    gear: <><circle cx="8" cy="8" r="2" /><path d="M8 1.6v1.7M8 12.7v1.7M14.4 8h-1.7M3.3 8H1.6M12.5 3.5l-1.2 1.2M4.7 11.3l-1.2 1.2M12.5 12.5l-1.2-1.2M4.7 4.7 3.5 3.5" /></>,
    signout: <><path d="M9 3H4v10h5M11 5l3 3-3 3M14 8H7" /></>,
  };
  return (
    <button onClick={onClick} style={{
      width: "100%", height: 34, padding: "0 11px", borderRadius: 8,
      color: danger ? "oklch(0.72 0.19 25)" : "var(--fg-1)",
      display: "flex", alignItems: "center", gap: 10,
      fontSize: 13, fontWeight: 500, textAlign: "left", transition: "background .1s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "oklch(1 0 0 / 0.05)"}
      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
      <svg viewBox="0 0 16 16" fill={icon === "dashboard" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" style={{ width: 14, height: 14, opacity: .8 }}>
        {icons[icon]}
      </svg>
      {label}
    </button>
  );
}

/* ─────────── Announcements — Worker first, localStorage fallback ─────────── */

const STORAGE_ANNOUNCEMENTS = "skill:announcements";
const readLocal = () => { try { return JSON.parse(localStorage.getItem(STORAGE_ANNOUNCEMENTS)) || []; } catch { return []; } };
const writeLocal = (a) => localStorage.setItem(STORAGE_ANNOUNCEMENTS, JSON.stringify(a));

function useAnnouncements() {
  const [list, setList] = useState(readLocal);
  const [remote, setRemote] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await authenticatedFetch("/announcements");
      if (!r.ok) return false;
      const d = await r.json();
      if (d && d.ok && Array.isArray(d.announcements)) {
        setList(d.announcements);
        setRemote(true);
        return true;
      }
    } catch (e) { /* endpoint not deployed */ }
    return false;
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    const onStorage = (e) => { if (e.key === STORAGE_ANNOUNCEMENTS) setList(readLocal()); };
    const onLocal = () => setList(readLocal());
    window.addEventListener("storage", onStorage);
    window.addEventListener("skill:announcements", onLocal);
    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("skill:announcements", onLocal);
    };
  }, [load]);

  const post = async (from, body) => {
    try {
      const r = await authenticatedFetch("/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (r.ok) { const d = await r.json(); if (d && d.ok) { await load(); return; } }
    } catch (e) { /* fall through */ }
    const next = [{ id: Date.now() + "_" + Math.random().toString(36).slice(2, 6), at: Date.now(), from, body }, ...readLocal()];
    writeLocal(next); setList(next);
    window.dispatchEvent(new Event("skill:announcements"));
  };

  const remove = async (id) => {
    try {
      const r = await authenticatedFetch(`/admin/broadcast/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (r.ok) { await load(); return; }
    } catch (e) { /* fall through */ }
    const next = readLocal().filter(a => a.id !== id);
    writeLocal(next); setList(next);
    window.dispatchEvent(new Event("skill:announcements"));
  };

  return { list, post, remove, remote };
}

/* ─────────── User directory — Worker proxies Clerk's Backend API ─────────── */

function useUserDirectory() {
  const [users, setUsers] = useState({});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await authenticatedFetch("/admin/users");
        if (!r.ok) return;
        const d = await r.json();
        if (!alive || !d || !d.ok) return;
        if (Array.isArray(d.users)) {
          const map = {};
          for (const u of d.users) {
            const em = (u.email || "").toLowerCase();
            if (em) map[em] = u;
          }
          setUsers(map);
        } else if (d.users && typeof d.users === "object") {
          setUsers(d.users);
        }
      } catch (e) { /* endpoint not deployed */ }
    };
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return users;
}

/* ─────────── Devices — real launcher sessions from Worker ─────────── */

function useDevices() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    try {
      const r = await authenticatedFetch("/api/sessions");
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.ok && Array.isArray(d.sessions)) {
        setSessions(d.sessions);
      }
    } catch (e) { /* endpoint not deployed */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const revoke = async (sessionId) => {
    try {
      const r = await authenticatedFetch(`/api/sessions/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
      if (r.ok) await load();
    } catch (e) { /* fall through */ }
  };

  return { sessions, loading, reload: load, revoke };
}

/* ─────────── Plans, checkout, entitlement ─────────── */

/* GET /api/plans is public, because the pricing section has to render for
   someone who has never signed in. The amounts come from worker/src/plans.js
   and are never written down here — a price that disagrees with itself between
   the page and the charge is the kind of bug you hear about through a
   chargeback.

   `configured` is the Worker saying whether a payment provider actually has its
   keys. It stays false until the secrets are set, and the buy button reads it,
   so the section ships in a disabled state rather than a broken one. */
function usePlans() {
  const [state, setState] = useState({ plans: [], configured: false, loading: true, error: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_URL}/api/plans`);
        const d = await r.json();
        if (!alive) return;
        if (!d || !d.ok) throw new Error("bad response");
        setState({ plans: d.plans || [], configured: !!d.configured, loading: false, error: null });
      } catch (e) {
        if (alive) setState({ plans: [], configured: false, loading: false, error: "unreachable" });
      }
    })();
    return () => { alive = false; };
  }, []);

  return state;
}

const CHECKOUT_ERRORS = {
  not_configured: "The store is not open yet.",
  unknown_plan: "That plan no longer exists — reload the page.",
  slow_down: "Too many attempts. Wait a minute and try again.",
};

/* POST /api/checkout, then hand the browser to whoever the Worker chose.

   There is deliberately no fallback if that call fails. Sending someone to a
   payment page this app did not mint means a payment carrying no account id,
   and an unattributed payment is the one failure here that costs real money to
   unpick — better a button that says it did not work. */
function useCheckout() {
  const [busy, setBusy] = useState(null);   // the plan id, so only its card waits
  const [error, setError] = useState(null);

  const start = async (plan) => {
    setBusy(plan);
    setError(null);
    try {
      const r = await authenticatedFetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await r.json().catch(() => null);
      // Leave `busy` set on success: the page is navigating away.
      if (r.ok && d && d.ok && d.url) { window.location.assign(d.url); return; }
      setError((d && CHECKOUT_ERRORS[d.error]) || "Could not start checkout. Try again in a moment.");
    } catch (e) {
      setError("Could not reach the store. Check your connection and try again.");
    }
    setBusy(null);
  };

  return { start, busy, error };
}

/* GET /api/entitlement — the record behind the Licence panel, and also the one
   place a purchase made before the account existed gets claimed. Worth calling
   even for an account that has never bought anything, for exactly that reason.

   Pass enabled=false when signed out; the call would only 401. */
function useEntitlement(enabled = true) {
  const [ent, setEnt] = useState(null);
  const [loading, setLoading] = useState(!!enabled);

  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    try {
      const r = await authenticatedFetch("/api/entitlement");
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.ok && d.entitlement) setEnt(d.entitlement);
    } catch (e) { /* endpoint not deployed */ }
    finally { setLoading(false); }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);
  return { ent, loading, reload: load };
}

/* Minor units in, money out. The catalogue is the only place an amount is
   written down; this just renders it, and drops the cents when there are
   none — $25, not $25.00. */
function formatPrice(amount, currency) {
  const value = (Number(amount) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    }).format(value);
  } catch (e) {
    return `$${value.toFixed(2)}`;
  }
}

Object.assign(window, {
  useAuth, useAnnouncements, useUserDirectory, useDevices,
  usePlans, useCheckout, useEntitlement, formatPrice,
  AuthModal, UserMenu, authenticatedFetch, clerkAppearance, clerkModalAppearance, API_URL,
});
