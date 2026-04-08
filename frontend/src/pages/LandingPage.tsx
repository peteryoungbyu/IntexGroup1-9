import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { authSession, isAuthenticated } = useAuth();

  // TODO backend: add GET /api/public/stats returning
  // { totalOccupancy, sessionCount, avgAttendanceRate } without auth.
  // These three stats are still using static fallbacks for now.
  const girlsSheltered = '60+';
  const sessionsLogged = '1,200+';
  const avgAttendance = '87%';

  const isAdmin = authSession.roles.includes('Admin');
  const isDonor = authSession.roles.includes('Donor');

  const heroLink = isAuthenticated
    ? isAdmin
      ? '/admin'
      : '/donor/history'
    : '/login';
  const heroLabel = isAuthenticated
    ? isAdmin
      ? 'Go to Admin Portal'
      : 'My Donations'
    : 'Supporter Login';
  const ctaLink = isAuthenticated
    ? isAdmin
      ? '/admin'
      : '/donor/history'
    : '/login';
  const ctaLabel = isAdmin
    ? 'Go to Admin Portal'
    : isDonor
      ? 'View My Donations'
      : 'Get Started';

  const pillars = [
    {
      key: 'caring',
      eyebrow: 'CARING',
      title: 'A safe place to call home',
      body: 'Ten safehouses across Luzon, Visayas, and Mindanao provide around-the-clock care for girls removed from harm.',
      metric: girlsSheltered,
      metricLabel: 'Girls sheltered right now',
      cardClass: 'pillar-caring',
      eyebrowClass: 'pillar-eyebrow pillar-eyebrow-light',
      titleClass: 'pillar-caring-title',
      textClass: 'pillar-caring-text',
      statClass: 'pillar-caring-stat',
      substatClass: 'pillar-caring-substat',
      showDivider: true,
      icon: (
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e8a838"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginBottom: 12 }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      key: 'healing',
      eyebrow: 'HEALING',
      title: 'Counseling & recovery',
      body: 'Trained counselors run individual and group sessions every week.',
      metric: sessionsLogged,
      metricLabel: 'Sessions logged',
      cardClass: 'pillar-healing',
      eyebrowClass: 'pillar-eyebrow pillar-eyebrow-healing',
      titleClass: 'pillar-healing-title',
      textClass: 'pillar-healing-text',
      statClass: 'pillar-healing-stat',
      substatClass: 'pillar-healing-substat',
      showDivider: false,
      icon: (
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
      ),
    },
    {
      key: 'teaching',
      eyebrow: 'TEACHING',
      title: 'Education & skills',
      body: 'Bridge schooling, vocational training, and literacy programs run year-round.',
      metric: avgAttendance,
      metricLabel: 'Avg attendance',
      cardClass: 'pillar-teaching',
      eyebrowClass: 'pillar-eyebrow pillar-eyebrow-teaching',
      titleClass: 'pillar-teaching-title',
      textClass: 'pillar-teaching-text',
      statClass: 'pillar-teaching-stat',
      substatClass: 'pillar-teaching-substat',
      showDivider: false,
      icon: (
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
      ),
    },
  ];

  return (
    <div>
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
            most, giving them the foundation for a brighter future.
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

      <section className="landing-pillars">
        <h2 className="landing-pillars-title">
          Three ways we change
          <br />
          <em>every life</em>
        </h2>

        <div className="landing-pillars-grid">
          {pillars.map((pillar) => (
            <div key={pillar.key} className={pillar.cardClass}>
              <div>
                <div className={pillar.eyebrowClass}>{pillar.eyebrow}</div>
                {pillar.icon}
                <h3 className={pillar.titleClass}>{pillar.title}</h3>
                <p className={pillar.textClass}>{pillar.body}</p>
              </div>
              <div>
                {pillar.showDivider && <hr className="pillar-divider" />}
                <div className={pillar.statClass}>{pillar.metric}</div>
                <div className={pillar.substatClass}>{pillar.metricLabel}</div>
              </div>
            </div>
          ))}

          <div className="pillar-mission">
            <div className="pillar-mission-label">OUR MISSION</div>
            <p className="pillar-mission-text">
              Every girl who walks through our doors receives the same promise:
              safety, healing, and a future worth fighting for. Three pillars.
              One mission. Every single day.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-strip">
        <div className="container">
          {isAdmin ? (
            <>
              <h2 className="text-white mb-2" style={{ fontWeight: 800 }}>
                Good to Have You Back
              </h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                There are girls counting on your work today.
              </p>
              <Link
                to={ctaLink}
                className="btn btn-warning btn-lg fw-bold px-5"
              >
                {ctaLabel}
              </Link>
            </>
          ) : isDonor ? (
            <>
              <h2 className="text-white mb-2" style={{ fontWeight: 800 }}>
                Thank You for Your Support
              </h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Your generosity is making a real difference for girls across the
                Philippines.
              </p>
              <Link
                to={ctaLink}
                className="btn btn-warning btn-lg fw-bold px-5"
              >
                {ctaLabel}
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-white fw-bold mb-2">
                Ready to Make a Difference?
              </h2>
              <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Join our community of supporters helping girls build brighter
                futures.
              </p>
              <Link
                to={ctaLink}
                className="btn btn-warning btn-lg fw-bold px-5"
              >
                {ctaLabel}
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
