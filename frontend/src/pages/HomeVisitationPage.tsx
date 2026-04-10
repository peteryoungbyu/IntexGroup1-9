import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import type { HomeVisitation, ResidentListItem } from '../types/ResidentDetail';
import {
  getResidents,
  getResidentVisitations,
  addVisitation,
  deleteVisitation,
  ApiError,
} from '../lib/residentAPI';

const PAGE_SIZE = 10;

// Schema Constants
const VISIT_TYPES = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
];
const COOPERATION_LEVELS = [
  'Highly Cooperative',
  'Cooperative',
  'Neutral',
  'Uncooperative',
];
const OUTCOMES = [
  'Favorable',
  'Needs Improvement',
  'Unfavorable',
  'Inconclusive',
];

interface FlatVisitation extends HomeVisitation {
  residentCode: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const d = dateOnlyMatch
    ? new Date(
        Number(dateOnlyMatch[1]),
        Number(dateOnlyMatch[2]) - 1,
        Number(dateOnlyMatch[3])
      )
    : new Date(dateStr);

  return isNaN(d.getTime())
    ? dateStr
    : d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
}

function outcomeBadgeClass(outcome: string | null): string {
  switch (outcome) {
    case 'Favorable':
      return 'bg-success';
    case 'Unfavorable':
      return 'bg-danger';
    case 'Needs Improvement':
      return 'bg-warning text-dark';
    default:
      return 'bg-secondary';
  }
}

