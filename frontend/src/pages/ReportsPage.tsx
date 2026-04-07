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
  const [reintegration, setReintegration] = useState<ReportSection | null>(null);
  const [comparison, setComparison] = useState<ReportSection | null>(null);
  const [loading, setLoading] = useState(true);

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
  const trendChartData = trendRows.map((row) => ({
    label: `${MONTH_NAMES[(row.month ?? 1) - 1]} ${row.year}`,
    total: Number(row.total ?? 0),
    count: Number(row.count ?? 0),
  }));

  const reintRows: any[] = (reintegration?.data as any[]) ?? [];
  const reintChartData = reintRows.map((row) => ({
    name: row.status ?? 'Unknown',
    value: Number(row.count ?? 0),
  }));

  const compRows: any[] = (comparison?.data as any[]) ?? [];
  const safehouseMap: Record<string, { residents: number; incidents: number }> = {};
  for (const row of compRows) {
    const key = row.name ?? `Safehouse ${row.safehouseId}`;
    if (!safehouseMap[key]) {
      safehouseMap[key] = { residents: 0, incidents: 0 };
    }
    safehouseMap[key].residents += Number(row.activeResidents ?? 0);
    safehouseMap[key].incidents += Number(row.incidentCount ?? 0);
  }
  const compChartData = Object.entries(safehouseMap).map(([name, value]) => ({
    name,
    ...value,
  }));

  const donationSummarySection = annual?.find((section) =>
    section.title.toLowerCase().includes('donation')
  );
  const donationSummaryRows: any[] = (donationSummarySection?.data as any[]) ?? [];

  const servicesSection = annual?.find((section) =>
    section.title.toLowerCase().includes('service')
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
                    tickFormatter={(value) =>
                      `PHP ${Number(value).toLocaleString()}`
                    }
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
                        {reintChartData.map((_, index) => (
                          <Cell
                            key={index}
                            fill={BRAND_COLORS[index % BRAND_COLORS.length]}
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
                <p className="text-muted small mb-3">{comparison?.description}</p>
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

        <div className="card mb-4">
          <div className="card-header fw-semibold">
            Annual Accomplishment Report - {year}
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
                      tickFormatter={(value) =>
                        `PHP ${Number(value).toLocaleString()}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="donationType"
                      tick={{ fontSize: 12 }}
                      width={120}
                    />
                    <Tooltip
                      formatter={(value) => {
                        const numericValue = Number(value ?? 0);
                        return [`PHP ${numericValue.toLocaleString()}`, 'Total'];
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#2563eb"
                      radius={[0, 4, 4, 0]}
                    />
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

            {annual
              ?.filter(
                (section) =>
                  !section.title.toLowerCase().includes('donation') &&
                  !section.title.toLowerCase().includes('service')
              )
              .map((section) => (
                <div key={section.title} className="mb-4">
                  <h6
                    className="fw-semibold"
                    style={{ color: 'var(--brand-dark)' }}
                  >
                    {section.title}
                  </h6>
                  <p className="text-muted small mb-2">
                    {section.description}
                  </p>
                  {Array.isArray(section.data) && section.data.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light">
                          <tr>
                            {Object.keys((section.data as any[])[0]).map((key) => (
                              <th key={key} className="text-capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(section.data as any[]).map((row, index) => (
                            <tr key={index}>
                              {Object.values(row).map((value, valueIndex) => (
                                <td key={valueIndex}>
                                  {value == null ? '-' : String(value)}
                                </td>
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
