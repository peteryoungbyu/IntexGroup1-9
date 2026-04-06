import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../lib/authAPI';
import { useAuth } from '../context/AuthContext';

export default function LogoutPage() {
  const { refreshAuthSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logoutUser()
      .then(() => refreshAuthSession())
      .then(() => navigate('/'))
      .catch(() => navigate('/'));
  }, []);

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Signing out…</span>
      </div>
    </div>
  );
}
