import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';

export default function CookieConsentBanner() {
  const { acknowledged, acknowledgeConsent } = useCookieConsent();

  if (acknowledged) return null;

  return (
    <div
      className="position-fixed bottom-0 start-0 end-0 bg-dark text-white p-3 d-flex align-items-center justify-content-between gap-3"
      style={{ zIndex: 1050 }}
      role="alert"
    >
      <p className="mb-0 small">
        We use cookies to keep you signed in and remember your preferences. See our{' '}
        <Link to="/cookie-policy" className="text-warning">Cookie Policy</Link> for details.
      </p>
      <button className="btn btn-sm btn-warning flex-shrink-0" onClick={acknowledgeConsent}>
        Accept
      </button>
    </div>
  );
}
