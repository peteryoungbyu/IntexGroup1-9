import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { logoutUser } from '../lib/authAPI';

export default function Header() {
  const { authSession, isAuthenticated, refreshAuthSession } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const isAdmin = authSession.roles.includes('Admin');
  const isDonor = authSession.roles.includes('Donor');

  const handleLogout = async () => {
    await logoutUser();
    await refreshAuthSession();
    navigate('/');
  };

  return (
      <nav className="navbar navbar-expand-lg" style={{
        background: 'var(--brand-dark)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0.75rem 0'
      }}>
          <div className="container">
              {/* Brand */}
              <Link to="/">
                  <img
                      src="/src/assets/text_only.png"
                      alt="New Dawn Foundation"
                      style={{ height: '38px', width: 'auto' }}
                  />
              </Link>
              

          <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              style={{ borderColor: 'rgba(255,255,255,0.3)' }}
          >
            <span className="navbar-toggler-icon" style={{ filter: 'invert(1)' }} />
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            {/* Left links */}
            <ul className="navbar-nav me-auto align-items-lg-center gap-1">
              <li className="nav-item">
                <NavLink className="nav-link px-3 py-2 rounded-2" to="/"
                         style={({ isActive }) => ({
                           color: isActive ? 'var(--brand-accent)' : 'rgba(255,255,255,0.8)',
                           fontWeight: isActive ? '600' : '400',
                           fontSize: '0.92rem'
                         })}>
                  Home
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link px-3 py-2 rounded-2" to="/impact"
                         style={({ isActive }) => ({
                           color: isActive ? 'var(--brand-accent)' : 'rgba(255,255,255,0.8)',
                           fontWeight: isActive ? '600' : '400',
                           fontSize: '0.92rem'
                         })}>
                  Impact
                </NavLink>
              </li>

              {isAdmin && (
                  <>
                    {[
                      { to: '/admin', label: 'Dashboard' },
                      { to: '/admin/donors', label: 'Donors' },
                      { to: '/admin/residents', label: 'Residents' },
                      { to: '/admin/reports', label: 'Reports' },
                      { to: '/admin/social-media', label: 'Social Media' },
                      { to: '/admin/partners', label: 'Partners' },
                    ].map(link => (
                        <li key={link.to} className="nav-item">
                          <NavLink className="nav-link px-3 py-2 rounded-2" to={link.to}
                                   style={({ isActive }) => ({
                                     color: isActive ? 'var(--brand-accent)' : 'rgba(255,255,255,0.8)',
                                     fontWeight: isActive ? '600' : '400',
                                     fontSize: '0.92rem'
                                   })}>
                            {link.label}
                          </NavLink>
                        </li>
                    ))}
                  </>
              )}

              {isDonor && !isAdmin && (
                  <li className="nav-item">
                    <NavLink className="nav-link px-3 py-2 rounded-2" to="/donor/history"
                             style={({ isActive }) => ({
                               color: isActive ? 'var(--brand-accent)' : 'rgba(255,255,255,0.8)',
                               fontWeight: isActive ? '600' : '400',
                               fontSize: '0.92rem'
                             })}>
                      My Donations
                    </NavLink>
                  </li>
              )}
            </ul>

            {/* Right side */}
            <ul className="navbar-nav ms-auto align-items-lg-center gap-2">
              <li className="nav-item">
                <button
                    className="btn btn-sm rounded-circle d-flex align-items-center justify-content-center"
                    onClick={toggleTheme}
                    title="Toggle theme"
                    style={{
                      width: '34px',
                      height: '34px',
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
              </li>

              {isAuthenticated ? (
                  <>
                    <li className="nav-item">
                      <NavLink
                          className="nav-link px-3 py-1 rounded-2 d-flex align-items-center gap-2"
                          to="/account/mfa"
                          style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.92rem' }}
                      >
                    <span style={{
                      background: 'var(--brand-accent)',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: 'var(--brand-dark)'
                    }}>
                      {authSession.userName?.charAt(0).toUpperCase()}
                    </span>
                        {authSession.userName}
                      </NavLink>
                    </li>
                    <li className="nav-item">
                      <button
                          className="btn btn-sm fw-semibold px-3"
                          onClick={handleLogout}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            color: 'white',
                            borderRadius: '8px'
                          }}
                      >
                        Logout
                      </button>
                    </li>
                  </>
              ) : (
                  <li className="nav-item">
                    <NavLink
                        className="btn btn-sm fw-semibold px-4"
                        to="/login"
                        style={{
                          background: 'var(--brand-accent)',
                          border: 'none',
                          color: 'var(--brand-dark)',
                          borderRadius: '8px'
                        }}
                    >
                      Login
                    </NavLink>
                  </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
  );
}