import Pagination from '../components/Pagination';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';
import { useEffect, useMemo, useRef, useState } from 'react';


// ─── Helpers ────────────────────────────────────────────────────────────────

function normalizeKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function parseMetricPayload(payload: string | null): Record<string, unknown> {
  if (!payload) return {};
  try {
    const parsed = JSON.parse(payload);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
  } catch {
    // try Python-style single quotes
  }
  try {
    const normalized = payload.replace(/'([^']*)'/g, (_, g: string) => `"${g.replace(/"/g, '\\"')}"`);
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed))
      return parsed as Record<string, unknown>;
  } catch {
    // ignore
  }
  return {};
}

function readNumericMetric(payload: Record<string, unknown>, aliases: string[]): number | null {
  const norm = aliases.map(normalizeKey);
  for (const [key, value] of Object.entries(payload)) {
    if (!norm.includes(normalizeKey(key))) continue;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function fmt(value: number | null, type: 'score' | 'percent' | 'count'): string {
  if (value === null) return '—';
  if (type === 'score') return value.toFixed(1);
  if (type === 'percent') return `${value.toFixed(1)}%`;
  return Math.round(value).toLocaleString();
}

function toYearMonth(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const m = value.trim().match(/^(\d{4})-(\d{1,2})/);
  if (m) {
    const yr = Number(m[1]); const mo = Number(m[2]);
    if (Number.isFinite(yr) && mo >= 1 && mo <= 12) return yr * 100 + mo;
  }
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) return null;
  return d.getUTCFullYear() * 100 + (d.getUTCMonth() + 1);
}

function monthLabel(snapshot: ImpactSnapshot): string {
  const payload = parseMetricPayload(snapshot.metricPayloadJson);
  const src = (typeof payload.month === 'string' ? payload.month : null) ?? snapshot.snapshotDate;
  const d = new Date(src);
  if (isNaN(d.getTime())) return src ?? '';
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

const HEALTH_ALIASES = ['avgHealthScore', 'avg_health_score', 'averageHealthScore', 'average_health_score', 'healthScoreAvg'];
const EDU_ALIASES = ['avgEducationProgress', 'avg_education_progress', 'averageEducationProgress', 'average_education_progress'];
const RESIDENT_ALIASES = ['totalResidents', 'total_residents', 'activeResidents', 'active_residents', 'residentCount'];
const DONATION_ALIASES = [
  'donations_total_for_month',
  'donationsTotalForMonth',
  'monthlyDonations',
];

const START_YM = 202301;
const END_YM   = 202602;

// ─── Component ───────────────────────────────────────────────────────────────

export default function PublicDashboardPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredSnapshot, setFeaturedSnapshot] = useState<ImpactSnapshot | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const timelineRef = useRef<HTMLDivElement>(null);

  const [referenceDate] = useState(() => new Date());
  const targetDate = (() => {
    const d = new Date(referenceDate);
    d.setMonth(d.getMonth() - 2);
    d.setDate(1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  })();

  useEffect(() => {
    getPublicImpact(120)
      .then((data) => {
        setSnapshots(data);

        const matched = data.find((s) => {
          const payload = parseMetricPayload(s.metricPayloadJson);
          const month = typeof payload.month === 'string' ? payload.month : s.snapshotDate?.slice(0, 7);
          return month === targetDate.slice(0, 7);
        });

        setFeaturedSnapshot(matched ?? null);
      })
      .finally(() => setLoading(false));
  }, [targetDate]);

  // Filter + sort snapshots
    const filteredSnapshots = useMemo(() => {
      return snapshots.filter((s) => {
        const payload = parseMetricPayload(s.metricPayloadJson);
        const ym = toYearMonth(payload.month) ?? toYearMonth(s.snapshotDate);
        return ym !== null && ym >= START_YM && ym <= END_YM;
      });
    }, [snapshots]);

    const sortedDesc = useMemo(() => {
      return [...filteredSnapshots].sort((a, b) => {
        const pa = parseMetricPayload(a.metricPayloadJson);
        const pb = parseMetricPayload(b.metricPayloadJson);
        const ma = toYearMonth(pa.month) ?? toYearMonth(a.snapshotDate) ?? 0;
        const mb = toYearMonth(pb.month) ?? toYearMonth(b.snapshotDate) ?? 0;
        return mb - ma;
      });
    }, [filteredSnapshots]);

    const sortedAsc = useMemo(() => {
      return [...sortedDesc].reverse();
    }, [sortedDesc]);

  const pagedSnapshots = sortedDesc.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  function handlePageChange(page: number) {
    setCurrentPage(page);
    timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Featured payload
  const featuredPayload = parseMetricPayload(featuredSnapshot?.metricPayloadJson ?? null);
  const featuredHealth    = readNumericMetric(featuredPayload, HEALTH_ALIASES);
  const featuredEdu       = readNumericMetric(featuredPayload, EDU_ALIASES);
  const featuredResidents = readNumericMetric(featuredPayload, RESIDENT_ALIASES);

  // Hero card values — use most recent snapshot
  const mostRecentPayload = parseMetricPayload(sortedDesc[0]?.metricPayloadJson ?? null);
  const heroHealth = readNumericMetric(mostRecentPayload, HEALTH_ALIASES);
  const heroResidents = readNumericMetric(mostRecentPayload, RESIDENT_ALIASES);
  const heroDonations = readNumericMetric(mostRecentPayload, DONATION_ALIASES);

  console.log(mostRecentPayload);

  // Chart data
  const healthChartData = sortedAsc.flatMap((s) => {
    const p = parseMetricPayload(s.metricPayloadJson);
    const v = readNumericMetric(p, HEALTH_ALIASES);
    return v !== null ? [{ name: monthLabel(s), value: v }] : [];
  });

  const eduChartData = sortedAsc.flatMap((s) => {
    const p = parseMetricPayload(s.metricPayloadJson);
    const v = readNumericMetric(p, EDU_ALIASES);
    return v !== null ? [{ name: monthLabel(s), value: v }] : [];
  });

  const accentRecent = (data: { name: string; value: number }[], index: number) =>
    index >= data.length - 2 ? '#e8a838' : undefined;

  if (loading)
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" style={{ color: 'var(--brand-primary)' }} />
      </div>
    );

  return (
    <div>
      {/* SECTION 1 — Page Header */}
      <div className="page-header">
        <div className="container">
          <p className="section-label">New Dawn Foundation</p>
          <h1>Impact Dashboard</h1>
          <p>Our progress in caring for, healing, and teaching girls across the Philippines</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)' }}>
        <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

          {/* SECTION 2 — Hero Stat Cards */}
          <div className="row g-3 mb-4">
            {[
              {
                label: 'GIRLS SERVED',
                value: heroResidents != null ? Math.round(heroResidents).toLocaleString() : '—',
                sub: 'currently in care',
              },
              {
                label: 'MONTHLY DONATIONS',
                value: heroDonations != null
                  ? `₱${Math.round(heroDonations).toLocaleString()}`
                  : '—',
                sub: 'funding this month',
              },
              {
                label: 'AVG EDUCATION',
                value: featuredEdu != null ? `${featuredEdu.toFixed(0)}%` : '—',
                sub: 'learning progress',
              },
              {
                label: 'AVG HEALTH SCORE',
                value: heroHealth != null ? heroHealth.toFixed(1) : '—',
                sub: 'out of 5.0',
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="col-6 col-md-3">
                <div style={{
                  background: '#fff',
                  borderRadius: 14,
                  padding: 20,
                  borderLeft: '4px solid var(--brand-accent)',
                  height: '100%',
                  boxShadow: '0 2px 12px rgba(13,45,68,0.07)',
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8 }}>{label}</p>
                  <p style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--brand-dark)', lineHeight: 1, marginBottom: 4 }}>{value}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 3 — Featured Snapshot Card */}
          {featuredSnapshot && (
            <div style={{
              background: 'var(--brand-dark)',
              borderRadius: 14,
              padding: '24px 28px',
              marginBottom: 28,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 24,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              {/* Left */}
              <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8 }}>
                  Latest Impact Snapshot
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
                  {featuredSnapshot.headline ||
                    `NewDawn Impact Report — ${new Date(featuredSnapshot.snapshotDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}
                </p>
                {featuredSnapshot.summaryText && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', maxWidth: 400, margin: 0, lineHeight: 1.6 }}>
                    {featuredSnapshot.summaryText}
                  </p>
                )}
              </div>

              {/* Right — metric boxes */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Health Score', value: fmt(featuredHealth, 'score') },
                  { label: 'Edu Progress', value: fmt(featuredEdu, 'percent') },
                  { label: 'Residents',    value: fmt(featuredResidents, 'count') },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.07)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    textAlign: 'center',
                    minWidth: 80,
                  }}>
                    <p style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-accent)', lineHeight: 1, marginBottom: 4 }}>{value}</p>
                    <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4 — Charts */}
          {(healthChartData.length > 0 || eduChartData.length > 0) && (
            <div className="row g-3 mb-4">
              {/* Chart 1 — Health Score */}
              <div className="col-12 col-md-6">
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(13,45,68,0.07)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 12 }}>
                    Health Score Over Time
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={healthChartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v) => {
                          const value = typeof v === 'number' ? v : Number(v ?? 0);
                          return [value.toFixed(2), 'Health Score'];
                        }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {healthChartData.map((_, i) => (
                          <Cell key={i} fill={accentRecent(healthChartData, i) ?? '#1a5276'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2 — Education Progress */}
              <div className="col-12 col-md-6">
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(13,45,68,0.07)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 12 }}>
                    Education Progress Over Time
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={eduChartData} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(v) => {
                          const value = typeof v === 'number' ? v : Number(v ?? 0);
                          return [`${value.toFixed(1)}%`, 'Avg Education Progress'];
                        }}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {eduChartData.map((_, i) => (
                          <Cell key={i} fill={accentRecent(eduChartData, i) ?? '#0f6e56'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5 — Monthly Reports Timeline */}
          <div ref={timelineRef} style={{ scrollMarginTop: '1rem' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 8 }}>
            Monthly Reports
          </p>

          {filteredSnapshots.length === 0 ? (
            <div className="alert alert-info">No impact reports found for this period.</div>
          ) : (
            <>
            <p className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredSnapshots.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredSnapshots.length)} of {filteredSnapshots.length} reports
            </p>
            <div className="timeline-wrapper">
              {pagedSnapshots.map((s) => {
                const p = parseMetricPayload(s.metricPayloadJson);
                const health    = readNumericMetric(p, HEALTH_ALIASES);
                const edu       = readNumericMetric(p, EDU_ALIASES);
                const residents = readNumericMetric(p, RESIDENT_ALIASES);
                const dateLabel = new Date(s.snapshotDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                return (
                  <div key={s.snapshotId} className="timeline-item">
                    <div className="timeline-dot" />
                    <div style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '16px 20px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      boxShadow: '0 1px 6px rgba(13,45,68,0.06)',
                    }}>
                      {/* Left */}
                      <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--brand-accent)', marginBottom: 4 }}>
                          {dateLabel}
                        </p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand-dark)', marginBottom: 4, lineHeight: 1.3 }}>
                          {s.headline || `NewDawn Impact Report — ${dateLabel}`}
                        </p>
                        {s.summaryText && (
                          <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5, maxWidth: 500, margin: 0 }}>
                            {s.summaryText}
                          </p>
                        )}
                      </div>

                      {/* Right — stats */}
                      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                        {[
                          { label: 'Health',    value: fmt(health, 'score') },
                          { label: 'Education', value: fmt(edu, 'percent') },
                          { label: 'Residents', value: fmt(residents, 'count') },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-dark)', lineHeight: 1, marginBottom: 2 }}>{value}</p>
                            <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '1px', color: '#9ca3af', margin: 0 }}>{label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3">
              <Pagination
                page={currentPage}
                totalCount={filteredSnapshots.length}
                pageSize={ITEMS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            </div>
            </>
          )}
          </div>

        </div>
      </div>
    </div>
  );
}
