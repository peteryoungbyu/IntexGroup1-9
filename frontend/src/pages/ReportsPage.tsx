import { useEffect, useState } from 'react';
import {
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
  BarChart,
  Bar,
} from 'recharts';
import type { ReportSection } from '../types/ReportSection';
import {
  getAnnualReport,
  getDonationTrends,
  getReintegrationOutcomes,
  getInferenceResults,
  runReintegrationReadiness,
  runDonorUpsell,
  runInterventionEffectiveness,
  runSocialMediaDonations,
  runResidentRisk,
  type InferenceResult,
  type ReportInferenceColumnFormat,
  type ReportInferenceRow,
  type ReportInferenceTable,
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
  const [reintegration, setReintegration] = useState<ReportSection | null>(null);
  const [loading, setLoading] = useState(true);

  type InferenceJob = {
    jobKey: string;
    label: string;
    run: () => Promise<InferenceResult>;
  };

  const inferenceJobs: InferenceJob[] = [
    {
      jobKey: 'reintegration-readiness',
      label: 'Reintegration Readiness',
      run: runReintegrationReadiness,
    },
    {
      jobKey: 'donor-upsell',
      label: 'Donor Upsell',
      run: runDonorUpsell,
    },
    {
      jobKey: 'intervention-effectiveness',
      label: 'Intervention Effectiveness',
      run: runInterventionEffectiveness,
    },
    {
      jobKey: 'social-media-donations',
      label: 'Social Media Donations',
      run: runSocialMediaDonations,
    },
    {
      jobKey: 'resident-risk',
      label: 'Resident Risk',
      run: runResidentRisk,
    },
  ];

  const [inferenceStatus, setInferenceStatus] = useState<
    Record<
      string,
      { running: boolean; result: InferenceResult | null; error: string | null }
    >
  >({});

  const [inferenceTables, setInferenceTables] = useState<
    Record<string, ReportInferenceTable | null>
  >({});
  const [loadingResults, setLoadingResults] = useState<Record<string, boolean>>(
    {}
  );

  type RowData = Record<string, unknown>;

  async function fetchResults(job: InferenceJob) {
    setLoadingResults((prev) => ({ ...prev, [job.jobKey]: true }));
    try {
      const table = await getInferenceResults(job.jobKey, 0);
      setInferenceTables((prev) => ({ ...prev, [job.jobKey]: table }));
    } finally {
      setLoadingResults((prev) => ({ ...prev, [job.jobKey]: false }));
    }
  }

  async function runInference(job: InferenceJob) {
    setInferenceStatus((prev) => ({
      ...prev,
      [job.jobKey]: { running: true, result: null, error: null },
    }));

    try {
      const result = await job.run();
      setInferenceStatus((prev) => ({
        ...prev,
        [job.jobKey]: {
          running: false,
          result,
          error: result.success ? null : result.error,
        },
      }));

      if (result.success) {
        await fetchResults(job);
      }
    } catch (e: unknown) {
      setInferenceStatus((prev) => ({
        ...prev,
        [job.jobKey]: {
          running: false,
          result: null,
          error: e instanceof Error ? e.message : 'Unknown error',
        },
      }));
    }
  }

  function normalizeSectionRows(sectionData: unknown): RowData[] {
    if (Array.isArray(sectionData)) return sectionData;
    if (sectionData && typeof sectionData === 'object') {
      return [sectionData as RowData];
    }
    return [];
  }

  function toReadableLabel(key: string): string {
    return key.replace(/([A-Z])/g, ' $1').trim();
  }

  function formatSummaryValue(key: string, value: unknown): string {
    if (value == null) return '—';

    if (typeof value === 'number') {
      if (key.toLowerCase().includes('year')) return String(value);
      return value.toLocaleString();
    }

    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  function isSummaryObjectRow(row: RowData): boolean {
    const values = Object.values(row);
    return values.every(
      (value) =>
        value == null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    );
  }

  function formatCellValue(
    value: string | number | null | undefined,
    format: ReportInferenceColumnFormat
  ): string {
    if (value == null) return '—';

    switch (format) {
      case 'percent':
        return typeof value === 'number'
          ? `${(value * 100).toFixed(1)}%`
          : String(value);

      case 'currency':
        return typeof value === 'number'
          ? `PHP ${value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          : String(value);

      case 'datetime':
        return new Date(String(value)).toLocaleString();

      default:
        return String(value);
    }
  }

  function formatPredictionLabel(
    value: string | number | null | undefined
  ): string {
    const text = String(value ?? '').trim();
    if (!text) return '—';

    const knownLabels: Record<string, string> = {
      NotReady: 'Not Ready',
      NotEffective: 'Not Effective',
      WillUpgrade: 'Will Upgrade',
      WillNotUpgrade: 'Will Not Upgrade',
      WillGenerateDonation: 'Will Generate Donation',
      WillNotGenerateDonation: 'Will Not Generate Donation',
      HighRisk: 'High Risk',
      LowRisk: 'Low Risk',
    };

    if (knownLabels[text]) return knownLabels[text];

    return text
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function getReadyPredictionCount(rows: ReportInferenceRow[]): number {
    return rows.filter(
      (row) => String(row.prediction ?? '').trim().toLowerCase() === 'ready'
    ).length;
  }

  function getBadgeClass(value: string | number | null | undefined): string {
    const normalized = String(value ?? '').trim().toLowerCase();

    if (
      normalized === 'high' ||
      normalized === 'highrisk' ||
      normalized === 'notready' ||
      normalized === 'noteffective' ||
      normalized === 'willnotupgrade' ||
      normalized === 'willnotgeneratedonation'
    ) {
      return 'badge bg-danger';
    }

    if (normalized === 'medium') {
      return 'badge bg-warning text-dark';
    }

    if (
      normalized === 'ready' ||
      normalized === 'effective' ||
      normalized === 'willupgrade' ||
      normalized === 'willgeneratedonation' ||
      normalized === 'low' ||
      normalized === 'lowrisk' ||
      normalized === 'active'
    ) {
      return 'badge bg-success';
    }

    return 'badge bg-secondary';
  }

  function getRowKey(
    jobKey: string,
    row: ReportInferenceRow,
    index: number
  ): string {
    const entityId = row.postId ?? row.residentId ?? row.supporterId ?? index;
    return `${jobKey}-${entityId}-${index}`;
  }

  useEffect(() => {
    Promise.all([
      getAnnualReport(year),
      getDonationTrends(12),
      getReintegrationOutcomes(),
    ])
      .then(([annualReport, donationTrends, reintegrationOutcomes]) => {
        setAnnual(annualReport);
        setTrends(donationTrends);
        setReintegration(reintegrationOutcomes);
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

  const trendRows: RowData[] = normalizeSectionRows(trends?.data);
  const trendChartData = trendRows.map((r) => ({
    label: `${MONTH_NAMES[Math.max(Number(r.month ?? 1) - 1, 0)] ?? 'Jan'} ${
      r.year ?? ''
    }`,
    total: Number(r.total ?? 0),
    count: Number(r.count ?? 0),
  }));

  const reintRows: RowData[] = normalizeSectionRows(reintegration?.data);
  const reintChartData = reintRows.map((r) => ({
    name: r.status ?? 'Unknown',
    value: Number(r.count ?? 0),
  }));

  const donationSummarySection = annual?.find((s) =>
    s.title.toLowerCase().includes('donation')
  );
  const donationSummaryRows: RowData[] = normalizeSectionRows(
    donationSummarySection?.data
  );
  const donationSummaryBreakdownRows = donationSummaryRows.map((row) => ({
    type: String(
      row?.donationType ?? row?.type ?? row?.category ?? row?.label ?? 'Unknown'
    ),
    count: Number(row?.count ?? 0),
    total: Number(row?.total ?? row?.amount ?? 0),
  }));
  const donationSummaryChartData = donationSummaryRows
    .map((row) => {
      const label =
        row?.donationType ??
        row?.type ??
        row?.category ??
        row?.label ??
        'Unknown';

      const value = Number(row?.total ?? row?.amount ?? row?.count ?? 0);
      return { label: String(label), value };
    })
    .filter((row) => Number.isFinite(row.value));

  const servicesSection = annual?.find((s) =>
    s.title.toLowerCase().includes('service')
  );
  const servicesRows: RowData[] = normalizeSectionRows(servicesSection?.data);
  const servicesChartData = servicesRows
    .map((row) => ({
      label: String(
        row?.serviceType ?? row?.type ?? row?.category ?? 'Unknown'
      ),
      value: Number(row?.count ?? row?.total ?? 0),
    }))
    .filter((row) => Number.isFinite(row.value));

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
          <div className="col-md-12">
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
        </div>

        <div className="card mb-4">
          <div className="card-header fw-semibold">
            ML Inference — Run Predictions
          </div>
          <div className="card-body">
            <p className="text-muted small mb-3">
              Trigger each model to score all records and write results to the
              database. Each job may take several seconds.
            </p>
            <div className="d-flex flex-column gap-4">
              {inferenceJobs.map((job) => {
                const status = inferenceStatus[job.jobKey];
                const table = inferenceTables[job.jobKey];
                const rows = table?.rows ?? [];
                const loadingRes = loadingResults[job.jobKey];
                const readyCount =
                  job.jobKey === 'reintegration-readiness'
                    ? getReadyPredictionCount(rows)
                    : 0;

                return (
                  <div key={job.jobKey} className="border rounded p-3">
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
                        <span className="text-success small">
                          ✓ {status.result.updatedCount} records updated
                        </span>
                      )}

                      {status?.error && (
                        <span className="text-danger small">
                          ✗ {status.error}
                        </span>
                      )}
                    </div>

                    {table?.note && (
                      <p className="text-muted small mb-2">{table.note}</p>
                    )}

                    {job.jobKey === 'reintegration-readiness' &&
                      rows.length > 0 && (
                        <div className="mb-3 p-3 rounded border bg-light">
                          <p className="text-muted text-uppercase small fw-semibold mb-1">
                            OKR: Reintegration Readiness
                          </p>
                          <h4 className="mb-1">
                            {readyCount.toLocaleString()} Ready
                          </h4>
                          <p className="text-muted small mb-0">
                            Total residents predicted as Ready (
                            {rows.length.toLocaleString()} latest predictions)
                          </p>
                        </div>
                      )}

                    {rows.length > 0 && (
                      <div
                        className="table-responsive"
                        style={{ maxHeight: 320, overflowY: 'auto' }}
                      >
                        <table className="table table-sm table-bordered table-hover mb-0">
                          <thead className="table-light sticky-top">
                            <tr>
                              {table?.columns.map((column) => (
                                <th key={column.key}>{column.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, index) => (
                              <tr key={getRowKey(job.jobKey, row, index)}>
                                {table?.columns.map((column) => {
                                  const value = row[column.key];
                                  return (
                                    <td key={column.key}>
                                      {column.format === 'badge' ? (
                                        <span className={getBadgeClass(value)}>
                                          {column.key === 'prediction' ||
                                          column.key === 'riskBand'
                                            ? formatPredictionLabel(value)
                                            : formatCellValue(
                                                value,
                                                column.format
                                              )}
                                        </span>
                                      ) : (
                                        <span
                                          className={
                                            column.format === 'datetime'
                                              ? 'text-muted small'
                                              : undefined
                                          }
                                        >
                                          {formatCellValue(
                                            value,
                                            column.format
                                          )}
                                        </span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
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
                {donationSummaryChartData.length > 0 ? (
                  <div className="table-responsive mt-3">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Donation Type</th>
                          <th className="text-end"># Donations</th>
                          <th className="text-end">Total (PHP)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donationSummaryBreakdownRows.map((row, index) => (
                          <tr key={`${row.type}-${index}`}>
                            <td>{row.type}</td>
                            <td className="text-end">
                              {row.count.toLocaleString()}
                            </td>
                            <td className="text-end">
                              ₱{row.total.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">
                    Donation data loaded but no chartable values were found.
                  </p>
                )}
              </div>
            )}

            {servicesRows.length > 0 && (
              <div className="mb-4">
                <h6 className="fw-semibold mb-2">{servicesSection?.title}</h6>
                <p className="text-muted small mb-2">
                  {servicesSection?.description}
                </p>
                {servicesChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={servicesChartData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar
                        dataKey="value"
                        fill="#16a34a"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted small mb-0">
                    Service data loaded but no chartable values were found.
                  </p>
                )}
              </div>
            )}

            {annual
              ?.filter(
                (s) =>
                  !s.title.toLowerCase().includes('donation') &&
                  !s.title.toLowerCase().includes('service')
              )
              .map((s) => {
                const sectionRows = normalizeSectionRows(s.data);
                const isSummarySection =
                  sectionRows.length === 1 &&
                  isSummaryObjectRow(sectionRows[0]);

                return (
                  <div key={s.title} className="mb-4">
                    <h6
                      className="fw-semibold"
                      style={{ color: 'var(--brand-dark)' }}
                    >
                      {s.title}
                    </h6>
                    <p className="text-muted small mb-2">{s.description}</p>

                    {sectionRows.length > 0 ? (
                      isSummarySection ? (
                        <div className="row g-3">
                          {Object.entries(sectionRows[0]).map(([key, value]) => (
                            <div
                              className="col-12 col-sm-6 col-lg-4"
                              key={key}
                            >
                              <div className="border rounded p-3 h-100 bg-light-subtle">
                                <p className="text-muted text-uppercase small fw-semibold mb-1">
                                  {toReadableLabel(key)}
                                </p>
                                <h4 className="mb-0">
                                  {formatSummaryValue(key, value)}
                                </h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered mb-0">
                            <thead className="table-light">
                              <tr>
                                {Object.keys(sectionRows[0]).map((k) => (
                                  <th key={k} className="text-capitalize">
                                    {toReadableLabel(k)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sectionRows.map((row, i) => (
                                <tr key={i}>
                                  {Object.values(row).map((v, j) => (
                                    <td key={j}>
                                      {v == null ? '—' : String(v)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <p className="text-muted small">No data available.</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}