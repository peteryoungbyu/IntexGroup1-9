import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../lib/authAPI';
import horizontalLightLogo from '../assets/horizontal_light.png';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await registerUser(email, password);
      navigate('/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="container text-center">
          <img
            src={horizontalLightLogo}
            alt="New Dawn Foundation"
            style={{ height: 48, marginBottom: '1.25rem' }}
          />
          <h1>Create Account</h1>
          <p>Join the New Dawn Foundation community</p>
        </div>
      </div>

      <div
        style={{
          background: 'var(--brand-light)',
          minHeight: '60vh',
          padding: '2.5rem 0',
        }}
      >
        <div className="container" style={{ maxWidth: 440 }}>
          <div className="card">
            <div className="card-body p-4">
              {error && <div className="alert alert-danger">{error}</div>}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Password</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={14}
                  />
                  <div className="form-text">Minimum 14 characters.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 fw-semibold"
                  disabled={loading}
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>
            </div>
          </div>

          <p className="text-center mt-3 small text-muted">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
