import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import handsImage from '../assets/hands.jpg';
import hopeGirlsImage from '../assets/hopefulGirls.jpg';

const ways = [
  {
    title: 'Volunteer Your Time',
    description:
      'We welcome volunteers with skills in education, healthcare, counseling, or general support. Minimum 3-month commitment.',
    bg: '#dcfce7',
    iconColor: '#166534',
    borderColor: '#166534',
    link: null,
    linkLabel: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Donate Supplies',
    description:
      'We regularly need hygiene products, school materials, clothing, books, and non-perishable food. Contact us for our current wishlist.',
    bg: '#fef9c3',
    iconColor: '#854d0e',
    borderColor: '#854d0e',
    link: null,
    linkLabel: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#854d0e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Spread the Word',
    description:
      'Share our mission on social media, introduce us to your church, business, or community group. Awareness saves lives.',
    bg: '#fce7f3',
    iconColor: '#9d174d',
    borderColor: '#9d174d',
    link: null,
    linkLabel: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9d174d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    title: 'Corporate Partnerships',
    description:
      'Your business can make a lasting impact through sponsorships, employee giving programs, or cause-related campaigns.',
    bg: '#ede9fe',
    iconColor: '#5b21b6',
    borderColor: '#5b21b6',
    link: null,
    linkLabel: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5b21b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    title: 'Legacy Giving',
    description:
      'Include New Dawn Foundation in your estate planning and create a lasting legacy for girls in need for generations to come.',
    bg: '#e0f2fe',
    iconColor: '#075985',
    borderColor: '#075985',
    link: null,
    linkLabel: null,
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#075985" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
  },
];

const faqs = [
  {
    q: 'Is my donation tax deductible?',
    a: 'New Dawn Foundation is a registered nonprofit (EIN 81-3220618). Donations may be tax-deductible in the Philippines and, for US donors, under IRS regulations. Please consult your tax advisor for guidance specific to your situation.',
  },
  {
    q: 'How do I know my donation is used well?',
    a: 'We publish transparent monthly impact reports on our public Impact Dashboard. You can see exactly how many girls we are serving, their health and education progress, and how resources are allocated across our programs.',
  },
  {
    q: 'Can I sponsor a specific program?',
    a: 'Yes! You can designate your gift toward Caring (shelter), Healing (therapy), or Teaching (education). Just mention your preference in the interest form below and we will contact you to set that up.',
  },
  {
    q: 'Can I visit a safehouse?',
    a: 'To protect the safety and privacy of our residents, safehouse locations are confidential and visits are not possible. However, we organize periodic volunteer orientation events at our administrative office.',
  },
  {
    q: 'How do I set up a recurring donation?',
    a: 'On the Donate page, simply toggle "Make this a monthly gift" before submitting. Monthly donors are the backbone of our financial stability and receive special impact updates.',
  },
];

