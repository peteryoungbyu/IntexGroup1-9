import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type {
  Resident,
  ResidentListItem,
  ResidentSafehouseOption,
  PagedResult,
} from '../types/ResidentDetail';
import {
  getResidents,
  deleteResident,
  createResident,
  getResidentSafehouseOptions,
} from '../lib/residentAPI';
import { RESIDENT_CASE_CATEGORIES } from '../lib/residentOptions';
import Pagination from '../components/Pagination';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

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

const EMPTY_RESIDENT: Omit<Resident, 'residentId' | 'createdAt'> = {
  caseControlNo: '',
  internalCode: '',
  safehouseId: 1,
  caseStatus: 'Active',
  sex: 'Female',
  dateOfBirth: '',
  birthStatus: null,
  placeOfBirth: null,
  religion: null,
  caseCategory: 'Child in Need of Special Protection',
  subCatOrphaned: false,
  subCatTrafficked: false,
  subCatChildLabor: false,
  subCatPhysicalAbuse: false,
  subCatSexualAbuse: false,
  subCatOsaec: false,
  subCatCicl: false,
  subCatAtRisk: false,
  subCatStreetChild: false,
  subCatChildWithHiv: false,
  isPwd: false,
  pwdType: null,
  hasSpecialNeeds: false,
  specialNeedsDiagnosis: null,
  familyIs4Ps: false,
  familySoloParent: false,
  familyIndigenous: false,
  familyParentPwd: false,
  familyInformalSettler: false,
  dateOfAdmission: '',
  ageUponAdmission: null,
  presentAge: null,
  lengthOfStay: null,
  referralSource: null,
  referringAgencyPerson: null,
  dateColbRegistered: null,
  dateColbObtained: null,
  assignedSocialWorker: null,
  initialCaseAssessment: null,
  dateCaseStudyPrepared: null,
  reintegrationType: null,
  reintegrationStatus: null,
  initialRiskLevel: null,
  currentRiskLevel: null,
  dateEnrolled: null,
  dateClosed: null,
  notesRestricted: null,
};

