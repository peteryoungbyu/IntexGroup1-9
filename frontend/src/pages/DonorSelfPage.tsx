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

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;
  if (error) return <div className="container py-5"><div className="alert alert-warning">{error}</div></div>;
  if (!detail) return <div className="container py-5"><div className="alert alert-info">No donation history found.</div></div>;

  const supporter = detail.supporter;
  const donations = Array.isArray(detail.donations) ? detail.donations : [];
  const totalMonetary = donations.filter(d => d.amount != null).reduce((sum, d) => sum + (d.amount ?? 0), 0);

  return (
    <div className="container py-5">
      <h1 className="mb-1">My Donations & Impact</h1>
      <p className="text-muted mb-4">Thank you for supporting New Dawn Foundation, {supporter.displayName}.</p>

      <div className="row g-3 mb-4">
        <div className="col-sm-4">
          <div className="card text-center shadow-sm">
            <div className="card-body">
              <h6 className="text-muted">Total Donations</h6>
              <h3>{donations.length}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card text-center shadow-sm">
            <div className="card-body">
              <h6 className="text-muted">Total Monetary (PHP)</h6>
              <h3>₱{totalMonetary.toLocaleString()}</h3>
            </div>
          </div>
        </div>
        <div className="col-sm-4">
          <div className="card text-center shadow-sm">
            <div className="card-body">
              <h6 className="text-muted">Supporter Since</h6>
              <h3>{supporter.firstDonationDate ?? '—'}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
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
  );
}
