import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';

export default function CookieConsentBanner() {
  const { consentChoice, acceptNecessaryOnly, acceptPreferences } = useCookieConsent();

  if (consentChoice) return null;

  return (
    <div
      className="position-fixed bottom-0 start-0 end-0 bg-dark text-white p-3 p-md-4"
      style={{ zIndex: 1050 }}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="container px-0">
        <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
          <p className="mb-0 small">
            We always use the necessary authentication cookie that keeps signed-in
            sessions working. You can choose whether to allow optional preference
            storage for future site settings. We do not use analytics or advertising
            cookies. See our{' '}
            <Link to="/cookie-policy" className="text-warning">
              Cookie Policy
            </Link>{' '}
            for details.
          </p>

          <div className="d-flex flex-column flex-sm-row gap-2 flex-shrink-0">
            <button
              type="button"
              className="btn btn-sm btn-outline-light"
              onClick={acceptNecessaryOnly}
            >
              Necessary only
            </button>
            <button
              type="button"
              className="btn btn-sm btn-warning"
              onClick={acceptPreferences}
            >
              Accept preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
