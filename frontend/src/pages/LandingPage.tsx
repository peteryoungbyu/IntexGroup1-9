import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';

export default function LandingPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  // TODO backend: add GET /api/public/stats returning { totalOccupancy, sessionCount, avgAttendanceRate } without auth
  // All three stats are currently behind AdminRead auth (DashboardController, ResidentController).
  const [girlsSheltered] = useState('60+');
  const [sessionsLogged] = useState('1,200+');
  const [avgAttendance] = useState('87%');

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

        {/* Pillars — bento grid */}
        <section style={{ background: '#f8f7f4', padding: '72px 40px' }}>
          {/* Headline */}
          <h2 style={{ fontSize: '2.6rem', fontWeight: 800, color: '#0d2d44', marginBottom: 32, lineHeight: 1.15 }}>
            Three ways we change<br />
            <em style={{ fontWeight: 300, color: '#6b7280', fontStyle: 'italic' }}>every life</em>
          </h2>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr',
            gridTemplateRows: '1fr auto',
            gap: 16,
            minHeight: 460,
          }}>

            {/* Card 1 — Caring (spans both rows) */}
            <div style={{
              gridRow: 'span 2',
              background: '#0d2d44',
              borderRadius: 20,
              padding: '40px 36px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>
                  CARING
                </div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
                  A safe place to call home
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, fontSize: '0.95rem', margin: 0 }}>
                  Ten safehouses across Luzon, Visayas, and Mindanao provide around-the-clock care for girls removed from harm.
                </p>
              </div>
              <div>
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginBottom: 16 }} />
                <div style={{ fontSize: '3.2rem', fontWeight: 800, color: '#e8a838', lineHeight: 1 }}>{girlsSheltered}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  Girls sheltered right now
                </div>
              </div>
            </div>

            {/* Card 2 — Healing (top middle) */}
            <div style={{
              background: '#e8f4f0',
              borderRadius: 20,
              padding: '28px 26px',
              border: '1px solid rgba(15,110,86,0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#0f6e56', marginBottom: 12 }}>
                  HEALING
                </div>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0f6e56" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                  <path d="M12 22V12" />
                  <path d="M12 12C12 7 8 4 3 5c0 5 3 9 9 7" />
                  <path d="M12 12c0-5 4-8 9-7 0 5-3 9-9 7" />
                </svg>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f6e56', marginBottom: 8 }}>Counseling & recovery</h4>
                <p style={{ color: '#4b7c6f', fontSize: '0.83rem', lineHeight: 1.6, margin: 0 }}>
                  Trained counselors run individual and group sessions every week.
                </p>
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f6e56', lineHeight: 1 }}>{sessionsLogged}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#4b7c6f', marginTop: 4 }}>
                  Sessions logged
                </div>
              </div>
            </div>

            {/* Card 3 — Teaching (top right) */}
            <div style={{
              background: '#fff8ec',
              borderRadius: 20,
              padding: '28px 26px',
              border: '1px solid rgba(180,83,9,0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#b45309', marginBottom: 12 }}>
                  TEACHING
                </div>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#b45309', marginBottom: 8 }}>Education & skills</h4>
                <p style={{ color: '#92400e', fontSize: '0.83rem', lineHeight: 1.6, margin: 0 }}>
                  Bridge schooling, vocational training, and literacy programs run year-round.
                </p>
              </div>
              <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#b45309', lineHeight: 1 }}>{avgAttendance}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#92400e', marginTop: 4 }}>
                  Avg attendance
                </div>
              </div>
            </div>

            {/* Mission box — bottom, spans 2 cols */}
            <div style={{
              gridColumn: 'span 2',
              background: 'transparent',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: '#e8a838', marginBottom: 12 }}>
                OUR MISSION
              </div>
              <p style={{ color: '#6b7280', fontSize: '1rem', lineHeight: 1.75, margin: 0, maxWidth: 480 }}>
                Every girl who walks through our doors receives the same promise — safety, healing, and a future worth fighting for. Three pillars. One mission. Every single day.
              </p>
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
