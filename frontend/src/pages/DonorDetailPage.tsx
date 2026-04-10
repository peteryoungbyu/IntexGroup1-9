import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { SupporterDetail } from '../types/SupporterDetail';
import {
  getSupporterById,
  getSupporterFormOptions,
  updateSupporter,
  addDonation,
  deleteDonation,
  getDonorPledgeOptions,
  type AdminDonationRequest,
  type DonorPledgeOptions,
  type SupporterFormOptions,
  type UpdateSupporterRequest,
} from '../lib/supporterAPI';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const EMPTY_DONATION: AdminDonationRequest = {
  amount: 1000,
  isRecurring: false,
  programArea: null,
  safehouseId: null,
};

const EMPTY_OPTIONS: SupporterFormOptions = {
  supporterTypes: [],
  relationshipTypes: [],
  regions: [],
  countries: [],
  acquisitionChannels: [],
  statuses: ['Active', 'Inactive'],
};

const EMPTY_PLEDGE_OPTIONS: DonorPledgeOptions = {
  programAreas: [],
  safehouseIds: [],
};

function hasRequiredOptions(options: SupporterFormOptions) {
  return (
    options.supporterTypes.length > 0 &&
    options.relationshipTypes.length > 0 &&
    options.regions.length > 0 &&
    options.countries.length > 0 &&
    options.acquisitionChannels.length > 0 &&
    options.statuses.length > 0
  );
}

function toEditRequest(
  detail: SupporterDetail['supporter']
): UpdateSupporterRequest {
  return {
    supporterType: detail.supporterType ?? '',
    organizationName: detail.organizationName ?? null,
    firstName: detail.firstName ?? '',
    lastName: detail.lastName ?? '',
    relationshipType: detail.relationshipType ?? '',
    region: detail.region ?? '',
    country: detail.country ?? '',
    email: detail.email ?? '',
    phone: detail.phone ?? '',
    status: detail.status ?? 'Active',
    firstDonationDate: detail.firstDonationDate ?? '',
    acquisitionChannel: detail.acquisitionChannel ?? '',
    displayName: detail.displayName,
    churnProbability: detail.churnProbability ?? null,
    likelyChurn: detail.likelyChurn ?? null,
  };
}

