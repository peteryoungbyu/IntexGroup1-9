import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  Supporter,
  SupporterListItem,
  PagedResult,
} from '../types/SupporterDetail';
import {
  getSupporters,
  deleteSupporter,
  createSupporter,
} from '../lib/supporterAPI';
import Pagination from '../components/Pagination';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const EMPTY_SUPPORTER: Omit<Supporter, 'supporterId' | 'createdAt'> = {
  displayName: '',
  supporterType: 'Monetary Donor',
  organizationName: null,
  firstName: null,
  lastName: null,
  email: null,
  phone: null,
  status: 'Active',
  region: null,
  country: null,
  firstDonationDate: null,
  acquisitionChannel: null,
};

interface PendingDelete {
  id: number;
  name: string;
}

export default function DonorsPage() {
  const navigate = useNavigate();
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

  const [showAdd, setShowAdd] = useState(false);
  const [showChurnCard, setShowChurnCard] = useState(false);
  const [addForm, setAddForm] = useState<
    Omit<Supporter, 'supporterId' | 'createdAt'>
  >({ ...EMPTY_SUPPORTER });
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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

  const openAdd = () => {
    setAddForm({ ...EMPTY_SUPPORTER });
    setAddError(null);
    setShowAdd(true);
  };
  const closeAdd = () => {
    if (addBusy) return;
    setShowAdd(false);
    setAddError(null);
  };
  const set = (field: keyof typeof addForm, value: unknown) =>
    setAddForm((f) => ({ ...f, [field]: value }));

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBusy(true);
    setAddError(null);
    try {
      const created = await createSupporter(addForm);
      setShowAdd(false);
      navigate(`/admin/donors/${created.supporterId}`);
    } catch {
      setAddError('Failed to create donor. Please try again.');
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div>
      {showAdd && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeAdd}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAddSubmit}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Donor</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeAdd}
                    disabled={addBusy}
                  />
                </div>
                <div className="modal-body">
                  {addError && (
                    <div className="alert alert-danger">{addError}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Display Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={addForm.displayName}
                        onChange={(e) => set('displayName', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Supporter Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={addForm.supporterType}
                        onChange={(e) => set('supporterType', e.target.value)}
                      >
                        <option>Monetary Donor</option>
                        <option>Volunteer</option>
                        <option>Skills Contributor</option>
                        <option>In-Kind Donor</option>
                        <option>Social Media Advocate</option>
                        <option>Corporate Partner</option>
                        <option>Foundation</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.firstName ?? ''}
                        onChange={(e) =>
                          set('firstName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.lastName ?? ''}
                        onChange={(e) =>
                          set('lastName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Organization Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.organizationName ?? ''}
                        onChange={(e) =>
                          set('organizationName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={addForm.email ?? ''}
                        onChange={(e) => set('email', e.target.value || null)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.phone ?? ''}
                        onChange={(e) => set('phone', e.target.value || null)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={addForm.status}
                        onChange={(e) => set('status', e.target.value)}
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Region</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.region ?? ''}
                        onChange={(e) => set('region', e.target.value || null)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.country ?? ''}
                        onChange={(e) => set('country', e.target.value || null)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Acquisition Channel</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.acquisitionChannel ?? ''}
                        onChange={(e) =>
                          set('acquisitionChannel', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">First Donation Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={addForm.firstDonationDate ?? ''}
                        onChange={(e) =>
                          set('firstDonationDate', e.target.value || null)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAdd}
                    disabled={addBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={addBusy}
                  >
                    {addBusy ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving…
                      </>
                    ) : (
                      'Add Donor'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
          <form className="row g-2 mb-0 flex-grow-1" onSubmit={handleSearch}>
            <div className="col-lg-4 col-md-6 col-12">
              <input
                className="form-control"
                placeholder="Search name or email…"
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
          <div className="d-flex flex-column flex-md-row gap-2 w-100 w-md-auto">
            <button
              className={`btn ${showChurnCard ? 'btn-outline-primary' : 'btn-primary'}`}
              onClick={() => setShowChurnCard((s) => !s)}
            >
              {showChurnCard
                ? 'Hide Predicted Donor Churn'
                : 'Predict Donor Churn'}
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              + Add Donor
            </button>
          </div>
        </div>

        {showChurnCard && (
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <span>Predicted Donor Churn</span>
              <span className="badge bg-secondary">Preview</span>
            </div>
            <div className="card-body p-0">
              <p className="text-muted small px-3 pt-3 mb-2">
                Placeholder list until pipeline 01 integration is connected.
              </p>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result?.items ?? []).map((s) => (
                      <tr key={`churn-${s.supporterId}`}>
                        <td>{s.displayName}</td>
                        <td>
                          <Link
                            to={`/admin/donors/${s.supporterId}`}
                            className="btn btn-sm btn-primary"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                    {(result?.items ?? []).length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center text-muted py-4">
                          No donors loaded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
                          <div className="d-flex flex-column flex-md-row gap-1">
                            <Link
                              to={`/admin/donors/${s.supporterId}`}
                              className="btn btn-sm btn-primary"
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
                          </div>
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
