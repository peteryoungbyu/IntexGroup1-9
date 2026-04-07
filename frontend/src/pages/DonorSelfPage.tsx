import { useEffect, useState } from 'react';
import type { SupporterDetail } from '../types/SupporterDetail';
import { getMyDonorHistory } from '../lib/supporterAPI';

export default function DonorSelfPage() {
  const [detail, setDetail] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyDonorHistory()
      .then(setDetail)
      .catch((err: unknown) => {
        const message =
          err instanceof Error
            ? err.message
            : 'Could not load your donation history. Make sure your account is linked to a supporter profile.';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" style={{ color: 'var(--brand-primary)' }} /></div>;
  if (error) return <div className="container py-5"><div className="alert alert-warning">{error}</div></div>;
  if (!detail) return <div className="container py-5"><div className="alert alert-info">No donation history found.</div></div>;

  const supporter = detail.supporter;
  const donations = Array.isArray(detail.donations) ? detail.donations : [];
  const totalMonetary = donations.filter(d => d.amount != null).reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">Donor Portal</p>
          <h1>My Donations & Impact</h1>
          <p>Thank you for supporting New Dawn Foundation, {supporter.displayName}</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', padding: '2.5rem 0' }}>
        <div className="container">
          <div className="row g-3 mb-4">
            <div className="col-sm-4">
              <div className="card text-center">
                <div className="card-body py-4">
                  <p className="section-label mb-1">Total Donations</p>
                  <h2 className="fw-bold mb-0" style={{ color: 'var(--brand-dark)' }}>{donations.length}</h2>
                </div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="card text-center">
                <div className="card-body py-4">
                  <p className="section-label mb-1">Total Monetary (PHP)</p>
                  <h2 className="fw-bold mb-0" style={{ color: 'var(--brand-dark)' }}>₱{totalMonetary.toLocaleString()}</h2>
                </div>
              </div>
            </div>
            <div className="col-sm-4">
              <div className="card text-center">
                <div className="card-body py-4">
                  <p className="section-label mb-1">Supporter Since</p>
                  <h2 className="fw-bold mb-0" style={{ color: 'var(--brand-dark)' }}>{supporter.firstDonationDate ?? '—'}</h2>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Donation History</div>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Date</th><th>Type</th><th>Amount / Value</th><th>Campaign</th><th>Channel</th></tr>
                </thead>
                <tbody>
                  {donations.map(d => (
                    <tr key={d.donationId}>
                      <td>{d.donationDate}</td>
                      <td>{d.donationType}</td>
                      <td>
                        {d.amount != null ? `₱${d.amount.toLocaleString()}` : d.estimatedValue != null ? `${d.estimatedValue} ${d.impactUnit}` : '—'}
                      </td>
                      <td>{d.campaignName ?? '—'}</td>
                      <td>{d.channelSource ?? '—'}</td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted py-4">No donations on record.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
