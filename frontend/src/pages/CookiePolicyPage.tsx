import { useCookieConsent } from '../context/CookieConsentContext';

export default function CookiePolicyPage() {
  const {
    consentChoice,
    acceptNecessaryOnly,
    acceptPreferences,
    resetConsent,
  } = useCookieConsent();

  const currentChoiceLabel =
    consentChoice === 'necessary'
      ? 'Necessary only'
      : consentChoice === 'preferences'
        ? 'Preferences allowed'
        : 'No choice recorded yet';

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">Legal</p>
          <h1>Cookie Policy</h1>
          <p>Information about cookies and browser storage used on this site</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: 800 }}>
          <div className="card">
            <div className="card-body p-4 p-md-5">
              <p className="text-muted small mb-4">Last updated: April 2026</p>

              <p className="mb-4">
                This page explains what cookies and browser storage this application
                uses, what is strictly necessary, and how to change your cookie choice.
              </p>

              <div className="table-responsive mb-4">
                <table className="table table-bordered">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Purpose</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <code>.AspNetCore.Identity.Application</code>
                      </td>
                      <td>HttpOnly Cookie</td>
                      <td>
                        Authentication session - keeps you signed in. Set by the
                        server and not readable by JavaScript.
                      </td>
                      <td>7 days (sliding)</td>
                    </tr>
                    <tr>
                      <td>
                        <code>new-dawn-cookie-consent-v2</code>
                      </td>
                      <td>localStorage</td>
                      <td>
                        Records your cookie choice as either <code>necessary</code>{' '}
                        or <code>preferences</code>. This is not a browser cookie; it
                        is stored in localStorage so we can honor the choice you made.
                      </td>
                      <td>Until changed or cleared</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>
                Manage cookie settings
              </h2>
              <p>
                Current choice: <strong>{currentChoiceLabel}</strong>
              </p>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={acceptNecessaryOnly}
                >
                  Necessary only
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={acceptPreferences}
                >
                  Accept preferences
                </button>
                <button
                  type="button"
                  className="btn btn-link px-0"
                  onClick={resetConsent}
                >
                  Reopen banner
                </button>
              </div>
              <p className="mb-4">
                After removing the old dark-mode cookie, this site does not
                currently set any optional preference cookies. Choosing{' '}
                <strong>Accept preferences</strong> stores permission for future
                optional site settings, while choosing <strong>Necessary only</strong>{' '}
                withdraws that permission.
              </p>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>
                How to manage cookies
              </h2>
              <p>
                You can change your choice on this page at any time or clear cookies
                and localStorage through your browser settings. Clearing the
                authentication cookie will sign you out.
              </p>

              <p className="mb-0">
                We do not use advertising, tracking, or analytics cookies. Preference
                storage is currently inactive unless you choose to allow it for future
                optional site settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
