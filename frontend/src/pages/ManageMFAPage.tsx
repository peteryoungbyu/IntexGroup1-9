import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { TwoFactorStatus } from '../types/TwoFactorStatus';
import {
  getTwoFactorStatus,
  enableTwoFactor,
  disableTwoFactor,
  resetRecoveryCodes,
} from '../lib/authAPI';
import { useAuth } from '../context/AuthContext';

export default function ManageMFAPage() {
  const { authSession } = useAuth();
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const s = await getTwoFactorStatus();
      setStatus(s);
      if (s.sharedKey && authSession.email) {
        const issuer = 'New Dawn Foundation';
        const account = encodeURIComponent(authSession.email);
        const key = s.sharedKey.replace(/\s/g, '');
        const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${account}?secret=${key}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
        const url = await QRCode.toDataURL(otpauthUri);
        setQrDataUrl(url);
      }
    } catch {
      setError('Failed to load MFA status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const updated = await enableTwoFactor(code.replace(/\s+/g, ''));
      setStatus(updated);
      setCode('');
      setMessage('Two-factor authentication enabled successfully.');
    } catch (err) {
      const nextError =
        err instanceof Error &&
        err.message &&
        err.message !== 'Invalid token.' &&
        err.message !== 'Two-factor authentication was not enabled.'
          ? err.message
          : 'Invalid code. Please try again.';
      setError(nextError);
    }
  };

  const handleDisable = async () => {
    if (
      !confirm(
        'Disable two-factor authentication? This reduces your account security.'
      )
    )
      return;
    try {
      await disableTwoFactor();
      await load();
      setMessage('Two-factor authentication disabled.');
    } catch {
      setError('Failed to disable MFA.');
    }
  };

  const handleResetCodes = async () => {
    if (
      !confirm(
        'Generate new recovery codes? Your current codes will stop working.'
      )
    )
      return;
    try {
      const updated = await resetRecoveryCodes();
      setStatus(updated);
      setMessage('Recovery codes regenerated.');
    } catch {
      setError('Failed to reset recovery codes.');
    }
  };

  if (loading)
    return (
      <div className="container py-5 text-center">
        <div
          className="spinner-border"
          style={{ color: 'var(--brand-primary)' }}
        />
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">Account Settings</p>
          <h1>Two-Factor Authentication</h1>
          <p>Secure your account with an authenticator app</p>
        </div>
      </div>

      <div
        style={{
          background: 'var(--brand-light)',
          minHeight: '60vh',
          padding: '2.5rem 0',
        }}
      >
        <div className="container" style={{ maxWidth: 600 }}>
          {message && <div className="alert alert-success mb-3">{message}</div>}
          {error && <div className="alert alert-danger mb-3">{error}</div>}

          <div className="card">
            <div className="card-body p-4">
              {status?.isTwoFactorEnabled ? (
                <div>
                  <div className="alert alert-success">
                    Two-factor authentication is <strong>enabled</strong>.
                  </div>
                  <p>
                    Recovery codes remaining:{' '}
                    <strong>{status.recoveryCodesLeft}</strong>
                  </p>
                  {status.recoveryCodes && (
                    <div className="mb-4">
                      <h6
                        className="fw-bold"
                        style={{ color: 'var(--brand-dark)' }}
                      >
                        Recovery Codes
                      </h6>
                      <p className="text-muted small">
                        Store these somewhere safe. Each code can only be used
                        once.
                      </p>
                      <div
                        className="p-3 rounded font-monospace small"
                        style={{
                          background: 'var(--brand-light)',
                          border: '1px solid rgba(26,82,118,0.15)',
                        }}
                      >
                        {status.recoveryCodes.map((c) => (
                          <div key={c}>{c}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleResetCodes}
                    >
                      Reset Recovery Codes
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      onClick={handleDisable}
                    >
                      Disable 2FA
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="alert alert-warning">
                    Two-factor authentication is <strong>not enabled</strong>.
                  </div>
                  <p className="text-muted">
                    Scan this QR code with an authenticator app (Google
                    Authenticator, Authy, etc.):
                  </p>
                  {qrDataUrl && (
                    <img
                      src={qrDataUrl}
                      alt="QR code for MFA setup"
                      className="mb-3 d-block rounded"
                      style={{ border: '2px solid var(--brand-light)' }}
                    />
                  )}
                  {status?.sharedKey && (
                    <p className="text-muted small mb-3">
                      Manual key: <code>{status.sharedKey}</code>
                    </p>
                  )}
                  <form onSubmit={handleEnable}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        inputMode="numeric"
                        maxLength={6}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary fw-semibold"
                    >
                      Enable 2FA
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
