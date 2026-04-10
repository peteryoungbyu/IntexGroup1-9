import { useEffect, useState } from 'react';
import { createResident, getResidentFormOptions } from '../lib/residentAPI';
import type {
  CreateResidentRequest,
  Resident,
  ResidentFormOptions,
} from '../types/ResidentDetail';

const SUBCATEGORY_FIELDS = [
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
] as const;

const FAMILY_FIELDS = [
  ['familyIs4Ps', '4Ps Beneficiary'],
  ['familySoloParent', 'Solo Parent'],
  ['familyIndigenous', 'Indigenous Group'],
  ['familyParentPwd', 'Parent with Disability'],
  ['familyInformalSettler', 'Informal Settler'],
] as const;

const EMPTY_FORM: CreateResidentRequest = {
  safehouseId: 1,
  caseStatus: 'Active',
  dateOfBirth: '',
  birthStatus: '',
  placeOfBirth: '',
  religion: '',
  caseCategory: '',
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
  referralSource: '',
  referringAgencyPerson: null,
  assignedSocialWorker: '',
  initialCaseAssessment: '',
  reintegrationType: null,
  reintegrationStatus: null,
  initialRiskLevel: '',
  currentRiskLevel: '',
};

interface ResidentCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (resident: Resident) => void;
}

function buildInitialForm(
  options?: ResidentFormOptions
): CreateResidentRequest {
  return {
    ...EMPTY_FORM,
    safehouseId: options?.safehouses[0]?.safehouseId ?? EMPTY_FORM.safehouseId,
    caseStatus: options?.caseStatuses[0] ?? EMPTY_FORM.caseStatus,
  };
}

function normalizeNullableText(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDuration(startValue: string, endValue: string): string {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);

  if (!start || !end || end < start) {
    return '';
  }

  let totalMonths =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    end.getUTCMonth() -
    start.getUTCMonth();

  if (end.getUTCDate() < start.getUTCDate()) {
    totalMonths -= 1;
  }

  if (totalMonths < 0) {
    return '';
  }

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return `${years} Years ${months} months`;
}

