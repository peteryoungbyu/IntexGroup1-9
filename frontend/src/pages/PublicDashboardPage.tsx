import { useEffect, useState } from 'react';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { getPublicImpact } from '../lib/reportAPI';

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

function formatMetric(
  value: number | null,
  type: 'score' | 'percent' | 'count' | 'currency'
): string {
  if (value === null) return 'N/A';

  switch (type) {
    case 'score':
      return value.toFixed(1);
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'count':
      return Math.round(value).toLocaleString();
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(value);
  }
}

function toYearMonth(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const compact = value.trim();
  const match = compact.match(/^(\d{4})-(\d{1,2})/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      month >= 1 &&
      month <= 12
    ) {
      return year * 100 + month;
    }
  }

  const date = new Date(compact);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCFullYear() * 100 + (date.getUTCMonth() + 1);
}

export default function PublicDashboardPage() {
  const [snapshots, setSnapshots] = useState<ImpactSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;
  const startYearMonth = 202301;
  const endYearMonth = 202602;

  useEffect(() => {
    getPublicImpact(120)
      .then(setSnapshots)
      .finally(() => setLoading(false));
  }, []);

  const filteredSnapshots = snapshots.filter((s) => {
    const payload = parseMetricPayload(s.metricPayloadJson);
    const payloadYearMonth = toYearMonth(payload.month);
    const fallbackYearMonth = toYearMonth(s.snapshotDate);
    const effectiveYearMonth = payloadYearMonth ?? fallbackYearMonth;

    if (effectiveYearMonth === null) return false;
    return (
      effectiveYearMonth >= startYearMonth && effectiveYearMonth <= endYearMonth
    );
  });

  const sortedSnapshots = [...filteredSnapshots].sort((a, b) => {
    const payloadA = parseMetricPayload(a.metricPayloadJson);
    const payloadB = parseMetricPayload(b.metricPayloadJson);
    const monthA =
      toYearMonth(payloadA.month) ?? toYearMonth(a.snapshotDate) ?? 0;
    const monthB =
      toYearMonth(payloadB.month) ?? toYearMonth(b.snapshotDate) ?? 0;
    return monthB - monthA;
  });

  const totalPages = Math.max(1, Math.ceil(sortedSnapshots.length / pageSize));
  const currentPageSafe = Math.min(currentPage, totalPages);
  const pageStart = (currentPageSafe - 1) * pageSize;
  const pagedSnapshots = sortedSnapshots.slice(pageStart, pageStart + pageSize);

  if (loading)
    return (
      <div className="container py-5 text-center">
        <div
          className="spinner-border"
          style={{ color: 'var(--brand-primary)' }}
        />
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <p className="section-label">New Dawn Foundation</p>
          <h1>Impact Dashboard</h1>
          <p>
            Our progress in caring for, healing, and teaching girls across the
            Philippines
          </p>
        </div>
      </div>

      <section className="py-5" style={{ background: 'var(--brand-light)' }}>
        <div className="container">
          {filteredSnapshots.length === 0 ? (
            <div className="alert alert-info">
              No impact reports found between January 2023 and February 2026.
            </div>
          ) : (
            <>
              <div className="row g-4">
                {pagedSnapshots.map((s) => {
                  const payload = parseMetricPayload(s.metricPayloadJson);
                  const avgHealthScore = readNumericMetric(payload, [
                    'avgHealthScore',
                    'avg_health_score',
                    'averageHealthScore',
                    'average_health_score',
                    'healthScoreAvg',
                  ]);
                  const avgEducationProgress = readNumericMetric(payload, [
                    'avgEducationProgress',
                    'avg_education_progress',
                    'averageEducationProgress',
                    'average_education_progress',
                  ]);
                  const totalResidents = readNumericMetric(payload, [
                    'totalResidents',
                    'total_residents',
                    'activeResidents',
                    'active_residents',
                    'residentCount',
                  ]);

                  return (
                    <div key={s.snapshotId} className="col-md-6 col-lg-4">
                      <div className="card impact-card h-100">
                        <div className="card-body p-4">
                          <span
                            className="badge mb-3 px-3 py-2"
                            style={{
                              background: 'var(--brand-primary)',
                              fontSize: '0.75rem',
                            }}
                          >
                            {new Date(s.snapshotDate).toLocaleDateString(
                              'en-US',
                              { month: 'long', year: 'numeric' }
                            )}
                          </span>
                          <h5
                            className="fw-bold"
                            style={{ color: 'var(--brand-dark)' }}
                          >
                            {/* {s.headline} */}
                            NewDawn Impact Report{' '}
                            {new Date(s.snapshotDate).toLocaleDateString(
                              'en-US',
                              { month: 'long', year: 'numeric' }
                            )}
                          </h5>
                          <ul className="list-unstyled small mt-3 mb-0">
                            <li
                              className="py-1"
                              style={{
                                borderTop: '1px solid rgba(0,0,0,0.06)',
                              }}
                            >
                              <strong>Average health score:</strong>{' '}
                              {formatMetric(avgHealthScore, 'score')}
                            </li>
                            <li
                              className="py-1"
                              style={{
                                borderTop: '1px solid rgba(0,0,0,0.06)',
                              }}
                            >
                              <strong>Average education progress:</strong>{' '}
                              {formatMetric(avgEducationProgress, 'percent')}
                            </li>
                            <li
                              className="py-1"
                              style={{
                                borderTop: '1px solid rgba(0,0,0,0.06)',
                              }}
                            >
                              <strong>Total residents:</strong>{' '}
                              {formatMetric(totalResidents, 'count')}
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label="Impact pagination"
                  className="mt-4 d-flex justify-content-center"
                >
                  <ul className="pagination mb-0">
                    <li
                      className={`page-item ${currentPageSafe === 1 ? 'disabled' : ''}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPageSafe - 1)}
                        disabled={currentPageSafe === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <li
                          key={page}
                          className={`page-item ${page === currentPageSafe ? 'active' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </button>
                        </li>
                      )
                    )}
                    <li
                      className={`page-item ${currentPageSafe === totalPages ? 'disabled' : ''}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => setCurrentPage(currentPageSafe + 1)}
                        disabled={currentPageSafe === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
