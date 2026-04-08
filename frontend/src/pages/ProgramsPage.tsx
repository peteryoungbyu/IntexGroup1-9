import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const programs = [
  {
    id: 'caring',
    label: 'Caring',
    title: 'Safe Shelter & Daily Care',
    tagline: 'A place to simply be safe.',
    bg: '#dbeafe',
    iconColor: '#1a5276',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1a5276" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    description:
      'For many girls who arrive at New Dawn, safety is something they have never known. Our safehouses provide stable, loving environments where every girl has a bed, nutritious meals, clothing, and consistent adult support. We keep our locations confidential to protect our residents.',
    whatWeProvide: [
      'Secure, confidential safehouse locations across three regions',
      'Three balanced meals and snacks every day',
      'Dedicated house parents available around the clock',
      'Personal hygiene supplies, clothing, and toiletries',
      'Recreational activities, field trips, and celebrations',
      'Spiritual care and faith community connection',
    ],
    quote: '"The first night I slept here, I wasn\'t scared for the first time in years." — A former resident',
  },
  {
    id: 'healing',
    label: 'Healing',
    title: 'Therapy & Emotional Restoration',
    tagline: 'Safety opens the door. Healing walks through it.',
    bg: '#dcfce7',
    iconColor: '#166534',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22V12" />
        <path d="M12 12C12 7 8 4 3 5c0 5 3 9 9 7" />
        <path d="M12 12c0-5 4-8 9-7 0 5-3 9-9 7" />
      </svg>
    ),
    description:
      'Trauma reshapes the brain, the body, and the heart. Our licensed social workers and counselors use evidence-based, trauma-informed approaches to help girls process their experiences, rebuild trust, and develop healthy emotional patterns. Healing is not rushed — we walk at each girl\'s pace.',
    whatWeProvide: [
      'Individual counseling sessions with licensed social workers',
      'Group therapy and peer support circles',
      'Trauma-informed care across every program area',
      'Regular case conferences to review each girl\'s progress',
      'Mental health assessments and ongoing monitoring',
      'Family reunification counseling where appropriate',
    ],
    quote: '"I learned that what happened to me wasn\'t my fault. That changed everything." — A current resident',
  },
  {
    id: 'teaching',
    label: 'Teaching',
    title: 'Education & Future Building',
    tagline: 'Knowledge is the key no one can take away.',
    bg: '#fef9c3',
    iconColor: '#854d0e',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
    description:
      'Education is the most powerful tool for long-term independence. We work to ensure every girl is enrolled in formal schooling and provide supplemental tutoring, literacy support, and vocational training. Our goal: every girl leaves New Dawn with a diploma or certification and a clear path forward.',
    whatWeProvide: [
      'Enrollment and support in accredited local schools',
      'Daily tutoring and homework assistance',
      'Literacy and numeracy remediation for those who missed school',
      'Vocational training in skills like sewing, baking, and computing',
      'Life skills curriculum (financial literacy, health, communication)',
      'Reintegration planning and post-placement monitoring',
    ],
    quote: '"I passed my board exam last year. New Dawn believed I could before I did." — A graduate',
  },
];

const stories = [
  {
    name: 'A.',
    age: '16',
    story:
      'A. arrived at our safehouse unable to make eye contact with anyone. After six months of individual counseling and group sessions, she started leading the morning prayer for the whole house. She recently enrolled in Grade 9 — her first time in formal school.',
  },
  {
    name: 'R.',
    age: '14',
    story:
      'R. had never learned to read when she came to us at age 13. Our literacy program gave her one-on-one tutoring five days a week. Within eight months she was reading chapter books. She told her social worker: "Now nobody can trick me with papers."',
  },
  {
    name: 'M.',
    age: '19',
    story:
      'M. graduated from our program at 18 and completed a 6-month baking certification. She now runs a small home bakery, sends money to her younger siblings, and visits the safehouse monthly to mentor current residents.',
  },
];

