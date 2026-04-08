import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { HomeVisitation, ResidentListItem } from '../types/ResidentDetail';
import { getResidents, getResidentVisitations, addVisitation, deleteVisitation } from '../lib/residentAPI';

const VISIT_TYPES = ['Initial Assessment', 'Routine Follow-Up', 'Reintegration Assessment', 'Post-Placement Monitoring', 'Emergency'];
const OUTCOMES = ['Favorable', 'Needs Improvement', 'Unfavorable', 'Inconclusive'];
const COOPERATION_LEVELS = ['Highly Cooperative', 'Cooperative', 'Neutral', 'Uncooperative'];
const PAGE_SIZE = 10;

interface FlatVisitation extends HomeVisitation {
  residentCode: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function outcomeBadgeClass(outcome: string | null): string {
  switch (outcome) {
    case 'Favorable': return 'bg-success';
    case 'Unfavorable': return 'bg-danger';
    case 'Needs Improvement': return 'bg-warning text-dark';
    default: return 'bg-secondary';
  }
}

function cooperationBadgeClass(level: string | null): string {
  switch (level) {
    case 'Highly Cooperative': return 'bg-success';
    case 'Cooperative': return 'bg-primary';
    case 'Neutral': return 'bg-secondary';
    case 'Uncooperative': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

const EMPTY_FORM = {
  residentId: '',
  visitDate: '',
  socialWorker: '',
  visitType: '',
  locationVisited: '',
  familyMembersPresent: '',
  purpose: '',
  observations: '',
  familyCooperationLevel: '',
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: '',
  visitOutcome: '',
};

export default function HomeVisitationPage() {
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
    setError('');
    try {
      const paged = await getResidents(1, 500);
      setResidents(paged.items);
      const perResident = await Promise.all(
        paged.items.map((r) =>
          getResidentVisitations(r.residentId).catch(() => [] as HomeVisitation[])
        )
      );
      const flat: FlatVisitation[] = perResident.flatMap((visits, i) =>
        visits.map((v) => ({ ...v, residentCode: paged.items[i].caseControlNo }))
      );
      flat.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      setVisitations(flat);
    } catch {
      setError('Failed to load home visitations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // Metrics (current calendar month)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthVisits = visitations.filter(
    (v) => new Date(v.visitDate) >= thisMonthStart
  );
  const metrics = {
    totalThisMonth: thisMonthVisits.length,
    safetyConcerns: visitations.filter((v) => v.safetyConcernsNoted).length,
    followUpRequired: visitations.filter((v) => v.followUpNeeded).length,
    favorable: visitations.filter((v) => v.visitOutcome === 'Favorable').length,
  };

  // Filtered
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
    if (filterOutcome) list = list.filter((v) => v.visitOutcome === filterOutcome);
    if (filterCooperation) list = list.filter((v) => v.familyCooperationLevel === filterCooperation);
    return list;
  }, [visitations, search, filterType, filterOutcome, filterCooperation]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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
    if (!form.residentId || !form.visitDate || !form.socialWorker || !form.visitType) {
      setFormError('Resident, date, social worker, and visit type are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await addVisitation(Number(form.residentId), {
        residentId: Number(form.residentId),
        visitDate: form.visitDate,
        socialWorker: form.socialWorker,
        visitType: form.visitType,
        locationVisited: form.locationVisited || null,
        familyMembersPresent: form.familyMembersPresent || null,
        purpose: form.purpose || null,
        observations: form.observations || null,
        familyCooperationLevel: form.familyCooperationLevel || null,
        safetyConcernsNoted: form.safetyConcernsNoted,
        followUpNeeded: form.followUpNeeded,
        followUpNotes: form.followUpNotes || null,
        visitOutcome: form.visitOutcome || null,
      });
      closeModal();
      await loadAll();
    } catch {
      setFormError('Failed to save visitation. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVisitation(deleteTarget.residentId, deleteTarget.visitationId);
      setDeleteTarget(null);
      await loadAll();
    } catch {
      // keep modal open on error
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {/* SECTION 1 — Page Header */}
      <div className="page-header">
        <div className="container">
          <h1>Home Visitations</h1>
          <p>Log and review home and field visits for residents</p>
        </div>
      </div>

      <div style={{ background: 'var(--brand-light)', minHeight: '100%' }}>
        <div className="container py-4">

          {error && (
            <div className="alert alert-danger mb-4">{error}</div>
          )}

          {/* SECTION 2 — Metric Cards */}
          <div className="row g-3 mb-4">
            {[
              { label: 'Visits This Month', value: metrics.totalThisMonth, sub: 'current month' },
              { label: 'Safety Concerns', value: metrics.safetyConcerns, sub: 'flagged across all visits' },
              { label: 'Follow-Up Required', value: metrics.followUpRequired, sub: 'pending follow-up' },
              { label: 'Favorable Outcomes', value: metrics.favorable, sub: 'all time' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="col-6 col-md-3">
                <div className="card text-center h-100">
                  <div className="card-body py-4">
                    <p className="mb-2 text-uppercase fw-bold" style={{ fontSize: '0.68rem', letterSpacing: '1.5px', color: 'var(--brand-accent)' }}>{label}</p>
                    <p className="mb-0 fw-bold" style={{ fontSize: '1.6rem', color: 'var(--brand-dark)', lineHeight: 1.1 }}>{loading ? '—' : value}</p>
                    <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>{sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* SECTION 3 — Filters + Log Button */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Search</label>
                  <input
                    className="form-control"
                    placeholder="Resident code, social worker, location…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Visit Type</label>
                  <select className="form-select" value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
                    <option value="">All Types</option>
                    {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Outcome</label>
                  <select className="form-select" value={filterOutcome} onChange={(e) => { setFilterOutcome(e.target.value); setPage(1); }}>
                    <option value="">All Outcomes</option>
                    {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-2">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Cooperation</label>
                  <select className="form-select" value={filterCooperation} onChange={(e) => { setFilterCooperation(e.target.value); setPage(1); }}>
                    <option value="">All Levels</option>
                    {COOPERATION_LEVELS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-6 col-md-1 d-flex align-items-end">
                  <button className="btn btn-outline-secondary w-100" onClick={resetFilters}>Clear</button>
                </div>
                <div className="col-12 col-md-2 d-flex align-items-end">
                  <button className="btn btn-warning fw-semibold w-100" onClick={openModal}>
                    + Log New Visit
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4 — Table */}
          <div className="card">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ whiteSpace: 'nowrap' }}>Date</th>
                    <th>Resident</th>
                    <th>Social Worker</th>
                    <th>Visit Type</th>
                    <th>Cooperation</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Safety</th>
                    <th style={{ whiteSpace: 'nowrap' }}>Follow-Up</th>
                    <th>Outcome</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={9} className="text-center py-5">
                        <div className="spinner-border" style={{ color: 'var(--brand-primary)' }} />
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-5">
                        <p className="mb-1" style={{ fontSize: '1.4rem' }}>🏠</p>
                        <p className="mb-0">No visitations found.</p>
                      </td>
                    </tr>
                  )}
                  {!loading && pageItems.map((v) => (
                    <tr key={`${v.residentId}-${v.visitationId}`}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(v.visitDate)}</td>
                      <td>
                        <span className="badge bg-primary" style={{ fontSize: '0.75rem' }}>{v.residentCode}</span>
                      </td>
                      <td>{v.socialWorker}</td>
                      <td>
                        <span className="badge bg-secondary" style={{ fontSize: '0.72rem' }}>{v.visitType}</span>
                      </td>
                      <td>
                        {v.familyCooperationLevel ? (
                          <span className={`badge ${cooperationBadgeClass(v.familyCooperationLevel)}`} style={{ fontSize: '0.72rem' }}>
                            {v.familyCooperationLevel}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {v.safetyConcernsNoted
                          ? <span className="badge bg-danger" style={{ fontSize: '0.72rem' }}>Yes</span>
                          : <span className="text-muted" style={{ fontSize: '0.85rem' }}>No</span>}
                      </td>
                      <td>
                        {v.followUpNeeded
                          ? <span className="badge bg-warning text-dark" style={{ fontSize: '0.72rem' }}>Yes</span>
                          : <span className="text-muted" style={{ fontSize: '0.85rem' }}>No</span>}
                      </td>
                      <td>
                        {v.visitOutcome ? (
                          <span className={`badge ${outcomeBadgeClass(v.visitOutcome)}`} style={{ fontSize: '0.72rem' }}>
                            {v.visitOutcome}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            to={`/admin/residents/${v.residentId}`}
                            className="btn btn-sm btn-outline-primary"
                            style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                          >
                            View
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setDeleteTarget(v)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div className="card-body pt-2 pb-3 d-flex justify-content-between align-items-center">
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                  {filtered.length} visits · page {safePage} of {totalPages}
                </span>
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>←</button>
                  <button className="btn btn-sm btn-outline-secondary" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>→</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* SECTION 5 — Log New Visit Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold" style={{ color: 'var(--brand-dark)' }}>Log New Visit</h5>
                <button type="button" className="btn-close" onClick={closeModal} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2">{formError}</div>}

                  <div className="row g-3">
                    {/* Resident */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Resident <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.residentId}
                        onChange={(e) => setForm({ ...form, residentId: e.target.value })}
                        required
                      >
                        <option value="">Select resident…</option>
                        {residents.map((r) => (
                          <option key={r.residentId} value={r.residentId}>{r.caseControlNo}</option>
                        ))}
                      </select>
                    </div>

                    {/* Visit Date */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Visit Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.visitDate}
                        onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                        required
                      />
                    </div>

                    {/* Social Worker */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Social Worker <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        placeholder="Name"
                        value={form.socialWorker}
                        onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}
                        required
                      />
                    </div>

                    {/* Visit Type */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Visit Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.visitType}
                        onChange={(e) => setForm({ ...form, visitType: e.target.value })}
                        required
                      >
                        <option value="">Select…</option>
                        {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Location */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Location Visited</label>
                      <input
                        className="form-control"
                        placeholder="Address or area"
                        value={form.locationVisited}
                        onChange={(e) => setForm({ ...form, locationVisited: e.target.value })}
                      />
                    </div>

                    {/* Family Members Present */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Family Members Present</label>
                      <input
                        className="form-control"
                        placeholder="Names / relationship"
                        value={form.familyMembersPresent}
                        onChange={(e) => setForm({ ...form, familyMembersPresent: e.target.value })}
                      />
                    </div>

                    {/* Purpose */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Purpose</label>
                      <input
                        className="form-control"
                        placeholder="Purpose of this visit"
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      />
                    </div>

                    {/* Observations */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Observations</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Observations made during the visit"
                        value={form.observations}
                        onChange={(e) => setForm({ ...form, observations: e.target.value })}
                      />
                    </div>

                    {/* Family Cooperation Level */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Family Cooperation Level</label>
                      <select
                        className="form-select"
                        value={form.familyCooperationLevel}
                        onChange={(e) => setForm({ ...form, familyCooperationLevel: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {COOPERATION_LEVELS.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </div>

                    {/* Visit Outcome */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Visit Outcome</label>
                      <select
                        className="form-select"
                        value={form.visitOutcome}
                        onChange={(e) => setForm({ ...form, visitOutcome: e.target.value })}
                      >
                        <option value="">Select…</option>
                        {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    </div>

                    {/* Checkboxes */}
                    <div className="col-12 col-md-6">
                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="safetyConcerns"
                          checked={form.safetyConcernsNoted}
                          onChange={(e) => setForm({ ...form, safetyConcernsNoted: e.target.checked })}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="safetyConcerns">Safety Concerns Noted</label>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="followUp"
                          checked={form.followUpNeeded}
                          onChange={(e) => setForm({ ...form, followUpNeeded: e.target.checked })}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="followUp">Follow-Up Needed</label>
                      </div>
                    </div>

                    {/* Follow-Up Notes */}
                    {form.followUpNeeded && (
                      <div className="col-12">
                        <label className="form-label fw-semibold">Follow-Up Notes</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          placeholder="Describe required follow-up actions"
                          value={form.followUpNotes}
                          onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-warning fw-semibold" disabled={saving}>
                    {saving ? 'Saving…' : 'Log Visit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title fw-bold text-danger">Confirm Delete</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body">
                <p>
                  Delete the <strong>{deleteTarget.visitType}</strong> visit for resident{' '}
                  <strong>{deleteTarget.residentCode}</strong> on{' '}
                  <strong>{formatDate(deleteTarget.visitDate)}</strong>?
                </p>
                <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger fw-semibold" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete Visit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