export default function GetInvolvedPage() {
  const { isAuthenticated } = useAuth();
  const donateLink = isAuthenticated ? '/donate' : '/login';
  const [formData, setFormData] = useState({ name: '', email: '', interest: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setSubmitted(true);
  };

  return (
    <div>
      {/* Hero */}
      <section className="hero-section" style={{ minHeight: 320 }}>
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=1400&q=80"
          alt="Volunteers working together"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="section-label">Join Us</p>
          <h1 className="display-5 fw-bold text-white mb-3" style={{ lineHeight: 1.15 }}>
            Change a Life Today
          </h1>
          <p className="text-white" style={{ opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.6 }}>
            There are many ways to support the girls of New Dawn Foundation — find the one that fits you.
          </p>
        </div>
      </section>

      {/* Donation Spotlight */}
      <section className="py-5 bg-white px-3 px-md-4 px-lg-5" style={{ marginTop: '3rem' }}>
        <div className="container">
          <div
            className="row align-items-center g-4 g-lg-5"
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div className="col-lg-6">
              <div style={{ maxWidth: 520 }}>
                <p className="section-label" style={{ color: 'var(--brand-accent)', opacity: 1 }}>
                  The Most Impactful Step
                </p>
                <h2 className="fw-bold mb-3" style={{ fontSize: '2.1rem', lineHeight: 1.2, color: 'var(--brand-dark)' }}>
                  Make a Donation
                </h2>
                <p
                  className="mb-4"
                  style={{
                    color: '#475569',
                    lineHeight: 1.8,
                    fontSize: '1.02rem',
                  }}
                >
                  Financial gifts of any size directly fund shelter, therapy, and education for girls in our care.
                  ₱500 feeds a resident for a week. ₱2,500 covers a month of counseling. Every peso restores hope.
                </p>
                <Link to={donateLink} className="btn btn-warning btn-lg fw-bold px-5" style={{ fontSize: '1.05rem' }}>
                  Donate Now
                </Link>
              </div>
            </div>

            <div className="col-lg-6">
              <div
                className="rounded-4 overflow-hidden"
                style={{
                  minHeight: 380,
                  marginTop: '0.5rem',
                }}
              >
                <img
                  src={handsImage}
                  alt="Community support and unity"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Ways to Help */}
      <section className="pt-5 pb-5 mt-4 bg-white">
        <div className="container">
          <div className="text-center mb-5">
            <p className="section-label">Beyond Donations</p>
            <h2 className="fw-bold" style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}>
              More Ways to Make a Difference
            </h2>
          </div>
          <div className="row g-4 justify-content-center">
            {ways.map((w) => (
              <div key={w.title} className="col-md-6 col-lg-4">
                <div
                  className="card card-hover h-100 p-4"
                  style={{ borderTop: `3px solid ${w.borderColor}` }}
                >
                  <div
                    className="d-flex align-items-center justify-content-center mb-3 rounded-3"
                    style={{ width: 56, height: 56, background: w.bg }}
                    aria-hidden="true"
                  >
                    {w.icon}
                  </div>
                  <h5 className="fw-bold mb-2" style={{ color: 'var(--brand-dark)' }}>
                    {w.title}
                  </h5>
                  <p className="text-muted mb-0" style={{ fontSize: '0.92rem', lineHeight: 1.7 }}>
                    {w.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page photo quote break */}
      <section className="hero-section" style={{ minHeight: 300 }}>
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1400&q=80"
          alt="Girls with hope and possibility"
        />
        <div className="hero-overlay" style={{ background: 'rgba(10, 30, 50, 0.65)' }} />
        <div className="hero-content text-center" style={{ maxWidth: 680 }}>
          <p
            className="text-white fw-bold mb-0"
            style={{ fontSize: 'clamp(1.1rem, 4vw, 1.5rem)', lineHeight: 1.6, fontStyle: 'italic' }}
          >
            "One act of generosity can change the entire trajectory of a girl's life."
          </p>
        </div>
      </section>

      {/* Interest Form */}
      <section className="py-5" style={{ background: 'var(--brand-light)' }}>
        <div className="container">
          <div className="row g-5 align-items-center">
            {/* Left photo */}
            <div className="col-lg-5 d-none d-lg-block">
              <div className="rounded-4 overflow-hidden" style={{ aspectRatio: '1/1' }}>
                <img
                  src={hopeGirlsImage}
                  alt="Hopeful girls"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: '50% center',
                    transform: 'scale(1.05)',
                  }}
                />
              </div>
            </div>

            {/* Form */}
            <div className="col-lg-7">
              <div className="mb-4">
                <p className="section-label">Ready to Help?</p>
                <h2 className="fw-bold" style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}>
                  Get in Touch
                </h2>
                <p className="text-muted mt-2">
                  Let us know how you'd like to get involved and we'll reach out within 2 business days.
                </p>
              </div>

              {submitted ? (
                <div className="card p-5 text-center">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: 64, height: 64, background: '#dcfce7' }}
                    aria-hidden="true"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4 className="fw-bold mb-2" style={{ color: 'var(--brand-dark)' }}>
                    We'll be in touch soon!
                  </h4>
                  <p className="text-muted mb-0">
                    Thank you, {formData.name}. A member of our team will contact you at <strong>{formData.email}</strong> within 2 business days.
                  </p>
                </div>
              ) : (
                <div className="card p-4 p-md-5">
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label htmlFor="name" className="form-label fw-semibold">
                          Full Name <span aria-hidden="true" style={{ color: '#dc3545' }}>*</span>
                        </label>
                        <input
                          id="name"
                          type="text"
                          className="form-control"
                          placeholder="Your full name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                      </div>
                      <div className="col-md-6">
                        <label htmlFor="email" className="form-label fw-semibold">
                          Email Address <span aria-hidden="true" style={{ color: '#dc3545' }}>*</span>
                        </label>
                        <input
                          id="email"
                          type="email"
                          className="form-control"
                          placeholder="your@email.com"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <label htmlFor="interest" className="form-label fw-semibold">
                          How Would You Like to Help?
                        </label>
                        <select
                          id="interest"
                          className="form-select"
                          value={formData.interest}
                          onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                        >
                          <option value="">Select an option…</option>
                          <option value="donate">Make a Donation</option>
                          <option value="volunteer">Volunteer My Time</option>
                          <option value="supplies">Donate Supplies</option>
                          <option value="social">Spread the Word</option>
                          <option value="corporate">Corporate Partnership</option>
                          <option value="legacy">Legacy Giving</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label htmlFor="message" className="form-label fw-semibold">
                          Message (optional)
                        </label>
                        <textarea
                          id="message"
                          className="form-control"
                          rows={4}
                          placeholder="Tell us more about how you'd like to help, or ask us a question…"
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        />
                      </div>
                      <div className="col-12">
                        <button
                          type="submit"
                          className="btn btn-primary btn-lg w-100 fw-bold"
                          disabled={!formData.name || !formData.email}
                        >
                          Send Message
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-5 bg-white">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="text-center mb-5">
                <p className="section-label">Questions & Answers</p>
                <h2 className="fw-bold" style={{ fontSize: '2rem', color: 'var(--brand-dark)' }}>
                  Frequently Asked Questions
                </h2>
              </div>
              <div className="accordion" id="faqAccordion">
                {faqs.map((faq, i) => (
                  <div key={i} className="accordion-item mb-2" style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                    <h3 className="accordion-header" style={{ margin: 0 }}>
                      <button
                        className="accordion-button fw-semibold"
                        type="button"
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        aria-expanded={openFaq === i}
                        aria-controls={`faq-${i}`}
                        style={{
                          background: openFaq === i ? '#eff6ff' : '#fff',
                          color: 'var(--brand-dark)',
                          boxShadow: 'none',
                          fontSize: '0.95rem',
                        }}
                      >
                        {faq.q}
                      </button>
                    </h3>
                    <div
                      id={`faq-${i}`}
                      className={`accordion-collapse collapse${openFaq === i ? ' show' : ''}`}
                    >
                      <div className="accordion-body text-muted" style={{ lineHeight: 1.8, fontSize: '0.93rem' }}>
                        {faq.a}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-strip">
        <div className="container">
          <h2 className="text-white fw-bold mb-2">Every Action Makes a Difference</h2>
          <p className="mb-4" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Whether you give ₱500 or 500 hours — you are part of the story.
          </p>
          <Link to={donateLink} className="btn btn-warning btn-lg fw-bold px-5">
            Donate Now
          </Link>
        </div>
      </section>
    </div>
  );
}
