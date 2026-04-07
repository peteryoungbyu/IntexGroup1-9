import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ResidentDetail, ProcessRecording, HomeVisitation, CaseConference } from '../types/ResidentDetail';
import { getResidentById, addRecording, deleteRecording, addVisitation, deleteVisitation, updateResident } from '../lib/residentAPI';
import type { Resident } from '../types/ResidentDetail';
import { addCaseConference, deleteCaseConference } from '../lib/caseConferenceAPI';
import { RESIDENT_CASE_CATEGORIES } from '../lib/residentOptions';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const RISK_COLORS: Record<string, string> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
  Critical: 'dark',
};

const EMPTY_RECORDING: Omit<ProcessRecording, 'recordingId'> = {
  residentId: 0,
  sessionDate: '',
  socialWorker: '',
  sessionType: 'Individual',
  sessionDurationMinutes: 60,
  emotionalStateObserved: '',
  emotionalStateEnd: '',
  sessionNarrative: '',
  interventionsApplied: '',
  followUpActions: '',
  progressNoted: false,
  concernsFlagged: false,
  referralMade: false,
};

const EMPTY_VISITATION: Omit<HomeVisitation, 'visitationId'> = {
  residentId: 0,
  visitDate: '',
  socialWorker: '',
  visitType: 'Routine Follow-Up',
  locationVisited: '',
  familyMembersPresent: '',
  purpose: '',
  observations: '',
  familyCooperationLevel: 'Moderate',
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: '',
  visitOutcome: 'Neutral',
};

const EMPTY_CONFERENCE: Omit<CaseConference, 'conferenceId'> = {
  residentId: 0,
  conferenceDate: '',
  facilitatedBy: '',
  attendees: '',
  agenda: '',
  decisions: '',
  nextSteps: '',
  nextReviewDate: null,
};