export default function CaseloadPage() {
  const navigate = useNavigate();
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
  const [addForm, setAddForm] = useState<
    Omit<Resident, 'residentId' | 'createdAt'>
  >({ ...EMPTY_RESIDENT });
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
    setAddForm({ ...EMPTY_RESIDENT });
    setAddError(null);
    setShowAdd(true);
  };

  const closeAdd = () => {
    if (addBusy) return;
    setShowAdd(false);
    setAddError(null);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddBusy(true);
    setAddError(null);
    try {
      const created = await createResident(addForm);
      setShowAdd(false);
      navigate(`/admin/residents/${created.residentId}`);
    } catch {
      setAddError('Failed to create resident record. Please try again.');
    } finally {
      setAddBusy(false);
    }
  };

  const set = (field: keyof typeof addForm, value: unknown) =>
    setAddForm((f) => ({ ...f, [field]: value }));

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

      {/* Add Resident Modal */}
      {showAdd && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeAdd}
        >
          <div
            className="modal-dialog modal-xl modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAddSubmit}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Resident</h5>
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

                  {/* Basic Info */}
                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Basic Information
                  </h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label">
                        Case Control No. <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={addForm.caseControlNo}
                        onChange={(e) => set('caseControlNo', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Internal Code <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={addForm.internalCode}
                        onChange={(e) => set('internalCode', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Safehouse ID <span className="text-danger">*</span>
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        required
                        min={1}
                        value={addForm.safehouseId}
                        onChange={(e) =>
                          set('safehouseId', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Sex <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={addForm.sex}
                        onChange={(e) => set('sex', e.target.value)}
                      >
                        <option>Female</option>
                        <option>Male</option>
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
                        value={addForm.dateOfBirth}
                        onChange={(e) => set('dateOfBirth', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Place of Birth</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.placeOfBirth ?? ''}
                        onChange={(e) =>
                          set('placeOfBirth', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Birth Status</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.birthStatus ?? ''}
                        onChange={(e) =>
                          set('birthStatus', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Religion</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.religion ?? ''}
                        onChange={(e) =>
                          set('religion', e.target.value || null)
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
                        value={addForm.caseStatus}
                        onChange={(e) => set('caseStatus', e.target.value)}
                      >
                        <option>Active</option>
                        <option>Closed</option>
                        <option>Transferred</option>
                      </select>
                    </div>
                  </div>

                  {/* Case Category */}
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
                        value={addForm.caseCategory}
                        onChange={(e) => set('caseCategory', e.target.value)}
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
                                id={`add-${field}`}
                                checked={addForm[field] as boolean}
                                onChange={(e) => set(field, e.target.checked)}
                              />
                              <label
                                className="form-check-label"
                                htmlFor={`add-${field}`}
                              >
                                {label}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Disability */}
                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Disability Information
                  </h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="form-check mt-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="add-isPwd"
                          checked={addForm.isPwd}
                          onChange={(e) => set('isPwd', e.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="add-isPwd">
                          Person with Disability (PWD)
                        </label>
                      </div>
                    </div>
                    {addForm.isPwd && (
                      <div className="col-md-4">
                        <label className="form-label">PWD Type</label>
                        <input
                          type="text"
                          className="form-control"
                          value={addForm.pwdType ?? ''}
                          onChange={(e) =>
                            set('pwdType', e.target.value || null)
                          }
                        />
                      </div>
                    )}
                    <div className="col-md-3">
                      <div className="form-check mt-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="add-hasSpecialNeeds"
                          checked={addForm.hasSpecialNeeds}
                          onChange={(e) =>
                            set('hasSpecialNeeds', e.target.checked)
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor="add-hasSpecialNeeds"
                        >
                          Has Special Needs
                        </label>
                      </div>
                    </div>
                    {addForm.hasSpecialNeeds && (
                      <div className="col-md-4">
                        <label className="form-label">Diagnosis</label>
                        <input
                          type="text"
                          className="form-control"
                          value={addForm.specialNeedsDiagnosis ?? ''}
                          onChange={(e) =>
                            set('specialNeedsDiagnosis', e.target.value || null)
                          }
                        />
                      </div>
                    )}
                  </div>

                  {/* Family Socio-demographic */}
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
                            id={`add-${field}`}
                            checked={addForm[field] as boolean}
                            onChange={(e) => set(field, e.target.checked)}
                          />
                          <label
                            className="form-check-label"
                            htmlFor={`add-${field}`}
                          >
                            {label}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Admission Details */}
                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Admission &amp; Referral
                  </h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label">
                        Date of Admission <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={addForm.dateOfAdmission}
                        onChange={(e) => set('dateOfAdmission', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Assigned Social Worker
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.assignedSocialWorker ?? ''}
                        onChange={(e) =>
                          set('assignedSocialWorker', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Referral Source</label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.referralSource ?? ''}
                        onChange={(e) =>
                          set('referralSource', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Referring Agency / Person
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={addForm.referringAgencyPerson ?? ''}
                        onChange={(e) =>
                          set('referringAgencyPerson', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Initial Risk Level</label>
                      <select
                        className="form-select"
                        value={addForm.initialRiskLevel ?? ''}
                        onChange={(e) =>
                          set('initialRiskLevel', e.target.value || null)
                        }
                      >
                        <option value="">— None —</option>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Current Risk Level</label>
                      <select
                        className="form-select"
                        value={addForm.currentRiskLevel ?? ''}
                        onChange={(e) =>
                          set('currentRiskLevel', e.target.value || null)
                        }
                      >
                        <option value="">— None —</option>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">
                        Initial Case Assessment
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={addForm.initialCaseAssessment ?? ''}
                        onChange={(e) =>
                          set('initialCaseAssessment', e.target.value || null)
                        }
                      />
                    </div>
                  </div>

                  {/* Reintegration */}
                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Reintegration
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Reintegration Type</label>
                      <select
                        className="form-select"
                        value={addForm.reintegrationType ?? ''}
                        onChange={(e) =>
                          set('reintegrationType', e.target.value || null)
                        }
                      >
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
                      <select
                        className="form-select"
                        value={addForm.reintegrationStatus ?? ''}
                        onChange={(e) =>
                          set('reintegrationStatus', e.target.value || null)
                        }
                      >
                        <option value="">— None —</option>
                        <option>Ongoing</option>
                        <option>Completed</option>
                        <option>Failed</option>
                        <option>Pending</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Date Enrolled</label>
                      <input
                        type="date"
                        className="form-control"
                        value={addForm.dateEnrolled ?? ''}
                        onChange={(e) =>
                          set('dateEnrolled', e.target.value || null)
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
                      'Add Resident'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
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
              <button type="submit" className="btn btn-primary flex-fill">
                Search
              </button>
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
