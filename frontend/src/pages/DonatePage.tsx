import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createDonorPledge, getDonorPledgeOptions } from '../lib/supporterAPI';

const tiers = [
  {
    amount: 500,
    label: '₱500',
    impact: 'Provides one week of meals for a resident',
    icon: '🍚',
  },
  {
    amount: 1000,
    label: '₱1,000',
    impact: 'Funds a month of school supplies for one girl',
    icon: '📚',
  },
  {
    amount: 2500,
    label: '₱2,500',
    impact: 'Covers one counseling session with a licensed social worker',
    icon: '💙',
  },
  {
    amount: 5000,
    label: '₱5,000',
    impact:
      "Supports one girl's full month of care — shelter, meals, and therapy",
    icon: '🏠',
  },
];

const allocation = [
  {
    label: 'Safe Shelter & Daily Care',
    percent: 40,
    color: 'var(--brand-primary)',
  },
  { label: 'Healing & Counseling', percent: 35, color: 'var(--brand-accent)' },
  { label: 'Education & Training', percent: 25, color: '#166534' },
];

export default function DonatePage() {
  const { isAuthenticated, refreshAuthSession } = useAuth();
  const [selected, setSelected] = useState<number | null>(1000);
  const [custom, setCustom] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [programAreas, setProgramAreas] = useState<string[]>([]);
  const [safehouseIds, setSafehouseIds] = useState<number[]>([]);
  const [selectedProgramArea, setSelectedProgramArea] = useState('Any');
  const [selectedSafehouse, setSelectedSafehouse] = useState('Any');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveAmount = custom ? Number(custom) : selected;

  useEffect(() => {
    getDonorPledgeOptions().then((options) => {
      setProgramAreas(options.programAreas);
      setSafehouseIds(options.safehouseIds);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAmount || effectiveAmount <= 0) return;
    setSubmitError('');

    if (isAuthenticated) {
      try {
        setIsSubmitting(true);
        await createDonorPledge(
          Number(effectiveAmount),
          recurring,
          selectedProgramArea === 'Any' ? null : selectedProgramArea,
          selectedSafehouse === 'Any' ? null : Number(selectedSafehouse)
        );
        await refreshAuthSession();
      } catch {
        setSubmitError(
          'We were unable to save your pledge right now. Please try again.'
        );
        setIsSubmitting(false);
        return;
      }
    }

    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div
        className="py-5"
        style={{ minHeight: '60vh', display: 'flex', alignItems: 'center' }}
      >
        <div className="container text-center">
          <div
            className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
            style={{ width: 80, height: 80, background: '#dcfce7' }}
            aria-hidden="true"
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#166534"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="fw-bold mb-3" style={{ color: 'var(--brand-dark)' }}>
            Thank You for Your Generosity!
          </h1>
          <p
            className="text-muted mb-2"
            style={{
              fontSize: '1.05rem',
              maxWidth: 520,
              margin: '0 auto 1rem',
            }}
          >
            Your pledge of{' '}
            <strong>₱{(effectiveAmount ?? 0).toLocaleString()}</strong>
            {recurring ? ' per month' : ''} means the world to the girls of New
            Dawn Foundation.
          </p>
          <p
            className="text-muted mb-4"
            style={{ maxWidth: 480, margin: '0 auto 1.5rem' }}
          >
            {isAuthenticated
              ? 'Your donation has been recorded. You can view your personal donor history and impact details now.'
              : 'Create a free account to track the real-world impact of your donations and receive updates on the girls your support helps.'}
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            {isAuthenticated ? (
              <Link
                to="/donor/history"
                className="btn btn-primary btn-lg fw-bold px-5"
              >
                View My Donation History
              </Link>
            ) : (
              <Link
                to="/register"
                className="btn btn-primary btn-lg fw-bold px-5"
              >
                Create Your Account
              </Link>
            )}
            <Link to="/" className="btn btn-outline-secondary btn-lg px-5">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Hero */}
      <section className="hero-section" style={{ minHeight: 340 }}>
        <img
          className="hero-img"
          src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=1400&q=80"
          alt="Helping hands"
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="section-label">Make a Difference Today</p>
          <h1
            className="display-5 fw-bold text-white mb-3"
            style={{ lineHeight: 1.15 }}
          >
            Your Gift
            <br />
            Changes Lives
          </h1>
          <p
            className="text-white"
            style={{ opacity: 0.85, fontSize: '1.05rem', lineHeight: 1.6 }}
          >
            100% of your donation goes directly toward shelter, healing, and
            education for girls who need it most.
          </p>
        </div>
      </section>

      <section className="py-5" style={{ background: 'var(--brand-light)' }}>
        <div className="container">
          <div className="row g-5 align-items-start">
            {/* Donation Form */}
            <div className="col-lg-7">
              <div className="card card-hover p-4 p-md-5">
                <h2
                  className="fw-bold mb-1"
                  style={{ color: 'var(--brand-dark)' }}
                >
                  Choose Your Impact
                </h2>
                <p className="text-muted mb-4">
                  Select an amount or enter your own.
                </p>

                {/* Tier buttons */}
                <div
                  className="row g-3 mb-4"
                  role="group"
                  aria-label="Donation amount options"
                >
                  {tiers.map((t) => (
                    <div key={t.amount} className="col-6">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(t.amount);
                          setCustom('');
                        }}
                        className="w-100 text-start p-3 rounded-3"
                        style={{
                          border: `2px solid ${selected === t.amount && !custom ? 'var(--brand-primary)' : '#e2e8f0'}`,
                          background:
                            selected === t.amount && !custom
                              ? '#eff6ff'
                              : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        aria-pressed={selected === t.amount && !custom}
                      >
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span aria-hidden="true">{t.icon}</span>
                          <span
                            className="fw-bold"
                            style={{
                              color: 'var(--brand-dark)',
                              fontSize: '1.1rem',
                            }}
                          >
                            {t.label}
                          </span>
                        </div>
                        <div
                          className="text-muted"
                          style={{ fontSize: '0.8rem', lineHeight: 1.4 }}
                        >
                          {t.impact}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="mb-4">
                  <label
                    htmlFor="custom-amount"
                    className="form-label fw-semibold"
                    style={{ color: 'var(--brand-dark)' }}
                  >
                    Or enter a custom amount (₱)
                  </label>
                  <div className="input-group">
                    <span className="input-group-text fw-bold">₱</span>
                    <input
                      id="custom-amount"
                      type="number"
                      className="form-control"
                      placeholder="e.g. 1500"
                      min="1"
                      value={custom}
                      onChange={(e) => {
                        setCustom(e.target.value);
                        setSelected(null);
                      }}
                    />
                  </div>
                </div>

                {/* Allocation preferences */}
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label
                      htmlFor="program-area"
                      className="form-label fw-semibold"
                      style={{ color: 'var(--brand-dark)' }}
                    >
                      Program Area
                    </label>
                    <select
                      id="program-area"
                      className="form-select"
                      value={selectedProgramArea}
                      onChange={(e) => setSelectedProgramArea(e.target.value)}
                    >
                      <option value="Any">Any</option>
                      {programAreas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label
                      htmlFor="safehouse"
                      className="form-label fw-semibold"
                      style={{ color: 'var(--brand-dark)' }}
                    >
                      Safehouse
                    </label>
                    <select
                      id="safehouse"
                      className="form-select"
                      value={selectedSafehouse}
                      onChange={(e) => setSelectedSafehouse(e.target.value)}
                    >
                      <option value="Any">Any</option>
                      {safehouseIds.map((safehouseId) => (
                        <option key={safehouseId} value={String(safehouseId)}>
                          {safehouseId}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recurring */}
                <div className="mb-4">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="recurring-toggle"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                    />
                    <label
                      className="form-check-label fw-semibold"
                      htmlFor="recurring-toggle"
                    >
                      Make this a monthly gift
                    </label>
                  </div>
                  <p className="text-muted small mt-1 mb-0">
                    Monthly donors provide reliable, year-round support that
                    helps us plan programs with confidence.
                  </p>
                </div>

                {/* Submit */}
                <form onSubmit={handleSubmit}>
                  {submitError && (
                    <div className="alert alert-danger" role="alert">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 fw-bold py-3"
                    disabled={
                      !effectiveAmount || effectiveAmount <= 0 || isSubmitting
                    }
                  >
                    {isSubmitting
                      ? 'Saving pledge...'
                      : effectiveAmount && effectiveAmount > 0
                        ? `Pledge ₱${Number(effectiveAmount).toLocaleString()}${recurring ? '/month' : ''}`
                        : 'Select an Amount to Continue'}
                  </button>
                </form>

                <div className="d-flex align-items-center gap-2 justify-content-center mt-3">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#6b7280"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="text-muted small">
                    Secure donation — your information is protected
                  </span>
                </div>

                {!isAuthenticated && (
                  <p className="text-muted small text-center mt-2 mb-0">
                    This is a demonstration platform. Pledges are recorded for
                    tracking purposes.
                    <br />
                    <Link to="/register">Create an account</Link> to track your
                    donations and see your impact.
                  </p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="col-lg-5">
              {/* Allocation */}
              <div className="card p-4 mb-4">
                <h5
                  className="fw-bold mb-3"
                  style={{ color: 'var(--brand-dark)' }}
                >
                  How Your Donation Will Be Used
                </h5>
                {allocation.map((a) => (
                  <div key={a.label} className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <span
                        className="small fw-semibold"
                        style={{ color: 'var(--brand-dark)' }}
                      >
                        {a.label}
                      </span>
                      <span
                        className="small fw-bold"
                        style={{ color: a.color }}
                      >
                        {a.percent}%
                      </span>
                    </div>
                    <div
                      className="progress"
                      style={{ height: 8, borderRadius: 8 }}
                      role="progressbar"
                      aria-valuenow={a.percent}
                      aria-valuemin={0}
                      aria-valuemax={80}
                      aria-label={`${a.label}: ${a.percent}%`}
                    >
                      <div
                        className="progress-bar"
                        style={{
                          width: `${Math.min((a.percent / 80) * 100, 100)}%`,
                          background: a.color,
                          borderRadius: 8,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Trust signals */}
              <div className="card p-4 mb-4">
                <h5
                  className="fw-bold mb-3"
                  style={{ color: 'var(--brand-dark)' }}
                >
                  Why Give to New Dawn?
                </h5>
                <ul className="list-unstyled mb-0">
                  {[
                    'Registered nonprofit — EIN 81-3220618',
                    'Serving girls in the Philippines since 2018',
                    'Transparent monthly impact reporting',
                    '100% of donations go to direct services',
                    'Licensed social workers on staff',
                  ].map((item) => (
                    <li
                      key={item}
                      className="d-flex align-items-start gap-2 mb-2"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--brand-primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="flex-shrink-0 mt-1"
                        aria-hidden="true"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-muted small">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Account prompt */}
              {isAuthenticated ? (
                <div
                  className="card p-4"
                  style={{ background: 'var(--brand-dark)', border: 'none' }}
                >
                  <h6 className="fw-bold text-white mb-2">
                    Thank you for your support
                  </h6>
                  <p
                    className="mb-3"
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                    }}
                  >
                    View your donation history and impact in your account.
                  </p>
                  <Link
                    to="/donor/history"
                    className="btn btn-warning btn-sm fw-bold w-100"
                  >
                    View My Donations
                  </Link>
                </div>
              ) : (
                <div
                  className="card p-4"
                  style={{ background: 'var(--brand-dark)', border: 'none' }}
                >
                  <h6 className="fw-bold text-white mb-2">Track Your Impact</h6>
                  <p
                    className="mb-3"
                    style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                    }}
                  >
                    Create a free donor account to see how your gifts are making
                    a difference — monthly updates included.
                  </p>
                  <Link
                    to="/register"
                    className="btn btn-warning btn-sm fw-bold w-100"
                  >
                    Create Free Account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