type DeleteTarget =
  | { type: 'recording'; id: number }
  | { type: 'visitation'; id: number }
  | { type: 'conference'; id: number };

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const residentId = Number(id);

  const [detail, setDetail] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Omit<Resident, 'residentId' | 'createdAt'> | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showAddRecording, setShowAddRecording] = useState(false);
  const [showAddVisitation, setShowAddVisitation] = useState(false);
  const [showAddConference, setShowAddConference] = useState(false);

  const [recordingForm, setRecordingForm] = useState({ ...EMPTY_RECORDING, residentId });
  const [visitationForm, setVisitationForm] = useState({ ...EMPTY_VISITATION, residentId });
  const [conferenceForm, setConferenceForm] = useState({ ...EMPTY_CONFERENCE, residentId });

  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refresh = () => getResidentById(residentId).then(setDetail);

  useEffect(() => {
    if (!id) return;
    getResidentById(residentId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setRecordingForm(f => ({ ...f, residentId }));
    setVisitationForm(f => ({ ...f, residentId }));
    setConferenceForm(f => ({ ...f, residentId }));
  }, [residentId]);

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" style={{ color: 'var(--brand-primary)' }} /></div>;
  if (!detail) return <div className="container py-5"><div className="alert alert-danger">Resident not found.</div></div>;

  const { resident, recordings, visitations, plans, conferences, predictions } =
    detail;

  async function handleAddRecording(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    setFormError(null);
    try {
      await addRecording(residentId, recordingForm);
      await refresh();
      setShowAddRecording(false);
      setRecordingForm({ ...EMPTY_RECORDING, residentId });
    } catch {
      setFormError('Failed to save recording. Please try again.');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleAddVisitation(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    setFormError(null);
    try {
      await addVisitation(residentId, visitationForm);
      await refresh();
      setShowAddVisitation(false);
      setVisitationForm({ ...EMPTY_VISITATION, residentId });
    } catch {
      setFormError('Failed to save visitation. Please try again.');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleAddConference(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    setFormError(null);
    try {
      await addCaseConference(conferenceForm);
      await refresh();
      setShowAddConference(false);
      setConferenceForm({ ...EMPTY_CONFERENCE, residentId });
    } catch {
      setFormError('Failed to save conference. Please try again.');
    } finally {
      setFormBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === 'recording') await deleteRecording(residentId, deleteTarget.id);
      else if (deleteTarget.type === 'visitation') await deleteVisitation(residentId, deleteTarget.id);
      else await deleteCaseConference(deleteTarget.id);
      await refresh();
      setDeleteTarget(null);
    } catch {
      setDeleteError('Failed to delete. Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  }

  function openEdit() {
    const { residentId: _id, createdAt: _ca, ...fields } = resident as Resident;
    setEditForm(fields);
    setEditError(null);
    setShowEdit(true);
  }
  function closeEdit() { if (editBusy) return; setShowEdit(false); setEditError(null); }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await updateResident(residentId, editForm);
      await refresh();
      setShowEdit(false);
    } catch {
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setEditBusy(false);
    }
  }

  const setEdit = <K extends keyof Omit<Resident, 'residentId' | 'createdAt'>>(
    field: K,
    value: Omit<Resident, 'residentId' | 'createdAt'>[K]
  ) => setEditForm(f => f ? { ...f, [field]: value } : f);

  function closeAddRecording() { setShowAddRecording(false); setFormError(null); setRecordingForm({ ...EMPTY_RECORDING, residentId }); }
  function closeAddVisitation() { setShowAddVisitation(false); setFormError(null); setVisitationForm({ ...EMPTY_VISITATION, residentId }); }
  function closeAddConference() { setShowAddConference(false); setFormError(null); setConferenceForm({ ...EMPTY_CONFERENCE, residentId }); }

  return (
    <div>
      <div className="page-header">
        <div className="container-fluid px-4">
          <div className="d-flex align-items-center gap-2 mb-2">
            <Link
              to="/admin/residents"
              className="btn btn-sm btn-outline-light"
            >
              ← Back
            </Link>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="mb-0">
              {resident.caseControlNo} · {resident.internalCode}
            </h1>
            {resident.currentRiskLevel && (
              <span
                className={`badge bg-${RISK_COLORS[resident.currentRiskLevel] ?? 'secondary'}`}
              >
                {resident.currentRiskLevel} Risk
              </span>
            )}
            <span
              className={`badge bg-${resident.caseStatus === 'Active' ? 'success' : 'secondary'}`}
            >
              {resident.caseStatus}
            </span>
          </div>
          <p>Case details and progress tracking</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <ul className="nav nav-tabs mb-4">
          {[
            'overview',
            'recordings',
            'visitations',
            'plans',
            'conferences',
            'predictions',
          ].map((t) => (
            <li key={t} className="nav-item">
              <button
                className={`nav-link ${activeTab === t ? 'active' : ''}`}
                onClick={() => setActiveTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            </li>
          ))}
        </ul>

        {/* Edit Resident Modal */}
        {showEdit && editForm && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeEdit}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
              <form onSubmit={handleEditSubmit}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Resident — {resident.caseControlNo}</h5>
                    <button type="button" className="btn-close" onClick={closeEdit} disabled={editBusy} />
                  </div>
                  <div className="modal-body">
                    {editError && <div className="alert alert-danger">{editError}</div>}

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">Basic Information</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">Case Control No. <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" required value={editForm.caseControlNo}
                          onChange={e => setEdit('caseControlNo', e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Internal Code <span className="text-danger">*</span></label>
                        <input type="text" className="form-control" required value={editForm.internalCode}
                          onChange={e => setEdit('internalCode', e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Safehouse ID <span className="text-danger">*</span></label>
                        <input type="number" className="form-control" required min={1} value={editForm.safehouseId}
                          onChange={e => setEdit('safehouseId', Number(e.target.value))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Sex <span className="text-danger">*</span></label>
                        <select className="form-select" required value={editForm.sex}
                          onChange={e => setEdit('sex', e.target.value)}>
                          <option>Female</option>
                          <option>Male</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={editForm.dateOfBirth}
                          onChange={e => setEdit('dateOfBirth', e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Place of Birth</label>
                        <input type="text" className="form-control" value={editForm.placeOfBirth ?? ''}
                          onChange={e => setEdit('placeOfBirth', e.target.value || null)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Birth Status</label>
                        <input type="text" className="form-control" value={editForm.birthStatus ?? ''}
                          onChange={e => setEdit('birthStatus', e.target.value || null)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Religion</label>
                        <input type="text" className="form-control" value={editForm.religion ?? ''}
                          onChange={e => setEdit('religion', e.target.value || null)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Case Status <span className="text-danger">*</span></label>
                        <select className="form-select" required value={editForm.caseStatus}
                          onChange={e => setEdit('caseStatus', e.target.value)}>
                          <option>Active</option>
                          <option>Closed</option>
                          <option>Transferred</option>
                        </select>
                      </div>
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">Case Category &amp; Sub-categories</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label">Case Category <span className="text-danger">*</span></label>
                        <select className="form-select" required value={editForm.caseCategory}
                          onChange={e => setEdit('caseCategory', e.target.value)}>
                          {RESIDENT_CASE_CATEGORIES.map(category => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label d-block">Sub-categories</label>
                        <div className="row g-2">
                          {([
                            ['subCatOrphaned', 'Orphaned'],
                            ['subCatTrafficked', 'Trafficked'],
                            ['subCatChildLabor', 'Child Labor'],
                            ['subCatPhysicalAbuse', 'Physical Abuse'],
                            ['subCatSexualAbuse', 'Sexual Abuse'],
                            ['subCatOsaec', 'OSAEC'],
                            ['subCatCicl', 'CICL'],
                            ['subCatAtRisk', 'At Risk'],
                            ['subCatStreetChild', 'Street Child'],
                            ['subCatChildWithHiv', 'Child with HIV'],
                          ] as const).map(([field, label]) => (
                            <div key={field} className="col-6">
                              <div className="form-check">
                                <input type="checkbox" className="form-check-input" id={`edit-${field}`}
                                  checked={editForm[field] as boolean}
                                  onChange={e => setEdit(field, e.target.checked)} />
                                <label className="form-check-label" htmlFor={`edit-${field}`}>{label}</label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">Disability Information</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input type="checkbox" className="form-check-input" id="edit-isPwd"
                            checked={editForm.isPwd}
                            onChange={e => setEdit('isPwd', e.target.checked)} />
                          <label className="form-check-label" htmlFor="edit-isPwd">Person with Disability (PWD)</label>
                        </div>
                      </div>
                      {editForm.isPwd && (
                        <div className="col-md-4">
                          <label className="form-label">PWD Type</label>
                          <input type="text" className="form-control" value={editForm.pwdType ?? ''}
                            onChange={e => setEdit('pwdType', e.target.value || null)} />
                        </div>
                      )}
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input type="checkbox" className="form-check-input" id="edit-hasSpecialNeeds"
                            checked={editForm.hasSpecialNeeds}
                            onChange={e => setEdit('hasSpecialNeeds', e.target.checked)} />
                          <label className="form-check-label" htmlFor="edit-hasSpecialNeeds">Has Special Needs</label>
                        </div>
                      </div>
                      {editForm.hasSpecialNeeds && (
                        <div className="col-md-4">
                          <label className="form-label">Diagnosis</label>
                          <input type="text" className="form-control" value={editForm.specialNeedsDiagnosis ?? ''}
                            onChange={e => setEdit('specialNeedsDiagnosis', e.target.value || null)} />
                        </div>
                      )}
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">Family Socio-demographic Profile</h6>
                    <div className="row g-2 mb-4">
                      {([
                        ['familyIs4Ps', '4Ps Beneficiary'],
                        ['familySoloParent', 'Solo Parent'],
                        ['familyIndigenous', 'Indigenous Group'],
                        ['familyParentPwd', 'Parent with Disability'],
                        ['familyInformalSettler', 'Informal Settler'],
                      ] as const).map(([field, label]) => (
                        <div key={field} className="col-md-4">
                          <div className="form-check">
                            <input type="checkbox" className="form-check-input" id={`edit-${field}`}
                              checked={editForm[field] as boolean}
                              onChange={e => setEdit(field, e.target.checked)} />
                            <label className="form-check-label" htmlFor={`edit-${field}`}>{label}</label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">Admission &amp; Referral</h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">Date of Admission <span className="text-danger">*</span></label>
                        <input type="date" className="form-control" required value={editForm.dateOfAdmission}
                          onChange={e => setEdit('dateOfAdmission', e.target.value)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Assigned Social Worker</label>
                        <input type="text" className="form-control" value={editForm.assignedSocialWorker ?? ''}
                          onChange={e => setEdit('assignedSocialWorker', e.target.value || null)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Referral Source</label>
                        <input type="text" className="form-control" value={editForm.referralSource ?? ''}
                          onChange={e => setEdit('referralSource', e.target.value || null)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Referring Agency / Person</label>
                        <input type="text" className="form-control" value={editForm.referringAgencyPerson ?? ''}
                          onChange={e => setEdit('referringAgencyPerson', e.target.value || null)} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Initial Risk Level</label>
                        <select className="form-select" value={editForm.initialRiskLevel ?? ''}
                          onChange={e => setEdit('initialRiskLevel', e.target.value || null)}>
                          <option value="">— None —</option>
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                          <option>Critical</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Current Risk Level</label>
                        <select className="form-select" value={editForm.currentRiskLevel ?? ''}
                          onChange={e => setEdit('currentRiskLevel', e.target.value || null)}>
                          <option value="">— None —</option>
                          <option>Low</option>
                          <option>Medium</option>
                          <option>High</option>
                          <option>Critical</option>
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">Initial Case Assessment</label>
                        <textarea className="form-control" rows={2} value={editForm.initialCaseAssessment ?? ''}
                          onChange={e => setEdit('initialCaseAssessment', e.target.value || null)} />
                      </div>
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">Reintegration</h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Reintegration Type</label>
                        <select className="form-select" value={editForm.reintegrationType ?? ''}
                          onChange={e => setEdit('reintegrationType', e.target.value || null)}>
                          <option value="">— None —</option>
                          <option>Family Reintegration</option>
                          <option>Community Reintegration</option>
                          <option>Independent Living</option>
                          <option>Foster Care</option>
                          <option>Adoption</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Reintegration Status</label>
                        <select className="form-select" value={editForm.reintegrationStatus ?? ''}
                          onChange={e => setEdit('reintegrationStatus', e.target.value || null)}>
                          <option value="">— None —</option>
                          <option>Ongoing</option>
                          <option>Completed</option>
                          <option>Failed</option>
                          <option>Pending</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Date Closed</label>
                        <input type="date" className="form-control" value={editForm.dateClosed ?? ''}
                          onChange={e => setEdit('dateClosed', e.target.value || null)} />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeEdit} disabled={editBusy}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editBusy}>
                      {editBusy ? <><span className="spinner-border spinner-border-sm me-2" />Saving…</> : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span>Case Information</span>
                  <button className="btn btn-sm btn-outline-primary" onClick={openEdit}>Edit</button>
                </div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5">Category</dt>
                    <dd className="col-sm-7">{resident.caseCategory}</dd>
                    <dt className="col-sm-5">Admitted</dt>
                    <dd className="col-sm-7">{resident.dateOfAdmission}</dd>
                    <dt className="col-sm-5">Social Worker</dt>
                    <dd className="col-sm-7">
                      {resident.assignedSocialWorker ?? '—'}
                    </dd>
                    <dt className="col-sm-5">Reintegration</dt>
                    <dd className="col-sm-7">
                      {resident.reintegrationStatus ?? '—'}{' '}
                      {resident.reintegrationType
                        ? `(${resident.reintegrationType})`
                        : ''}
                    </dd>
                    <dt className="col-sm-5">Referral Source</dt>
                    <dd className="col-sm-7">
                      {resident.referralSource ?? '—'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">ML Predictions</div>
                <div className="card-body">
                  {predictions.length === 0 ? (
                    <p className="text-muted">No predictions available.</p>
                  ) : (
                    <table className="table table-sm mb-0">
                      <thead>
                        <tr>
                          <th>Model</th>
                          <th>Score</th>
                          <th>Label</th>
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((p) => (
                          <tr key={p.predictionId}>
                            <td>{p.modelName}</td>
                            <td>{(p.score * 100).toFixed(1)}%</td>
                            <td>{p.label ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recordings */}
        {activeTab === 'recordings' && (
          <>
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Process Recordings ({recordings.length})</span>
                <button className="btn btn-sm btn-primary" onClick={() => { setFormError(null); setShowAddRecording(true); }}>
                  + Add Recording
                </button>
              </div>
              <div className="card-body">
                {recordings.length === 0 ? <p className="text-muted">No recordings yet.</p> : (
                  <div className="list-group list-group-flush">
                    {recordings.map(r => (
                      <div key={r.recordingId} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong>{r.sessionDate}</strong>
                              <span className="text-muted small">{r.sessionType} · {r.sessionDurationMinutes} min · {r.socialWorker}</span>
                            </div>
                            {r.sessionNarrative && <p className="mb-1 small">{r.sessionNarrative}</p>}
                            {r.interventionsApplied && <p className="mb-1 small text-muted"><strong>Interventions:</strong> {r.interventionsApplied}</p>}
                            {r.followUpActions && <p className="mb-1 small text-muted"><strong>Follow-up:</strong> {r.followUpActions}</p>}
                            <div className="d-flex gap-2 mt-1">
                              {r.progressNoted && <span className="badge bg-success">Progress</span>}
                              {r.concernsFlagged && <span className="badge bg-warning text-dark">Concerns Flagged</span>}
                              {r.referralMade && <span className="badge bg-primary">Referral Made</span>}
                            </div>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger ms-3 flex-shrink-0"
                            onClick={() => { setDeleteError(null); setDeleteTarget({ type: 'recording', id: r.recordingId }); }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showAddRecording && (
              <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeAddRecording}>
                <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
                  <form onSubmit={handleAddRecording}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Add Process Recording</h5>
                        <button type="button" className="btn-close" onClick={closeAddRecording} disabled={formBusy} />
                      </div>
                      <div className="modal-body">
                        {formError && <div className="alert alert-danger">{formError}</div>}
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">Session Date <span className="text-danger">*</span></label>
                            <input type="date" className="form-control" required value={recordingForm.sessionDate}
                              onChange={e => setRecordingForm(f => ({ ...f, sessionDate: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Social Worker <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" required value={recordingForm.socialWorker}
                              onChange={e => setRecordingForm(f => ({ ...f, socialWorker: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Session Type <span className="text-danger">*</span></label>
                            <select className="form-select" required value={recordingForm.sessionType}
                              onChange={e => setRecordingForm(f => ({ ...f, sessionType: e.target.value }))}>
                              <option>Individual</option>
                              <option>Group</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Duration (minutes) <span className="text-danger">*</span></label>
                            <input type="number" className="form-control" min={1} required value={recordingForm.sessionDurationMinutes}
                              onChange={e => setRecordingForm(f => ({ ...f, sessionDurationMinutes: Number(e.target.value) }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Emotional State (Start)</label>
                            <input type="text" className="form-control" value={recordingForm.emotionalStateObserved ?? ''}
                              onChange={e => setRecordingForm(f => ({ ...f, emotionalStateObserved: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Emotional State (End)</label>
                            <input type="text" className="form-control" value={recordingForm.emotionalStateEnd ?? ''}
                              onChange={e => setRecordingForm(f => ({ ...f, emotionalStateEnd: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Session Narrative</label>
                            <textarea className="form-control" rows={3} value={recordingForm.sessionNarrative ?? ''}
                              onChange={e => setRecordingForm(f => ({ ...f, sessionNarrative: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Interventions Applied</label>
                            <textarea className="form-control" rows={2} value={recordingForm.interventionsApplied ?? ''}
                              onChange={e => setRecordingForm(f => ({ ...f, interventionsApplied: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Follow-Up Actions</label>
                            <textarea className="form-control" rows={2} value={recordingForm.followUpActions ?? ''}
                              onChange={e => setRecordingForm(f => ({ ...f, followUpActions: e.target.value }))} />
                          </div>
                          <div className="col-12 d-flex gap-4">
                            <div className="form-check">
                              <input type="checkbox" className="form-check-input" id="progressNoted" checked={recordingForm.progressNoted}
                                onChange={e => setRecordingForm(f => ({ ...f, progressNoted: e.target.checked }))} />
                              <label className="form-check-label" htmlFor="progressNoted">Progress Noted</label>
                            </div>
                            <div className="form-check">
                              <input type="checkbox" className="form-check-input" id="concernsFlagged" checked={recordingForm.concernsFlagged}
                                onChange={e => setRecordingForm(f => ({ ...f, concernsFlagged: e.target.checked }))} />
                              <label className="form-check-label" htmlFor="concernsFlagged">Concerns Flagged</label>
                            </div>
                            <div className="form-check">
                              <input type="checkbox" className="form-check-input" id="referralMade" checked={recordingForm.referralMade}
                                onChange={e => setRecordingForm(f => ({ ...f, referralMade: e.target.checked }))} />
                              <label className="form-check-label" htmlFor="referralMade">Referral Made</label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeAddRecording} disabled={formBusy}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={formBusy}>
                          {formBusy ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                          Save Recording
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* Visitations */}
        {activeTab === 'visitations' && (
          <>
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Home Visitations ({visitations.length})</span>
                <button className="btn btn-sm btn-primary" onClick={() => { setFormError(null); setShowAddVisitation(true); }}>
                  + Add Visitation
                </button>
              </div>
              <div className="card-body">
                {visitations.length === 0 ? <p className="text-muted">No visitations yet.</p> : (
                  <div className="list-group list-group-flush">
                    {visitations.map(v => (
                      <div key={v.visitationId} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong>{v.visitDate}</strong>
                              <span className="text-muted small">{v.visitType} · {v.socialWorker}</span>
                            </div>
                            {v.locationVisited && <p className="mb-1 small">{v.locationVisited}</p>}
                            {v.observations && <p className="mb-1 small text-muted">{v.observations}</p>}
                            {v.followUpNotes && <p className="mb-1 small text-muted"><strong>Follow-up:</strong> {v.followUpNotes}</p>}
                            <div className="d-flex gap-2">
                              <span className={`badge bg-${v.visitOutcome === 'Favorable' ? 'success' : v.visitOutcome === 'Unfavorable' ? 'danger' : 'secondary'}`}>{v.visitOutcome}</span>
                              {v.safetyConcernsNoted && <span className="badge bg-danger">Safety Concerns</span>}
                              {v.followUpNeeded && <span className="badge bg-warning text-dark">Follow-Up Needed</span>}
                            </div>
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger ms-3 flex-shrink-0"
                            onClick={() => { setDeleteError(null); setDeleteTarget({ type: 'visitation', id: v.visitationId }); }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showAddVisitation && (
              <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeAddVisitation}>
                <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
                  <form onSubmit={handleAddVisitation}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Add Home Visitation</h5>
                        <button type="button" className="btn-close" onClick={closeAddVisitation} disabled={formBusy} />
                      </div>
                      <div className="modal-body">
                        {formError && <div className="alert alert-danger">{formError}</div>}
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">Visit Date <span className="text-danger">*</span></label>
                            <input type="date" className="form-control" required value={visitationForm.visitDate}
                              onChange={e => setVisitationForm(f => ({ ...f, visitDate: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Social Worker <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" required value={visitationForm.socialWorker}
                              onChange={e => setVisitationForm(f => ({ ...f, socialWorker: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Visit Type <span className="text-danger">*</span></label>
                            <select className="form-select" required value={visitationForm.visitType}
                              onChange={e => setVisitationForm(f => ({ ...f, visitType: e.target.value }))}>
                              <option>Initial Assessment</option>
                              <option>Routine Follow-Up</option>
                              <option>Reintegration Assessment</option>
                              <option>Post-Placement Monitoring</option>
                              <option>Emergency</option>
                            </select>
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Location Visited</label>
                            <input type="text" className="form-control" value={visitationForm.locationVisited ?? ''}
                              onChange={e => setVisitationForm(f => ({ ...f, locationVisited: e.target.value }))} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label">Family Members Present</label>
                            <input type="text" className="form-control" value={visitationForm.familyMembersPresent ?? ''}
                              onChange={e => setVisitationForm(f => ({ ...f, familyMembersPresent: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Purpose</label>
                            <input type="text" className="form-control" value={visitationForm.purpose ?? ''}
                              onChange={e => setVisitationForm(f => ({ ...f, purpose: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Observations</label>
                            <textarea className="form-control" rows={3} value={visitationForm.observations ?? ''}
                              onChange={e => setVisitationForm(f => ({ ...f, observations: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Family Cooperation Level</label>
                            <select className="form-select" value={visitationForm.familyCooperationLevel ?? 'Moderate'}
                              onChange={e => setVisitationForm(f => ({ ...f, familyCooperationLevel: e.target.value }))}>
                              <option>High</option>
                              <option>Moderate</option>
                              <option>Low</option>
                              <option>None</option>
                            </select>
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Visit Outcome</label>
                            <select className="form-select" value={visitationForm.visitOutcome ?? 'Neutral'}
                              onChange={e => setVisitationForm(f => ({ ...f, visitOutcome: e.target.value }))}>
                              <option>Favorable</option>
                              <option>Neutral</option>
                              <option>Unfavorable</option>
                              <option>Inconclusive</option>
                            </select>
                          </div>
                          <div className="col-12">
                            <label className="form-label">Follow-Up Notes</label>
                            <textarea className="form-control" rows={2} value={visitationForm.followUpNotes ?? ''}
                              onChange={e => setVisitationForm(f => ({ ...f, followUpNotes: e.target.value }))} />
                          </div>
                          <div className="col-12 d-flex gap-4">
                            <div className="form-check">
                              <input type="checkbox" className="form-check-input" id="safetyConcerns" checked={visitationForm.safetyConcernsNoted}
                                onChange={e => setVisitationForm(f => ({ ...f, safetyConcernsNoted: e.target.checked }))} />
                              <label className="form-check-label" htmlFor="safetyConcerns">Safety Concerns Noted</label>
                            </div>
                            <div className="form-check">
                              <input type="checkbox" className="form-check-input" id="followUpNeeded" checked={visitationForm.followUpNeeded}
                                onChange={e => setVisitationForm(f => ({ ...f, followUpNeeded: e.target.checked }))} />
                              <label className="form-check-label" htmlFor="followUpNeeded">Follow-Up Needed</label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeAddVisitation} disabled={formBusy}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={formBusy}>
                          {formBusy ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                          Save Visitation
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* Plans */}
        {activeTab === 'plans' && (
          <div className="card">
            <div className="card-header">
              Intervention Plans ({plans.length})
            </div>
            <div className="card-body">
              {plans.length === 0 ? (
                <p className="text-muted">No plans yet.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {plans.map((p: any) => (
                    <div key={p.planId} className="list-group-item px-0">
                      <div className="d-flex justify-content-between">
                        <strong>{p.planCategory}</strong>
                        <span
                          className={`badge bg-${p.status === 'Achieved' ? 'success' : 'secondary'}`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="mb-1 small">{p.planDescription}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conferences */}
        {activeTab === 'conferences' && (
          <>
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Case Conferences ({conferences.length})</span>
                <button className="btn btn-sm btn-primary" onClick={() => { setFormError(null); setShowAddConference(true); }}>
                  + Add Conference
                </button>
              </div>
              <div className="card-body">
                {conferences.length === 0 ? <p className="text-muted">No conferences yet.</p> : (
                  <div className="list-group list-group-flush">
                    {conferences.map(c => (
                      <div key={c.conferenceId} className="list-group-item px-0">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong>{c.conferenceDate}</strong>
                              <span className="text-muted small">{c.facilitatedBy}</span>
                            </div>
                            <p className="mb-1 small"><strong>Agenda:</strong> {c.agenda}</p>
                            {c.decisions && <p className="mb-1 small"><strong>Decisions:</strong> {c.decisions}</p>}
                            {c.nextSteps && <p className="mb-0 small"><strong>Next Steps:</strong> {c.nextSteps}</p>}
                            {c.nextReviewDate && <p className="mb-0 small text-muted">Next review: {c.nextReviewDate}</p>}
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger ms-3 flex-shrink-0"
                            onClick={() => { setDeleteError(null); setDeleteTarget({ type: 'conference', id: c.conferenceId }); }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {showAddConference && (
              <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeAddConference}>
                <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
                  <form onSubmit={handleAddConference}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Add Case Conference</h5>
                        <button type="button" className="btn-close" onClick={closeAddConference} disabled={formBusy} />
                      </div>
                      <div className="modal-body">
                        {formError && <div className="alert alert-danger">{formError}</div>}
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">Conference Date <span className="text-danger">*</span></label>
                            <input type="date" className="form-control" required value={conferenceForm.conferenceDate}
                              onChange={e => setConferenceForm(f => ({ ...f, conferenceDate: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Facilitated By <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" required value={conferenceForm.facilitatedBy}
                              onChange={e => setConferenceForm(f => ({ ...f, facilitatedBy: e.target.value }))} />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">Next Review Date</label>
                            <input type="date" className="form-control" value={conferenceForm.nextReviewDate ?? ''}
                              onChange={e => setConferenceForm(f => ({ ...f, nextReviewDate: e.target.value || null }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Attendees <span className="text-danger">*</span></label>
                            <input type="text" className="form-control" required value={conferenceForm.attendees}
                              onChange={e => setConferenceForm(f => ({ ...f, attendees: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Agenda <span className="text-danger">*</span></label>
                            <textarea className="form-control" rows={2} required value={conferenceForm.agenda}
                              onChange={e => setConferenceForm(f => ({ ...f, agenda: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Decisions</label>
                            <textarea className="form-control" rows={2} value={conferenceForm.decisions ?? ''}
                              onChange={e => setConferenceForm(f => ({ ...f, decisions: e.target.value }))} />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Next Steps</label>
                            <textarea className="form-control" rows={2} value={conferenceForm.nextSteps ?? ''}
                              onChange={e => setConferenceForm(f => ({ ...f, nextSteps: e.target.value }))} />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={closeAddConference} disabled={formBusy}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={formBusy}>
                          {formBusy ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                          Save Conference
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* Predictions */}
        {activeTab === 'predictions' && (
          <div className="card">
            <div className="card-header">
              ML Predictions ({predictions.length})
            </div>
            <div className="card-body">
              {predictions.length === 0 ? (
                <p className="text-muted">No predictions available.</p>
              ) : (
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Score</th>
                      <th>Label</th>
                      <th>Generated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => (
                      <tr key={p.predictionId}>
                        <td>{p.modelName}</td>
                        <td>{(p.score * 100).toFixed(1)}%</td>
                        <td>{p.label ?? '—'}</td>
                        <td>{new Date(p.generatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      <DeleteConfirmModal
        open={deleteTarget !== null}
        title={`Delete ${deleteTarget?.type ?? ''}`}
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This cannot be undone.`}
        confirmLabel="Delete"
        busy={deleteBusy}
        error={deleteError ?? undefined}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
      />
    </div>
  );
}
