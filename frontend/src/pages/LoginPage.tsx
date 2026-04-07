import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { loginUser, getExternalProviders, buildExternalLoginUrl } from '../lib/authAPI';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<{ name: string; displayName: string }[]>([]);

  const { refreshAuthSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = (location.state as { returnPath?: string })?.returnPath ?? '/';

  useEffect(() => {
    getExternalProviders().then(setProviders).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginUser(email, password, rememberMe, twoFactorCode || undefined, recoveryCode || undefined);
      await refreshAuthSession();
      navigate(returnPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.toLowerCase().includes('two') || msg.toLowerCase().includes('authenticator')) {
        setShowMfa(true);
        setError('Please enter your two-factor authentication code.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="container text-center">
          <img
            src="/src/assets/horizontal_light.png"
            alt="New Dawn Foundation"
            style={{ height: 48, marginBottom: '1.25rem' }}
          />
          <h1>Sign In</h1>
          <p>Welcome back to New Dawn Foundation</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', minHeight: '60vh', padding: '2.5rem 0' }}>
        <div className="container" style={{ maxWidth: 440 }}>
          <div className="card">
            <div className="card-body p-4">
              {error && <div className="alert alert-danger">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Password</label>
                  <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>

                {showMfa && (
                  <>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Authenticator Code</label>
                      <input type="text" className="form-control" value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value)} placeholder="6-digit code" inputMode="numeric" />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Recovery Code (if no authenticator)</label>
                      <input type="text" className="form-control" value={recoveryCode} onChange={e => setRecoveryCode(e.target.value)} placeholder="recovery-code" />
                    </div>
                  </>
                )}

                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="rememberMe" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
                  <label className="form-check-label" htmlFor="rememberMe">Remember me</label>
                </div>

                <button type="submit" className="btn btn-primary w-100 fw-semibold" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              {providers.length > 0 && (
                <div className="mt-3">
                  <hr />
                  <p className="text-center text-muted small">Or sign in with</p>
                  {providers.map(p => (
                    <a
                      key={p.name}
                      href={buildExternalLoginUrl(p.name, returnPath)}
                      className="btn btn-outline-secondary w-100 mb-2"
                    >
                      {p.displayName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-center mt-3 small text-muted">
            <Link to="/privacy">Privacy Policy</Link> · <Link to="/cookie-policy">Cookie Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
