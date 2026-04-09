import { useEffect, useMemo, useState } from 'react';
import Pagination from '../components/Pagination';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
}

interface PendingDelete {
  id: number;
  caption: string;
}

interface SocialPost {
  postId: number;
  createdAt: string;
  platform: string;
  postType: string;
  caption: string;
  reach: number;
  engagementRate: number;
  donationReferrals: number;
}

function getPlatformStyle(platform: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    Facebook: { background: '#1877F2', color: '#fff' },
    Instagram: { background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', color: '#fff' },
    Twitter: { background: '#1DA1F2', color: '#fff' },
    TikTok: { background: '#111111', color: '#fff' },
    LinkedIn: { background: '#0A66C2', color: '#fff' },
    YouTube: { background: '#FF0000', color: '#fff' },
    WhatsApp: { background: '#25D366', color: '#fff' },
  };

  return map[platform] ?? { background: '#6c757d', color: '#fff' };
}

function getPlatformChartColor(platform: string): string {
  const map: Record<string, string> = {
    Facebook: '#1877F2',
    Instagram: '#C13584',
    Twitter: '#1DA1F2',
    TikTok: '#111111',
    LinkedIn: '#0A66C2',
    YouTube: '#FF0000',
    WhatsApp: '#25D366',
  };

  return map[platform] ?? '#6c757d';
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(108, 117, 125, ${alpha})`;

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatCompactNumber(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

export default function SocialMediaPage() {
  const [result, setResult] = useState<{ items: SocialPost[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (platform) params.set('platform', platform);

    apiFetch(`/api/social-media?${params}`)
      .then((r) => r.json())
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, platform]);

  const handleDeleteClick = (id: number, caption: string) => {
    setDeleteError(undefined);
    setPending({ id, caption });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setBusy(true);
    setDeleteError(undefined);
    try {
      await apiFetch(`/api/social-media/${pending.id}`, { method: 'DELETE' });
      setPending(null);
      load();
    } catch {
      setDeleteError('Failed to delete post. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    if (busy) return;
    setPending(null);
    setDeleteError(undefined);
  };

  const stats = useMemo(() => {
    const items = result?.items ?? [];
    const totalPosts = items.length;
    const totalReach = items.reduce((sum, p) => sum + (p.reach ?? 0), 0);
    const totalDonations = items.reduce((sum, p) => sum + (p.donationReferrals ?? 0), 0);
    const avgEngagement =
      totalPosts > 0
        ? items.reduce((sum, p) => sum + (p.engagementRate ?? 0), 0) / totalPosts
        : 0;

    return {
      totalPosts,
      totalReach,
      totalDonations,
      avgEngagement,
    };
  }, [result]);

  const platformEngagement = useMemo(() => {
    const items = result?.items ?? [];

    const grouped = items.reduce((acc, post) => {
      const key = post.platform ?? 'Unknown';

      if (!acc[key]) {
        acc[key] = {
          platform: key,
          totalEngagementRate: 0,
          count: 0,
        };
      }

      acc[key].totalEngagementRate += Number(post.engagementRate ?? 0);
      acc[key].count += 1;

      return acc;
    }, {} as Record<string, { platform: string; totalEngagementRate: number; count: number }>);

    return Object.values(grouped)
      .map((g) => ({
        platform: g.platform,
        avgEngagementRate: g.count ? g.totalEngagementRate / g.count : 0,
      }))
      .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);
  }, [result]);

  return (
    <div>
      <DeleteConfirmModal
        open={pending !== null}
        title="Delete Post"
        message={
          <>
            Are you sure you want to delete the post{' '}
            <strong>"{pending?.caption}"</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Post"
        busy={busy}
        error={deleteError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Social Media Management</h1>
          <p>Track and manage social media performance across platforms</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p
                  className="text-uppercase fw-bold mb-2"
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '1px',
                    color: 'var(--brand-accent)',
                  }}
                >
                  Total Posts
                </p>
                <h3 className="mb-1">{loading ? '—' : result?.total ?? 0}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  Posts
                </p>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p
                  className="text-uppercase fw-bold mb-2"
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '1px',
                    color: 'var(--brand-accent)',
                  }}
                >
                  Total Reach
                </p>
                <h3 className="mb-1">{loading ? '—' : formatCompactNumber(stats.totalReach)}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  Audience reached
                </p>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p
                  className="text-uppercase fw-bold mb-2"
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '1px',
                    color: 'var(--brand-accent)',
                  }}
                >
                  Avg Engagement
                </p>
                <h3 className="mb-2">
                  {loading ? '—' : `${(stats.avgEngagement * 100).toFixed(1)}%`}
                </h3>
                <div
                  className="progress"
                  style={{ height: '8px', background: '#ece8df' }}
                >
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{
                      width: `${Math.min(stats.avgEngagement * 100, 100)}%`,
                      background: 'var(--brand-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="col-6 col-lg-3">
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body">
                <p
                  className="text-uppercase fw-bold mb-2"
                  style={{
                    fontSize: '0.72rem',
                    letterSpacing: '1px',
                    color: 'var(--brand-accent)',
                  }}
                >
                  Donations Driven
                </p>
                <h3 className="mb-1">{loading ? '—' : stats.totalDonations}</h3>
                <p className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
                  Referral conversions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-2 mb-4">
          <div className="col-sm-3">
            <select
              className="form-select"
              value={platform}
              onChange={(e) => {
                setPage(1);
                setPlatform(e.target.value);
              }}
            >
              <option value="">All Platforms</option>
              {[
                'Facebook',
                'Instagram',
                'Twitter',
                'TikTok',
                'LinkedIn',
                'YouTube',
                'WhatsApp',
              ].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div
              className="spinner-border"
              style={{ color: 'var(--brand-primary)' }}
            />
          </div>
        ) : (
          <>
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h5 className="mb-1">Platform Engagement</h5>
                    <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                      Average engagement rate by platform from the current results
                    </p>
                  </div>

                  {platformEngagement.length > 0 && (
                    <span className="badge rounded-pill text-bg-light border">
                      Top Platform: {platformEngagement[0].platform}
                    </span>
                  )}
                </div>

                {platformEngagement.length === 0 ? (
                  <div className="text-muted">No engagement data available.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {platformEngagement.map((item) => {
                      const rawPercent = item.avgEngagementRate * 100;
                      const fillPercent = Math.min((rawPercent / 50) * 100, 100);
                      const color = getPlatformChartColor(item.platform);
                      const tinted = hexToRgba(color, 0.14);
                      const isTikTok = item.platform === 'TikTok';

                      return (
                        <div
                          key={item.platform}
                          style={{
                            width: '100%',
                            background: tinted,
                            borderRadius: '14px',
                            overflow: 'hidden',
                            position: 'relative',
                            minHeight: '56px',
                            border: `1px solid ${hexToRgba(color, 0.22)}`,
                          }}
                        >
                          {/* right-side percentage always visible */}
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              paddingRight: '1rem',
                              color: '#1f2937',
                              fontWeight: 600,
                              zIndex: 1,
                              pointerEvents: 'none',
                            }}
                          >
                            {rawPercent.toFixed(1)}%
                          </div>

                          {/* colored fill */}
                          <div
                            style={{
                              width: `${fillPercent}%`,
                              background: color,
                              minHeight: '56px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.9rem 1rem',
                              transition: 'width 0.35s ease',
                              position: 'relative',
                              zIndex: 2,
                            }}
                          >
                            <span
                              className="fw-semibold"
                              style={{
                                color: '#fff',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.platform}
                            </span>

                            {/* inside number only for wider bars */}
                            {fillPercent >= 24 && (
                              <span
                                className="fw-semibold"
                                style={{
                                  color: '#fff',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {rawPercent.toFixed(1)}%
                              </span>
                            )}
                          </div>

                          {/* small-bar label overlay */}
                          {fillPercent < 24 && (
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                paddingLeft: '1rem',
                                zIndex: 3,
                                pointerEvents: 'none',
                              }}
                            >
                              <span
                                style={{
                                  color: isTikTok ? '#fff' : '#1f2937',
                                  fontWeight: 600,
                                }}
                              >
                                {item.platform}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="card border-0 shadow-sm">
              <div className="table-responsive social-table-wrap">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Platform</th>
                      <th>Type</th>
                      <th>Caption</th>
                      <th>Reach</th>
                      <th>Engagement</th>
                      <th>Donations</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.items.map((p) => (
                      <tr key={p.postId}>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>

                        <td>
                          <span
                            className="badge rounded-pill px-3 py-2"
                            style={getPlatformStyle(p.platform)}
                          >
                            {p.platform}
                          </span>
                        </td>

                        <td>
                          <span className="badge bg-primary-subtle text-dark border">
                            {p.postType}
                          </span>
                        </td>

                        <td className="text-truncate" style={{ maxWidth: 240 }}>
                          {p.caption}
                        </td>

                        <td>
                          <div className="fw-semibold">
                            {p.reach?.toLocaleString()}
                          </div>
                          <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                            {formatCompactNumber(p.reach ?? 0)}
                          </div>
                        </td>

                        <td style={{ minWidth: 170 }}>
                          <div className="d-flex justify-content-between mb-1">
                            <span style={{ fontSize: '0.82rem' }}>Rate</span>
                            <span className="fw-semibold" style={{ fontSize: '0.82rem' }}>
                              {(p.engagementRate * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className="progress"
                            style={{ height: '8px', background: '#ece8df' }}
                          >
                            <div
                              className="progress-bar"
                              role="progressbar"
                              style={{
                                width: `${Math.min(p.engagementRate * 100, 100)}%`,
                                background: 'var(--brand-accent)',
                              }}
                            />
                          </div>
                        </td>

                        <td>
                          <span
                            className="badge rounded-pill"
                            style={{
                              background:
                                p.donationReferrals > 0
                                  ? 'var(--brand-primary)'
                                  : '#d1d5db',
                              color:
                                p.donationReferrals > 0 ? '#fff' : '#374151',
                              fontSize: '0.8rem',
                              padding: '0.45rem 0.7rem',
                            }}
                          >
                            {p.donationReferrals}
                          </span>
                        </td>

                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteClick(p.postId, p.caption)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}

                    {result?.items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center text-muted py-4">
                          No posts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3">
              <Pagination
                page={page}
                totalCount={result?.total ?? 0}
                pageSize={20}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}