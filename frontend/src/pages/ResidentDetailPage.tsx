import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import type { ResidentDetail } from '../types/ResidentDetail';
import { getResidentById } from '../lib/residentAPI';

const RISK_COLORS: Record<string, string> = { Low: 'success', Medium: 'warning', High: 'danger', Critical: 'dark' };

export default function ResidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ResidentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!id) return;
    getResidentById(Number(id))
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" style={{ color: 'var(--brand-primary)' }} /></div>;
  if (!detail) return <div className="container py-5"><div className="alert alert-danger">Resident not found.</div></div>;

  const { resident, recordings, visitations, plans, conferences, predictions } = detail;

  return (
    <div>
      <div className="page-header">
        <div className="container-fluid px-4">
          <div className="d-flex align-items-center gap-2 mb-2">
            <Link to="/admin/residents" className="btn btn-sm btn-outline-light">← Back</Link>
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h1 className="mb-0">{resident.caseControlNo} · {resident.internalCode}</h1>
            {resident.currentRiskLevel && (
              <span className={`badge bg-${RISK_COLORS[resident.currentRiskLevel] ?? 'secondary'}`}>{resident.currentRiskLevel} Risk</span>
            )}
            <span className={`badge bg-${resident.caseStatus === 'Active' ? 'success' : 'secondary'}`}>{resident.caseStatus}</span>
          </div>
          <p>Case details and progress tracking</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        {/* Tabs */}
        <ul className="nav nav-tabs mb-4">
          {['overview', 'recordings', 'visitations', 'plans', 'conferences', 'predictions'].map(t => (
            <li key={t} className="nav-item">
              <button className={`nav-link ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            </li>
          ))}
        </ul>

        {activeTab === 'overview' && (
          <div className="row g-3">
            <div className="col-md-6">
              <div className="card">
                <div className="card-header">Case Information</div>
                <div className="card-body">
                  <dl className="row mb-0">
                    <dt className="col-sm-5">Category</dt><dd className="col-sm-7">{resident.caseCategory}</dd>
                    <dt className="col-sm-5">Admitted</dt><dd className="col-sm-7">{resident.dateOfAdmission}</dd>
                    <dt className="col-sm-5">Social Worker</dt><dd className="col-sm-7">{resident.assignedSocialWorker ?? '—'}</dd>
                    <dt className="col-sm-5">Reintegration</dt><dd className="col-sm-7">{resident.reintegrationStatus ?? '—'} {resident.reintegrationType ? `(${resident.reintegrationType})` : ''}</dd>
                    <dt className="col-sm-5">Referral Source</dt><dd className="col-sm-7">{resident.referralSource ?? '—'}</dd>
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
                      <thead><tr><th>Model</th><th>Score</th><th>Label</th></tr></thead>
                      <tbody>
                        {predictions.map(p => (
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

        {activeTab === 'recordings' && (
          <div className="card">
            <div className="card-header">Process Recordings ({recordings.length})</div>
            <div className="card-body">
              {recordings.length === 0 ? <p className="text-muted">No recordings yet.</p> : (
                <div className="list-group list-group-flush">
                  {recordings.map(r => (
                    <div key={r.recordingId} className="list-group-item px-0">
                      <div className="d-flex justify-content-between">
                        <strong>{r.sessionDate}</strong>
                        <span className="text-muted small">{r.sessionType} · {r.sessionDurationMinutes} min · {r.socialWorker}</span>
                      </div>
                      {r.sessionNarrative && <p className="mb-1 small mt-1">{r.sessionNarrative}</p>}
                      <div className="d-flex gap-2 mt-1">
                        {r.progressNoted && <span className="badge bg-success">Progress</span>}
                        {r.concernsFlagged && <span className="badge bg-warning text-dark">Concerns Flagged</span>}
                        {r.referralMade && <span className="badge bg-primary">Referral Made</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'visitations' && (
          <div className="card">
            <div className="card-header">Home Visitations ({visitations.length})</div>
            <div className="card-body">
              {visitations.length === 0 ? <p className="text-muted">No visitations yet.</p> : (
                <div className="list-group list-group-flush">
                  {visitations.map(v => (
                    <div key={v.visitationId} className="list-group-item px-0">
                      <div className="d-flex justify-content-between">
                        <strong>{v.visitDate}</strong>
                        <span className="text-muted small">{v.visitType} · {v.socialWorker}</span>
                      </div>
                      <p className="mb-1 small">{v.locationVisited}</p>
                      <div className="d-flex gap-2">
                        <span className={`badge bg-${v.visitOutcome === 'Favorable' ? 'success' : v.visitOutcome === 'Unfavorable' ? 'danger' : 'secondary'}`}>{v.visitOutcome}</span>
                        {v.safetyConcernsNoted && <span className="badge bg-danger">Safety Concerns</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="card">
            <div className="card-header">Intervention Plans ({plans.length})</div>
            <div className="card-body">
              {plans.length === 0 ? <p className="text-muted">No plans yet.</p> : (
                <div className="list-group list-group-flush">
                  {plans.map((p: any) => (
                    <div key={p.planId} className="list-group-item px-0">
                      <div className="d-flex justify-content-between">
                        <strong>{p.planCategory}</strong>
                        <span className={`badge bg-${p.status === 'Achieved' ? 'success' : 'secondary'}`}>{p.status}</span>
                      </div>
                      <p className="mb-1 small">{p.planDescription}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'conferences' && (
          <div className="card">
            <div className="card-header">Case Conferences ({conferences.length})</div>
            <div className="card-body">
              {conferences.length === 0 ? <p className="text-muted">No conferences yet.</p> : (
                <div className="list-group list-group-flush">
                  {conferences.map(c => (
                    <div key={c.conferenceId} className="list-group-item px-0">
                      <div className="d-flex justify-content-between">
                        <strong>{c.conferenceDate}</strong>
                        <span className="text-muted small">{c.facilitatedBy}</span>
                      </div>
                      <p className="mb-1 small"><strong>Agenda:</strong> {c.agenda}</p>
                      {c.decisions && <p className="mb-0 small"><strong>Decisions:</strong> {c.decisions}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && (
          <div className="card">
            <div className="card-header">ML Predictions ({predictions.length})</div>
            <div className="card-body">
              {predictions.length === 0 ? <p className="text-muted">No predictions available.</p> : (
                <table className="table table-hover">
                  <thead><tr><th>Model</th><th>Score</th><th>Label</th><th>Generated</th></tr></thead>
                  <tbody>
                    {predictions.map(p => (
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
    </div>
  );
}