// terms.jsx — Terms of Service page

function TermsPage({ onClose }) {
  const EFFECTIVE = "September 6, 2025";

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 15, fontWeight: 650, letterSpacing: "-.018em", color: "var(--fg)", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, lineHeight: 1.75, color: "var(--fg-1)", display: "flex", flexDirection: "column", gap: 10 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "oklch(0.08 0 0 / 0.80)",
      display: "grid", placeItems: "center", padding: "24px 16px",
      animation: "auth-fade .18s ease",
      overflowY: "auto",
    }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: 680,
        borderRadius: 14, background: "var(--bg-1)",
        border: "1px solid var(--line-2)",
        boxShadow: "var(--sh-4)",
        animation: "auth-rise .22s cubic-bezier(.2,.8,.2,1)",
        overflow: "hidden",
        maxHeight: "90vh",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{
          padding: "22px 28px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.022em", color: "var(--fg)" }}>Terms of Service</div>
            <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 3 }}>Effective: {EFFECTIVE}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            width: 30, height: 30, borderRadius: 7,
            border: "1px solid var(--line-2)", color: "var(--fg-3)",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}>
            <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}>
              <path d="m2 2 8 8M10 2l-8 8" />
            </svg>
          </button>
        </div>

        <div style={{ padding: "28px 28px 32px", overflowY: "auto" }}>

          <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--fg-2)", marginBottom: 32, padding: "14px 16px", borderRadius: 8, background: "oklch(1 0 0 / 0.03)", border: "1px solid var(--line)" }}>
            Please read these Terms of Service carefully before creating an account or using Skill. By registering, downloading, or using Skill in any capacity, you confirm that you have read, understood, and agree to be bound by these terms. If you do not agree, you may not use Skill.
          </p>

          <Section title="1. Acceptance of Terms">
            <p>These Terms of Service ("Terms") constitute a legally binding agreement between you ("User") and Skill ("we," "us," or "our"). These Terms govern your access to and use of the Skill software client, website, accounts, and all associated services (collectively, "the Service").</p>
            <p>By creating an account, you represent that you are at least 13 years of age, or the applicable age of digital consent in your jurisdiction, and that you have the legal capacity to enter into this agreement.</p>
          </Section>

          <Section title="2. No Cracking, Bypassing, or Reverse Engineering">
            <p>You <strong style={{ color: "var(--fg)", fontWeight: 650 }}>may not</strong> crack, decompile, disassemble, reverse engineer, or otherwise attempt to derive the source code, algorithms, or structure of Skill or any of its components.</p>
            <p>You may not bypass, circumvent, remove, deactivate, or otherwise undermine any licence validation, authentication, entitlement check, or security mechanism built into Skill.</p>
            <p>Attempting to crack a licence key, generate fake licence keys, modify licence data, or use Skill beyond the scope of your purchased entitlement is a material breach of these Terms and may constitute criminal offences under applicable computer-fraud and intellectual-property laws.</p>
            <p>Any account found to have participated in cracking activity will be permanently banned without refund. We reserve the right to pursue civil and criminal remedies to the fullest extent permitted by law.</p>
          </Section>

          <Section title="3. No Redistribution">
            <p>Skill is licensed to you, not sold. Your licence is personal, non-transferable, and non-sublicensable. You <strong style={{ color: "var(--fg)", fontWeight: 650 }}>may not</strong>:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Redistribute, resell, sublicense, lease, or transfer your copy of Skill or your licence key to any third party.</li>
              <li>Upload, share, torrent, or otherwise distribute Skill's binary files, installer, or any modified version of them.</li>
              <li>Bundle Skill with any other software product or service without our explicit written permission.</li>
              <li>Share, sell, or give away your account credentials to another person.</li>
              <li>Create or operate any public or private loader, injector, or wrapper that distributes Skill's functionality without authorisation.</li>
            </ul>
            <p>Redistribution of Skill in any form — paid or free — is strictly prohibited. Violations will result in immediate account termination, revocation of your licence, and legal action where appropriate.</p>
          </Section>

          <Section title="4. No Fraud or Abuse">
            <p>You agree not to engage in any fraudulent, deceptive, or abusive conduct in connection with Skill, including but not limited to:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Initiating fraudulent chargebacks or payment disputes for purchases you genuinely made and received.</li>
              <li>Using stolen, borrowed, or otherwise unauthorised payment methods to purchase a licence.</li>
              <li>Misrepresenting your identity, account, or entitlement to gain unauthorised access to features.</li>
              <li>Impersonating a Skill staff member, developer, or support representative.</li>
              <li>Creating multiple accounts to circumvent bans, rate limits, or single-device restrictions.</li>
              <li>Attempting to manipulate, exploit, or abuse any promotional, referral, or discount system.</li>
            </ul>
            <p>Fraudulent chargebacks will result in immediate and permanent account suspension. We reserve the right to pursue recovery of disputed amounts through our payment processor and applicable legal channels.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>Skill is provided for personal use only. You agree not to use Skill in any way that:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Violates any local, national, or international law or regulation.</li>
              <li>Causes harm, distress, or damage to any third party.</li>
              <li>Interferes with or disrupts the integrity or performance of our services or infrastructure.</li>
              <li>Exploits, harms, or attempts to exploit or harm minors in any way.</li>
            </ul>
          </Section>

          <Section title="6. Account Responsibility">
            <p>You are solely responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately if you become aware of any unauthorised use of your account.</p>
            <p>We will not be liable for any loss or damage arising from your failure to comply with this section. Any activity that occurs under your account is your responsibility.</p>
          </Section>

          <Section title="7. Termination">
            <p>We reserve the right to suspend or permanently terminate your account at our sole discretion, with or without notice, for any violation of these Terms. Upon termination:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
              <li>Your access to Skill will be immediately revoked.</li>
              <li>Any licences associated with your account will be voided.</li>
              <li>Refunds are issued solely at our discretion and are not guaranteed upon termination for cause.</li>
            </ul>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>Skill is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of harmful components.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by applicable law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service.</p>
          </Section>

          <Section title="10. Changes to These Terms">
            <p>We may update these Terms from time to time. Continued use of Skill after changes are posted constitutes your acceptance of the revised Terms. We will make reasonable efforts to notify you of material changes via the website or your account email.</p>
          </Section>

          <Section title="11. Contact">
            <p>For questions about these Terms, please reach us via our Discord server or through the contact link in the footer of this website.</p>
          </Section>

        </div>

        <div style={{
          padding: "14px 28px",
          borderTop: "1px solid var(--line)",
          display: "flex", justifyContent: "flex-end",
          flexShrink: 0,
        }}>
          <button onClick={onClose} className="btn btn-primary" style={{ height: 36, padding: "0 20px", fontSize: 13 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { TermsPage });
