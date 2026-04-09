import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';

export default function Footer() {
  const { resetConsent } = useCookieConsent();

  const footerLinkStyle = {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '0.85rem',
    textDecoration: 'none',
  } as const;

  return (
    <footer
      style={{
        background: 'var(--brand-dark)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '1.25rem 0',
        marginTop: 'auto',
      }}
    >
      <div className="container d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2">
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} New Dawn Foundation. All rights
          reserved.
        </span>
        <div className="d-flex gap-3">
          <Link
            to="/privacy"
            style={footerLinkStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
            }
          >
            Privacy Policy
          </Link>
          <Link
            to="/cookie-policy"
            style={footerLinkStyle}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
            }
          >
            Cookie Policy
          </Link>
          <button
            type="button"
            style={{
              ...footerLinkStyle,
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')
            }
            onClick={resetConsent}
          >
            Cookie Settings
          </button>
        </div>
      </div>
    </footer>
  );
}