export default function ProgramsPage() {
  const { isAuthenticated } = useAuth();
  const donateLink = isAuthenticated ? '/donate' : '/login';
  return (
    <div>
      {/* Hero */}
      <section className="hero-section">
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=1400&q=80"
          alt="Children learning"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="section-label">What We Do</p>
          <h1 className="display-5 fw-bold text-white mb-3" style={{ lineHeight: 1.15 }}>
            How We<br />Restore Hope
          </h1>
          <p className="text-white mb-4" style={{ opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.6 }}>
            Three integrated programs — Caring, Healing, and Teaching — that work together to transform a girl's life from the inside out.
          </p>
          <div className="d-flex gap-3 flex-wrap">
            <a href="#programs" className="btn btn-warning btn-lg fw-bold px-4">
              Explore Programs
            </a>
            <Link to="/impact" className="btn btn-outline-light btn-lg px-4">
              See the Impact
            </Link>
          </div>
        </div>
      </section>

      {/* Programs */}
      <div id="programs">
        {programs.map((prog, idx) => (
          <section
            key={prog.id}
            className="py-5"
            style={{ background: idx % 2 === 0 ? '#fff' : 'var(--brand-light)' }}
          >
            <div className="container">
              <div className={`row align-items-center g-5 ${idx % 2 === 1 ? 'flex-md-row-reverse' : ''}`}>
                <div className="col-lg-6">
                  <div
                    className="d-inline-flex align-items-center justify-content-center mb-3 rounded-3"
                    style={{ width: 64, height: 64, background: prog.bg }}
                    aria-hidden="true"
                  >
                    {prog.icon}
                  </div>
                  <p className="section-label">{prog.label}</p>
                  <h2 className="fw-bold mb-2" style={{ color: 'var(--brand-dark)', fontSize: '1.75rem' }}>
                    {prog.title}
                  </h2>
                  <p className="fst-italic mb-3" style={{ color: 'var(--brand-accent)', fontWeight: 600 }}>
                    {prog.tagline}
                  </p>
                  <p className="text-muted mb-4" style={{ lineHeight: 1.8 }}>
                    {prog.description}
                  </p>
                  <ul className="list-unstyled mb-4">
                    {prog.whatWeProvide.map((item) => (
                      <li key={item} className="d-flex align-items-start gap-2 mb-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-1" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-muted" style={{ fontSize: '0.93rem' }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <blockquote
                    className="p-3 rounded-3"
                    style={{ background: prog.bg, borderLeft: `4px solid ${prog.iconColor}`, margin: 0 }}
                  >
                    <p className="mb-0 fst-italic" style={{ color: prog.iconColor, fontSize: '0.92rem' }}>
                      {prog.quote}
                    </p>
                  </blockquote>
                </div>
                <div className="col-lg-6">
                  <div className="rounded-4 overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <img
                      src={
                        prog.id === 'caring'
                          ? 'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=800&q=80'
                          : prog.id === 'healing'
                          ? 'https://images.unsplash.com/photo-1573497491765-dccce02b29df?w=800&q=80'
                          : 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80'
                      }
                      alt={prog.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Impact Callout */}
      <section className="py-5" style={{ background: 'var(--brand-primary)' }}>
        <div className="container text-center">
          <p className="section-label" style={{ color: 'var(--brand-accent)' }}>By the Numbers</p>
          <h2 className="fw-bold text-white mb-3" style={{ fontSize: '2rem' }}>
            These Programs Are Working
          </h2>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto 1.5rem' }}>
            Every month we publish transparent impact data so you can see exactly where your support goes.
          </p>
          <Link to="/impact" className="btn btn-warning btn-lg fw-bold px-5">
            View Our Impact Dashboard
          </Link>
        </div>
      </section>

      {/* Stories */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-label">Stories of Change</p>
            <h2 className="fw-bold" style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}>
              Voices From Our Community
            </h2>
            <p className="text-muted mt-2" style={{ maxWidth: 540, margin: '0.5rem auto 0' }}>
              Names are abbreviated and identifying details changed to protect privacy.
            </p>
          </div>
          <div className="row g-4">
            {stories.map((s) => (
              <div key={s.name} className="col-md-4">
                <div className="card card-hover h-100 p-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                      style={{ width: 48, height: 48, background: 'var(--brand-primary)', color: '#fff', fontSize: '1.1rem', flexShrink: 0 }}
                      aria-hidden="true"
                    >
                      {s.name}
                    </div>
                    <div>
                      <div className="fw-bold" style={{ color: 'var(--brand-dark)' }}>Resident {s.name}</div>
                      <div className="text-muted small">Age {s.age}</div>
                    </div>
                  </div>
                  <p className="text-muted mb-0" style={{ lineHeight: 1.8, fontSize: '0.93rem' }}>
                    {s.story}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-strip">
        <div className="container">
          <h2 className="text-white fw-bold mb-2">Help Us Keep These Programs Running</h2>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Every program depends on the generosity of supporters like you.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to={donateLink} className="btn btn-warning btn-lg fw-bold px-5">
              Donate Now
            </Link>
            <Link to="/get-involved" className="btn btn-outline-light btn-lg px-5">
              Other Ways to Help
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
