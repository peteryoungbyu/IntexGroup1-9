import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../lib/authAPI';
import textOnlyLogo from '../assets/text_only.png';

export default function Header() {
  const { authSession, isAuthenticated, refreshAuthSession } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutUser();
    await refreshAuthSession();
    navigate('/');
  };

  const isAdmin = authSession.roles.includes('Admin');
  const isDonor = authSession.roles.includes('Donor');

  return (
    <nav
      className="navbar navbar-expand-xl"
      style={{
        background: 'var(--brand-dark)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0.75rem 0',
      }}
    >
      <div className="container-fluid px-3 d-flex align-items-center justify-content-between flex-wrap">
        {/* Brand */}
        <Link to="/">
          <img
            src={textOnlyLogo}
            alt="New Dawn Foundation"
            style={{ height: '38px', width: 'auto' }}
          />
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{ borderColor: 'rgba(255,255,255,0.3)' }}
        >
          <span
            className="navbar-toggler-icon"
            style={{ filter: 'invert(1)' }}
          />
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Left links */}
          <ul className="navbar-nav me-auto align-items-xl-center gap-0">
            <li className="nav-item">
              <NavLink
                className="nav-link px-2 py-2 rounded-2"
                to="/"
                end
                style={({ isActive }) => ({
                  color: isActive
                    ? 'var(--brand-accent)'
                    : 'rgba(255,255,255,0.8)',
                  fontWeight: isActive ? '600' : '400',
                  fontSize: '0.92rem',
                })}
              >
                Home
              </NavLink>
            </li>
            {[
              { to: '/about', label: 'About' },
              { to: '/programs', label: 'Programs' },
              { to: '/impact', label: 'Impact' },
              { to: '/get-involved', label: 'Get Involved' },
            ].map((link) => (
              <li key={link.to} className="nav-item">
                <NavLink
                  className="nav-link px-2 py-2 rounded-2"
                  to={link.to}
                  style={({ isActive }) => ({
                    color: isActive
                      ? 'var(--brand-accent)'
                      : 'rgba(255,255,255,0.8)',
                    fontWeight: isActive ? '600' : '400',
                    fontSize: '0.92rem',
                  })}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}

            {isDonor && !isAdmin && (
              <li className="nav-item">
                <NavLink
                  className="nav-link px-2 py-2 rounded-2"
                  to="/donor/history"
                  style={({ isActive }) => ({
                    color: isActive
                      ? 'var(--brand-accent)'
                      : 'rgba(255,255,255,0.8)',
                    fontWeight: isActive ? '600' : '400',
                    fontSize: '0.92rem',
                  })}
                >
                  My Donations
                </NavLink>
              </li>
            )}
          </ul>

          {/* Right side */}
          <ul className="navbar-nav ms-auto align-items-xl-center gap-2">
            {isAuthenticated ? (
              <>
                <li className="nav-item dropdown">
                  <button
                    className="nav-link dropdown-toggle px-2 py-2 rounded-2"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    style={{
                      color: 'rgba(255,255,255,0.8)',
                      fontSize: '0.92rem',
                      background: 'none',
                      border: 'none',
                    }}
                  >
                    My Account
                  </button>
                  <ul
                    className="dropdown-menu"
                    style={{
                      background: '#1e293b',
                      borderColor: '#334155',
                    }}
                  >
                    <li>
                      <Link
                        className="dropdown-item"
                        to="/account/mfa"
                        style={{ color: '#f1f5f9' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Set Up Two-Step Verification
                      </Link>
                    </li>
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={handleLogout}
                        style={{ color: '#f1f5f9', width: '100%', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#334155')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Logout
                      </button>
                    </li>
                  </ul>
                </li>
                {isAdmin ? (
                  <li className="nav-item">
                    <Link
                      to="/admin"
                      style={{
                        display: 'inline-block',
                        background: '#e8a838',
                        color: '#0d2d44',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        padding: '6px 16px',
                        border: 'none',
                        textDecoration: 'none',
                      }}
                    >
                      Admin Portal
                    </Link>
                  </li>
                ) : (
                  <li className="nav-item">
                    <Link
                      className="btn btn-sm px-4"
                      to="/donate"
                      style={{
                        background: 'var(--brand-accent)',
                        color: 'var(--brand-dark)',
                        borderRadius: '8px',
                        fontWeight: 700,
                        border: 'none',
                      }}
                    >
                      Donate Now
                    </Link>
                  </li>
                )}
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link
                    className="btn btn-sm px-4"
                    to="/login"
                    style={{
                      background: 'var(--brand-accent)',
                      color: 'var(--brand-dark)',
                      borderRadius: '8px',
                      fontWeight: 700,
                      border: 'none',
                    }}
                  >
                    Donate Now
                  </Link>
                </li>
                <li className="nav-item">
                  <NavLink
                    className="btn btn-sm fw-semibold px-4"
                    to="/login"
                    style={{
                      background: 'transparent',
                      border: '1.5px solid rgba(255,255,255,0.4)',
                      color: 'rgba(255,255,255,0.85)',
                      borderRadius: '8px',
                    }}
                  >
                    Login
                  </NavLink>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
