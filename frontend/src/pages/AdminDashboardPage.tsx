import { useEffect, useState } from 'react';
import type {
  AdminDashboardData,
  DashboardMetric,
} from '../types/DashboardMetric';
import { getAdminDashboard } from '../lib/reportAPI';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
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
  if (error)
    return (
      <div className="container py-5">
        <div className="alert alert-danger">{error}</div>
      </div>
    );

  return (
    <div>
      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Dashboard</h1>
          <p>Overview of safehouse operations and key metrics</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        {/* Summary Cards */}
        <div className="row g-3 mb-4">
          {(data?.summary ?? []).map((m: DashboardMetric) => (
            <div key={m.label} className="col-sm-6 col-xl-3">
              <div className="card text-center">
                <div className="card-body py-4">
                  <p className="section-label mb-1">{m.label}</p>
                  <h2
                    className="mb-0 fw-bold"
                    style={{ color: 'var(--brand-dark)' }}
                  >
                    {m.value}
                  </h2>
                  {m.trend && <small className="text-muted">{m.trend}</small>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Safehouse Breakdown */}
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">Safehouse Status</div>
              <div className="card-body p-0">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Name</th>
                      <th>Region</th>
                      <th>Occupancy</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.safehouseBreakdown ?? []).map((s: any) => (
                      <tr key={s.safehouseId}>
                        <td>{s.name}</td>
                        <td>{s.region}</td>
                        <td>
                          {s.currentOccupancy}/{s.capacityGirls}
                        </td>
                        <td>
                          <span
                            className={`badge bg-${s.status === 'Active' ? 'success' : 'secondary'}`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data?.safehouseBreakdown.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          No safehouse data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card">
              <div className="card-header">Upcoming Case Conferences</div>
              <div className="card-body p-0">
                <table className="table table-sm table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Date</th>
                      <th>Resident ID</th>
                      <th>Facilitated By</th>
                      <th>Agenda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.upcomingConferences ?? []).map((c: any) => (
                      <tr key={c.conferenceId}>
                        <td>{c.conferenceDate}</td>
                        <td>{c.residentId}</td>
                        <td>{c.facilitatedBy}</td>
                        <td className="text-truncate" style={{ maxWidth: 180 }}>{c.agenda}</td>
                      </tr>
                    ))}
                    {(data?.upcomingConferences ?? []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          No upcoming conferences
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header">Recent Monthly Metrics</div>
              <div className="card-body p-0">
                <table className="table table-sm table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Residents</th>
                      <th>Avg Health</th>
                      <th>Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.monthlyMetrics ?? []).slice(0, 6).map((m: any) => (
                      <tr key={m.metricId}>
                        <td>
                          {new Date(m.monthStart).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td>{m.activeResidents}</td>
                        <td>
                          {m.avgHealthScore == null
                            ? 'N/A'
                            : Number(m.avgHealthScore).toFixed(1)}
                        </td>
                        <td>{m.incidentCount}</td>
                      </tr>
                    ))}
                    {data?.monthlyMetrics.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          No metric data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
