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

  useEffect(() => {
    Promise.all([
      getAnnualReport(year),
      getDonationTrends(12),
      getReintegrationOutcomes(),
      getSafehouseComparison(),
    ])
      .then(([a, t, r, c]) => {
        setAnnual(a);
        setTrends(t);
        setReintegration(r);
        setComparison(c);
      })
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

  // Shape donation trend data for chart
  const trendRows: any[] = (trends?.data as any[]) ?? [];
  const trendChartData = trendRows.map((r) => ({
    label: `${MONTH_NAMES[(r.month ?? 1) - 1]} ${r.year}`,
    total: Number(r.total ?? 0),
    count: Number(r.count ?? 0),
  }));

  // Reintegration pie data
  const reintRows: any[] = (reintegration?.data as any[]) ?? [];
  const reintChartData = reintRows.map((r) => ({
    name: r.status ?? 'Unknown',
    value: Number(r.count ?? 0),
  }));

  // Safehouse comparison – aggregate by safehouse name
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

        {/* Reintegration + Safehouse — side by side */}
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

        {/* Annual Accomplishment */}
        <div className="card mb-4">
          <div className="card-header fw-semibold">
            Annual Accomplishment Report — {year}
          </div>
          <div className="card-body">
            {/* Donation by type bar chart if available */}
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

            {/* Services section if available */}
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
