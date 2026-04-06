import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';

export default function PublicDashboardPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicImpact(12).then(setSnapshots).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;

  return (
    <div className="container py-5">
      <h1 className="mb-2">Impact Dashboard</h1>
      <p className="text-muted lead mb-4">Our progress in caring for, healing, and teaching girls across the Philippines.</p>

      {snapshots.length === 0 ? (
        <div className="alert alert-info">No impact reports published yet.</div>
      ) : (
        <div className="row g-4">
          {snapshots.map(s => {
            let metrics: Record<string, unknown> = {};
            try { metrics = JSON.parse(s.metricPayloadJson ?? '{}'); } catch { /* ignore */ }

            return (
              <div key={s.snapshotId} className="col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-header bg-primary text-white">
                    {new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </div>
                  <div className="card-body">
                    <h5 className="card-title">{s.headline}</h5>
                    <p className="card-text small">{s.summaryText}</p>
                    {Object.entries(metrics).length > 0 && (
                      <ul className="list-unstyled small mt-2">
                        {Object.entries(metrics).slice(0, 4).map(([k, v]) => (
                          <li key={k}><strong>{k.replace(/_/g, ' ')}:</strong> {String(v)}</li>
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
  );
}
