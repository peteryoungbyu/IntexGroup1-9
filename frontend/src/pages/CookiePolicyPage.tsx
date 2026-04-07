export default function CookiePolicyPage() {
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
                This page explains what cookies and browser storage this
                application uses and why.
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
                        Authentication session — keeps you signed in. Set by the
                        server; cannot be read by JavaScript.
                      </td>
                      <td>7 days (sliding)</td>
                    </tr>
                    <tr>
                      <td>
                        <code>new-dawn-theme</code>
                      </td>
                      <td>Browser Cookie (readable)</td>
                      <td>
                        Stores your light/dark theme preference so it persists
                        across visits.
                      </td>
                      <td>1 year</td>
                    </tr>
                    <tr>
                      <td>
                        <code>new-dawn-cookie-consent</code>
                      </td>
                      <td>localStorage</td>
                      <td>
                        Records that you have acknowledged this cookie notice.
                        Not a cookie — stored in localStorage.
                      </td>
                      <td>Permanent (until cleared)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h2 className="h5 fw-bold" style={{ color: 'var(--brand-dark)' }}>
                How to manage cookies
              </h2>
              <p>
                You can clear cookies and localStorage at any time through your
                browser settings. Clearing the authentication cookie will sign
                you out. Clearing the theme cookie will reset your preference to
                light mode.
              </p>

              <p className="mb-0">
                We do not use advertising, tracking, or analytics cookies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
