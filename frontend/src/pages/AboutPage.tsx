import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicOrgSummary } from '../lib/reportAPI';
import type { PublicOrgSummary } from '../lib/reportAPI';
import aboutOrigin from '../assets/about-origin.jpg';
import merrickImg from '../assets/team/merrick.jpg';
import peterImg from '../assets/team/peter.jpg';
import andersImg from '../assets/team/anders.jpg';
import jakeImg from '../assets/team/jake.jpg';
import { useAuth } from '../context/AuthContext';

const values = [
  {
    title: 'Dignity',
    text: 'Every girl deserves to be treated with respect and recognized as a person of infinite worth, regardless of her past.',
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
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    title: 'Safety',
    text: 'We create environments where girls can feel truly secure — physically, emotionally, and spiritually.',
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
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    title: 'Empowerment',
    text: 'We walk alongside each girl as she discovers her own strength, voice, and capacity to shape her future.',
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
        aria-hidden="true"
      >
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
        <line x1="6" y1="1" x2="6" y2="4" />
        <line x1="10" y1="1" x2="10" y2="4" />
        <line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
  },
  {
    title: 'Community',
    text: 'Lasting healing happens in relationship. We build a family of supporters, staff, and survivors who lift each other up.',
    bg: '#fce7f3',
    icon: (
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9d174d"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const team = [
  {
    name: 'Peter Young',
    role: 'Executive Director',
    img: peterImg,
    initials: 'PY',
  },
  {
    name: 'Merrick Morgan',
    role: 'Clinical Director',
    img: merrickImg,
    initials: 'MM',
  },
  {
    name: 'Anders Houghton',
    role: 'Operations Manager',
    img: andersImg,
    initials: 'AD',
  },
  {
    name: 'Jake Fuhriman',
    role: 'Head of Education',
    img: jakeImg,
    initials: 'JF',
  },
];

export default function AboutPage() {
  const { isAuthenticated } = useAuth();
  const donateLink = isAuthenticated ? '/donate' : '/login';
  const [summary, setSummary] = useState<PublicOrgSummary | null>(null);

  useEffect(() => {
    getPublicOrgSummary()
      .then(setSummary)
      .catch(() => {});
  }, []);

  const stats = summary
    ? [
        {
          value: summary.totalGirlsServed.toLocaleString(),
          label: 'Girls Served',
        },
        { value: summary.numberOfSafehouses.toString(), label: 'Safehouses' },
        { value: summary.yearsOperating.toString(), label: 'Years Operating' },
        {
          value: summary.staffAndVolunteers.toLocaleString(),
          label: 'Staff & Volunteers',
        },
      ]
    : [
        { value: '—', label: 'Girls Served' },
        { value: '—', label: 'Safehouses' },
        { value: '—', label: 'Years Operating' },
        { value: '—', label: 'Staff & Volunteers' },
      ];

  return (
    <div>
      {/* Hero */}
      <section className="hero-section">
        <img
          className="hero-img"
          // src="https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=1400&q=80"
          src="src\assets\mountains.jpg"
          alt="Girls in classroom"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="section-label">Our Story</p>
          <h1
            className="display-5 fw-bold text-white mb-3"
            style={{ lineHeight: 1.15 }}
          >
            Restoring Hope,
            <br />
            One Life at a Time
          </h1>
          <p
            className="text-white mb-4"
            style={{ opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.6 }}
          >
            New Dawn Foundation was born from a simple conviction: every girl
            deserves a safe place to heal, grow, and dream.
          </p>
          <Link to={donateLink} className="btn btn-warning btn-lg fw-bold px-4">
            Support Our Mission
          </Link>
        </div>
      </section>

      {/* Origin Story */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <p className="section-label">How We Started</p>
              <h2
                className="fw-bold mb-4"
                style={{ color: 'var(--brand-dark)', fontSize: '2rem' }}
              >
                A Problem Too Big to Ignore
              </h2>
              <p className="text-muted mb-3" style={{ lineHeight: 1.8 }}>
                In the Philippines, thousands of girls face trafficking, abuse,
                and neglect every year. Many cycle through temporary shelters
                with no consistent support — and no path forward. In January
                2022, a group of social workers, educators, and community
                leaders in Quezon City decided that wasn't good enough.
              </p>
              <p className="text-muted mb-3" style={{ lineHeight: 1.8 }}>
                New Dawn Foundation opened its first safehouse — Lighthouse
                Safehouse 1 — in Quezon City on January 1, 2022. The mission was
                clear: don't just keep girls safe tonight — give them everything
                they need to thrive for a lifetime.
              </p>
              <p className="text-muted mb-0" style={{ lineHeight: 1.8 }}>
                Since 2022, we have grown to operate multiple safehouses across
                the region, building a community of supporters, social workers,
                and partners all united around one goal: restoring hope for
                girls who need it most.
              </p>
            </div>
            <div className="col-lg-6">
              <div
                className="rounded-4 overflow-hidden"
                style={{ aspectRatio: '4/3', background: 'var(--brand-light)' }}
              >
                <img
                  src={aboutOrigin}
                  alt="Children smiling and playing in a Filipino community"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-5" style={{ background: 'var(--brand-primary)' }}>
        <div className="container">
          <div className="row g-4 text-center">
            {stats.map((s) => (
              <div key={s.label} className="col-6 col-md-3">
                <div
                  className="display-4 fw-bold mb-1"
                  style={{ color: 'var(--brand-accent)' }}
                  aria-label={`${s.value} ${s.label}`}
                >
                  {s.value}
                </div>
                <div
                  className="text-white"
                  style={{ opacity: 0.85, fontWeight: 500 }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="py-5" style={{ background: 'var(--brand-light)' }}>
        <div className="container">
          <div className="row g-4">
            <div className="col-md-6">
              <div className="card card-hover h-100 p-4">
                <div
                  className="mb-3"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#dbeafe',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#1a5276"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <h3
                  className="fw-bold mb-3"
                  style={{ color: 'var(--brand-dark)' }}
                >
                  Our Mission
                </h3>
                <p className="text-muted mb-0" style={{ lineHeight: 1.8 }}>
                  To provide comprehensive, trauma-informed care to girls who
                  have experienced abuse, trafficking, or neglect — giving them
                  the safety, healing, and education they need to build
                  independent and fulfilling lives.
                </p>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card card-hover h-100 p-4">
                <div
                  className="mb-3"
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#166534"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
                <h3
                  className="fw-bold mb-3"
                  style={{ color: 'var(--brand-dark)' }}
                >
                  Our Vision
                </h3>
                <p className="text-muted mb-0" style={{ lineHeight: 1.8 }}>
                  A Philippines where every girl is free from exploitation, has
                  access to quality care and education, and is empowered to
                  reach her full potential — contributing to her family,
                  community, and nation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-label">What Guides Us</p>
            <h2
              className="fw-bold"
              style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}
            >
              Our Core Values
            </h2>
          </div>
          <div className="row g-4">
            {values.map((v) => (
              <div key={v.title} className="col-sm-6 col-lg-3">
                <div className="pillar-card h-100">
                  <div className="pillar-icon" style={{ background: v.bg }}>
                    {v.icon}
                  </div>
                  <h4
                    className="fw-bold mb-2"
                    style={{ color: 'var(--brand-dark)' }}
                  >
                    {v.title}
                  </h4>
                  <p
                    className="text-muted mb-0"
                    style={{ fontSize: '0.92rem', lineHeight: 1.7 }}
                  >
                    {v.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-5" style={{ background: 'var(--brand-light)' }}>
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-label">The People Behind the Work</p>
            <h2
              className="fw-bold"
              style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}
            >
              Our Leadership Team
            </h2>
          </div>
          <div className="row g-4 justify-content-center">
            {team.map((member) => (
              <div key={member.name} className="col-6 col-md-3 text-center">
                <img
                  src={member.img}
                  alt={member.name}
                  className="rounded-circle mx-auto mb-3"
                  style={{
                    width: 150,
                    height: 150,
                    objectFit: 'cover',
                  }}
                />
                <h6
                  className="fw-bold mb-1"
                  style={{ color: 'var(--brand-dark)' }}
                >
                  {member.name}
                </h6>
                <p className="text-muted small mb-0">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-strip">
        <div className="container">
          <h2 className="text-white fw-bold mb-2">Be Part of the Change</h2>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Your support gives girls the foundation they deserve. Every
            contribution makes a difference.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link
              to={donateLink}
              className="btn btn-warning btn-lg fw-bold px-5"
            >
              Donate Today
            </Link>
            <Link
              to="/get-involved"
              className="btn btn-outline-light btn-lg px-5"
            >
              Other Ways to Help
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
