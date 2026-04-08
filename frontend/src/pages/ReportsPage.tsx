import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ReportSection } from '../types/ReportSection';
import {
  getAnnualReport,
  getDonationTrends,
  getReintegrationOutcomes,
  getSafehouseComparison,
  runReintegrationReadiness,
  runDonorUpsell,
  runInterventionEffectiveness,
  runSocialMediaDonations,
  runResidentRisk,
  getPredictionsByModel,
  type InferenceResult,
  type PredictionRow,
} from '../lib/reportAPI';

const BRAND_COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#be185d',
  '#65a30d',
];

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export default function ReportsPage() {
  const year = new Date().getFullYear();
  const [annual, setAnnual] = useState<ReportSection[] | null>(null);
  const [trends, setTrends] = useState<ReportSection | null>(null);
  const [reintegration, setReintegration] = useState<ReportSection | null>(
    null
  );
  const [comparison, setComparison] = useState<ReportSection | null>(null);
  const [loading, setLoading] = useState(true);

  type InferenceJob = {
    label: string;
    modelNames: string[];
    run: () => Promise<InferenceResult>;
  };

  const inferenceJobs: InferenceJob[] = [
    { label: 'Reintegration Readiness', modelNames: ['reintegration_readiness'], run: runReintegrationReadiness },
    { label: 'Donor Upsell', modelNames: ['donor_upsell'], run: runDonorUpsell },
    { label: 'Intervention Effectiveness', modelNames: ['intervention_effectiveness'], run: runInterventionEffectiveness },
    { label: 'Social Media Donations', modelNames: ['social_media_classification', 'social_media_regression'], run: runSocialMediaDonations },
    { label: 'Resident Risk', modelNames: ['resident_risk_classification', 'resident_risk_regression'], run: runResidentRisk },
  ];

  const [inferenceStatus, setInferenceStatus] = useState<
    Record<string, { running: boolean; result: InferenceResult | null; error: string | null }>
  >({});

  const [predictionRows, setPredictionRows] = useState<Record<string, PredictionRow[]>>({});
  const [loadingResults, setLoadingResults] = useState<Record<string, boolean>>({});

  async function fetchResults(job: InferenceJob) {
    setLoadingResults((prev) => ({ ...prev, [job.label]: true }));
    const allRows = (
      await Promise.all(job.modelNames.map((m) => getPredictionsByModel(m, 100)))
    ).flat().sort((a, b) => b.score - a.score);
    setPredictionRows((prev) => ({ ...prev, [job.label]: allRows }));
    setLoadingResults((prev) => ({ ...prev, [job.label]: false }));
  }

  async function runInference(job: InferenceJob) {
    setInferenceStatus((prev) => ({
      ...prev,
      [job.label]: { running: true, result: null, error: null },
    }));
    try {
      const result = await job.run();
      setInferenceStatus((prev) => ({
        ...prev,
        [job.label]: { running: false, result, error: result.success ? null : result.error },
      }));
      if (result.success) await fetchResults(job);
    } catch (e: any) {
      setInferenceStatus((prev) => ({
        ...prev,
        [job.label]: { running: false, result: null, error: e?.message ?? 'Unknown error' },
      }));
    }
  }

  useEffect(() => {
    Promise.all([
      getAnnualReport(year),
      getDonationTrends(12),
      getReintegrationOutcomes(),
      getSafehouseComparison(),
    ])
      .then(([annualReport, donationTrends, reintegrationOutcomes, safehouseComparison]) => {
        setAnnual(annualReport);
        setTrends(donationTrends);
        setReintegration(reintegrationOutcomes);
        setComparison(safehouseComparison);
      })
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div
          className="spinner-border"
          style={{ color: 'var(--brand-primary)' }}
        />
      </div>
    );
  }

  const trendRows: any[] = (trends?.data as any[]) ?? [];
  const trendChartData = trendRows.map((r) => ({
    label: `${MONTH_NAMES[(r.month ?? 1) - 1]} ${r.year}`,
    total: Number(r.total ?? 0),
    count: Number(r.count ?? 0),
  }));

  const reintRows: any[] = (reintegration?.data as any[]) ?? [];
  const reintChartData = reintRows.map((r) => ({
    name: r.status ?? 'Unknown',
    value: Number(r.count ?? 0),
  }));

  const compRows: any[] = (comparison?.data as any[]) ?? [];
  const safehouseMap: Record<string, { residents: number; incidents: number }> =
    {};
  for (const r of compRows) {
    const key = r.name ?? `Safehouse ${r.safehouseId}`;
    if (!safehouseMap[key]) safehouseMap[key] = { residents: 0, incidents: 0 };
    safehouseMap[key].residents += Number(r.activeResidents ?? 0);
    safehouseMap[key].incidents += Number(r.incidentCount ?? 0);
  }
  const compChartData = Object.entries(safehouseMap).map(([name, v]) => ({
    name,
    ...v,
  }));

  // Annual report — find "Donation Summary" section for a bar chart
  const donationSummarySection = annual?.find((s) =>
    s.title.toLowerCase().includes('donation')
  );
  const donationSummaryRows: any[] =
    (donationSummarySection?.data as any[]) ?? [];

  // Annual services section (caring/healing/teaching counts)
  const servicesSection = annual?.find((s) =>
    s.title.toLowerCase().includes('service')
  );
  const servicesRows: any[] = (servicesSection?.data as any[]) ?? [];

  function getScoreDisplay(row: PredictionRow): {
    text: string;
    className: string;
  } {
    if (
      row.modelName === 'social_media_regression' &&
      row.featureImportanceJson
    ) {
      try {
        const details = JSON.parse(row.featureImportanceJson) as {
          predictedAmountPhp?: number;
        };

        if (typeof details.predictedAmountPhp === 'number') {
          return {
            text: `PHP ${details.predictedAmountPhp.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            className: 'badge text-bg-info',
          };
        }
      } catch {
        // Fall through to default score rendering.
      }
    }

    return {
      text: row.score.toFixed(3),
      className:
        row.score >= 0.6
          ? 'badge bg-danger'
          : row.score >= 0.3
          ? 'badge bg-warning text-dark'
          : 'badge bg-success',
    };
  }

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
        {/* Donation Trends — Line Chart */}
        <div className="card mb-4">
          <div className="card-header fw-semibold">
            {trends?.title ?? 'Donation Trends'}
          </div>
          <div className="card-body">
            <p className="text-muted small mb-3">{trends?.description}</p>
            {trendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={trendChartData}
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const numericValue = Number(value ?? 0);
                      return name === 'total'
                        ? [`₱${numericValue.toLocaleString()}`, 'Total (PHP)']
                        : [numericValue, 'Donations'];
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      const numericValue = Number(value ?? 0);
                      return name === 'total'
                        ? [`PHP ${numericValue.toLocaleString()}`, 'Total (PHP)']
                        : [numericValue.toLocaleString(), 'Donations'];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    name="Total (PHP)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="count"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    name="# Donations"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted">No donation trend data available.</p>
            )}
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-md-5">
            <div className="card h-100">
              <div className="card-header fw-semibold">
                {reintegration?.title ?? 'Reintegration Outcomes'}
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  {reintegration?.description}
                </p>
                {reintChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={reintChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {reintChartData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={BRAND_COLORS[i % BRAND_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted">No reintegration data available.</p>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-7">
            <div className="card h-100">
              <div className="card-header fw-semibold">
                {comparison?.title ?? 'Safehouse Comparison'}
              </div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  {comparison?.description}
                </p>
                {compChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={compChartData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar
                        dataKey="residents"
                        fill="#2563eb"
                        name="Residents"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="incidents"
                        fill="#dc2626"
                        name="Incidents"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted">
                    No safehouse comparison data available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ML Inference Panel */}
        <div className="card mb-4">
          <div className="card-header fw-semibold">ML Inference — Run Predictions</div>
          <div className="card-body">
            <p className="text-muted small mb-3">
              Trigger each model to score all records and write results to the database.
              Each job may take several seconds.
            </p>
            <div className="d-flex flex-column gap-4">
              {inferenceJobs.map((job) => {
                const status = inferenceStatus[job.label];
                const rows = predictionRows[job.label] ?? [];
                const loadingRes = loadingResults[job.label];
                return (
                  <div key={job.label} className="border rounded p-3">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className="fw-semibold">{job.label}</span>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={status?.running}
                        onClick={() => runInference(job)}
                      >
                        {status?.running ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" />
                            Running…
                          </>
                        ) : (
                          'Run'
                        )}
                      </button>
                      {rows.length === 0 && !status?.running && (
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          disabled={loadingRes}
                          onClick={() => fetchResults(job)}
                        >
                          {loadingRes ? (
                            <span className="spinner-border spinner-border-sm" />
                          ) : (
                            'View Last Results'
                          )}
                        </button>
                      )}
                      {status?.result?.success && (
                        <span className="text-success small">✓ {status.result.updatedCount} records updated</span>
                      )}
                      {status?.error && (
                        <span className="text-danger small">✗ {status.error}</span>
                      )}
                    </div>

                    {rows.length > 0 && (
                      <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                        <table className="table table-sm table-bordered table-hover mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th>Model</th>
                              {rows[0].residentId != null && <th>Resident ID</th>}
                              {rows[0].supporterId != null && <th>Supporter ID</th>}
                              <th>Score</th>
                              <th>Label</th>
                              <th>Generated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => {
                              const scoreDisplay = getScoreDisplay(r);
                              return (
                              <tr key={r.predictionId}>
                                <td className="text-muted small">{r.modelName}</td>
                                {r.residentId != null && <td>{r.residentId}</td>}
                                {r.supporterId != null && <td>{r.supporterId}</td>}
                                <td>
                                  <span className={scoreDisplay.className}>
                                    {scoreDisplay.text}
                                  </span>
                                </td>
                                <td className="small">{r.label ?? '—'}</td>
                                <td className="text-muted small">
                                  {new Date(r.generatedAt).toLocaleString()}
                                </td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header fw-semibold">
            Annual Accomplishment Report — {year}
          </div>
          <div className="card-body">
            {donationSummaryRows.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold mb-2">
                  {donationSummarySection?.title}
                </h6>
                <p className="text-muted small mb-2">
                  {donationSummarySection?.description}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={donationSummaryRows}
                    layout="vertical"
                    margin={{ left: 20, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `₱${Number(v).toLocaleString()}`}
                    />
                    <YAxis
                      type="category"
                      dataKey="donationType"
                      tick={{ fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(v) => [
                        `₱${Number(v ?? 0).toLocaleString()}`,
                        'Total',
                      ]}
                    />
                    <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {servicesRows.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold mb-2">{servicesSection?.title}</h6>
                <p className="text-muted small mb-2">
                  {servicesSection?.description}
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={servicesRows}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="serviceType" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Remaining sections as data tables */}
            {annual
              ?.filter(
                (s) =>
                  !s.title.toLowerCase().includes('donation') &&
                  !s.title.toLowerCase().includes('service')
              )
              .map((s) => (
                <div key={s.title} className="mb-4">
                  <h6
                    className="fw-semibold"
                    style={{ color: 'var(--brand-dark)' }}
                  >
                    {s.title}
                  </h6>
                  <p className="text-muted small mb-2">{s.description}</p>
                  {Array.isArray(s.data) && s.data.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            {Object.keys((s.data as any[])[0]).map((k) => (
                              <th key={k} className="text-capitalize">
                                {k.replace(/([A-Z])/g, ' $1').trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(s.data as any[]).map((row, i) => (
                            <tr key={i}>
                              {Object.values(row).map((v, j) => (
                                <td key={j}>{v == null ? '—' : String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted small">No data available.</p>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
