import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { SupporterListItem, PagedResult } from '../types/SupporterDetail';
import { getSupporters, deleteSupporter } from '../lib/supporterAPI';
import Pagination from '../components/Pagination';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

interface PendingDelete {
  id: number;
  name: string;
}

export default function DonorsPage() {
  const [result, setResult] = useState<PagedResult<SupporterListItem> | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const load = () => {
    setLoading(true);
    getSupporters(page, 20, search || undefined, status || undefined)
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

  const handleDeleteClick = (id: number, name: string) => {
    setDeleteError(undefined);
    setPending({ id, name });
  };

  const handleConfirm = async () => {
    if (!pending) return;
    setBusy(true);
    setDeleteError(undefined);
    try {
      await deleteSupporter(pending.id);
      setPending(null);
      load();
    } catch {
      setDeleteError('Failed to delete donor. Please try again.');
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
        title="Delete Donor"
        message={
          <>
            Are you sure you want to delete <strong>{pending?.name}</strong>?
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete Donor"
        busy={busy}
        error={deleteError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Donors & Contributions</h1>
          <p>View and manage donor profiles and contributions</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <form className="row g-2 mb-4" onSubmit={handleSearch}>
          <div className="col-sm-4">
            <input
              className="form-control"
              placeholder="Search name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-sm-3">
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
          <div className="col-auto">
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
                      <th>Status</th>
                      <th>Total Donated (PHP)</th>
                      <th>First Donation</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.items.map((s) => (
                      <tr key={s.supporterId}>
                        <td>
                          <Link
                            to={`/admin/donors/${s.supporterId}`}
                            style={{
                              color: 'var(--brand-primary)',
                              fontWeight: 500,
                            }}
                          >
                            {s.displayName}
                          </Link>
                        </td>
                        <td>{s.supporterType}</td>
                        <td>
                          <span
                            className={`badge bg-${s.status === 'Active' ? 'success' : 'secondary'}`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td>{s.totalDonated.toLocaleString()}</td>
                        <td>{s.firstDonationDate ?? '—'}</td>
                        <td>
                          <Link
                            to={`/admin/donors/${s.supporterId}`}
                            className="btn btn-sm btn-primary me-1"
                          >
                            View
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() =>
                              handleDeleteClick(s.supporterId, s.displayName)
                            }
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {result?.items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          No donors found.
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
                totalCount={result?.totalCount ?? 0}
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
