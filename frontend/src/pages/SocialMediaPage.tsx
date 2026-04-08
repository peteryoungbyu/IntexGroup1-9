import { useEffect, useState } from 'react';
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

export default function SocialMediaPage() {
  const [result, setResult] = useState<{ items: any[]; total: number } | null>(
    null
  );
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
        <div className="row g-2 mb-4">
          <div className="col-sm-3">
            <select
              className="form-select"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
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
            <div className="card">
              <div className="table-responsive social-table-wrap">
                <table className="table table-hover mb-0">
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
                    {result?.items.map((p: any) => (
                      <tr key={p.postId}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td>{p.platform}</td>
                        <td>
                          <span className="badge bg-primary">{p.postType}</span>
                        </td>
                        <td className="text-truncate" style={{ maxWidth: 200 }}>
                          {p.caption}
                        </td>
                        <td>{p.reach?.toLocaleString()}</td>
                        <td>{(p.engagementRate * 100).toFixed(1)}%</td>
                        <td>{p.donationReferrals}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleDeleteClick(p.postId, p.caption)
                            }
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
