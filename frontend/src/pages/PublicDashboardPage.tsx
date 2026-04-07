import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';

export default function PublicDashboardPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicImpact(12).then(setSnapshots).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" style={{ color: 'var(--brand-primary)' }} /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">New Dawn Foundation</p>
          <h1>Impact Dashboard</h1>
          <p>Our progress in caring for, healing, and teaching girls across the Philippines</p>
        </div>
      </div>

      <section className="py-5" style={{ background: 'var(--brand-light)' }}>
        <div className="container">
          {snapshots.length === 0 ? (
            <div className="alert alert-info">No impact reports published yet.</div>
          ) : (
            <div className="row g-4">
              {snapshots.map(s => {
                let metrics: Record<string, unknown> = {};
                try { metrics = JSON.parse(s.metricPayloadJson ?? '{}'); } catch { /* ignore */ }

                return (
                  <div key={s.snapshotId} className="col-md-6 col-lg-4">
                    <div className="card impact-card h-100">
                      <div className="card-body p-4">
                        <span className="badge mb-3 px-3 py-2" style={{ background: 'var(--brand-primary)', fontSize: '0.75rem' }}>
                          {new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </span>
                        <h5 className="fw-bold" style={{ color: 'var(--brand-dark)' }}>{s.headline}</h5>
                        <p className="text-muted small mb-2">{s.summaryText}</p>
                        {Object.entries(metrics).length > 0 && (
                          <ul className="list-unstyled small mt-2 mb-0">
                            {Object.entries(metrics).slice(0, 4).map(([k, v]) => (
                              <li key={k} className="py-1" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                <strong>{k.replace(/_/g, ' ')}:</strong> {String(v)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
