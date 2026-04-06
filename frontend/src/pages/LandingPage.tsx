import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';

export default function LandingPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);

  useEffect(() => {
    getPublicImpact(3).then(setSnapshots).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="py-5 text-center bg-primary text-white">
        <div className="container">
          <h1 className="display-4 fw-bold">New Dawn Foundation</h1>
          <p className="lead">Caring. Healing. Teaching. Restoring hope for girls in the Philippines.</p>
          <Link to="/impact" className="btn btn-light btn-lg me-2">See Our Impact</Link>
          <Link to="/login" className="btn btn-outline-light btn-lg">Supporter Login</Link>
        </div>
      </section>

      {/* Impact highlights */}
      {snapshots.length > 0 && (
        <section className="py-5 bg-light">
          <div className="container">
            <h2 className="text-center mb-4">Recent Impact</h2>
            <div className="row g-4">
              {snapshots.map(s => (
                <div key={s.snapshotId} className="col-md-4">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <h5 className="card-title">{s.headline}</h5>
                      <p className="card-text small text-muted">{s.summaryText}</p>
                      <span className="badge bg-secondary">{new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-4">
              <Link to="/impact" className="btn btn-primary">View Full Impact Dashboard</Link>
            </div>
          </div>
        </section>
      )}

      {/* Three pillars */}
      <section className="py-5">
        <div className="container">
          <div className="row g-4 text-center">
            {[
              { icon: '❤️', title: 'Caring', text: 'Providing safe shelter and a nurturing environment for girls in need.' },
              { icon: '🌿', title: 'Healing', text: 'Therapeutic support and counseling to restore emotional wellbeing.' },
              { icon: '📚', title: 'Teaching', text: 'Education and vocational training to build independent futures.' },
            ].map(p => (
              <div key={p.title} className="col-md-4">
                <div className="p-4">
                  <div style={{ fontSize: '3rem' }}>{p.icon}</div>
                  <h3>{p.title}</h3>
                  <p className="text-muted">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
