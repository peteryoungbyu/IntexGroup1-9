import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type {
  Supporter,
  Donation,
  SupporterDetail,
} from '../types/SupporterDetail';
import {
  getSupporterById,
  updateSupporter,
  addDonation,
  deleteDonation,
} from '../lib/supporterAPI';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

const EMPTY_DONATION: Omit<Donation, 'donationId'> = {
  supporterId: 0,
  donationType: 'Monetary',
  donationDate: '',
  channelSource: null,
  currencyCode: 'PHP',
  amount: null,
  estimatedValue: null,
  impactUnit: null,
  isRecurring: false,
  campaignName: null,
  notes: null,
};

export default function DonorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supporterId = Number(id);

  const [detail, setDetail] = useState<SupporterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit supporter
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<Omit<
    Supporter,
    'supporterId' | 'createdAt'
  > | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add donation
  const [showAddDonation, setShowAddDonation] = useState(false);
  const [donationForm, setDonationForm] = useState<
    Omit<Donation, 'donationId'>
  >({ ...EMPTY_DONATION, supporterId });
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
    const {
      supporterId: _id,
      createdAt: _ca,
      ...fields
    } = supporter as Supporter;
    setEditForm(fields);
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
    setDonationForm({ ...EMPTY_DONATION, supporterId });
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
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">
                        Display Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        required
                        value={editForm.displayName}
                        onChange={(e) => setEdit('displayName', e.target.value)}
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
                        value={editForm.firstName ?? ''}
                        onChange={(e) =>
                          setEdit('firstName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.lastName ?? ''}
                        onChange={(e) =>
                          setEdit('lastName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Organization Name</label>
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
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email ?? ''}
                        onChange={(e) =>
                          setEdit('email', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone ?? ''}
                        onChange={(e) =>
                          setEdit('phone', e.target.value || null)
                        }
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
                        value={editForm.region ?? ''}
                        onChange={(e) =>
                          setEdit('region', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.country ?? ''}
                        onChange={(e) =>
                          setEdit('country', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Acquisition Channel</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.acquisitionChannel ?? ''}
                        onChange={(e) =>
                          setEdit('acquisitionChannel', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">First Donation Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={editForm.firstDonationDate ?? ''}
                        onChange={(e) =>
                          setEdit('firstDonationDate', e.target.value || null)
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
                  <h5 className="modal-title">Record Donation</h5>
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
                    <div className="col-md-6">
                      <label className="form-label">
                        Donation Type <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        required
                        value={donationForm.donationType}
                        onChange={(e) => setDon('donationType', e.target.value)}
                      >
                        <option>Monetary</option>
                        <option>In-Kind</option>
                        <option>Time</option>
                        <option>Skills</option>
                        <option>Social Media</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        Donation Date <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        required
                        value={donationForm.donationDate}
                        onChange={(e) => setDon('donationDate', e.target.value)}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Currency</label>
                      <input
                        type="text"
                        className="form-control"
                        value={donationForm.currencyCode ?? ''}
                        onChange={(e) =>
                          setDon('currencyCode', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        step="0.01"
                        value={donationForm.amount ?? ''}
                        onChange={(e) =>
                          setDon(
                            'amount',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Estimated Value</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        step="0.01"
                        value={donationForm.estimatedValue ?? ''}
                        onChange={(e) =>
                          setDon(
                            'estimatedValue',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Channel Source</label>
                      <input
                        type="text"
                        className="form-control"
                        value={donationForm.channelSource ?? ''}
                        onChange={(e) =>
                          setDon('channelSource', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Campaign Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={donationForm.campaignName ?? ''}
                        onChange={(e) =>
                          setDon('campaignName', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Impact Unit</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. hours, meals"
                        value={donationForm.impactUnit ?? ''}
                        onChange={(e) =>
                          setDon('impactUnit', e.target.value || null)
                        }
                      />
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                      <div className="form-check mb-1">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id="isRecurring"
                          checked={donationForm.isRecurring}
                          onChange={(e) =>
                            setDon('isRecurring', e.target.checked)
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor="isRecurring"
                        >
                          Recurring Donation
                        </label>
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={donationForm.notes ?? ''}
                        onChange={(e) =>
                          setDon('notes', e.target.value || null)
                        }
                      />
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
                    disabled={donationBusy}
                  >
                    {donationBusy ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Saving…
                      </>
                    ) : (
                      'Record Donation'
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
