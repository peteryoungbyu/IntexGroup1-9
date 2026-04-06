export default function PrivacyPolicyPage() {
  return (
    <div className="container py-5" style={{ maxWidth: 800 }}>
      <h1>Privacy Policy</h1>
      <p className="text-muted">Last updated: April 2026</p>

      <h2>1. Who We Are</h2>
      <p>New Dawn Foundation operates this web application to manage case records, supporter relationships, and organizational impact reporting. We are committed to protecting the privacy of all individuals whose data is processed by this system.</p>

      <h2>2. What Data We Collect</h2>
      <ul>
        <li><strong>Account data:</strong> Email address, hashed password, authentication tokens.</li>
        <li><strong>Supporter data:</strong> Name, contact information, donation history — collected to maintain donor relationships.</li>
        <li><strong>Resident data:</strong> Case records are maintained for program management and regulatory compliance. Access is restricted to authorized staff.</li>
        <li><strong>Usage data:</strong> Server logs, session cookies for authentication.</li>
      </ul>

      <h2>3. Legal Basis (GDPR)</h2>
      <p>We process personal data under the following legal bases: legitimate interests (organizational operations), consent (newsletter and advocacy communications), and legal obligation (government reporting requirements).</p>

      <h2>4. Data Retention</h2>
      <p>Supporter records are retained for 7 years for financial compliance. Case records are retained as required by Philippine social welfare regulations. Account data is deleted upon request after case closure.</p>

      <h2>5. Your Rights</h2>
      <p>You have the right to access, correct, or request deletion of your personal data. Contact us at privacy@newdawn.example to exercise these rights.</p>

      <h2>6. Security</h2>
      <p>All data is transmitted over HTTPS/TLS. Authentication uses industry-standard cookie-based sessions with HttpOnly, Secure, and SameSite=Lax attributes. Resident data is access-controlled by role.</p>

      <h2>7. Contact</h2>
      <p>New Dawn Foundation · privacy@newdawn.example</p>
    </div>
  );
}
