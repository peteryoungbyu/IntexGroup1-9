import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ResidentListItem, PagedResult } from '../types/ResidentDetail';
import { getResidents, deleteResident } from '../lib/residentAPI';
import Pagination from '../components/Pagination';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const RISK_COLORS: Record<string, string> = { Low: 'success', Medium: 'warning', High: 'danger', Critical: 'dark' };

interface PendingDelete { id: number; label: string; }

export default function CaseloadPage() {
  const [result, setResult] = useState<PagedResult<ResidentListItem> | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    getResidents(page, 20, search || undefined, status || undefined)
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);

  const handleSearch = (e: { preventDefault(): void }) => { e.preventDefault(); setPage(1); load(); };

  const handleDeleteClick = (id: number, label: string) => {
    setDeleteError(undefined);
    setPending({ id, label });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setBusy(true);
    setDeleteError(undefined);
    try {
      await deleteResident(pending.id);
      setPending(null);
      load();
    } catch {
      setDeleteError('Failed to delete resident record. Please try again.');
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
        title="Delete Resident Record"
        message={<>Are you sure you want to delete case <strong>{pending?.label}</strong>? This action cannot be undone.</>}
        confirmLabel="Delete Record"
        busy={busy}
        error={deleteError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Caseload Inventory</h1>
          <p>Manage and view all resident case records</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <form className="row g-2 mb-4" onSubmit={handleSearch}>
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
          <div className="text-center py-5"><div className="spinner-border" style={{ color: 'var(--brand-primary)' }} /></div>
        ) : (
          <>
            <div className="card">
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
                        <td><Link to={`/admin/residents/${r.residentId}`} style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>{r.caseControlNo}</Link></td>
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
                          <Link to={`/admin/residents/${r.residentId}`} className="btn btn-sm btn-primary me-1">View</Link>
                          <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteClick(r.residentId, r.caseControlNo)}>Delete</button>
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
    </div>
  );
}
