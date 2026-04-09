import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ProcessRecording, ResidentListItem, ProcessRecordingFormOptions } from '../types/ResidentDetail';
import {
  getResidents,
  getResidentRecordings,
  addSessionEntryRecording,
  deleteRecording,
  getProcessRecordingFormOptions,
} from '../lib/residentAPI';

const SESSION_TYPES = ['Individual', 'Group'];
const EMOTIONAL_STATES = ['Calm', 'Anxious', 'Sad', 'Angry', 'Hopeful', 'Withdrawn', 'Happy', 'Distressed'];
const INTERVENTION_OPTIONS = ['Legal Services', 'Healing', 'Teaching', 'Caring'];
const PAGE_SIZE = 10;

interface FlatRecording extends ProcessRecording {
  residentCode: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function emotionBadgeStyle(state: string | null): React.CSSProperties {
  const map: Record<string, string> = {
    Calm: '#0f6e56',
    Hopeful: '#0f6e56',
    Happy: '#0f6e56',
    Anxious: '#b45309',
    Sad: '#1a5276',
    Withdrawn: '#6b7280',
    Angry: '#b91c1c',
    Distressed: '#b91c1c',
  };
  return {
    background: map[state ?? ''] ?? '#6b7280',
    color: '#fff',
    fontSize: '0.7rem',
    whiteSpace: 'nowrap',
  };
}

type NewSessionForm = {
  residentId: string;
  sessionDate: string;
  socialWorker: string;
  sessionType: '' | 'Individual' | 'Group';
  sessionDurationMinutes: string;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  interventionsApplied: string[];
  followUpActions: string;
  progressNoted: '' | 'yes' | 'no';
  concernsFlagged: '' | 'yes' | 'no';
  referralMade: '' | 'yes' | 'no';
};

const EMPTY_FORM: NewSessionForm = {
  residentId: '',
  sessionDate: '',
  socialWorker: '',
  sessionType: '',
  emotionalStateObserved: '',
  emotionalStateEnd: '',
  interventionsApplied: [],
  followUpActions: '',
  progressNoted: '',
  concernsFlagged: '',
  referralMade: '',
};

export default function ProcessRecordingPage() {
  const location = useLocation();
  const [recordings, setRecordings] = useState<FlatRecording[]>([]);
  const [residents, setResidents] = useState<ResidentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterEmotion, setFilterEmotion] = useState('');
  const [filterProgress, setFilterProgress] = useState('');
  const [filterConcerns, setFilterConcerns] = useState('');
  const [page, setPage] = useState(1);

