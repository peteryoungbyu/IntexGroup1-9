import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';

export default function LandingPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);

  useEffect(() => {
    getPublicImpact(3)
      .then(setSnapshots)
      .catch(() => {});
  }, []);

  const pillars = [
    {
      title: 'Caring',
      text: 'Providing safe shelter and a nurturing environment for girls in need.',
      bg: '#dbeafe',
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1a5276"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      title: 'Healing',
      text: 'Therapeutic support and counseling to restore emotional wellbeing.',
      bg: '#dcfce7',
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#166534"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 22V12" />
          <path d="M12 12C12 7 8 4 3 5c0 5 3 9 9 7" />
          <path d="M12 12c0-5 4-8 9-7 0 5-3 9-9 7" />
        </svg>
      ),
    },
    {
      title: 'Teaching',
      text: 'Education and vocational training to build independent futures.',
      bg: '#fef9c3',
      icon: (
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#854d0e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="hero-section">
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400&q=80"
          alt="Children smiling"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="section-label">New Dawn Foundation</p>
          <h1
            className="display-5 fw-bold text-white mb-3"
            style={{ lineHeight: 1.15 }}
          >
            Restoring Hope for
            <br />
            Girls in the Philippines
          </h1>
          <p
            className="text-white mb-4"
            style={{ opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.6 }}
          >
            We provide safe shelter, healing, and education to girls who need it
            most — giving them the foundation for a brighter future.
          </p>
          <div className="d-flex gap-3 flex-wrap">
            <Link to="/impact" className="btn btn-warning btn-lg fw-bold px-4">
              See Our Impact
            </Link>
            <Link to="/login" className="btn btn-outline-light btn-lg px-4">
              Supporter Login
            </Link>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-label">What We Do</p>
            <h2
              className="fw-bold"
              style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}
            >
              Our Approach
            </h2>
          </div>
          <div className="row g-4">
            {pillars.map((p) => (
              <div key={p.title} className="col-md-4">
                <div className="pillar-card h-100">
                  <div className="pillar-icon" style={{ background: p.bg }}>
                    {p.icon}
                  </div>
                  <h4
                    className="fw-bold mb-2"
                    style={{ color: 'var(--brand-dark)' }}
                  >
                    {p.title}
                  </h4>
                  <p className="text-muted mb-0">{p.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Impact highlights */}
      {snapshots.length > 0 && (
        <section className="py-5" style={{ background: 'var(--brand-light)' }}>
          <div className="container">
            <div className="text-center mb-5">
              <p className="section-label">By the Numbers</p>
              <h2
                className="fw-bold"
                style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}
              >
                Recent Impact
              </h2>
            </div>
            <div className="row g-4">
              {snapshots.map((s) => (
                <div key={s.snapshotId} className="col-md-4">
                  <div className="card impact-card h-100">
                    <div className="card-body p-4">
                      <span
                        className="badge mb-3 px-3 py-2"
                        style={{
                          background: 'var(--brand-primary)',
                          fontSize: '0.75rem',
                        }}
                      >
                        {new Date(s.snapshotDate).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                      <h5
                        className="fw-bold"
                        style={{ color: 'var(--brand-dark)' }}
                      >
                        {s.headline}
                      </h5>
                      <p className="text-muted small mb-0">{s.summaryText}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-5">
              <Link
                to="/impact"
                className="btn btn-primary btn-lg px-5 fw-bold"
              >
                View Full Impact Dashboard
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA strip */}
      <section className="cta-strip">
        <div className="container">
          <h2 className="text-white fw-bold mb-2">
            Ready to Make a Difference?
          </h2>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Join our community of supporters helping girls build brighter
            futures.
          </p>
          <Link to="/login" className="btn btn-warning btn-lg fw-bold px-5">
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