function cooperationBadgeClass(level: string | null): string {
  switch (level) {
    case 'Highly Cooperative':
      return 'bg-success';
    case 'Cooperative':
      return 'bg-primary';
    case 'Neutral':
      return 'bg-secondary';
    case 'Uncooperative':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
}

const EMPTY_FORM = {
  residentId: '',
  visitDate: new Date().toISOString().split('T')[0],
  socialWorker: '',
  visitType: '',
  locationVisited: '',
  familyMembersPresent: 'None', // Default per requirements
  purpose: '',
  observations: '',
  familyCooperationLevel: '',
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: '',
  visitOutcome: '',
};

export default function HomeVisitationPage() {
  const [socialWorkerOptions, setSocialWorkerOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  const location = useLocation();
  const [visitations, setVisitations] = useState<FlatVisitation[]>([]);
  const [residents, setResidents] = useState<ResidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('');
  const [filterCooperation, setFilterCooperation] = useState('');
  const [page, setPage] = useState(1);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<FlatVisitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const paged = await getResidents(1, 500);
      setResidents(paged.items);
      const perResident = await Promise.all(
        paged.items.map((r) =>
          getResidentVisitations(r.residentId).catch(
            () => [] as HomeVisitation[]
          )
        )
      );
      const flat: FlatVisitation[] = perResident.flatMap((visits, i) =>
        visits.map((v) => ({
          ...v,
          residentCode: paged.items[i].caseControlNo,
        }))
      );
      flat.sort(
        (a, b) =>
          new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      );
      setVisitations(flat);

      // Extract unique existing values for dynamic dropdowns
      setSocialWorkerOptions(
        Array.from(new Set(flat.map((v) => v.socialWorker).filter(Boolean)))
      );
      setLocationOptions(
        Array.from(
          new Set(
            flat
              .map((v) => v.locationVisited)
              .filter((value): value is string => Boolean(value))
          )
        )
      );
    } catch {
      setError('Failed to load home visitations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const rid = new URLSearchParams(location.search).get('residentId');
    if (rid) {
      setForm({ ...EMPTY_FORM, residentId: rid });
      setFormError('');
      setShowModal(true);
    }
  }, [location.search]);

  // Auto-fill logic when Visit Type changes
  useEffect(() => {
    if (form.visitType) {
      setForm((prev) => ({
        ...prev,
        purpose: `Visitation for ${prev.visitType}`,
        observations: `Visit observations recorded during ${prev.visitType}.`,
      }));
    }
  }, [form.visitType]);

  const filtered = useMemo(() => {
    let list = visitations;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.residentCode.toLowerCase().includes(q) ||
          v.socialWorker.toLowerCase().includes(q) ||
          (v.locationVisited ?? '').toLowerCase().includes(q)
      );
    }
    if (filterType) list = list.filter((v) => v.visitType === filterType);
    if (filterOutcome)
      list = list.filter((v) => v.visitOutcome === filterOutcome);
    if (filterCooperation)
      list = list.filter((v) => v.familyCooperationLevel === filterCooperation);
    return list;
  }, [visitations, search, filterType, filterOutcome, filterCooperation]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthVisits = visitations.filter((v) => {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.visitDate);
    const visitDate = dateOnlyMatch
      ? new Date(
          Number(dateOnlyMatch[1]),
          Number(dateOnlyMatch[2]) - 1,
          Number(dateOnlyMatch[3])
        )
      : new Date(v.visitDate);

    return !isNaN(visitDate.getTime()) && visitDate >= thisMonthStart;
  });

  const metrics = {
    totalThisMonth: thisMonthVisits.length,
    safetyConcerns: visitations.filter((v) => v.safetyConcernsNoted).length,
    followUpRequired: visitations.filter((v) => v.followUpNeeded).length,
    favorable: visitations.filter((v) => v.visitOutcome === 'Favorable').length,
  };

  function resetFilters() {
    setSearch('');
    setFilterType('');
    setFilterOutcome('');
    setFilterCooperation('');
    setPage(1);
  }

  function openModal() {
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    // Strict check for NOT NULL fields from your SQL schema
    if (
      !form.residentId ||
      !form.visitType ||
      !form.socialWorker ||
      !form.familyCooperationLevel ||
      !form.visitOutcome
    ) {
      setFormError(
        'Please select a Resident, Worker, Visit Type, Cooperation Level, and Outcome.'
      );
      return;
    }

    const selectedResidentId = Number(form.residentId);
    const residentExists = residents.some(
      (resident) => resident.residentId === selectedResidentId
    );

    if (!residentExists) {
      setFormError(
        'That resident is no longer available. The list has been refreshed, so please choose the resident again.'
      );
      await loadAll();
      return;
    }

    setSaving(true);
    try {
      const payload = {
        // visitationId is omitted so DB handles identity
        residentId: selectedResidentId,
        visitDate: form.visitDate,
        socialWorker: form.socialWorker,
        visitType: form.visitType,
        locationVisited: form.locationVisited || 'Field', // Ensure not null
        familyMembersPresent: 'None',
        purpose: form.purpose || `Visitation for ${form.visitType}`,
        observations:
          form.observations ||
          `Observations recorded during ${form.visitType}.`,
        familyCooperationLevel: form.familyCooperationLevel,
        safetyConcernsNoted: !!form.safetyConcernsNoted,
        followUpNeeded: !!form.followUpNeeded,
        followUpNotes: form.followUpNeeded ? form.followUpNotes : null,
        visitOutcome: form.visitOutcome,
      };

      await addVisitation(selectedResidentId, payload);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      await loadAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setFormError(
          'That resident was not found when saving. Please refresh the resident list and select a current resident.'
        );
        await loadAll();
        return;
      }

      if (err instanceof ApiError && err.body) {
        setFormError(`Submit failed: ${err.body}`);
        return;
      }

      setFormError('Submit failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVisitation(
        deleteTarget.residentId,
        deleteTarget.visitationId
      );
      setDeleteTarget(null);
      await loadAll();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="container">
          <h1>Home Visitations</h1>
          <p>Log and review home and field visits for residents</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', minHeight: '100%' }}>
        <div className="container py-4">
          {error && <div className="alert alert-danger mb-4">{error}</div>}

          <div className="row g-3 mb-4">
            {[
              {
                label: 'Visits This Month',
                value: metrics.totalThisMonth,
                sub: 'current month',
              },
              {
                label: 'Safety Concerns',
                value: metrics.safetyConcerns,
                sub: 'flagged across all visits',
              },
              {
                label: 'Follow-Up Required',
                value: metrics.followUpRequired,
                sub: 'pending follow-up',
              },
              {
                label: 'Favorable Outcomes',
                value: metrics.favorable,
                sub: 'all time',
              },
            ].map(({ label, value, sub }) => (
              <div key={label} className="col-6 col-md-3">
                <div className="card text-center h-100">
                  <div className="card-body py-4">
                    <p
                      className="mb-2 text-uppercase fw-bold"
                      style={{
                        fontSize: '0.68rem',
                        letterSpacing: '1.5px',
                        color: 'var(--brand-accent)',
                      }}
                    >
                      {label}
                    </p>
                    <p
                      className="mb-0 fw-bold"
                      style={{
                        fontSize: '1.6rem',
                        color: 'var(--brand-dark)',
                        lineHeight: 1.1,
                      }}
                    >
                      {loading ? '—' : value}
                    </p>
                    <p
                      className="mb-0 text-muted"
                      style={{ fontSize: '0.75rem' }}
                    >
                      {sub}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-3">
                  <label
                    className="form-label fw-semibold"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Search
                  </label>
                  <input
                    className="form-control"
                    placeholder="Resident code, social worker, location..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="col-6 col-md-2">
                  <label
                    className="form-label fw-semibold"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Visit Type
                  </label>
                  <select
                    className="form-select"
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Types</option>
                    {VISIT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label
                    className="form-label fw-semibold"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Outcome
                  </label>
                  <select
                    className="form-select"
                    value={filterOutcome}
                    onChange={(e) => {
                      setFilterOutcome(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Outcomes</option>
                    {OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label
                    className="form-label fw-semibold"
                    style={{ fontSize: '0.8rem' }}
                  >
                    Cooperation
                  </label>
                  <select
                    className="form-select"
                    value={filterCooperation}
                    onChange={(e) => {
                      setFilterCooperation(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">All Levels</option>
                    {COOPERATION_LEVELS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-6 col-md-1 d-flex align-items-end">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={resetFilters}
                  >
                    Clear
                  </button>
                </div>
                <div className="col-12 col-md-2 d-flex align-items-end">
                  <button
                    className="btn btn-warning fw-semibold w-100"
                    onClick={openModal}
                  >
                    + Log New Visit
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Resident</th>
                    <th>Social Worker</th>
                    <th>Type</th>
                    <th>Cooperation</th>
                    <th>Outcome</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((v) => (
                    <tr key={v.visitationId}>
                      <td>{formatDate(v.visitDate)}</td>
                      <td>
                        <span className="badge bg-primary">
                          {v.residentCode}
                        </span>
                      </td>
                      <td>{v.socialWorker}</td>
                      <td>
                        <small>{v.visitType}</small>
                      </td>
                      <td>
                        <span
                          className={`badge ${cooperationBadgeClass(v.familyCooperationLevel)}`}
                        >
                          {v.familyCooperationLevel}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${outcomeBadgeClass(v.visitOutcome)}`}
                        >
                          {v.visitOutcome}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteTarget(v)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && filtered.length === 0 && (
                <div className="p-4 text-center text-muted">
                  No home visitations match the current filters.
                </div>
              )}
              {totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
                  <small className="text-muted">
                    Page {safePage} of {totalPages}
                  </small>
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Log New Visit Modal */}
      {showModal && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Log New Home Visitation</h5>
                <button className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger">{formError}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Resident (Case No)
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.residentId}
                        onChange={(e) =>
                          setForm({ ...form, residentId: e.target.value })
                        }
                      >
                        <option value="">Select Resident...</option>
                        {residents.map((r) => (
                          <option key={r.residentId} value={r.residentId}>
                            {r.caseControlNo}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Visit Date</label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={form.visitDate}
                        onChange={(e) =>
                          setForm({ ...form, visitDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Social Worker
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.socialWorker}
                        onChange={(e) =>
                          setForm({ ...form, socialWorker: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        {socialWorkerOptions.map((sw) => (
                          <option key={sw} value={sw}>
                            {sw}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Visit Type</label>
                      <select
                        className="form-select"
                        required
                        value={form.visitType}
                        onChange={(e) =>
                          setForm({ ...form, visitType: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        {VISIT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Location Visited
                      </label>
                      <select
                        className="form-select"
                        value={form.locationVisited}
                        onChange={(e) =>
                          setForm({ ...form, locationVisited: e.target.value })
                        }
                      >
                        <option value="">Select or Type...</option>
                        {locationOptions.map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-bold">
                        Cooperation Level
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.familyCooperationLevel}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            familyCooperationLevel: e.target.value,
                          })
                        }
                      >
                        <option value="">Select...</option>
                        {COOPERATION_LEVELS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Outcome</label>
                      <select
                        className="form-select"
                        required
                        value={form.visitOutcome}
                        onChange={(e) =>
                          setForm({ ...form, visitOutcome: e.target.value })
                        }
                      >
                        <option value="">Select...</option>
                        {OUTCOMES.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check form-switch mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="safety"
                          checked={form.safetyConcernsNoted}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              safetyConcernsNoted: e.target.checked,
                            })
                          }
                        />
                        <label className="form-check-label" htmlFor="safety">
                          Safety Concerns?
                        </label>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-check form-switch mt-4">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="follow"
                          checked={form.followUpNeeded}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              followUpNeeded: e.target.checked,
                            })
                          }
                        />
                        <label className="form-check-label" htmlFor="follow">
                          Follow-up?
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-warning fw-bold"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Visitation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal d-block"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Delete Record?</h5>
              </div>
              <div className="modal-body">
                Are you sure you want to delete the visit for{' '}
                <strong>{deleteTarget.residentCode}</strong>?
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
