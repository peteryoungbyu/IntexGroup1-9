import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpactByDate } from '../lib/reportAPI';
import { useAuth } from '../context/AuthContext';

function normalizeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function parseMetricPayload(payload: string | null): Record<string, unknown> {
  if (!payload) return {};

  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through and try normalizing Python-style single-quoted payloads.
  }

  try {
    const normalized = payload.replace(/'([^']*)'/g, (_, group: string) => {
      const escaped = group.replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed payload strings and render fallback values.
  }

  return {};
}

function readNumericMetric(
  payload: Record<string, unknown>,
  aliases: string[]
): number | null {
  const normalizedAliases = aliases.map(normalizeKey);

  for (const [key, value] of Object.entries(payload)) {
    if (!normalizedAliases.includes(normalizeKey(key))) continue;

    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function formatMetric(value: number | null, type: 'score' | 'percent'): string {
  if (value === null) return 'N/A';

  switch (type) {
    case 'score':
      return value.toFixed(1);
    case 'percent':
      return `${value.toFixed(1)}%`;
  }
}

export default function LandingPage() {
  const { authSession, isAuthenticated } = useAuth();
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [referenceDate] = useState(() => new Date());

  // TODO backend: add GET /api/public/stats returning
  // { totalOccupancy, sessionCount, avgAttendanceRate } without auth.
  // These three stats are still using static fallbacks for now.
  const girlsSheltered = '60+';
  const sessionsLogged = '1,200+';
  const avgAttendance = '87%';

  const targetSnapshotDate = new Date(referenceDate);
  targetSnapshotDate.setMonth(targetSnapshotDate.getMonth() - 2);
  targetSnapshotDate.setDate(1);
  const targetSnapshotDateText = `${targetSnapshotDate.getFullYear()}-${String(
    targetSnapshotDate.getMonth() + 1
  ).padStart(2, '0')}-01`;

  useEffect(() => {
    getPublicImpactByDate(targetSnapshotDateText)
      .then(setSnapshots)
      .catch(() => {
        setSnapshots([]);
      });
  }, [targetSnapshotDateText]);

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

  const latestSnapshot = snapshots[0];
  const latestSnapshotPayload = parseMetricPayload(
    latestSnapshot?.metricPayloadJson ?? null
  );
  const latestAvgHealthScore = readNumericMetric(latestSnapshotPayload, [
    'avgHealthScore',
    'avg_health_score',
    'averageHealthScore',
    'average_health_score',
    'healthScoreAvg',
  ]);
  const latestAvgEducationProgress = readNumericMetric(latestSnapshotPayload, [
    'avgEducationProgress',
    'avg_education_progress',
    'averageEducationProgress',
    'average_education_progress',
  ]);

  const pillars = [
    {
      key: 'caring',
      eyebrow: 'CARING',
      title: 'A safe place to call home',
      body: 'Ten safehouses across Luzon, Visayas, and Mindanao provide around-the-clock care for girls removed from harm.',
      metric: girlsSheltered,
      metricLabel: 'Girls sheltered right now',
      variant: 'featured' as const,
      accent: '#e8a838',
      background: '#0d2d44',
      textColor: '#ffffff',
      bodyColor: 'rgba(255,255,255,0.55)',
      labelColor: 'rgba(255,255,255,0.4)',
      border: undefined,
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
      variant: 'supporting' as const,
      accent: '#0f6e56',
      background: '#e8f4f0',
      textColor: '#0f6e56',
      bodyColor: '#4b7c6f',
      labelColor: '#0f6e56',
      border: '1px solid rgba(15,110,86,0.2)',
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
      variant: 'supporting' as const,
      accent: '#b45309',
      background: '#fff8ec',
      textColor: '#b45309',
      bodyColor: '#92400e',
      labelColor: '#b45309',
      border: '1px solid rgba(180,83,9,0.2)',
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

      <section style={{ background: '#f8f7f4', padding: '72px 40px' }}>
        <h2
          style={{
            fontSize: '2.6rem',
            fontWeight: 800,
            color: '#0d2d44',
            marginBottom: 32,
            lineHeight: 1.15,
          }}
        >
          Three ways we change
          <br />
          <em
            style={{
              fontWeight: 300,
              color: '#6b7280',
              fontStyle: 'italic',
            }}
          >
            every life
          </em>
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr',
            gridTemplateRows: '1fr auto',
            gap: 16,
            minHeight: 460,
          }}
        >
          {pillars.map((pillar) => {
            const isFeatured = pillar.variant === 'featured';

            return (
              <div
                key={pillar.key}
                style={{
                  gridRow: isFeatured ? 'span 2' : undefined,
                  background: pillar.background,
                  borderRadius: 20,
                  padding: isFeatured ? '40px 36px' : '28px 26px',
                  border: pillar.border,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '2px',
                      textTransform: 'uppercase',
                      color: pillar.labelColor,
                      marginBottom: isFeatured ? 20 : 12,
                    }}
                  >
                    {pillar.eyebrow}
                  </div>
                  {pillar.icon}
                  <h3
                    style={{
                      fontSize: isFeatured ? '1.8rem' : '1.3rem',
                      fontWeight: 800,
                      color: pillar.textColor,
                      lineHeight: 1.2,
                      marginBottom: isFeatured ? 16 : 8,
                    }}
                  >
                    {pillar.title}
                  </h3>
                  <p
                    style={{
                      color: pillar.bodyColor,
                      lineHeight: isFeatured ? 1.65 : 1.6,
                      fontSize: isFeatured ? '0.95rem' : '0.83rem',
                      margin: 0,
                    }}
                  >
                    {pillar.body}
                  </p>
                </div>
                <div>
                  {isFeatured ? (
                    <hr
                      style={{
                        borderColor: 'rgba(255,255,255,0.1)',
                        marginBottom: 16,
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      fontSize: isFeatured ? '3.2rem' : '1.8rem',
                      fontWeight: 800,
                      color: pillar.accent,
                      lineHeight: 1,
                    }}
                  >
                    {pillar.metric}
                  </div>
                  <div
                    style={{
                      fontSize: isFeatured ? '0.75rem' : '0.72rem',
                      fontWeight: 700,
                      letterSpacing: '1.5px',
                      textTransform: 'uppercase',
                      color: isFeatured
                        ? 'rgba(255,255,255,0.4)'
                        : pillar.bodyColor,
                      marginTop: isFeatured ? 6 : 4,
                    }}
                  >
                    {pillar.metricLabel}
                  </div>
                </div>
              </div>
            );
          })}

          <div
            style={{
              gridColumn: 'span 2',
              background: 'transparent',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: '#e8a838',
                marginBottom: 12,
              }}
            >
              OUR MISSION
            </div>
            <p
              style={{
                color: '#6b7280',
                fontSize: '1rem',
                lineHeight: 1.75,
                margin: 0,
                maxWidth: 480,
              }}
            >
              Every girl who walks through our doors receives the same promise:
              safety, healing, and a future worth fighting for. Three pillars.
              One mission. Every single day.
            </p>
            {latestSnapshot ? (
              <div
                style={{
                  marginTop: 24,
                  maxWidth: 540,
                  background: '#ffffff',
                  borderRadius: 18,
                  padding: '18px 20px',
                  boxShadow: '0 18px 38px rgba(13,45,68,0.08)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#0d2d44',
                    marginBottom: 10,
                  }}
                >
                  Latest impact snapshot
                </div>
                <div
                  style={{
                    fontSize: '1.15rem',
                    fontWeight: 800,
                    color: '#0d2d44',
                    marginBottom: 8,
                  }}
                >
                  NewDawn Impact Report -{' '}
                  {new Date(latestSnapshot.snapshotDate).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  )}
                </div>
                <p style={{ color: '#52606d', lineHeight: 1.65, margin: 0 }}>
                  {latestSnapshot.summaryText}
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                    marginTop: 16,
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      background: '#f8f7f4',
                      borderRadius: 14,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        color: '#6b7280',
                        marginBottom: 6,
                      }}
                    >
                      Avg health score
                    </div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#0d2d44',
                        lineHeight: 1,
                      }}
                    >
                      {formatMetric(latestAvgHealthScore, 'score')}
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#f8f7f4',
                      borderRadius: 14,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                        color: '#6b7280',
                        marginBottom: 6,
                      }}
                    >
                      Avg education progress
                    </div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: '#0d2d44',
                        lineHeight: 1,
                      }}
                    >
                      {formatMetric(latestAvgEducationProgress, 'percent')}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    letterSpacing: '1.2px',
                    textTransform: 'uppercase',
                    color: '#e8a838',
                  }}
                >
                  {new Date(latestSnapshot.snapshotDate).toLocaleDateString(
                    'en-US',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    }
                  )}
                </div>
              </div>
            ) : null}
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
