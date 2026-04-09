import { Link } from 'react-router-dom';

const sectionHeadingStyle = { color: 'var(--brand-dark)' } as const;

export default function PrivacyPolicyPage() {
  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">Legal</p>
          <h1>Privacy Policy</h1>
          <p>How New Dawn Foundation collects, uses, shares, and protects data</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: 880 }}>
          <div className="card">
            <div className="card-body p-4 p-md-5">
              <p className="text-muted small mb-4">Last updated: April 2026</p>

              <p className="mb-4">
                New Dawn Foundation ("New Dawn," "we," "our," or "us") operates
                this website and related application tools to support public impact
                reporting, donor engagement, secure account access, and internal case
                management for girls in our care. This Privacy Policy explains how we
                handle personal information across our public pages, donor account
                features, and authenticated administrative tools.
              </p>

              <div className="alert alert-light border mb-4" role="note">
                <strong>Important:</strong> public pages and dashboards are intended to
                display organizational and aggregate impact information. Resident-level
                case data is restricted to authorized administrative users and is not
                published on the public site.
              </div>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                1. Who This Policy Covers
              </h2>
              <p>
                This policy applies to information processed through the New Dawn
                Foundation website, donor self-service area, login and registration
                flows, and internal administrative tools used to manage supporter and
                resident records. It applies to donors, prospective supporters,
                account holders, staff users, and individuals whose information is
                entered into our secure case-management system.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                2. Information We Collect
              </h2>
              <ul className="mb-4">
                <li>
                  <strong>Account and authentication data:</strong> email address,
                  username, encrypted or hashed password credentials, assigned roles,
                  security and sign-in state, multi-factor authentication settings if
                  enabled, and external identity-provider details if you choose a
                  supported sign-in provider.
                </li>
                <li>
                  <strong>Donor and supporter data:</strong> display name, first and
                  last name, organization name, email address, phone number, region,
                  country, donor status, acquisition channel, and supporter-account
                  linkage needed to show a donor's personal history.
                </li>
                <li>
                  <strong>Donation and pledge data:</strong> donation date, amount,
                  recurring status, currency, channel source, designated program area,
                  safehouse allocation, and related donation history used for donor
                  records, stewardship, and impact reporting.
                </li>
                <li>
                  <strong>Resident and case-management data:</strong> case-control and
                  internal identifiers, safehouse placement, case status, demographic
                  details, vulnerability categories, referral and admission details,
                  social-work notes, process recordings, home visitation records, case
                  conferences, intervention and reintegration records, and restricted
                  safeguarding notes.
                </li>
                <li>
                  <strong>Prediction and operational analytics data:</strong> internal
                  scoring or forecasting outputs used by authorized staff to support
                  donor management, reporting, or resident risk review.
                </li>
                <li>
                  <strong>Technical and device data:</strong> authentication-cookie
                  state, privacy-preference storage, and routine server or security log
                  information generated when the application is used.
                </li>
              </ul>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                3. How We Collect Information
              </h2>
              <ul className="mb-4">
                <li>
                  Directly from you when you create an account, sign in, or record a
                  donation pledge through your authenticated user flow.
                </li>
                <li>
                  From authorized staff or administrators when supporter or resident
                  records are created, updated, or maintained inside secure tools.
                </li>
                <li>
                  From a supported external identity provider when you choose to sign
                  in that way.
                </li>
                <li>
                  Automatically through essential authentication, consent, and security
                  mechanisms required to operate the application.
                </li>
              </ul>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                4. How We Use Personal Information
              </h2>
              <ul className="mb-4">
                <li>To create and manage user accounts and sign-in sessions.</li>
                <li>
                  To enforce role-based access controls and protect sensitive records.
                </li>
                <li>
                  To record donor pledges, donation allocations, and supporter history.
                </li>
                <li>
                  To operate resident case-management workflows and safeguarding
                  processes.
                </li>
                <li>
                  To generate aggregate impact reporting and internal operational
                  dashboards.
                </li>
                <li>
                  To support internal planning, donor stewardship, and program review,
                  including authorized predictive or analytical tools.
                </li>
                <li>
                  To maintain security, investigate suspicious activity, and comply
                  with legal, accounting, audit, and nonprofit reporting obligations.
                </li>
              </ul>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                5. Legal Bases for Processing
              </h2>
              <p>
                Where GDPR or similar privacy laws apply, New Dawn processes personal
                data under one or more of the following legal bases: consent, where a
                user makes a voluntary choice such as a cookie-preference setting or
                future optional communications; contractual necessity or steps taken at
                your request, such as account creation and donor self-service access;
                legitimate interests in securely operating the organization and its
                systems; and legal obligation where records must be retained or
                disclosed for safeguarding, accounting, audit, or regulatory purposes.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                6. Cookies and Similar Technologies
              </h2>
              <p>
                We use essential authentication technology to keep signed-in sessions
                working securely. We also store your privacy-preference choice so the
                site can remember whether you selected "Necessary only" or "Accept
                preferences." We do not currently use advertising or analytics cookies.
                For more detail, see our <Link to="/cookie-policy">Cookie Policy</Link>.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                7. How We Share Information
              </h2>
              <ul className="mb-4">
                <li>
                  With authorized employees, administrators, social-work staff, or
                  approved partners who need access to perform their responsibilities.
                </li>
                <li>
                  With technology, hosting, authentication, or infrastructure providers
                  that help us operate the application securely.
                </li>
                <li>
                  With an external identity provider if you choose a supported external
                  sign-in method.
                </li>
                <li>
                  With auditors, regulators, courts, law enforcement, or other third
                  parties when disclosure is required by law or reasonably necessary to
                  protect rights, safety, or the integrity of our systems.
                </li>
              </ul>
              <p>
                We do not sell personal information or share it for behavioral
                advertising.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                8. Resident Privacy and Sensitive Information
              </h2>
              <p>
                Much of the resident information maintained in New Dawn's internal
                systems relates to minors and other vulnerable individuals. We treat
                this data as highly sensitive. Resident records are restricted to
                authorized administrative users, are not intended for public display,
                and are handled for care coordination, case management, safeguarding,
                reporting, and related program operations only.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                9. Data Retention
              </h2>
              <p>
                We retain personal information for as long as reasonably necessary to
                fulfill the purposes described in this policy, including operating the
                application, maintaining donor history, supporting case management,
                meeting audit and accounting obligations, resolving disputes, and
                protecting the organization. Retention periods may differ by record
                type. Resident records and financial records may be kept longer where
                safeguarding or legal obligations require it.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                10. Security
              </h2>
              <p>
                We use administrative, technical, and organizational safeguards
                designed to protect data from unauthorized access, disclosure,
                alteration, or destruction. These include HTTPS/TLS, secure
                authentication cookies, role-based access control, and restricted
                access to sensitive resident and operational data. No security measure
                is perfect, but we aim to apply reasonable protections consistent with
                the sensitivity of the data we handle.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                11. International Processing
              </h2>
              <p>
                New Dawn serves donors and stakeholders connected to work in the
                Philippines and may use cloud-based tools or service providers that
                process information in more than one country. When cross-border
                processing occurs, we aim to use reasonable contractual, technical, or
                organizational safeguards appropriate to the circumstances.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                12. Your Privacy Rights
              </h2>
              <p>
                Depending on your location and applicable law, you may have the right
                to request access to your personal data, ask us to correct inaccurate
                information, request deletion, restrict or object to certain
                processing, receive a portable copy of applicable data, withdraw
                consent where processing is based on consent, or lodge a complaint
                with a supervisory authority.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                13. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes
                in our operations, legal obligations, or application features. When we
                do, we will revise the "Last updated" date on this page.
              </p>

              <h2 className="h5 fw-bold" style={sectionHeadingStyle}>
                14. Contact Us
              </h2>
              <p className="mb-0">
                New Dawn Foundation
                <br />
                Quezon City, Philippines
                <br />
                Email: privacy@newdawn.example
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
