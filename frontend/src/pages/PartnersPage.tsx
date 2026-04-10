import { useEffect, useState } from 'react';
import Pagination from '../components/Pagination';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
}

export default function PartnersPage() {
  const [result, setResult] = useState<{ items: any[]; total: number } | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    apiFetch(`/api/partners?${params}`)
      .then((r) => r.json())
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, status]);

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this partner? This will also remove all their safehouse assignments. This action cannot be undone.'
    );
    if (!confirmed) return;
    try {
      const res = await apiFetch(`/api/partners/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setResult((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((p) => p.partnerId !== id),
              total: prev.total - 1,
            }
          : prev
      );
    } catch {
      alert('Failed to delete partner. Please try again.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Partners Management</h1>
          <p>View and manage partner organizations and their assignments</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <form className="row g-2 mb-4" onSubmit={handleSearch}>
          <div className="col-lg-4 col-md-6 col-12">
            <input
              className="form-control"
              placeholder="Search partner name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-lg-3 col-md-6 col-12">
            <select
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="col-lg-auto col-12">
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </div>
        </form>

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
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Role</th>
                      <th>Region</th>
                      <th>Status</th>
                      <th>Contact</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.items.map((p: any) => (
                      <tr key={p.partnerId}>
                        <td
                          style={{
                            fontWeight: 500,
                            color: 'var(--brand-dark)',
                          }}
                        >
                          {p.partnerName}
                        </td>
                        <td>{p.partnerType}</td>
                        <td>{p.roleType}</td>
                        <td>{p.region ?? '—'}</td>
                        <td>
                          <span
                            className={`badge bg-${p.status === 'Active' ? 'success' : 'secondary'}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td>{p.email ?? p.contactName ?? '—'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(p.partnerId)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {result?.items.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center text-muted py-4">
                          No partners found.
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
