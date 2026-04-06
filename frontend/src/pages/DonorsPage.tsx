import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SupporterListItem, PagedResult } from '../types/SupporterDetail';
import { getSupporters, deleteSupporter } from '../lib/supporterAPI';
import Pagination from '../components/Pagination';

export default function DonorsPage() {
  const [result, setResult] = useState<PagedResult<SupporterListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getSupporters(page, 20, search || undefined, status || undefined)
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(); };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete supporter "${name}"? This cannot be undone.`)) return;
    await deleteSupporter(id);
    load();
  };

  return (
    <div className="container-fluid py-4">
      <h1 className="mb-3">Donors & Contributions</h1>

      <form className="row g-2 mb-3" onSubmit={handleSearch}>
        <div className="col-sm-4">
          <input className="form-control" placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="col-sm-3">
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary">Search</button>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border" /></div>
      ) : (
        <>
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Total Donated (PHP)</th>
                    <th>First Donation</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {result?.items.map(s => (
                    <tr key={s.supporterId}>
                      <td><Link to={`/admin/donors/${s.supporterId}`}>{s.displayName}</Link></td>
                      <td>{s.supporterType}</td>
                      <td><span className={`badge bg-${s.status === 'Active' ? 'success' : 'secondary'}`}>{s.status}</span></td>
                      <td>{s.totalDonated.toLocaleString()}</td>
                      <td>{s.firstDonationDate ?? '—'}</td>
                      <td>
                        <Link to={`/admin/donors/${s.supporterId}`} className="btn btn-sm btn-outline-primary me-1">View</Link>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(s.supporterId, s.displayName)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {result?.items.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted py-4">No donors found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-3">
            <Pagination page={page} totalCount={result?.totalCount ?? 0} pageSize={20} onPageChange={setPage} />
          </div>
        </>
      )}
    </div>
  );
}
