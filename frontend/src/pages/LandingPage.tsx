import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';
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

function parseSnapshotDate(snapshotDate: string): Date | null {
  if (!snapshotDate.trim()) return null;

  const normalized = new Date(snapshotDate);
  if (Number.isNaN(normalized.getTime())) return null;

  return normalized;
}

function toYearMonth(date: Date): number {
  return date.getFullYear() * 100 + (date.getMonth() + 1);
}

export default function LandingPage() {
  const { authSession, isAuthenticated } = useAuth();
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);

  // TODO backend: add GET /api/public/stats returning
  // { totalOccupancy, sessionCount, avgAttendanceRate } without auth.
  // These three stats are still using static fallbacks for now.
  const girlsSheltered = '60+';
  const sessionsLogged = '1,200+';
  const avgAttendance = '87%';

  useEffect(() => {
    getPublicImpact(12)
      .then(setSnapshots)
      .catch(() => {
        setSnapshots([]);
      });
  }, []);

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

  const today = new Date(Date.now());
  const targetDate = new Date(today);
  targetDate.setMonth(targetDate.getMonth() - 2);
  const targetYearMonth = toYearMonth(targetDate);
  const latestSnapshot = [...snapshots]
    .map((snapshot) => ({
      snapshot,
      parsedDate: parseSnapshotDate(snapshot.snapshotDate),
    }))
    .filter(
      (entry) =>
        entry.parsedDate !== null &&
        toYearMonth(entry.parsedDate) === targetYearMonth
    )
    .sort((a, b) => b.parsedDate!.getTime() - a.parsedDate!.getTime())[0]?.snapshot;
  const latestSnapshotPayload = parseMetricPayload(latestSnapshot?.metricPayloadJson ?? null);
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

<section className="landing-pillars">
  <h2 className="landing-pillars-title">
    Three ways we change
    <br />
    <em>every life</em>
  </h2>

  <div className="landing-pillars-grid">
    {pillars.map((pillar) => {
      const isFeatured = pillar.variant === "featured";

      return (
        <div
          key={pillar.key}
          className={`pillar-card ${pillar.key} ${isFeatured ? "featured" : ""}`}
        >
          <div>
            <div className={`pillar-eyebrow ${pillar.eyebrowClass}`}>
              {pillar.eyebrow}
            </div>

            {pillar.icon}

            <h3 className="pillar-title">
              {pillar.title}
            </h3>

            <p className="pillar-text">
              {pillar.body}
            </p>
          </div>

          <div>
            {isFeatured && <hr className="pillar-divider" />}

            <div className="pillar-stat">
              {pillar.metric}
            </div>

            <div className="pillar-substat">
              {pillar.metricLabel}
            </div>
          </div>
        </div>
      );
    })}

    {/* Mission + analytics */}
    <div className="pillar-mission">
      <div className="pillar-mission-label">
        OUR MISSION
      </div>

      <p className="pillar-mission-text">
        Every girl who walks through our doors receives the same promise —
        safety, healing, and a future worth fighting for. Three pillars.
        One mission. Every single day.
      </p>

      {latestSnapshot && (
        <div className="impact-snapshot">

          <div className="impact-snapshot-label">
            Latest impact snapshot
          </div>

          <div className="impact-snapshot-title">
            {latestSnapshot.headline}
          </div>

          <p className="impact-snapshot-text">
            {latestSnapshot.summaryText}
          </p>

          <div className="impact-metrics">

            <div className="impact-metric">
              <div className="impact-metric-label">
                Avg health score
              </div>

              <div className="impact-metric-value">
                {formatMetric(latestAvgHealthScore,"score")}
              </div>
            </div>

            <div className="impact-metric">
              <div className="impact-metric-label">
                Avg education progress
              </div>

              <div className="impact-metric-value">
                {formatMetric(latestAvgEducationProgress,"percent")}
              </div>
            </div>

          </div>

          <div className="impact-date">
            {new Date(latestSnapshot.snapshotDate).toLocaleDateString(
              "en-US",
              {
                month:"short",
                day:"numeric",
                year:"numeric"
              }
            )}
          </div>

        </div>
      )}
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
              <Link to={ctaLink} className="btn btn-warning btn-lg fw-bold px-5">
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
              <Link to={ctaLink} className="btn btn-warning btn-lg fw-bold px-5">
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
              <Link to={ctaLink} className="btn btn-warning btn-lg fw-bold px-5">
                {ctaLabel}
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
