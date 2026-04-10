import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  Resident,
  ResidentListItem,
  ResidentSafehouseOption,
  PagedResult,
} from '../types/ResidentDetail';
import {
  getResidents,
  deleteResident,
  getResidentSafehouseOptions,
} from '../lib/residentAPI';
import { RESIDENT_CASE_CATEGORIES } from '../lib/residentOptions';
import Pagination from '../components/Pagination';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import ResidentCreateModal from '../components/ResidentCreateModal';

const RISK_COLORS: Record<string, string> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
  Critical: 'dark',
};

interface PendingDelete {
  id: number;
  label: string;
}

interface ResidentFilters {
  search: string;
  status: string;
  safehouseId: string;
  caseCategory: string;
}

const EMPTY_FILTERS: ResidentFilters = {
  search: '',
  status: '',
  safehouseId: '',
  caseCategory: '',
};

export default function CaseloadPage() {
  const [result, setResult] = useState<PagedResult<ResidentListItem> | null>(
    null
  );
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ResidentFilters>({ ...EMPTY_FILTERS });
  const [draftFilters, setDraftFilters] = useState<ResidentFilters>({
    ...EMPTY_FILTERS,
  });
  const [safehouseOptions, setSafehouseOptions] = useState<
    ResidentSafehouseOption[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const [showAdd, setShowAdd] = useState(false);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const load = (nextPage = page, nextFilters = filters) => {
    setLoading(true);
    const safehouseId = nextFilters.safehouseId
      ? Number(nextFilters.safehouseId)
      : undefined;

    getResidents(
      nextPage,
      20,
      nextFilters.search || undefined,
      nextFilters.status || undefined,
      safehouseId,
      nextFilters.caseCategory || undefined
    )
      .then(setResult)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [page, filters]);

  useEffect(() => {
    getResidentSafehouseOptions()
      .then(setSafehouseOptions)
      .catch(() => setSafehouseOptions([]));
  }, []);

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setPage(1);
    setFilters((current) => ({
      ...current,
      search: draftFilters.search,
    }));
  };

  const handleResetFilters = () => {
    setDraftFilters({ ...EMPTY_FILTERS });
    setFilters({ ...EMPTY_FILTERS });
    setPage(1);
  };

  const handleFilterChange = <
    K extends Exclude<keyof ResidentFilters, 'search'>,
  >(
    field: K,
    value: ResidentFilters[K]
  ) => {
    setPage(1);
    setDraftFilters((current) => ({
      ...current,
      [field]: value,
    }));
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  };

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

  const openAdd = () => {
    setAddSuccess(null);
    setShowAdd(true);
  };

  const closeAdd = () => {
    setShowAdd(false);
  };

  const handleResidentCreated = (resident: Resident) => {
    setShowAdd(false);
    setAddSuccess(`Resident record ${resident.caseControlNo} created successfully.`);
    load();
  };



  return (
    <div>
      <DeleteConfirmModal
        open={pending !== null}
        title="Delete Resident Record"
        message={
          <>
            Are you sure you want to delete case{' '}
            <strong>{pending?.label}</strong>? This action cannot be undone.
          </>
        }
        confirmLabel="Delete Record"
        busy={busy}
        error={deleteError}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      <ResidentCreateModal
        open={showAdd}
        onClose={closeAdd}
        onCreated={handleResidentCreated}
      />


      {addSuccess && (
        <div
          className="alert alert-success alert-dismissible mx-4 mt-3 mb-0"
          role="alert"
        >
          {addSuccess}
          <button
            type="button"
            className="btn-close"
            onClick={() => setAddSuccess(null)}
          />
        </div>
      )}

      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Caseload Inventory</h1>
          <p>Manage and view all resident case records</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
          <form className="row g-2 mb-0 flex-grow-1" onSubmit={handleSearch}>
            <div className="col-lg-3 col-md-6">
              <input
                className="form-control"
                placeholder="Search case number or code…"
                value={draftFilters.search}
                onChange={(e) =>
                  setDraftFilters((current) => ({
                    ...current,
                    search: e.target.value,
                  }))
                }
              />
            </div>
            <div className="col-lg-2 col-md-6">
              <select
                className="form-select"
                value={draftFilters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
                <option value="Transferred">Transferred</option>
              </select>
            </div>
            <div className="col-lg-3 col-md-6">
              <select
                className="form-select"
                value={draftFilters.safehouseId}
                onChange={(e) =>
                  handleFilterChange('safehouseId', e.target.value)
                }
              >
                <option value="">All Safehouses</option>
                {safehouseOptions.map((safehouse) => (
                  <option
                    key={safehouse.safehouseId}
                    value={String(safehouse.safehouseId)}
                  >
                    {safehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-6">
              <select
                className="form-select"
                value={draftFilters.caseCategory}
                onChange={(e) =>
                  handleFilterChange('caseCategory', e.target.value)
                }
              >
                <option value="">All Categories</option>
                {RESIDENT_CASE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-12 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleResetFilters}
              >
                Reset
              </button>
            </div>
          </form>
          <button className="btn btn-primary" onClick={openAdd}>
            + Add Resident
          </button>
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
                    {result?.items.map((r) => (
                      <tr key={r.residentId}>
                        <td>
                          <Link
                            to={`/admin/residents/${r.residentId}`}
                            style={{
                              color: 'var(--brand-primary)',
                              fontWeight: 500,
                            }}
                          >
                            {r.caseControlNo}
                          </Link>
                        </td>
                        <td>{r.internalCode}</td>
                        <td>{r.caseCategory}</td>
                        <td>
                          <span
                            className={`badge bg-${r.caseStatus === 'Active' ? 'success' : 'secondary'}`}
                          >
                            {r.caseStatus}
                          </span>
                        </td>
                        <td>
                          {r.currentRiskLevel && (
                            <span
                              className={`badge bg-${RISK_COLORS[r.currentRiskLevel] ?? 'secondary'}`}
                            >
                              {r.currentRiskLevel}
                            </span>
                          )}
                        </td>
                        <td>{`Safehouse ${r.safehouseId}`}</td>
                        <td>
                          <div className="d-flex flex-column flex-md-row gap-1">
                            <Link
                              to={`/admin/residents/${r.residentId}`}
                              className="btn btn-sm btn-primary"
                            >
                              View
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() =>
                                handleDeleteClick(r.residentId, r.caseControlNo)
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
                        <td colSpan={7} className="text-center text-muted py-4">
                          No residents found.
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

