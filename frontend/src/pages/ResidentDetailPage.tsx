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

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" /></div>;
  if (!detail) return <div className="container py-5"><div className="alert alert-danger">Resident not found.</div></div>;

  const { resident, recordings, visitations, plans, conferences, predictions } = detail;

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center gap-2 mb-3">
        <Link to="/admin/residents" className="btn btn-sm btn-outline-secondary">← Back</Link>
        <h1 className="mb-0">{resident.caseControlNo} · {resident.internalCode}</h1>
        {resident.currentRiskLevel && (
          <span className={`badge bg-${RISK_COLORS[resident.currentRiskLevel] ?? 'secondary'} ms-2`}>{resident.currentRiskLevel} Risk</span>
        )}
        <span className={`badge bg-${resident.caseStatus === 'Active' ? 'success' : 'secondary'}`}>{resident.caseStatus}</span>
      </div>

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
            <div className="card"><div className="card-body">
              <h5>Case Information</h5>
              <dl className="row mb-0">
                <dt className="col-sm-5">Category</dt><dd className="col-sm-7">{resident.caseCategory}</dd>
                <dt className="col-sm-5">Admitted</dt><dd className="col-sm-7">{resident.dateOfAdmission}</dd>
                <dt className="col-sm-5">Social Worker</dt><dd className="col-sm-7">{resident.assignedSocialWorker ?? '—'}</dd>
                <dt className="col-sm-5">Reintegration</dt><dd className="col-sm-7">{resident.reintegrationStatus ?? '—'} {resident.reintegrationType ? `(${resident.reintegrationType})` : ''}</dd>
                <dt className="col-sm-5">Referral Source</dt><dd className="col-sm-7">{resident.referralSource ?? '—'}</dd>
              </dl>
            </div></div>
          </div>
          <div className="col-md-6">
            <div className="card"><div className="card-body">
              <h5>ML Predictions</h5>
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
            </div></div>
          </div>
        </div>
      )}

      {activeTab === 'recordings' && (
        <div className="card"><div className="card-body">
          <h5>Process Recordings ({recordings.length})</h5>
          {recordings.length === 0 ? <p className="text-muted">No recordings yet.</p> : (
            <div className="list-group">
              {recordings.map(r => (
                <div key={r.recordingId} className="list-group-item">
                  <div className="d-flex justify-content-between">
                    <strong>{r.sessionDate}</strong>
                    <span className="text-muted small">{r.sessionType} · {r.sessionDurationMinutes} min · {r.socialWorker}</span>
                  </div>
                  {r.sessionNarrative && <p className="mb-1 small mt-1">{r.sessionNarrative}</p>}
                  <div className="d-flex gap-2 mt-1">
                    {r.progressNoted && <span className="badge bg-success">Progress</span>}
                    {r.concernsFlagged && <span className="badge bg-warning text-dark">Concerns Flagged</span>}
                    {r.referralMade && <span className="badge bg-info text-dark">Referral Made</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div></div>
      )}

      {activeTab === 'visitations' && (
        <div className="card"><div className="card-body">
          <h5>Home Visitations ({visitations.length})</h5>
          {visitations.length === 0 ? <p className="text-muted">No visitations yet.</p> : (
            <div className="list-group">
              {visitations.map(v => (
                <div key={v.visitationId} className="list-group-item">
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
        </div></div>
      )}

      {activeTab === 'plans' && (
        <div className="card"><div className="card-body">
          <h5>Intervention Plans ({plans.length})</h5>
          {plans.length === 0 ? <p className="text-muted">No plans yet.</p> : (
            <div className="list-group">
              {plans.map((p: any) => (
                <div key={p.planId} className="list-group-item">
                  <div className="d-flex justify-content-between">
                    <strong>{p.planCategory}</strong>
                    <span className={`badge bg-${p.status === 'Achieved' ? 'success' : 'secondary'}`}>{p.status}</span>
                  </div>
                  <p className="mb-1 small">{p.planDescription}</p>
                </div>
              ))}
            </div>
          )}
        </div></div>
      )}

      {activeTab === 'conferences' && (
        <div className="card"><div className="card-body">
          <h5>Case Conferences ({conferences.length})</h5>
          {conferences.length === 0 ? <p className="text-muted">No conferences yet.</p> : (
            <div className="list-group">
              {conferences.map(c => (
                <div key={c.conferenceId} className="list-group-item">
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
        </div></div>
      )}

      {activeTab === 'predictions' && (
        <div className="card"><div className="card-body">
          <h5>ML Predictions ({predictions.length})</h5>
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
        </div></div>
      )}
    </div>
  );
}
