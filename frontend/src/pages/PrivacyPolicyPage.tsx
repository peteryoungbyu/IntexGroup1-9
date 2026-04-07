export default function PrivacyPolicyPage() {
  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">Legal</p>
          <h1>Privacy Policy</h1>
          <p>How we collect, use, and protect your data</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="card">
            <div className="card-body p-4 p-md-5">
              <p className="text-muted small mb-4">Last updated: April 2026</p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>1. Who We Are</h2>
              <p>New Dawn Foundation operates this web application to manage case records, supporter relationships, and organizational impact reporting. We are committed to protecting the privacy of all individuals whose data is processed by this system.</p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>2. What Data We Collect</h2>
              <ul>
                <li><strong>Account data:</strong> Email address, hashed password, authentication tokens.</li>
                <li><strong>Supporter data:</strong> Name, contact information, donation history — collected to maintain donor relationships.</li>
                <li><strong>Resident data:</strong> Case records are maintained for program management and regulatory compliance. Access is restricted to authorized staff.</li>
                <li><strong>Usage data:</strong> Server logs, session cookies for authentication.</li>
              </ul>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>3. Legal Basis (GDPR)</h2>
              <p>We process personal data under the following legal bases: legitimate interests (organizational operations), consent (newsletter and advocacy communications), and legal obligation (government reporting requirements).</p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>4. Data Retention</h2>
              <p>Supporter records are retained for 7 years for financial compliance. Case records are retained as required by Philippine social welfare regulations. Account data is deleted upon request after case closure.</p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>5. Your Rights</h2>
              <p>You have the right to access, correct, or request deletion of your personal data. Contact us at privacy@newdawn.example to exercise these rights.</p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>6. Security</h2>
              <p>All data is transmitted over HTTPS/TLS. Authentication uses industry-standard cookie-based sessions with HttpOnly, Secure, and SameSite=Lax attributes. Resident data is access-controlled by role.</p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>7. Contact</h2>
              <p className="mb-0">New Dawn Foundation · privacy@newdawn.example</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
