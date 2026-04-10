import { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import type {
  ResidentDetail,
  ProcessRecording,
  ProcessRecordingFormData,
  HomeVisitation,
  HomeVisitationFormData,
  CaseConference,
  UpdateHomeVisitationRequest,
  UpdateProcessRecordingRequest,
  UpdateResidentRequest,
} from '../types/ResidentDetail';
import {
  getResidentById,
  addRecording,
  updateRecording,
  deleteRecording,
  addVisitation,
  updateVisitation,
  deleteVisitation,
  updateResident,
} from '../lib/residentAPI';
import {
  addCaseConference,
  deleteCaseConference,
} from '../lib/caseConferenceAPI';
import {
  RESIDENT_BIRTH_STATUSES,
  RESIDENT_CASE_CATEGORIES,
  RESIDENT_CASE_STATUSES,
  RESIDENT_REFERRAL_SOURCES,
  RESIDENT_RISK_LEVELS,
  RESIDENT_REINTEGRATION_STATUSES,
  RESIDENT_REINTEGRATION_TYPES,
  RESIDENT_SAFEHOUSE_IDS,
} from '../lib/residentOptions';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 10;

const RISK_COLORS: Record<string, string> = {
  Low: 'success',
  Medium: 'warning',
  High: 'danger',
  Critical: 'dark',
};

const RECORDING_SESSION_TYPES = ['Individual', 'Group'] as const;
const VISITATION_TYPES = [
  'Initial Assessment',
  'Routine Follow-Up',
  'Reintegration Assessment',
  'Post-Placement Monitoring',
  'Emergency',
] as const;
const FAMILY_COOPERATION_LEVELS = [
  'Highly Cooperative',
  'Cooperative',
  'Neutral',
  'Uncooperative',
] as const;
const VISIT_OUTCOMES = [
  'Favorable',
  'Needs Improvement',
  'Unfavorable',
  'Inconclusive',
] as const;

const EMPTY_RECORDING_FORM: ProcessRecordingFormData = {
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

const EMPTY_VISITATION_FORM: HomeVisitationFormData = {
  visitDate: '',
  socialWorker: '',
  visitType: 'Routine Follow-Up',
  locationVisited: '',
  familyMembersPresent: '',
  purpose: '',
  observations: '',
  familyCooperationLevel: 'Cooperative',
  safetyConcernsNoted: false,
  followUpNeeded: false,
  followUpNotes: '',
  visitOutcome: 'Needs Improvement',
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

type EditableResident = UpdateResidentRequest;
type RecordingFormState = ProcessRecordingFormData;
type VisitationFormState = HomeVisitationFormData;

type RecordingFormFieldsProps = {
  form: RecordingFormState;
  onChange: <K extends keyof RecordingFormState>(
    field: K,
    value: RecordingFormState[K]
  ) => void;
  idPrefix: string;
};

type VisitationFormFieldsProps = {
  form: VisitationFormState;
  onChange: <K extends keyof VisitationFormState>(
    field: K,
    value: VisitationFormState[K]
  ) => void;
  idPrefix: string;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOption<T extends readonly string[]>(
  value: string | null | undefined,
  allowedOptions: T,
  fallback: T[number]
): T[number] {
  const trimmed = normalizeText(value);
  const matched = allowedOptions.find((option) => option === trimmed);
  return matched ?? fallback;
}

function normalizeCooperationLevel(
  value: string | null | undefined
): (typeof FAMILY_COOPERATION_LEVELS)[number] {
  const aliases: Record<string, (typeof FAMILY_COOPERATION_LEVELS)[number]> = {
    High: 'Highly Cooperative',
    Moderate: 'Cooperative',
    Low: 'Neutral',
    None: 'Uncooperative',
  };

  const trimmed = normalizeText(value);
  return normalizeOption(
    aliases[trimmed] ?? trimmed,
    FAMILY_COOPERATION_LEVELS,
    'Cooperative'
  );
}

function normalizeVisitOutcome(
  value: string | null | undefined
): (typeof VISIT_OUTCOMES)[number] {
  const trimmed = normalizeText(value);
  const normalized = trimmed === 'Neutral' ? 'Needs Improvement' : trimmed;
  return normalizeOption(normalized, VISIT_OUTCOMES, 'Needs Improvement');
}

function toRecordingForm(recording: ProcessRecording): UpdateProcessRecordingRequest {
  return {
    sessionDate: recording.sessionDate,
    socialWorker: normalizeText(recording.socialWorker),
    sessionType: normalizeOption(
      recording.sessionType,
      RECORDING_SESSION_TYPES,
      'Individual'
    ),
    sessionDurationMinutes: recording.sessionDurationMinutes,
    emotionalStateObserved: normalizeText(recording.emotionalStateObserved),
    emotionalStateEnd: normalizeText(recording.emotionalStateEnd),
    sessionNarrative: normalizeText(recording.sessionNarrative),
    interventionsApplied: normalizeText(recording.interventionsApplied),
    followUpActions: normalizeText(recording.followUpActions),
    progressNoted: recording.progressNoted,
    concernsFlagged: recording.concernsFlagged,
    referralMade: recording.referralMade,
  };
}

function toVisitationForm(visitation: HomeVisitation): UpdateHomeVisitationRequest {
  return {
    visitDate: visitation.visitDate,
    socialWorker: normalizeText(visitation.socialWorker),
    visitType: normalizeOption(
      visitation.visitType,
      VISITATION_TYPES,
      'Routine Follow-Up'
    ),
    locationVisited: normalizeText(visitation.locationVisited),
    familyMembersPresent: normalizeText(visitation.familyMembersPresent),
    purpose: normalizeText(visitation.purpose),
    observations: normalizeText(visitation.observations),
    familyCooperationLevel: normalizeCooperationLevel(
      visitation.familyCooperationLevel
    ),
    safetyConcernsNoted: visitation.safetyConcernsNoted,
    followUpNeeded: visitation.followUpNeeded,
    followUpNotes: normalizeText(visitation.followUpNotes),
    visitOutcome: normalizeVisitOutcome(visitation.visitOutcome),
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function RecordingFormFields({
  form,
  onChange,
  idPrefix,
}: RecordingFormFieldsProps) {
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <label className="form-label">
          Session Date <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          className="form-control"
          required
          value={form.sessionDate}
          onChange={(e) => onChange('sessionDate', e.target.value)}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">
          Social Worker <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          required
          value={form.socialWorker}
          onChange={(e) => onChange('socialWorker', e.target.value)}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">
          Session Type <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          required
          value={form.sessionType}
          onChange={(e) => onChange('sessionType', e.target.value)}
        >
          {RECORDING_SESSION_TYPES.map((sessionType) => (
            <option key={sessionType} value={sessionType}>
              {sessionType}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">
          Duration (minutes) <span className="text-danger">*</span>
        </label>
        <input
          type="number"
          className="form-control"
          min={1}
          required
          value={form.sessionDurationMinutes}
          onChange={(e) =>
            onChange('sessionDurationMinutes', Number(e.target.value))
          }
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">Emotional State (Start)</label>
        <input
          type="text"
          className="form-control"
          value={form.emotionalStateObserved ?? ''}
          onChange={(e) => onChange('emotionalStateObserved', e.target.value)}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">Emotional State (End)</label>
        <input
          type="text"
          className="form-control"
          value={form.emotionalStateEnd ?? ''}
          onChange={(e) => onChange('emotionalStateEnd', e.target.value)}
        />
      </div>
      <div className="col-12">
        <label className="form-label">Session Narrative</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.sessionNarrative ?? ''}
          onChange={(e) => onChange('sessionNarrative', e.target.value)}
        />
      </div>
      <div className="col-12">
        <label className="form-label">Interventions Applied</label>
        <textarea
          className="form-control"
          rows={2}
          value={form.interventionsApplied ?? ''}
          onChange={(e) => onChange('interventionsApplied', e.target.value)}
        />
      </div>
      <div className="col-12">
        <label className="form-label">Follow-Up Actions</label>
        <textarea
          className="form-control"
          rows={2}
          value={form.followUpActions ?? ''}
          onChange={(e) => onChange('followUpActions', e.target.value)}
        />
      </div>
      <div className="col-12 d-flex gap-4">
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id={`${idPrefix}-progressNoted`}
            checked={form.progressNoted}
            onChange={(e) => onChange('progressNoted', e.target.checked)}
          />
          <label
            className="form-check-label"
            htmlFor={`${idPrefix}-progressNoted`}
          >
            Progress Noted
          </label>
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id={`${idPrefix}-concernsFlagged`}
            checked={form.concernsFlagged}
            onChange={(e) => onChange('concernsFlagged', e.target.checked)}
          />
          <label
            className="form-check-label"
            htmlFor={`${idPrefix}-concernsFlagged`}
          >
            Concerns Flagged
          </label>
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id={`${idPrefix}-referralMade`}
            checked={form.referralMade}
            onChange={(e) => onChange('referralMade', e.target.checked)}
          />
          <label
            className="form-check-label"
            htmlFor={`${idPrefix}-referralMade`}
          >
            Referral Made
          </label>
        </div>
      </div>
    </div>
  );
}

function VisitationFormFields({
  form,
  onChange,
  idPrefix,
}: VisitationFormFieldsProps) {
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <label className="form-label">
          Visit Date <span className="text-danger">*</span>
        </label>
        <input
          type="date"
          className="form-control"
          required
          value={form.visitDate}
          onChange={(e) => onChange('visitDate', e.target.value)}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">
          Social Worker <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          required
          value={form.socialWorker}
          onChange={(e) => onChange('socialWorker', e.target.value)}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">
          Visit Type <span className="text-danger">*</span>
        </label>
        <select
          className="form-select"
          required
          value={form.visitType}
          onChange={(e) => onChange('visitType', e.target.value)}
        >
          {VISITATION_TYPES.map((visitType) => (
            <option key={visitType} value={visitType}>
              {visitType}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-6">
        <label className="form-label">
          Location Visited <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          required
          value={form.locationVisited ?? ''}
          onChange={(e) => onChange('locationVisited', e.target.value)}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label">Family Members Present</label>
        <input
          type="text"
          className="form-control"
          value={form.familyMembersPresent ?? ''}
          onChange={(e) => onChange('familyMembersPresent', e.target.value)}
        />
      </div>
      <div className="col-12">
        <label className="form-label">Purpose</label>
        <input
          type="text"
          className="form-control"
          value={form.purpose ?? ''}
          onChange={(e) => onChange('purpose', e.target.value)}
        />
      </div>
      <div className="col-12">
        <label className="form-label">Observations</label>
        <textarea
          className="form-control"
          rows={3}
          value={form.observations ?? ''}
          onChange={(e) => onChange('observations', e.target.value)}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label">Family Cooperation Level</label>
        <select
          className="form-select"
          value={form.familyCooperationLevel ?? 'Cooperative'}
          onChange={(e) =>
            onChange('familyCooperationLevel', e.target.value)
          }
        >
          {FAMILY_COOPERATION_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">Visit Outcome</label>
        <select
          className="form-select"
          value={form.visitOutcome ?? 'Needs Improvement'}
          onChange={(e) => onChange('visitOutcome', e.target.value)}
        >
          {VISIT_OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {outcome}
            </option>
          ))}
        </select>
      </div>
      <div className="col-12">
        <label className="form-label">Follow-Up Notes</label>
        <textarea
          className="form-control"
          rows={2}
          value={form.followUpNotes ?? ''}
          onChange={(e) => onChange('followUpNotes', e.target.value)}
        />
      </div>
      <div className="col-12 d-flex gap-4">
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id={`${idPrefix}-safetyConcerns`}
            checked={form.safetyConcernsNoted}
            onChange={(e) => onChange('safetyConcernsNoted', e.target.checked)}
          />
          <label
            className="form-check-label"
            htmlFor={`${idPrefix}-safetyConcerns`}
          >
            Safety Concerns Noted
          </label>
        </div>
        <div className="form-check">
          <input
            type="checkbox"
            className="form-check-input"
            id={`${idPrefix}-followUpNeeded`}
            checked={form.followUpNeeded}
            onChange={(e) => onChange('followUpNeeded', e.target.checked)}
          />
          <label
            className="form-check-label"
            htmlFor={`${idPrefix}-followUpNeeded`}
          >
            Follow-Up Needed
          </label>
        </div>
      </div>
    </div>
  );
}

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const residentId = Number(id);
  const location = useLocation();

  const [detail, setDetail] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [highlightedRecordingId, setHighlightedRecordingId] = useState<
    number | null
  >(null);
  const [currentRecordingPage, setCurrentRecordingPage] = useState(1);
  const [highlightedVisitationId, setHighlightedVisitationId] = useState<
    number | null
  >(null);
  const [currentVisitationPage, setCurrentVisitationPage] = useState(1);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditableResident | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showAddRecording, setShowAddRecording] = useState(false);
  const [showEditRecording, setShowEditRecording] = useState(false);
  const [showAddVisitation, setShowAddVisitation] = useState(false);
  const [showEditVisitation, setShowEditVisitation] = useState(false);
  const [showAddConference, setShowAddConference] = useState(false);

  const [recordingForm, setRecordingForm] = useState<RecordingFormState>({
    ...EMPTY_RECORDING_FORM,
  });
  const [editRecordingId, setEditRecordingId] = useState<number | null>(null);
  const [editRecordingForm, setEditRecordingForm] = useState<RecordingFormState>({
    ...EMPTY_RECORDING_FORM,
  });
  const [visitationForm, setVisitationForm] = useState<VisitationFormState>({
    ...EMPTY_VISITATION_FORM,
  });
  const [editVisitationId, setEditVisitationId] = useState<number | null>(null);
  const [editVisitationForm, setEditVisitationForm] =
    useState<VisitationFormState>({
      ...EMPTY_VISITATION_FORM,
    });
  const [conferenceForm, setConferenceForm] = useState({
    ...EMPTY_CONFERENCE,
    residentId,
  });

  const [addRecordingBusy, setAddRecordingBusy] = useState(false);
  const [addRecordingError, setAddRecordingError] = useState<string | null>(
    null
  );
  const [editRecordingBusy, setEditRecordingBusy] = useState(false);
  const [editRecordingError, setEditRecordingError] = useState<string | null>(
    null
  );
  const [addVisitationBusy, setAddVisitationBusy] = useState(false);
  const [addVisitationError, setAddVisitationError] = useState<string | null>(
    null
  );
  const [editVisitationBusy, setEditVisitationBusy] = useState(false);
  const [editVisitationError, setEditVisitationError] = useState<string | null>(
    null
  );
  const [conferenceBusy, setConferenceBusy] = useState(false);
  const [conferenceError, setConferenceError] = useState<string | null>(null);

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
    setRecordingForm({ ...EMPTY_RECORDING_FORM });
    setEditRecordingForm({ ...EMPTY_RECORDING_FORM });
    setEditRecordingId(null);
    setVisitationForm({ ...EMPTY_VISITATION_FORM });
    setEditVisitationForm({ ...EMPTY_VISITATION_FORM });
    setEditVisitationId(null);
    setConferenceForm((f) => ({ ...f, residentId }));
  }, [residentId]);

  // Read tab and highlightId from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const highlightId = params.get('highlightId');
    if (tab === 'recordings' || tab === 'visitations') setActiveTab(tab);
    if (highlightId) {
      if (tab === 'visitations') {
        setHighlightedVisitationId(Number(highlightId));
      } else {
        setHighlightedRecordingId(Number(highlightId));
      }
    }
  }, [location.search]);

  // Scroll to, page to, and clear highlighted recording once data loads
  useEffect(() => {
    if (!highlightedRecordingId || !detail) return;
    const recs = detail.recordings;
    const idx = recs.findIndex((r) => r.recordingId === highlightedRecordingId);
    if (idx >= 0) {
      setCurrentRecordingPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
    }
    const scrollTimer = setTimeout(() => {
      document
        .getElementById('recording-' + highlightedRecordingId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    const clearTimer = setTimeout(() => setHighlightedRecordingId(null), 4000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightedRecordingId, detail]);

  // Scroll to, page to, and clear highlighted visitation once data loads
  useEffect(() => {
    if (!highlightedVisitationId || !detail) return;
    const visits = detail.visitations;
    const idx = visits.findIndex(
      (v) => v.visitationId === highlightedVisitationId
    );
    if (idx >= 0) {
      setCurrentVisitationPage(Math.floor(idx / ITEMS_PER_PAGE) + 1);
    }
    const scrollTimer = setTimeout(() => {
      document
        .getElementById('visitation-' + highlightedVisitationId)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    const clearTimer = setTimeout(() => setHighlightedVisitationId(null), 4000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightedVisitationId, detail]);

  if (loading)
    return (
      <div className="container py-5 text-center">
        <div
          className="spinner-border"
          style={{ color: 'var(--brand-primary)' }}
        />
      </div>
    );
  if (!detail)
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Resident not found.</div>
      </div>
    );

  const { resident, recordings, visitations, plans, conferences, predictions } =
    detail;

  const setRecordingField = <K extends keyof RecordingFormState>(
    field: K,
    value: RecordingFormState[K]
  ) => setRecordingForm((f) => ({ ...f, [field]: value }));

  const setEditRecordingField = <K extends keyof RecordingFormState>(
    field: K,
    value: RecordingFormState[K]
  ) => setEditRecordingForm((f) => ({ ...f, [field]: value }));

  const setVisitationField = <K extends keyof VisitationFormState>(
    field: K,
    value: VisitationFormState[K]
  ) => setVisitationForm((f) => ({ ...f, [field]: value }));

  const setEditVisitationField = <K extends keyof VisitationFormState>(
    field: K,
    value: VisitationFormState[K]
  ) => setEditVisitationForm((f) => ({ ...f, [field]: value }));

  async function handleAddRecording(e: React.FormEvent) {
    e.preventDefault();
    setAddRecordingBusy(true);
    setAddRecordingError(null);
    try {
      await addRecording(residentId, recordingForm);
      await refresh();
      closeAddRecording();
    } catch (error) {
      setAddRecordingError(
        getErrorMessage(error, 'Failed to save recording. Please try again.')
      );
    } finally {
      setAddRecordingBusy(false);
    }
  }

  async function handleAddVisitation(e: React.FormEvent) {
    e.preventDefault();
    setAddVisitationBusy(true);
    setAddVisitationError(null);
    try {
      await addVisitation(residentId, visitationForm);
      await refresh();
      closeAddVisitation();
    } catch (error) {
      setAddVisitationError(
        getErrorMessage(error, 'Failed to save visitation. Please try again.')
      );
    } finally {
      setAddVisitationBusy(false);
    }
  }

  async function handleAddConference(e: React.FormEvent) {
    e.preventDefault();
    setConferenceBusy(true);
    setConferenceError(null);
    try {
      await addCaseConference(conferenceForm);
      await refresh();
      closeAddConference();
    } catch {
      setConferenceError('Failed to save conference. Please try again.');
    } finally {
      setConferenceBusy(false);
    }
  }

  async function handleEditRecording(e: React.FormEvent) {
    e.preventDefault();
    if (!editRecordingId) return;
    setEditRecordingBusy(true);
    setEditRecordingError(null);
    try {
      await updateRecording(residentId, editRecordingId, editRecordingForm);
      await refresh();
      closeEditRecording();
    } catch (error) {
      setEditRecordingError(
        getErrorMessage(error, 'Failed to update recording. Please try again.')
      );
    } finally {
      setEditRecordingBusy(false);
    }
  }

  async function handleEditVisitation(e: React.FormEvent) {
    e.preventDefault();
    if (!editVisitationId) return;
    setEditVisitationBusy(true);
    setEditVisitationError(null);
    try {
      await updateVisitation(residentId, editVisitationId, editVisitationForm);
      await refresh();
      closeEditVisitation();
    } catch (error) {
      setEditVisitationError(
        getErrorMessage(
          error,
          'Failed to update visitation. Please try again.'
        )
      );
    } finally {
      setEditVisitationBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      if (deleteTarget.type === 'recording')
        await deleteRecording(residentId, deleteTarget.id);
      else if (deleteTarget.type === 'visitation')
        await deleteVisitation(residentId, deleteTarget.id);
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
    setEditForm({
      safehouseId: resident.safehouseId,
      caseStatus: resident.caseStatus,
      sex: resident.sex,
      dateOfBirth: resident.dateOfBirth,
      birthStatus: resident.birthStatus,
      placeOfBirth: resident.placeOfBirth,
      religion: resident.religion,
      caseCategory: resident.caseCategory,
      subCatOrphaned: resident.subCatOrphaned,
      subCatTrafficked: resident.subCatTrafficked,
      subCatChildLabor: resident.subCatChildLabor,
      subCatPhysicalAbuse: resident.subCatPhysicalAbuse,
      subCatSexualAbuse: resident.subCatSexualAbuse,
      subCatOsaec: resident.subCatOsaec,
      subCatCicl: resident.subCatCicl,
      subCatAtRisk: resident.subCatAtRisk,
      subCatStreetChild: resident.subCatStreetChild,
      subCatChildWithHiv: resident.subCatChildWithHiv,
      isPwd: resident.isPwd,
      pwdType: resident.pwdType,
      hasSpecialNeeds: resident.hasSpecialNeeds,
      specialNeedsDiagnosis: resident.specialNeedsDiagnosis,
      familyIs4Ps: resident.familyIs4Ps,
      familySoloParent: resident.familySoloParent,
      familyIndigenous: resident.familyIndigenous,
      familyParentPwd: resident.familyParentPwd,
      familyInformalSettler: resident.familyInformalSettler,
      dateOfAdmission: resident.dateOfAdmission,
      referralSource: resident.referralSource,
      referringAgencyPerson: resident.referringAgencyPerson,
      assignedSocialWorker: resident.assignedSocialWorker,
      initialCaseAssessment: resident.initialCaseAssessment,
      reintegrationType: resident.reintegrationType,
      reintegrationStatus: resident.reintegrationStatus,
      initialRiskLevel: resident.initialRiskLevel,
      currentRiskLevel: resident.currentRiskLevel,
      dateClosed: resident.dateClosed,
    });
    setEditError(null);
    setShowEdit(true);
  }
  function closeEdit() {
    if (editBusy) return;
    setShowEdit(false);
    setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    setEditBusy(true);
    setEditError(null);
    try {
      await updateResident(residentId, editForm);
      await refresh();
      setShowEdit(false);
    } catch (error) {
      setEditError(
        error instanceof Error
          ? error.message
          : 'Failed to save changes. Please try again.'
      );
    } finally {
      setEditBusy(false);
    }
  }

  const setEdit = <K extends keyof EditableResident>(
    field: K,
    value: EditableResident[K]
  ) => setEditForm((f) => (f ? { ...f, [field]: value } : f));

  function openAddRecording() {
    setRecordingForm({ ...EMPTY_RECORDING_FORM });
    setAddRecordingError(null);
    setShowAddRecording(true);
  }
  function closeAddRecording() {
    if (addRecordingBusy) return;
    setShowAddRecording(false);
    setAddRecordingError(null);
    setRecordingForm({ ...EMPTY_RECORDING_FORM });
  }
  function openEditRecording(recording: ProcessRecording) {
    setEditRecordingId(recording.recordingId);
    setEditRecordingForm(toRecordingForm(recording));
    setEditRecordingError(null);
    setShowEditRecording(true);
  }
  function closeEditRecording() {
    if (editRecordingBusy) return;
    setShowEditRecording(false);
    setEditRecordingId(null);
    setEditRecordingError(null);
    setEditRecordingForm({ ...EMPTY_RECORDING_FORM });
  }
  function openAddVisitation() {
    setVisitationForm({ ...EMPTY_VISITATION_FORM });
    setAddVisitationError(null);
    setShowAddVisitation(true);
  }
  function closeAddVisitation() {
    if (addVisitationBusy) return;
    setShowAddVisitation(false);
    setAddVisitationError(null);
    setVisitationForm({ ...EMPTY_VISITATION_FORM });
  }
  function openEditVisitation(visitation: HomeVisitation) {
    setEditVisitationId(visitation.visitationId);
    setEditVisitationForm(toVisitationForm(visitation));
    setEditVisitationError(null);
    setShowEditVisitation(true);
  }
  function closeEditVisitation() {
    if (editVisitationBusy) return;
    setShowEditVisitation(false);
    setEditVisitationId(null);
    setEditVisitationError(null);
    setEditVisitationForm({ ...EMPTY_VISITATION_FORM });
  }
  function closeAddConference() {
    if (conferenceBusy) return;
    setShowAddConference(false);
    setConferenceError(null);
    setConferenceForm({ ...EMPTY_CONFERENCE, residentId });
  }

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
          <div
            className="modal d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={closeEdit}
          >
            <div
              className="modal-dialog modal-xl modal-dialog-scrollable"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleEditSubmit}>
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">
                      Edit Resident — {resident.caseControlNo}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={closeEdit}
                      disabled={editBusy}
                    />
                  </div>
                  <div className="modal-body">
                    {editError && (
                      <div className="alert alert-danger">{editError}</div>
                    )}

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">
                      Basic Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">
                          Case Control No.{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          readOnly
                          value={resident.caseControlNo}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Internal Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          readOnly
                          value={resident.internalCode}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Safehouse ID <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.safehouseId}
                          onChange={(e) =>
                            setEdit('safehouseId', Number(e.target.value))
                          }
                        >
                          {RESIDENT_SAFEHOUSE_IDS.map((safehouseId) => (
                            <option key={safehouseId} value={safehouseId}>
                              {`Safehouse ${safehouseId}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Sex <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.sex}
                          onChange={(e) => setEdit('sex', e.target.value)}
                        >
                          <option value="F">F</option>
                          <option value="M">M</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Date of Birth <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          required
                          value={editForm.dateOfBirth}
                          onChange={(e) =>
                            setEdit('dateOfBirth', e.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Place of Birth <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editForm.placeOfBirth ?? ''}
                          onChange={(e) =>
                            setEdit('placeOfBirth', e.target.value || null)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Birth Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.birthStatus ?? ''}
                          onChange={(e) =>
                            setEdit('birthStatus', e.target.value || null)
                          }
                        >
                          <option value="">None</option>
                          {RESIDENT_BIRTH_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Religion <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editForm.religion ?? ''}
                          onChange={(e) =>
                            setEdit('religion', e.target.value || null)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Case Status <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.caseStatus}
                          onChange={(e) =>
                            setEdit('caseStatus', e.target.value)
                          }
                        >
                          {RESIDENT_CASE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">
                      Case Category &amp; Sub-categories
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <label className="form-label">
                          Case Category <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.caseCategory}
                          onChange={(e) =>
                            setEdit('caseCategory', e.target.value)
                          }
                        >
                          {RESIDENT_CASE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label d-block">
                          Sub-categories
                        </label>
                        <div className="row g-2">
                          {(
                            [
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
                            ] as const
                          ).map(([field, label]) => (
                            <div key={field} className="col-6">
                              <div className="form-check">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id={`edit-${field}`}
                                  checked={editForm[field] as boolean}
                                  onChange={(e) =>
                                    setEdit(field, e.target.checked)
                                  }
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`edit-${field}`}
                                >
                                  {label}
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">
                      Disability Information
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="edit-isPwd"
                            checked={editForm.isPwd}
                            onChange={(e) => setEdit('isPwd', e.target.checked)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor="edit-isPwd"
                          >
                            Person with Disability (PWD)
                          </label>
                        </div>
                      </div>
                      {editForm.isPwd && (
                        <div className="col-md-4">
                          <label className="form-label">PWD Type</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editForm.pwdType ?? ''}
                            onChange={(e) =>
                              setEdit('pwdType', e.target.value || null)
                            }
                          />
                        </div>
                      )}
                      <div className="col-md-3">
                        <div className="form-check mt-2">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="edit-hasSpecialNeeds"
                            checked={editForm.hasSpecialNeeds}
                            onChange={(e) =>
                              setEdit('hasSpecialNeeds', e.target.checked)
                            }
                          />
                          <label
                            className="form-check-label"
                            htmlFor="edit-hasSpecialNeeds"
                          >
                            Has Special Needs
                          </label>
                        </div>
                      </div>
                      {editForm.hasSpecialNeeds && (
                        <div className="col-md-4">
                          <label className="form-label">Diagnosis</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editForm.specialNeedsDiagnosis ?? ''}
                            onChange={(e) =>
                              setEdit(
                                'specialNeedsDiagnosis',
                                e.target.value || null
                              )
                            }
                          />
                        </div>
                      )}
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">
                      Family Socio-demographic Profile
                    </h6>
                    <div className="row g-2 mb-4">
                      {(
                        [
                          ['familyIs4Ps', '4Ps Beneficiary'],
                          ['familySoloParent', 'Solo Parent'],
                          ['familyIndigenous', 'Indigenous Group'],
                          ['familyParentPwd', 'Parent with Disability'],
                          ['familyInformalSettler', 'Informal Settler'],
                        ] as const
                      ).map(([field, label]) => (
                        <div key={field} className="col-md-4">
                          <div className="form-check">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id={`edit-${field}`}
                              checked={editForm[field] as boolean}
                              onChange={(e) => setEdit(field, e.target.checked)}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`edit-${field}`}
                            >
                              {label}
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">
                      Admission &amp; Referral
                    </h6>
                    <div className="row g-3 mb-4">
                      <div className="col-md-4">
                        <label className="form-label">
                          Date of Admission{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          required
                          value={editForm.dateOfAdmission}
                          onChange={(e) =>
                            setEdit('dateOfAdmission', e.target.value)
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Assigned Social Worker{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={editForm.assignedSocialWorker ?? ''}
                          onChange={(e) =>
                            setEdit(
                              'assignedSocialWorker',
                              e.target.value || null
                            )
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Referral Source <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.referralSource ?? ''}
                          onChange={(e) =>
                            setEdit('referralSource', e.target.value || null)
                          }
                        >
                          <option value="">None</option>
                          {RESIDENT_REFERRAL_SOURCES.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Referring Agency / Person
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.referringAgencyPerson ?? ''}
                          onChange={(e) =>
                            setEdit(
                              'referringAgencyPerson',
                              e.target.value || null
                            )
                          }
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Initial Risk Level{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.initialRiskLevel ?? ''}
                          onChange={(e) =>
                            setEdit('initialRiskLevel', e.target.value || null)
                          }
                        >
                          <option value="">— None —</option>
                          {RESIDENT_RISK_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Current Risk Level{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          required
                          value={editForm.currentRiskLevel ?? ''}
                          onChange={(e) =>
                            setEdit('currentRiskLevel', e.target.value || null)
                          }
                        >
                          <option value="">— None —</option>
                          {RESIDENT_RISK_LEVELS.map((level) => (
                            <option key={level} value={level}>
                              {level}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="form-label">
                          Initial Case Assessment{' '}
                          <span className="text-danger">*</span>
                        </label>
                        <textarea
                          className="form-control"
                          rows={2}
                          required
                          value={editForm.initialCaseAssessment ?? ''}
                          onChange={(e) =>
                            setEdit(
                              'initialCaseAssessment',
                              e.target.value || null
                            )
                          }
                        />
                      </div>
                    </div>

                    <h6 className="fw-semibold border-bottom pb-1 mb-3">
                      Reintegration
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Reintegration Type</label>
                        <select
                          className="form-select"
                          value={editForm.reintegrationType ?? ''}
                          onChange={(e) =>
                            setEdit('reintegrationType', e.target.value || null)
                          }
                        >
                          <option value="">— None —</option>
                          {RESIDENT_REINTEGRATION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">
                          Reintegration Status
                        </label>
                        <select
                          className="form-select"
                          value={editForm.reintegrationStatus ?? ''}
                          onChange={(e) =>
                            setEdit(
                              'reintegrationStatus',
                              e.target.value || null
                            )
                          }
                        >
                          <option value="">— None —</option>
                          {RESIDENT_REINTEGRATION_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Date Closed</label>
                        <input
                          type="date"
                          className="form-control"
                          value={editForm.dateClosed ?? ''}
                          onChange={(e) =>
                            setEdit('dateClosed', e.target.value || null)
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeEdit}
                      disabled={editBusy}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={editBusy}
                    >
                      {editBusy ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Saving…
                        </>
                      ) : (
                        'Save Changes'
                      )}
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
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={openEdit}
                  >
                    Edit
                  </button>
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
                <button
                  className="btn btn-sm btn-primary"
                  onClick={openAddRecording}
                >
                  + Add Recording
                </button>
              </div>
              <div className="card-body">
                {recordings.length === 0 ? (
                  <p className="text-muted">No recordings yet.</p>
                ) : (
                  <>
                    <p className="text-muted small mb-2">
                      Showing {(currentRecordingPage - 1) * ITEMS_PER_PAGE + 1}–
                      {Math.min(
                        currentRecordingPage * ITEMS_PER_PAGE,
                        recordings.length
                      )}{' '}
                      of {recordings.length} recordings
                    </p>
                    <div className="list-group list-group-flush">
                      {recordings
                        .slice(
                          (currentRecordingPage - 1) * ITEMS_PER_PAGE,
                          currentRecordingPage * ITEMS_PER_PAGE
                        )
                        .map((r) => (
                          <div
                            key={r.recordingId}
                            id={'recording-' + r.recordingId}
                            className="list-group-item px-0"
                            style={
                              r.recordingId === highlightedRecordingId
                                ? {
                                    backgroundColor: '#fff3cd',
                                    borderLeft: '4px solid #e8a838',
                                    borderRadius: '8px',
                                    padding: '12px',
                                  }
                                : undefined
                            }
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <strong>{r.sessionDate}</strong>
                                  <span className="text-muted small">
                                    {r.sessionType} · {r.sessionDurationMinutes}{' '}
                                    min · {r.socialWorker}
                                  </span>
                                </div>
                                {r.sessionNarrative && (
                                  <p className="mb-1 small">
                                    {r.sessionNarrative}
                                  </p>
                                )}
                                {r.interventionsApplied && (
                                  <p className="mb-1 small text-muted">
                                    <strong>Interventions:</strong>{' '}
                                    {r.interventionsApplied}
                                  </p>
                                )}
                                {r.followUpActions && (
                                  <p className="mb-1 small text-muted">
                                    <strong>Follow-up:</strong>{' '}
                                    {r.followUpActions}
                                  </p>
                                )}
                                <div className="d-flex gap-2 mt-1">
                                  {r.progressNoted && (
                                    <span className="badge bg-success">
                                      Progress
                                    </span>
                                  )}
                                  {r.concernsFlagged && (
                                    <span className="badge bg-warning text-dark">
                                      Concerns Flagged
                                    </span>
                                  )}
                                  {r.referralMade && (
                                    <span className="badge bg-primary">
                                      Referral Made
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex gap-2 ms-3 flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => openEditRecording(r)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeleteTarget({
                                      type: 'recording',
                                      id: r.recordingId,
                                    });
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-3">
                      <Pagination
                        page={currentRecordingPage}
                        totalCount={recordings.length}
                        pageSize={ITEMS_PER_PAGE}
                        onPageChange={setCurrentRecordingPage}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {showAddRecording && (
              <div
                className="modal d-block"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={closeAddRecording}
              >
                <div
                  className="modal-dialog modal-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form onSubmit={handleAddRecording}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Add Process Recording</h5>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={closeAddRecording}
                          disabled={addRecordingBusy}
                        />
                      </div>
                      <div className="modal-body">
                        {addRecordingError && (
                          <div className="alert alert-danger">
                            {addRecordingError}
                          </div>
                        )}
                        <RecordingFormFields
                          form={recordingForm}
                          onChange={setRecordingField}
                          idPrefix="add-recording"
                        />
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={closeAddRecording}
                          disabled={addRecordingBusy}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={addRecordingBusy}
                        >
                          {addRecordingBusy ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : null}
                          Save Recording
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showEditRecording && (
              <div
                className="modal d-block"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={closeEditRecording}
              >
                <div
                  className="modal-dialog modal-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form onSubmit={handleEditRecording}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Edit Process Recording</h5>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={closeEditRecording}
                          disabled={editRecordingBusy}
                        />
                      </div>
                      <div className="modal-body">
                        {editRecordingError && (
                          <div className="alert alert-danger">
                            {editRecordingError}
                          </div>
                        )}
                        <RecordingFormFields
                          form={editRecordingForm}
                          onChange={setEditRecordingField}
                          idPrefix="edit-recording"
                        />
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={closeEditRecording}
                          disabled={editRecordingBusy}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={editRecordingBusy}
                        >
                          {editRecordingBusy ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : null}
                          Save Changes
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
                <button
                  className="btn btn-sm btn-primary"
                  onClick={openAddVisitation}
                >
                  + Add Visitation
                </button>
              </div>
              <div className="card-body">
                {visitations.length === 0 ? (
                  <p className="text-muted">No visitations yet.</p>
                ) : (
                  <>
                    <p className="text-muted small mb-2">
                      Showing {(currentVisitationPage - 1) * ITEMS_PER_PAGE + 1}
                      –
                      {Math.min(
                        currentVisitationPage * ITEMS_PER_PAGE,
                        visitations.length
                      )}{' '}
                      of {visitations.length} visitations
                    </p>
                    <div className="list-group list-group-flush">
                      {visitations
                        .slice(
                          (currentVisitationPage - 1) * ITEMS_PER_PAGE,
                          currentVisitationPage * ITEMS_PER_PAGE
                        )
                        .map((v) => (
                          <div
                            key={v.visitationId}
                            id={'visitation-' + v.visitationId}
                            className="list-group-item px-0"
                            style={
                              v.visitationId === highlightedVisitationId
                                ? {
                                    backgroundColor: '#fff3cd',
                                    borderLeft: '4px solid #e8a838',
                                    borderRadius: '8px',
                                    padding: '12px',
                                  }
                                : undefined
                            }
                          >
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <strong>{v.visitDate}</strong>
                                  <span className="text-muted small">
                                    {v.visitType} · {v.socialWorker}
                                  </span>
                                </div>
                                {v.locationVisited && (
                                  <p className="mb-1 small">
                                    {v.locationVisited}
                                  </p>
                                )}
                                {v.observations && (
                                  <p className="mb-1 small text-muted">
                                    {v.observations}
                                  </p>
                                )}
                                {v.followUpNotes && (
                                  <p className="mb-1 small text-muted">
                                    <strong>Follow-up:</strong>{' '}
                                    {v.followUpNotes}
                                  </p>
                                )}
                                <div className="d-flex gap-2">
                                  <span
                                    className={`badge bg-${v.visitOutcome === 'Favorable' ? 'success' : v.visitOutcome === 'Unfavorable' ? 'danger' : 'secondary'}`}
                                  >
                                    {v.visitOutcome}
                                  </span>
                                  {v.safetyConcernsNoted && (
                                    <span className="badge bg-danger">
                                      Safety Concerns
                                    </span>
                                  )}
                                  {v.followUpNeeded && (
                                    <span className="badge bg-warning text-dark">
                                      Follow-Up Needed
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="d-flex gap-2 ms-3 flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => openEditVisitation(v)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => {
                                    setDeleteError(null);
                                    setDeleteTarget({
                                      type: 'visitation',
                                      id: v.visitationId,
                                    });
                                  }}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="mt-3">
                      <Pagination
                        page={currentVisitationPage}
                        totalCount={visitations.length}
                        pageSize={ITEMS_PER_PAGE}
                        onPageChange={setCurrentVisitationPage}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {showAddVisitation && (
              <div
                className="modal d-block"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={closeAddVisitation}
              >
                <div
                  className="modal-dialog modal-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form onSubmit={handleAddVisitation}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Add Home Visitation</h5>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={closeAddVisitation}
                          disabled={addVisitationBusy}
                        />
                      </div>
                      <div className="modal-body">
                        {addVisitationError && (
                          <div className="alert alert-danger">
                            {addVisitationError}
                          </div>
                        )}
                        <VisitationFormFields
                          form={visitationForm}
                          onChange={setVisitationField}
                          idPrefix="add-visitation"
                        />
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={closeAddVisitation}
                          disabled={addVisitationBusy}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={addVisitationBusy}
                        >
                          {addVisitationBusy ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : null}
                          Save Visitation
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showEditVisitation && (
              <div
                className="modal d-block"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={closeEditVisitation}
              >
                <div
                  className="modal-dialog modal-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form onSubmit={handleEditVisitation}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Edit Home Visitation</h5>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={closeEditVisitation}
                          disabled={editVisitationBusy}
                        />
                      </div>
                      <div className="modal-body">
                        {editVisitationError && (
                          <div className="alert alert-danger">
                            {editVisitationError}
                          </div>
                        )}
                        <VisitationFormFields
                          form={editVisitationForm}
                          onChange={setEditVisitationField}
                          idPrefix="edit-visitation"
                        />
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={closeEditVisitation}
                          disabled={editVisitationBusy}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={editVisitationBusy}
                        >
                          {editVisitationBusy ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : null}
                          Save Changes
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
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    setConferenceError(null);
                    setShowAddConference(true);
                  }}
                >
                  + Add Conference
                </button>
              </div>
              <div className="card-body">
                {conferences.length === 0 ? (
                  <p className="text-muted">No conferences yet.</p>
                ) : (
                  <div className="list-group list-group-flush">
                    {conferences.map((c) => (
                      <div
                        key={c.conferenceId}
                        className="list-group-item px-0"
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong>{c.conferenceDate}</strong>
                              <span className="text-muted small">
                                {c.facilitatedBy}
                              </span>
                            </div>
                            <p className="mb-1 small">
                              <strong>Agenda:</strong> {c.agenda}
                            </p>
                            {c.decisions && (
                              <p className="mb-1 small">
                                <strong>Decisions:</strong> {c.decisions}
                              </p>
                            )}
                            {c.nextSteps && (
                              <p className="mb-0 small">
                                <strong>Next Steps:</strong> {c.nextSteps}
                              </p>
                            )}
                            {c.nextReviewDate && (
                              <p className="mb-0 small text-muted">
                                Next review: {c.nextReviewDate}
                              </p>
                            )}
                          </div>
                          <button
                            className="btn btn-sm btn-outline-danger ms-3 flex-shrink-0"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteTarget({
                                type: 'conference',
                                id: c.conferenceId,
                              });
                            }}
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
              <div
                className="modal d-block"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                onClick={closeAddConference}
              >
                <div
                  className="modal-dialog modal-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <form onSubmit={handleAddConference}>
                    <div className="modal-content">
                      <div className="modal-header">
                        <h5 className="modal-title">Add Case Conference</h5>
                        <button
                          type="button"
                          className="btn-close"
                          onClick={closeAddConference}
                          disabled={conferenceBusy}
                        />
                      </div>
                      <div className="modal-body">
                        {conferenceError && (
                          <div className="alert alert-danger">
                            {conferenceError}
                          </div>
                        )}
                        <div className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">
                              Conference Date{' '}
                              <span className="text-danger">*</span>
                            </label>
                            <input
                              type="date"
                              className="form-control"
                              required
                              value={conferenceForm.conferenceDate}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  conferenceDate: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">
                              Facilitated By{' '}
                              <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              required
                              value={conferenceForm.facilitatedBy}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  facilitatedBy: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="col-md-4">
                            <label className="form-label">
                              Next Review Date
                            </label>
                            <input
                              type="date"
                              className="form-control"
                              value={conferenceForm.nextReviewDate ?? ''}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  nextReviewDate: e.target.value || null,
                                }))
                              }
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label">
                              Attendees <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              required
                              value={conferenceForm.attendees}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  attendees: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label">
                              Agenda <span className="text-danger">*</span>
                            </label>
                            <textarea
                              className="form-control"
                              rows={2}
                              required
                              value={conferenceForm.agenda}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  agenda: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Decisions</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={conferenceForm.decisions ?? ''}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  decisions: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="col-12">
                            <label className="form-label">Next Steps</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={conferenceForm.nextSteps ?? ''}
                              onChange={(e) =>
                                setConferenceForm((f) => ({
                                  ...f,
                                  nextSteps: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={closeAddConference}
                          disabled={conferenceBusy}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={conferenceBusy}
                        >
                          {conferenceBusy ? (
                            <span className="spinner-border spinner-border-sm me-1" />
                          ) : null}
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
        onCancel={() => {
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
