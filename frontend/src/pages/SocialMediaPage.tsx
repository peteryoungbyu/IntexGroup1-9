import { useEffect, useState } from 'react';
import Pagination from '../components/Pagination';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, ...init });
}

export default function SocialMediaPage() {
  const [result, setResult] = useState<{ items: any[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (platform) params.set('platform', platform);
    apiFetch(`/api/social-media?${params}`)
      .then(r => r.json())
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, platform]);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this social media post? This cannot be undone.')) return;
    await apiFetch(`/api/social-media/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Social Media Management</h1>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-sm-3">
          <select className="form-select" value={platform} onChange={e => setPlatform(e.target.value)}>
            <option value="">All Platforms</option>
            {['Facebook', 'Instagram', 'Twitter', 'TikTok', 'LinkedIn', 'YouTube', 'WhatsApp'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr><th>Date</th><th>Platform</th><th>Type</th><th>Caption</th><th>Reach</th><th>Engagement</th><th>Donations</th><th></th></tr>
                </thead>
                <tbody>
                  {result?.items.map((p: any) => (
                    <tr key={p.postId}>
                      <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td>{p.platform}</td>
                      <td><span className="badge bg-secondary">{p.postType}</span></td>
                      <td className="text-truncate" style={{ maxWidth: 200 }}>{p.caption}</td>
                      <td>{p.reach?.toLocaleString()}</td>
                      <td>{(p.engagementRate * 100).toFixed(1)}%</td>
                      <td>{p.donationReferrals}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(p.postId)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {result?.items.length === 0 && (
                    <tr><td colSpan={8} className="text-center text-muted py-4">No posts found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3">
            <Pagination page={page} totalCount={result?.total ?? 0} pageSize={20} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
