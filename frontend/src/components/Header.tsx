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
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" to="/">New Dawn</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><NavLink className="nav-link" to="/">Home</NavLink></li>
            <li className="nav-item"><NavLink className="nav-link" to="/impact">Impact</NavLink></li>
            {isAdmin && <>
              <li className="nav-item"><NavLink className="nav-link" to="/admin">Dashboard</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/donors">Donors</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/residents">Residents</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/reports">Reports</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/social-media">Social Media</NavLink></li>
              <li className="nav-item"><NavLink className="nav-link" to="/admin/partners">Partners</NavLink></li>
            </>}
            {isDonor && !isAdmin && (
              <li className="nav-item"><NavLink className="nav-link" to="/donor/history">My Donations</NavLink></li>
            )}
          </ul>
          <ul className="navbar-nav ms-auto align-items-center">
            <li className="nav-item">
              <button className="btn btn-sm btn-outline-secondary me-2" onClick={toggleTheme} title="Toggle theme">
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </li>
            {isAuthenticated ? (
              <>
                <li className="nav-item">
                  <NavLink className="nav-link" to="/account/mfa">{authSession.userName}</NavLink>
                </li>
                <li className="nav-item">
                  <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>Logout</button>
                </li>
              </>
            ) : (
              <li className="nav-item">
                <NavLink className="btn btn-sm btn-primary" to="/login">Login</NavLink>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
