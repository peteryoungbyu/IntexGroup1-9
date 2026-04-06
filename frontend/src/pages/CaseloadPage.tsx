import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ResidentListItem, PagedResult } from '../types/ResidentDetail';
import { getResidents, deleteResident } from '../lib/residentAPI';
import Pagination from '../components/Pagination';

const RISK_COLORS: Record<string, string> = { Low: 'success', Medium: 'warning', High: 'danger', Critical: 'dark' };

export default function CaseloadPage() {
  const [result, setResult] = useState<PagedResult<ResidentListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getResidents(page, 20, search || undefined, status || undefined)
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load(); };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this resident record? This cannot be undone.')) return;
    await deleteResident(id);
    load();
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1>Caseload Inventory</h1>
      </div>

      <form className="row g-2 mb-3" onSubmit={handleSearch}>
        <div className="col-sm-4">
          <input className="form-control" placeholder="Search case number or code…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="col-sm-3">
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Closed">Closed</option>
            <option value="Transferred">Transferred</option>
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
                    <th>Case No.</th>
                    <th>Internal Code</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Safehouse</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {result?.items.map(r => (
                    <tr key={r.residentId}>
                      <td><Link to={`/admin/residents/${r.residentId}`}>{r.caseControlNo}</Link></td>
                      <td>{r.internalCode}</td>
                      <td>{r.caseCategory}</td>
                      <td><span className={`badge bg-${r.caseStatus === 'Active' ? 'success' : 'secondary'}`}>{r.caseStatus}</span></td>
                      <td>
                        {r.currentRiskLevel && (
                          <span className={`badge bg-${RISK_COLORS[r.currentRiskLevel] ?? 'secondary'}`}>{r.currentRiskLevel}</span>
                        )}
                      </td>
                      <td>{r.safehouseId}</td>
                      <td>
                        <Link to={`/admin/residents/${r.residentId}`} className="btn btn-sm btn-outline-primary me-1">View</Link>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(r.residentId)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {result?.items.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No residents found.</td></tr>
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