export default function ResidentCreateModal({
  open,
  onClose,
  onCreated,
}: ResidentCreateModalProps) {
  const [form, setForm] = useState<CreateResidentRequest>(buildInitialForm());
  const [formOptions, setFormOptions] = useState<ResidentFormOptions | null>(
    null
  );
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    setForm(buildInitialForm());
    setFormOptions(null);
    setLoadingOptions(true);
    setBusy(false);
    setError(null);

    getResidentFormOptions()
      .then((options) => {
        if (cancelled) {
          return;
        }

        setFormOptions(options);
        setForm(buildInitialForm(options));
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load resident form options.'
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const todayIsoDate = getTodayIsoDate();
  const ageUponAdmission = formatDuration(
    form.dateOfBirth,
    form.dateOfAdmission
  );
  const presentAge = formatDuration(form.dateOfBirth, todayIsoDate);
  const lengthOfStay = formatDuration(form.dateOfAdmission, todayIsoDate);

  const setField = <K extends keyof CreateResidentRequest>(
    field: K,
    value: CreateResidentRequest[K]
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleClose = () => {
    if (!busy) {
      onClose();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const payload: CreateResidentRequest = {
        ...form,
        caseStatus: form.caseStatus.trim(),
        birthStatus: form.birthStatus.trim(),
        placeOfBirth: form.placeOfBirth.trim(),
        religion: form.religion.trim(),
        caseCategory: form.caseCategory.trim(),
        referralSource: form.referralSource.trim(),
        assignedSocialWorker: form.assignedSocialWorker.trim(),
        initialCaseAssessment: form.initialCaseAssessment.trim(),
        initialRiskLevel: form.initialRiskLevel.trim(),
        currentRiskLevel: form.currentRiskLevel.trim(),
        pwdType: form.isPwd ? normalizeNullableText(form.pwdType) : null,
        specialNeedsDiagnosis: form.hasSpecialNeeds
          ? normalizeNullableText(form.specialNeedsDiagnosis)
          : null,
        referringAgencyPerson: normalizeNullableText(form.referringAgencyPerson),
        reintegrationType: normalizeNullableText(form.reintegrationType),
        reintegrationStatus: normalizeNullableText(form.reintegrationStatus),
      };

      const created = await createResident(payload);
      onCreated(created);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create resident record. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-scrollable"
        onClick={(event) => event.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Add New Resident</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
                disabled={busy}
              />
            </div>
            <div
              className="modal-body"
              style={{ overflowY: 'auto', maxHeight: '80vh' }}
            >
              {error && <div className="alert alert-danger">{error}</div>}

              {loadingOptions ? (
                <div className="text-center py-5">
                  <div
                    className="spinner-border"
                    style={{ color: 'var(--brand-primary)' }}
                  />
                </div>
              ) : !formOptions ? (
                <div className="alert alert-warning mb-0">
                  Resident form options could not be loaded.
                </div>
              ) : (
                <>
                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Basic Information
                  </h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label">Case Control No.</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formOptions.nextCaseControlNo}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Internal Code</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formOptions.nextInternalCode}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Safehouse <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.safehouseId}
                        onChange={(event) =>
                          setField('safehouseId', Number(event.target.value))
                        }
                      >
                        {formOptions.safehouses.map((safehouse) => (
                          <option
                            key={safehouse.safehouseId}
                            value={safehouse.safehouseId}
                          >
                            {safehouse.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Case Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.caseStatus}
                        onChange={(event) =>
                          setField('caseStatus', event.target.value)
                        }
                      >
                        {formOptions.caseStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
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
                        value={form.dateOfBirth}
                        max={todayIsoDate}
                        onChange={(event) =>
                          setField('dateOfBirth', event.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Present Age</label>
                      <input
                        type="text"
                        className="form-control"
                        value={presentAge}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Birth Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.birthStatus}
                        onChange={(event) =>
                          setField('birthStatus', event.target.value)
                        }
                      >
                        <option value="">Select birth status</option>
                        {formOptions.birthStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Place of Birth <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={form.placeOfBirth}
                        onChange={(event) =>
                          setField('placeOfBirth', event.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Religion <span className="text-danger">*</span>
                      </label>
                      {formOptions.religions.length > 0 ? (
                        <select
                          className="form-select"
                          required
                          value={form.religion}
                          onChange={(event) =>
                            setField('religion', event.target.value)
                          }
                        >
                          <option value="">Select religion</option>
                          {formOptions.religions.map((religion) => (
                            <option key={religion} value={religion}>
                              {religion}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={form.religion}
                          onChange={(event) =>
                            setField('religion', event.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>

                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Case Category and Sub-categories
                  </h6>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label">
                        Case Category <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.caseCategory}
                        onChange={(event) =>
                          setField('caseCategory', event.target.value)
                        }
                      >
                        <option value="">Select case category</option>
                        {formOptions.caseCategories.map((category) => (
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
                        {SUBCATEGORY_FIELDS.map(([field, label]) => (
                          <div key={field} className="col-6">
                            <div className="form-check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                id={`add-${field}`}
                                checked={form[field]}
                                onChange={(event) =>
                                  setField(field, event.target.checked)
                                }
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
                          checked={form.isPwd}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setField('isPwd', checked);
                            if (!checked) {
                              setField('pwdType', null);
                            }
                          }}
                        />
                        <label className="form-check-label" htmlFor="add-isPwd">
                          Person with Disability (PWD)
                        </label>
                      </div>
                    </div>
                    {form.isPwd && (
                      <div className="col-md-5">
                        <label className="form-label">PWD Type</label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.pwdType ?? ''}
                          onChange={(event) =>
                            setField('pwdType', event.target.value || null)
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
                          checked={form.hasSpecialNeeds}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setField('hasSpecialNeeds', checked);
                            if (!checked) {
                              setField('specialNeedsDiagnosis', null);
                            }
                          }}
                        />
                        <label
                          className="form-check-label"
                          htmlFor="add-hasSpecialNeeds"
                        >
                          Has Special Needs
                        </label>
                      </div>
                    </div>
                    {form.hasSpecialNeeds && (
                      <div className="col-md-5">
                        <label className="form-label">
                          Special Needs Diagnosis
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.specialNeedsDiagnosis ?? ''}
                          onChange={(event) =>
                            setField(
                              'specialNeedsDiagnosis',
                              event.target.value || null
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
                    {FAMILY_FIELDS.map(([field, label]) => (
                      <div key={field} className="col-md-4">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id={`add-${field}`}
                            checked={form[field]}
                            onChange={(event) =>
                              setField(field, event.target.checked)
                            }
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

                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Admission and Referral
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
                        value={form.dateOfAdmission}
                        max={todayIsoDate}
                        onChange={(event) =>
                          setField('dateOfAdmission', event.target.value)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Age Upon Admission</label>
                      <input
                        type="text"
                        className="form-control"
                        value={ageUponAdmission}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Length of Stay</label>
                      <input
                        type="text"
                        className="form-control"
                        value={lengthOfStay}
                        readOnly
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Referral Source <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.referralSource}
                        onChange={(event) =>
                          setField('referralSource', event.target.value)
                        }
                      >
                        <option value="">Select referral source</option>
                        {formOptions.referralSources.map((source) => (
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
                        value={form.referringAgencyPerson ?? ''}
                        onChange={(event) =>
                          setField(
                            'referringAgencyPerson',
                            event.target.value || null
                          )
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Assigned Social Worker{' '}
                        <span className="text-danger">*</span>
                      </label>
                      {formOptions.assignedSocialWorkers.length > 0 ? (
                        <select
                          className="form-select"
                          required
                          value={form.assignedSocialWorker}
                          onChange={(event) =>
                            setField('assignedSocialWorker', event.target.value)
                          }
                        >
                          <option value="">Select social worker</option>
                          {formOptions.assignedSocialWorkers.map((worker) => (
                            <option key={worker} value={worker}>
                              {worker}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          className="form-control"
                          required
                          value={form.assignedSocialWorker}
                          onChange={(event) =>
                            setField('assignedSocialWorker', event.target.value)
                          }
                        />
                      )}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">
                        Initial Risk Level{' '}
                        <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={form.initialRiskLevel}
                        onChange={(event) =>
                          setField('initialRiskLevel', event.target.value)
                        }
                      >
                        <option value="">Select initial risk</option>
                        {formOptions.riskLevels.map((level) => (
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
                        value={form.currentRiskLevel}
                        onChange={(event) =>
                          setField('currentRiskLevel', event.target.value)
                        }
                      >
                        <option value="">Select current risk</option>
                        {formOptions.riskLevels.map((level) => (
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
                      {formOptions.initialCaseAssessments.length > 0 ? (
                        <select
                          className="form-select"
                          required
                          value={form.initialCaseAssessment}
                          onChange={(event) =>
                            setField('initialCaseAssessment', event.target.value)
                          }
                        >
                          <option value="">Select case assessment</option>
                          {formOptions.initialCaseAssessments.map(
                            (assessment) => (
                              <option key={assessment} value={assessment}>
                                {assessment}
                              </option>
                            )
                          )}
                        </select>
                      ) : (
                        <textarea
                          className="form-control"
                          rows={3}
                          required
                          value={form.initialCaseAssessment}
                          onChange={(event) =>
                            setField('initialCaseAssessment', event.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>

                  <h6 className="fw-semibold border-bottom pb-1 mb-3">
                    Reintegration
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Reintegration Type</label>
                      <select
                        className="form-select"
                        value={form.reintegrationType ?? ''}
                        onChange={(event) =>
                          setField(
                            'reintegrationType',
                            event.target.value || null
                          )
                        }
                      >
                        <option value="">None</option>
                        {formOptions.reintegrationTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Reintegration Status
                      </label>
                      <select
                        className="form-select"
                        value={form.reintegrationStatus ?? ''}
                        onChange={(event) =>
                          setField(
                            'reintegrationStatus',
                            event.target.value || null
                          )
                        }
                      >
                        <option value="">None</option>
                        {formOptions.reintegrationStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || loadingOptions || formOptions === null}
              >
                {busy ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" />
                    Saving...
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
  );
}