export default function DonorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supporterId = Number(id);

  const [detail, setDetail] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit supporter
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<UpdateSupporterRequest | null>(null);
  const [formOptions, setFormOptions] =
    useState<SupporterFormOptions>(EMPTY_OPTIONS);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add donation
  const [showAddDonation, setShowAddDonation] = useState(false);
  const [donationForm, setDonationForm] =
    useState<AdminDonationRequest>({ ...EMPTY_DONATION });
  const [pledgeOptions, setPledgeOptions] =
    useState<DonorPledgeOptions>(EMPTY_PLEDGE_OPTIONS);
  const [donationBusy, setDonationBusy] = useState(false);
  const [donationError, setDonationError] = useState<string | null>(null);

  // Delete donation
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  const refresh = () => getSupporterById(supporterId).then(setDetail);

  useEffect(() => {
    getSupporterById(supporterId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getSupporterFormOptions()
      .then(setFormOptions)
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    getDonorPledgeOptions().then(setPledgeOptions);
  }, []);

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
        <div className="alert alert-danger">Donor not found.</div>
      </div>
    );

  const { supporter, donations } = detail;

  function openEdit() {
    setEditForm(toEditRequest(supporter));
    setEditError(null);
    setShowEdit(true);
  }
  function closeEdit() {
    if (editBusy) return;
    setShowEdit(false);
    setEditError(null);
  }
  const setEdit = (field: string, value: unknown) =>
    setEditForm((f) => (f ? { ...f, [field]: value } : f));

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm) return;
    if (!hasRequiredOptions(formOptions)) {
      setEditError(
        'Supporter form options are incomplete. Make sure existing supporter data includes region, country, and the other dropdown values.'
      );
      return;
    }
    setEditBusy(true);
    setEditError(null);
    try {
      await updateSupporter(supporterId, editForm);
      await refresh();
      setShowEdit(false);
    } catch {
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setEditBusy(false);
    }
  }

  function openAddDonation() {
    setDonationForm({ ...EMPTY_DONATION });
    setDonationError(null);
    setShowAddDonation(true);
  }
  function closeAddDonation() {
    if (donationBusy) return;
    setShowAddDonation(false);
    setDonationError(null);
  }
  const setDon = (field: string, value: unknown) =>
    setDonationForm((f) => ({ ...f, [field]: value }));

  async function handleAddDonation(e: React.FormEvent) {
    e.preventDefault();
    if (!donationForm.amount || donationForm.amount <= 0) return;
    setDonationBusy(true);
    setDonationError(null);
    try {
      await addDonation(supporterId, donationForm);
      await refresh();
      setShowAddDonation(false);
    } catch {
      setDonationError('Failed to record donation. Please try again.');
    } finally {
      setDonationBusy(false);
    }
  }

  async function handleDeleteDonation() {
    if (pendingDelete === null) return;
    setDeleteBusy(true);
    setDeleteError(undefined);
    try {
      await deleteDonation(supporterId, pendingDelete);
      await refresh();
      setPendingDelete(null);
    } catch {
      setDeleteError('Failed to delete donation. Please try again.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div>
      <DeleteConfirmModal
        open={pendingDelete !== null}
        title="Delete Donation"
        message="Are you sure you want to delete this donation record? This action cannot be undone."
        confirmLabel="Delete Donation"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={handleDeleteDonation}
        onCancel={() => {
          if (!deleteBusy) {
            setPendingDelete(null);
            setDeleteError(undefined);
          }
        }}
      />

      {/* Edit Supporter Modal */}
      {showEdit && editForm && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeEdit}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-scrollable"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleEditSubmit}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    Edit Donor — {supporter.displayName}
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
                  {!optionsLoading && !hasRequiredOptions(formOptions) && (
                    <div className="alert alert-warning">
                      One or more required dropdown lists are empty. This edit
                      form reads its choices from existing supporter data.
                    </div>
                  )}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.firstName}
                        onChange={(e) => setEdit('firstName', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.lastName}
                        onChange={(e) => setEdit('lastName', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Supporter Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editForm.supporterType}
                        onChange={(e) =>
                          setEdit('supporterType', e.target.value)
                        }
                        disabled={optionsLoading || editBusy}
                      >
                        {formOptions.supporterTypes.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Organization Name{' '}
                        <span className="text-muted">(optional)</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.organizationName ?? ''}
                        onChange={(e) =>
                          setEdit('organizationName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Relationship Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editForm.relationshipType}
                        onChange={(e) =>
                          setEdit('relationshipType', e.target.value)
                        }
                        disabled={optionsLoading || editBusy}
                      >
                        {formOptions.relationshipTypes.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Email <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        required
                        value={editForm.email}
                        onChange={(e) => setEdit('email', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="+1 (347) 358-4878"
                        value={editForm.phone}
                        onChange={(e) => setEdit('phone', e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Status <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editForm.status}
                        onChange={(e) => setEdit('status', e.target.value)}
                        disabled={editBusy}
                      >
                        {formOptions.statuses.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Region <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editForm.region}
                        onChange={(e) => setEdit('region', e.target.value)}
                        disabled={optionsLoading || editBusy}
                      >
                        {formOptions.regions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Country <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editForm.country}
                        onChange={(e) => setEdit('country', e.target.value)}
                        disabled={optionsLoading || editBusy}
                      >
                        {formOptions.countries.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Acquisition Channel{' '}
                        <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={editForm.acquisitionChannel}
                        onChange={(e) =>
                          setEdit('acquisitionChannel', e.target.value)
                        }
                        disabled={optionsLoading || editBusy}
                      >
                        {formOptions.acquisitionChannels.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        First Donation Date{' '}
                        <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={editForm.firstDonationDate}
                        onChange={(e) =>
                          setEdit('firstDonationDate', e.target.value)
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

      {/* Add Donation Modal */}
      {showAddDonation && (
        <div
          className="modal d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeAddDonation}
        >
          <div
            className="modal-dialog modal-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleAddDonation}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Record Contribution</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeAddDonation}
                    disabled={donationBusy}
                  />
                </div>
                <div className="modal-body">
                  {donationError && (
                    <div className="alert alert-danger">{donationError}</div>
                  )}
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">
                        Amount <span className="text-danger">*</span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text fw-bold">₱</span>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="e.g. 1500"
                          min="1"
                          step="1"
                          required
                          value={donationForm.amount}
                          onChange={(e) =>
                            setDon(
                              'amount',
                              e.target.value ? Number(e.target.value) : 0
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Program Area</label>
                      <select
                        className="form-select"
                        value={donationForm.programArea ?? 'Any'}
                        onChange={(e) =>
                          setDon(
                            'programArea',
                            e.target.value === 'Any' ? null : e.target.value
                          )
                        }
                      >
                        <option value="Any">Any</option>
                        {pledgeOptions.programAreas.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Safehouse</label>
                      <select
                        className="form-select"
                        value={
                          donationForm.safehouseId == null
                            ? 'Any'
                            : String(donationForm.safehouseId)
                        }
                        onChange={(e) =>
                          setDon(
                            'safehouseId',
                            e.target.value === 'Any'
                              ? null
                              : Number(e.target.value)
                          )
                        }
                      >
                        <option value="Any">Any</option>
                        {pledgeOptions.safehouseIds.map((safehouseId) => (
                          <option key={safehouseId} value={String(safehouseId)}>
                            {safehouseId}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="admin-recurring-toggle"
                          checked={donationForm.isRecurring}
                          onChange={(e) =>
                            setDon('isRecurring', e.target.checked)
                          }
                        />
                        <label
                          className="form-check-label fw-semibold"
                          htmlFor="admin-recurring-toggle"
                        >
                          Make this a monthly gift
                        </label>
                      </div>
                      <p className="text-muted small mt-1 mb-0">
                        Monthly donors provide reliable, year-round support that
                        helps us plan programs with confidence.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAddDonation}
                    disabled={donationBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      donationBusy ||
                      !donationForm.amount ||
                      donationForm.amount <= 0
                    }
                  >
                    {donationBusy ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving…
                      </>
                    ) : (
                      `Pledge ₱${donationForm.amount.toLocaleString()}${donationForm.isRecurring ? '/month' : ''}`
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
          <div className="d-flex align-items-center gap-2 mb-2">
            <Link to="/admin/donors" className="btn btn-sm btn-outline-light">
              ← Back
            </Link>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="mb-0">{supporter.displayName}</h1>
            <span
              className={`badge bg-${supporter.status === 'Active' ? 'success' : 'secondary'}`}
            >
              {supporter.status}
            </span>
            <span className="badge bg-info text-dark">
              {supporter.supporterType}
            </span>
          </div>
          <p>{supporter.email ?? ''}</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        <div className="row g-3">
          {/* Supporter Info */}
          <div className="col-md-5">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Supporter Profile</span>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={openEdit}
                >
                  Edit
                </button>
              </div>
              <div className="card-body">
                <dl className="row mb-0">
                  <dt className="col-sm-5">Type</dt>
                  <dd className="col-sm-7">{supporter.supporterType}</dd>
                  <dt className="col-sm-5">Relationship</dt>
                  <dd className="col-sm-7">
                    {supporter.relationshipType ?? '—'}
                  </dd>
                  {supporter.firstName && (
                    <>
                      <dt className="col-sm-5">Name</dt>
                      <dd className="col-sm-7">
                        {supporter.firstName} {supporter.lastName}
                      </dd>
                    </>
                  )}
                  {supporter.organizationName && (
                    <>
                      <dt className="col-sm-5">Organization</dt>
                      <dd className="col-sm-7">{supporter.organizationName}</dd>
                    </>
                  )}
                  <dt className="col-sm-5">Email</dt>
                  <dd className="col-sm-7">{supporter.email ?? '—'}</dd>
                  <dt className="col-sm-5">Phone</dt>
                  <dd className="col-sm-7">{supporter.phone ?? '—'}</dd>
                  <dt className="col-sm-5">Region</dt>
                  <dd className="col-sm-7">
                    {supporter.region ?? '—'}
                    {supporter.country ? `, ${supporter.country}` : ''}
                  </dd>
                  <dt className="col-sm-5">Channel</dt>
                  <dd className="col-sm-7">
                    {supporter.acquisitionChannel ?? '—'}
                  </dd>
                  <dt className="col-sm-5">First Donation</dt>
                  <dd className="col-sm-7">
                    {supporter.firstDonationDate ?? '—'}
                  </dd>
                  <dt className="col-sm-5">Total Donated</dt>
                  <dd className="col-sm-7 fw-semibold">
                    PHP{' '}
                    {donations
                      .filter((d) => d.amount != null)
                      .reduce((s, d) => s + (d.amount ?? 0), 0)
                      .toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          {/* Donations */}
          <div className="col-md-7">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <span>Contributions ({donations.length})</span>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={openAddDonation}
                >
                  + Record Contribution
                </button>
              </div>
              <div className="card-body p-0">
                {donations.length === 0 ? (
                  <p className="text-muted p-3 mb-0">
                    No contributions recorded yet.
                  </p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Campaign</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {donations.map((d) => (
                          <tr key={d.donationId}>
                            <td>{d.donationDate}</td>
                            <td>
                              {d.donationType}
                              {d.isRecurring && (
                                <span className="badge bg-primary ms-1 small">
                                  Recurring
                                </span>
                              )}
                            </td>
                            <td>
                              {d.amount != null
                                ? `${d.currencyCode ?? 'PHP'} ${d.amount.toLocaleString()}`
                                : d.estimatedValue != null
                                  ? `~${d.currencyCode ?? 'PHP'} ${d.estimatedValue.toLocaleString()}`
                                  : (d.impactUnit ?? '—')}
                            </td>
                            <td>{d.campaignName ?? '—'}</td>
                            <td>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => {
                                  setDeleteError(undefined);
                                  setPendingDelete(d.donationId);
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
