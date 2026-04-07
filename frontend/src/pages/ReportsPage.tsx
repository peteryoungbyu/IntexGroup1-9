import { useEffect, useState } from 'react';
import type { ReportSection } from '../types/ReportSection';
import { getAnnualReport, getDonationTrends, getReintegrationOutcomes, getSafehouseComparison } from '../lib/reportAPI';

export default function ReportsPage() {
  const year = new Date().getFullYear();
  const [annual, setAnnual] = useState<ReportSection[] | null>(null);
  const [trends, setTrends] = useState<ReportSection | null>(null);
  const [reintegration, setReintegration] = useState<ReportSection | null>(null);
  const [comparison, setComparison] = useState<ReportSection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAnnualReport(year),
      getDonationTrends(12),
      getReintegrationOutcomes(),
      getSafehouseComparison(),
    ]).then(([a, t, r, c]) => {
      setAnnual(a);
      setTrends(t);
      setReintegration(r);
      setComparison(c);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container py-5 text-center"><div className="spinner-border" style={{ color: 'var(--brand-primary)' }} /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="container-fluid px-4">
          <p className="section-label">Admin</p>
          <h1>Reports & Analytics</h1>
          <p>Annual accomplishment reports and program insights</p>
        </div>
      </div>

      <div className="container-fluid py-4">
        {/* Annual Accomplishment */}
        <div className="card mb-4">
          <div className="card-header">Annual Accomplishment Report — {year}</div>
          <div className="card-body">
            {annual?.map(s => (
              <div key={s.title} className="mb-3">
                <h6 className="fw-bold" style={{ color: 'var(--brand-dark)' }}>{s.title}</h6>
                <p className="text-muted small mb-1">{s.description}</p>
                <pre className="rounded small p-2" style={{ background: 'var(--brand-light)', fontSize: '0.8rem' }}>{JSON.stringify(s.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        </div>

        {/* Donation Trends */}
        <div className="card mb-4">
          <div className="card-header">{trends?.title}</div>
          <div className="card-body">
            <p className="text-muted small">{trends?.description}</p>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead className="table-light"><tr><th>Year</th><th>Month</th><th>Count</th><th>Total (PHP)</th></tr></thead>
                <tbody>
                  {(trends?.data as any[] ?? []).map((row: any) => (
                    <tr key={`${row.year}-${row.month}`}>
                      <td>{row.year}</td>
                      <td>{row.month}</td>
                      <td>{row.count}</td>
                      <td>₱{Number(row.total).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Reintegration + Safehouse Comparison */}
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">{reintegration?.title}</div>
              <div className="card-body">
                <p className="text-muted small">{reintegration?.description}</p>
                {(reintegration?.data as any[] ?? []).map((row: any) => (
                  <div key={row.status} className="d-flex justify-content-between py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <span>{row.status}</span>
                    <span className="fw-bold" style={{ color: 'var(--brand-primary)' }}>{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">{comparison?.title}</div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-sm mb-0">
                    <thead className="table-light"><tr><th>Safehouse</th><th>Month</th><th>Residents</th><th>Incidents</th></tr></thead>
                    <tbody>
                      {(comparison?.data as any[] ?? []).slice(0, 10).map((row: any, i: number) => (
                        <tr key={i}><td>{row.name}</td><td>{row.monthStart}</td><td>{row.activeResidents}</td><td>{row.incidentCount}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}