  // Expanded rows (show narrative / interventions / follow-up)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [recordingFormOptions, setRecordingFormOptions] = useState<ProcessRecordingFormOptions>({
    residents: [],
    socialWorkers: [],
    emotionalStateObserved: [],
    emotionalStateEnd: [],
    followUpActions: [],
  });

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<FlatRecording | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [paged, formOptions] = await Promise.all([
        getResidents(1, 500),
        getProcessRecordingFormOptions(),
      ]);
      setResidents(paged.items);
      setRecordingFormOptions(formOptions);
      const perResident = await Promise.all(
        paged.items.map((r) =>
          getResidentRecordings(r.residentId).catch(() => [] as ProcessRecording[])
        )
      );
      const flat: FlatRecording[] = perResident.flatMap((recs, i) =>
        recs.map((r) => ({ ...r, residentCode: paged.items[i].caseControlNo }))
      );
      flat.sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
      setRecordings(flat);
    } catch {
      setError('Failed to load session recordings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showModal]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const rid = new URLSearchParams(location.search).get('residentId');
    if (rid) {
      setForm({ ...EMPTY_FORM, residentId: rid });
      setFormError('');
      setShowModal(true);
    }
  }, []);

  // Metrics (current calendar month)
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonth = recordings.filter((r) => new Date(r.sessionDate) >= thisMonthStart);
  const metrics = {
    totalThisMonth: thisMonth.length,
    progressNoted: recordings.filter((r) => r.progressNoted).length,
    concernsFlagged: recordings.filter((r) => r.concernsFlagged).length,
    referralsMade: recordings.filter((r) => r.referralMade).length,
  };

  // Filtered
  const filtered = useMemo(() => {
    let list = recordings;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.residentCode.toLowerCase().includes(q) ||
          r.socialWorker.toLowerCase().includes(q)
      );
    }
    if (filterType) list = list.filter((r) => r.sessionType === filterType);
    if (filterEmotion) list = list.filter((r) => r.emotionalStateObserved === filterEmotion);
    if (filterProgress === 'yes') list = list.filter((r) => r.progressNoted);
    if (filterProgress === 'no') list = list.filter((r) => !r.progressNoted);
    if (filterConcerns === 'yes') list = list.filter((r) => r.concernsFlagged);
    if (filterConcerns === 'no') list = list.filter((r) => !r.concernsFlagged);
    return list;
  }, [recordings, search, filterType, filterEmotion, filterProgress, filterConcerns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function resetFilters() {
    setSearch('');
    setFilterType('');
    setFilterEmotion('');
    setFilterProgress('');
    setFilterConcerns('');
    setPage(1);
  }

  function toggleRow(id: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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
    if (
      !form.residentId ||
      !form.sessionDate ||
      !form.socialWorker ||
      !form.sessionType ||
      !form.sessionDurationMinutes ||
      !form.emotionalStateObserved ||
      !form.emotionalStateEnd ||
      form.interventionsApplied.length === 0 ||
      !form.followUpActions ||
      !form.progressNoted ||
      !form.concernsFlagged ||
      !form.referralMade
    ) {
      setFormError('Please complete all fields before submitting this session.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await addSessionEntryRecording(Number(form.residentId), {
        sessionDate: form.sessionDate,
        socialWorker: form.socialWorker,
        sessionType: form.sessionType,
        sessionDurationMinutes: Number(form.sessionDurationMinutes),
        emotionalStateObserved: form.emotionalStateObserved,
        emotionalStateEnd: form.emotionalStateEnd,
        interventionsApplied: form.interventionsApplied,
        followUpActions: form.followUpActions,
        progressNoted: form.progressNoted === 'yes',
        concernsFlagged: form.concernsFlagged === 'yes',
        referralMade: form.referralMade === 'yes',
      });
      closeModal();
      await loadAll();
    } catch {
      setFormError('Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteRecording(deleteTarget.residentId, deleteTarget.recordingId);
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
          <h1>Process Recording</h1>
          <p>Counseling session documentation and resident progress tracking</p>
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
              { label: 'Sessions This Month', value: metrics.totalThisMonth, sub: 'current month' },
              { label: 'Progress Noted', value: metrics.progressNoted, sub: 'across all sessions' },
              { label: 'Concerns Flagged', value: metrics.concernsFlagged, sub: 'requiring attention' },
              { label: 'Referrals Made', value: metrics.referralsMade, sub: 'all time' },
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

          {/* SECTION 3 — Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-lg-3">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Search</label>
                  <input
                    className="form-control rounded-3"
                    placeholder="Resident code or social worker…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>

                <div className="col-6 col-lg-2">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Session Type</label>
                  <select
                    className="form-select rounded-3"
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                  >
                    <option value="">All Types</option>
                    {SESSION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="col-6 col-lg-2">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Emotional State</label>
                  <select
                    className="form-select rounded-3"
                    value={filterEmotion}
                    onChange={(e) => { setFilterEmotion(e.target.value); setPage(1); }}
                  >
                    <option value="">All States</option>
                    {EMOTIONAL_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div className="col-6 col-lg-2">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Progress</label>
                  <select
                    className="form-select rounded-3"
                    value={filterProgress}
                    onChange={(e) => { setFilterProgress(e.target.value); setPage(1); }}
                  >
                    <option value="">All</option>
                    <option value="yes">Progress Noted</option>
                    <option value="no">No Progress</option>
                  </select>
                </div>

                <div className="col-6 col-lg-1">
                  <label className="form-label fw-semibold" style={{ fontSize: '0.8rem' }}>Concerns</label>
                  <select
                    className="form-select rounded-3"
                    value={filterConcerns}
                    onChange={(e) => { setFilterConcerns(e.target.value); setPage(1); }}
                  >
                    <option value="">All</option>
                    <option value="yes">Flagged</option>
                    <option value="no">None</option>
                  </select>
                </div>

                <div className="col-6 col-lg-1">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={resetFilters}
                  >
                    Clear
                  </button>
                </div>

                <div className="col-6 col-lg-1">
                  <button
                    className="btn btn-warning fw-semibold w-100"
                    onClick={openModal}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    + Session
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
                  <th>Type</th>
                  <th>Social Worker</th>
                  <th className="d-none d-md-table-cell" style={{ whiteSpace: 'nowrap' }}>Duration</th>
                  <th className="d-none d-md-table-cell" style={{ whiteSpace: 'nowrap' }}>State (Start)</th>
                  <th className="d-none d-lg-table-cell" style={{ whiteSpace: 'nowrap' }}>State (End)</th>
                  <th>Progress</th>
                  <th className="d-none d-md-table-cell">Concerns</th>
                  <th className="d-none d-md-table-cell">Referral</th>
                  <th />
                </tr>
              </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={11} className="text-center py-5">
                        <div className="spinner-border" style={{ color: 'var(--brand-primary)' }} />
                      </td>
                    </tr>
                  )}
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center text-muted py-5">
                        <p className="mb-1" style={{ fontSize: '1.4rem' }}>📋</p>
                        <p className="mb-0">No session recordings found.</p>
                      </td>
                    </tr>
                  )}
                  {!loading && pageItems.map((r) => {
                    const isExpanded = expandedRows.has(r.recordingId);
                    const hasDetail = r.sessionNarrative || r.interventionsApplied || r.followUpActions;
                    return (
                      <Fragment key={r.recordingId}>
                        <tr>
                          {/* Date */}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            {formatDate(r.sessionDate)}
                          </td>

                          {/* Resident */}
                          <td>
                            <span className="badge bg-primary" style={{ fontSize: '0.75rem' }}>
                              {r.residentCode}
                            </span>
                          </td>

                          {/* Type */}
                          <td>
                            <span
                              className="badge"
                              style={{
                                background: r.sessionType === 'Individual'
                                  ? 'var(--brand-primary)'
                                  : '#7c3aed',
                                color: '#fff',
                                fontSize: '0.72rem',
                              }}
                            >
                              {r.sessionType}
                            </span>
                          </td>

                          {/* Social Worker (VISIBLE on mobile) */}
                          <td className="text-truncate" style={{ maxWidth: '120px' }}>
                            {r.socialWorker}
                          </td>

                          {/* Duration (hidden on mobile) */}
                          <td className="d-none d-md-table-cell">
                            {r.sessionDurationMinutes ? `${r.sessionDurationMinutes} min` : '—'}
                          </td>

                          {/* State START (hidden on mobile) */}
                          <td className="d-none d-md-table-cell">
                            {r.emotionalStateObserved ? (
                              <span className="badge" style={emotionBadgeStyle(r.emotionalStateObserved)}>
                                {r.emotionalStateObserved}
                              </span>
                            ) : '—'}
                          </td>

                          {/* State END (only show on lg+) */}
                          <td className="d-none d-lg-table-cell">
                            {r.emotionalStateEnd ? (
                              <span className="badge" style={emotionBadgeStyle(r.emotionalStateEnd)}>
                                {r.emotionalStateEnd}
                              </span>
                            ) : '—'}
                          </td>

                          {/* Progress */}
                          <td>
                            {r.progressNoted
                              ? <span className="badge bg-success" style={{ fontSize: '0.72rem' }}>Yes</span>
                              : <span className="text-muted" style={{ fontSize: '0.85rem' }}>No</span>}
                          </td>

                          {/* Concerns (hidden on mobile) */}
                          <td className="d-none d-md-table-cell">
                            {r.concernsFlagged
                              ? <span className="badge bg-danger" style={{ fontSize: '0.72rem' }}>Yes</span>
                              : <span className="text-muted" style={{ fontSize: '0.85rem' }}>No</span>}
                          </td>

                          {/* Referral (hidden on mobile) */}
                          <td className="d-none d-md-table-cell">
                            {r.referralMade
                              ? <span className="badge" style={{ background: 'var(--brand-accent)', color: '#fff', fontSize: '0.72rem' }}>Yes</span>
                              : <span className="text-muted" style={{ fontSize: '0.85rem' }}>No</span>}
                          </td>

                          {/* Actions */}
                          <td>
                            <div className="d-flex gap-2 align-items-center">
                              <Link
                                to={`/admin/residents/${r.residentId}`}
                                className="btn btn-sm btn-outline-primary"
                                style={{ fontSize: '0.75rem' }}
                              >
                                View
                              </Link>

                              {hasDetail && (
                                <button
                                  className="btn btn-sm btn-outline-secondary"
                                  style={{ fontSize: '0.75rem' }}
                                  onClick={() => toggleRow(r.recordingId)}
                                >
                                  ▼
                                </button>
                              )}

                              <button
                                className="btn btn-sm btn-outline-danger"
                                style={{ fontSize: '0.75rem' }}
                                onClick={() => setDeleteTarget(r)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        {hasDetail && isExpanded && (
                          <tr key={`${r.recordingId}-detail`} style={{ background: '#f8f7f4' }}>
                            <td colSpan={11} style={{ padding: '1rem 1.25rem' }}>
                              <div className="row g-3">
                                {r.sessionNarrative && (
                                  <div className="col-12 col-md-4">
                                    <p className="mb-1 text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--brand-accent)' }}>Session Narrative</p>
                                    <p className="mb-0" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{r.sessionNarrative}</p>
                                  </div>
                                )}
                                {r.interventionsApplied && (
                                  <div className="col-12 col-md-4">
                                    <p className="mb-1 text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--brand-accent)' }}>Interventions Applied</p>
                                    <p className="mb-0" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{r.interventionsApplied}</p>
                                  </div>
                                )}
                                {r.followUpActions && (
                                  <div className="col-12 col-md-4">
                                    <p className="mb-1 text-uppercase fw-bold" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: 'var(--brand-accent)' }}>Follow-Up Actions</p>
                                    <p className="mb-0" style={{ fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{r.followUpActions}</p>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && filtered.length > PAGE_SIZE && (
              <div className="card-body pt-2 pb-3 d-flex justify-content-between align-items-center">
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                  {filtered.length} sessions · page {safePage} of {totalPages}
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

      {/* SECTION 5 — New Session Modal */}
      {showModal && (
        <div
          className="modal d-block"
          tabIndex={-1}
          style={{
            background: 'rgba(0,0,0,0.4)',
            position: 'fixed',
            inset: 0,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: '0.75rem',
          }}
        >
          <div
            className="modal-dialog modal-lg"
            style={{
              margin: '0 auto',
              minHeight: 'calc(100vh - 1.5rem)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              className="modal-content"
              style={{
                width: '100%',
                maxHeight: 'calc(100vh - 1.5rem)',
                overflow: 'hidden',
              }}
            >
              <div className="modal-header">
                <h5 className="modal-title fw-bold" style={{ color: 'var(--brand-dark)' }}>
                  New Session Recording
                </h5>
                <button type="button" className="btn-close" onClick={closeModal} />
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <div
                  className="modal-body"
                  style={{
                    overflowY: 'auto',
                    maxHeight: '75vh',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
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
                        {recordingFormOptions.residents.map((r) => (
                          <option key={r.residentId} value={r.residentId}>{r.caseControlNo}</option>
                        ))}
                      </select>
                    </div>

                    {/* Session Date */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Session Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.sessionDate}
                        onChange={(e) => setForm({ ...form, sessionDate: e.target.value })}
                        required
                      />
                    </div>

                    {/* Social Worker */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Social Worker <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.socialWorker}
                        onChange={(e) => setForm({ ...form, socialWorker: e.target.value })}
                        required
                      >
                        <option value="">Select social worker…</option>
                        {recordingFormOptions.socialWorkers.map((name) => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Session Type */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Session Type <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.sessionType}
                        onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                        required
                      >
                        <option value="">Select…</option>
                        {SESSION_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Session Duration (minutes) <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        placeholder="e.g. 60"
                        value={form.sessionDurationMinutes}
                        onChange={(e) => setForm({ ...form, sessionDurationMinutes: e.target.value })}
                        required
                      />
                    </div>

                    {/* Emotional State Observed */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Emotional State (Start) <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.emotionalStateObserved}
                        onChange={(e) => setForm({ ...form, emotionalStateObserved: e.target.value })}
                        required
                      >
                        <option value="">Select…</option>
                        {(recordingFormOptions.emotionalStateObserved.length > 0
                          ? recordingFormOptions.emotionalStateObserved
                          : EMOTIONAL_STATES
                        ).map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Emotional State End */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Emotional State (End) <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.emotionalStateEnd}
                        onChange={(e) => setForm({ ...form, emotionalStateEnd: e.target.value })}
                        required
                      >
                        <option value="">Select…</option>
                        {(recordingFormOptions.emotionalStateEnd.length > 0
                          ? recordingFormOptions.emotionalStateEnd
                          : EMOTIONAL_STATES
                        ).map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>

                    {/* Interventions Applied */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Interventions Applied <span className="text-danger">*</span></label>
                      <div className="border rounded p-3" style={{ background: '#fff' }}>
                        <div className="d-flex flex-column gap-2">
                          {INTERVENTION_OPTIONS.map((option) => {
                            const isChecked = form.interventionsApplied.includes(option);
                            return (
                              <label key={option} className="form-check-label d-flex align-items-center gap-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setForm({
                                        ...form,
                                        interventionsApplied: [...form.interventionsApplied, option],
                                      });
                                    } else {
                                      setForm({
                                        ...form,
                                        interventionsApplied: form.interventionsApplied.filter((v) => v !== option),
                                      });
                                    }
                                  }}
                                />
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                      {form.interventionsApplied.length === 0 && (
                        <div className="form-text text-danger">Select at least one intervention.</div>
                      )}
                    </div>

                    {/* Follow-Up Actions */}
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-semibold">Follow-Up Actions <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.followUpActions}
                        onChange={(e) => setForm({ ...form, followUpActions: e.target.value })}
                        required
                      >
                        <option value="">Select follow-up action…</option>
                        {recordingFormOptions.followUpActions.map((action) => (
                          <option key={action} value={action}>{action}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">Progress Noted? <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.progressNoted}
                        onChange={(e) => setForm({ ...form, progressNoted: e.target.value as 'yes' | 'no' | '' })}
                        required
                      >
                        <option value="">Select…</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">Large Concerns? <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.concernsFlagged}
                        onChange={(e) => setForm({ ...form, concernsFlagged: e.target.value as 'yes' | 'no' | '' })}
                        required
                      >
                        <option value="">Select…</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-4">
                      <label className="form-label fw-semibold">Referral Made? <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={form.referralMade}
                        onChange={(e) => setForm({ ...form, referralMade: e.target.value as 'yes' | 'no' | '' })}
                        required
                      >
                        <option value="">Select…</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-warning fw-semibold" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        Saving…
                      </>
                    ) : 'Save Session'}
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
                  Delete the <strong>{deleteTarget.sessionType}</strong> session for resident{' '}
                  <strong>{deleteTarget.residentCode}</strong> on{' '}
                  <strong>{formatDate(deleteTarget.sessionDate)}</strong>?
                </p>
                <p className="text-muted mb-0" style={{ fontSize: '0.875rem' }}>This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger fw-semibold" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
