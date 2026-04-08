import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { authSession, isAuthenticated } = useAuth();
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

  const heroLink = isAuthenticated
    ? authSession.roles.includes('Admin') ? '/admin' : '/donor/history'
    : '/login';
  const heroLabel = isAuthenticated
    ? authSession.roles.includes('Admin') ? 'Go to Admin Portal' : 'My Donations'
    : 'Supporter Login';
  const ctaLink = isAuthenticated
    ? authSession.roles.includes('Admin') ? '/admin' : '/donor/history'
    : '/login';
  const isAdmin = authSession.roles.includes('Admin');
  const isDonor = authSession.roles.includes('Donor');

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
            <Link to={heroLink} className="btn btn-outline-light btn-lg px-4">
              {heroLabel}
            </Link>
          </div>
        </div>
      </section>      

    {/* Pillars */}
    <section className="landing-pillars">
      <h2 className="landing-pillars-title">
        Three ways we change
        <br />
        <em>every life</em>
      </h2>

      <div className="landing-pillars-grid">
        <div className="pillar-caring">
          <div>
            <div className="pillar-eyebrow pillar-eyebrow-light">CARING</div>
            <h3 className="pillar-caring-title">A safe place to call home</h3>
            <p className="pillar-caring-text">
              Ten safehouses across Luzon, Visayas, and Mindanao provide around-the-clock care for girls removed from harm.
            </p>
          </div>
          <div>
            <hr className="pillar-divider" />
            <div className="pillar-caring-stat">{girlsSheltered}</div>
            <div className="pillar-caring-substat">Girls sheltered right now</div>
          </div>
        </div>

        <div className="pillar-healing">
          <div>
            <div className="pillar-eyebrow pillar-eyebrow-healing">HEALING</div>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0f6e56"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: 12 }}
            >
              <path d="M12 22V12" />
              <path d="M12 12C12 7 8 4 3 5c0 5 3 9 9 7" />
              <path d="M12 12c0-5 4-8 9-7 0 5-3 9-9 7" />
            </svg>
            <h4 className="pillar-healing-title">Counseling & recovery</h4>
            <p className="pillar-healing-text">
              Trained counselors run individual and group sessions every week.
            </p>
          </div>
          <div>
            <div className="pillar-healing-stat">{sessionsLogged}</div>
            <div className="pillar-healing-substat">Sessions logged</div>
          </div>
        </div>

        <div className="pillar-teaching">
          <div>
            <div className="pillar-eyebrow pillar-eyebrow-teaching">TEACHING</div>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#b45309"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginBottom: 12 }}
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h4 className="pillar-teaching-title">Education & skills</h4>
            <p className="pillar-teaching-text">
              Bridge schooling, vocational training, and literacy programs run year-round.
            </p>
          </div>
          <div>
            <div className="pillar-teaching-stat">{avgAttendance}</div>
            <div className="pillar-teaching-substat">Avg attendance</div>
          </div>
        </div>

        <div className="pillar-mission">
          <div className="pillar-mission-label">OUR MISSION</div>
          <p className="pillar-mission-text">
            Every girl who walks through our doors receives the same promise — safety, healing, and a future worth fighting for. Three pillars. One mission. Every single day.
          </p>
        </div>
      </div>
    </section>

      {/* CTA strip */}
      <section className="cta-strip">
        <div className="container">
          {isAdmin ? (
            <>
              <h2 className="text-white mb-2" style={{ fontWeight: 800 }}>Good to Have You Back</h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                There are girls counting on your work today.
              </p>
              <Link to="/admin" className="btn btn-warning btn-lg fw-bold px-5">
                Go to Admin Portal
              </Link>
            </>
          ) : isDonor ? (
            <>
              <h2 className="text-white mb-2" style={{ fontWeight: 800 }}>Thank You for Your Support</h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Your generosity is making a real difference for girls across the Philippines.
              </p>
              <Link to="/donor/history" className="btn btn-warning btn-lg fw-bold px-5">
                View My Donations
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-white fw-bold mb-2">Ready to Make a Difference?</h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Join our community of supporters helping girls build brighter futures.
              </p>
              <Link to="/login" className="btn btn-warning btn-lg fw-bold px-5">
                Get Started
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
