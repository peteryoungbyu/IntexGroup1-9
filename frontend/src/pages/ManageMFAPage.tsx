import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { TwoFactorStatus } from '../types/TwoFactorStatus';
import { getTwoFactorStatus, enableTwoFactor, disableTwoFactor, resetRecoveryCodes } from '../lib/authAPI';

export default function ManageMFAPage() {
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
      if (s.authenticatorUri) {
        const url = await QRCode.toDataURL(s.authenticatorUri);
        setQrDataUrl(url);
      }
    } catch {
      setError('Failed to load MFA status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage('');
    try {
      const updated = await enableTwoFactor(code);
      setStatus(updated);
      setCode('');
      setMessage('Two-factor authentication enabled successfully.');
    } catch {
      setError('Invalid code. Please try again.');
    }
  };

  const handleDisable = async () => {
    if (!confirm('Disable two-factor authentication? This reduces your account security.')) return;
    try {
      await disableTwoFactor();
      await load();
      setMessage('Two-factor authentication disabled.');
    } catch {
      setError('Failed to disable MFA.');
    }
  };

  const handleResetCodes = async () => {
    if (!confirm('Generate new recovery codes? Your current codes will stop working.')) return;
    try {
      const updated = await resetRecoveryCodes();
      setStatus(updated);
      setMessage('Recovery codes regenerated.');
    } catch {
      setError('Failed to reset recovery codes.');
    }
  };

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;

  return (
    <div className="container py-5" style={{ maxWidth: 600 }}>
      <h1 className="mb-4">Manage Two-Factor Authentication</h1>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {status?.isTwoFactorEnabled ? (
        <div>
          <div className="alert alert-success">Two-factor authentication is <strong>enabled</strong>.</div>
          <p>Recovery codes remaining: <strong>{status.recoveryCodesLeft}</strong></p>
          {status.recoveryCodes && (
            <div className="mb-3">
              <h5>Recovery Codes</h5>
              <p className="text-muted small">Store these somewhere safe. Each code can only be used once.</p>
              <div className="bg-light p-3 rounded font-monospace">
                {status.recoveryCodes.map(c => <div key={c}>{c}</div>)}
              </div>
            </div>
          )}
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={handleResetCodes}>Reset Recovery Codes</button>
            <button className="btn btn-outline-danger" onClick={handleDisable}>Disable 2FA</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="alert alert-warning">Two-factor authentication is <strong>not enabled</strong>.</div>
          <p>Scan this QR code with an authenticator app (Google Authenticator, Authy, etc.):</p>
          {qrDataUrl && <img src={qrDataUrl} alt="QR code for MFA setup" className="mb-3 d-block border p-2 rounded" />}
          {status?.sharedKey && (
            <p className="text-muted small">Manual key: <code>{status.sharedKey}</code></p>
          )}
          <form onSubmit={handleEnable}>
            <div className="mb-3">
              <label className="form-label">Verification Code</label>
              <input
                type="text"
                className="form-control"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">Enable 2FA</button>
          </form>
        </div>
      )}
    </div>
  );
}
