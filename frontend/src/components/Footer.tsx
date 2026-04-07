import { Link } from 'react-router-dom';

export default function Footer() {
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
          &copy; {new Date().getFullYear()} New Dawn Foundation. All rights reserved.
        </span>
        <div className="d-flex gap-3">
          <Link
            to="/privacy"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            Privacy Policy
          </Link>
          <Link
            to="/cookie-policy"
            style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
          >
            Cookie Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
