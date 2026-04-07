export interface DashboardMetric {
  label: string;
  value: string;
  trend?: string;
}

export interface AdminDashboardData {
  summary: DashboardMetric[];
  monthlyMetrics: any[];
  safehouseBreakdown: any[];
  upcomingConferences: any[];
}

export interface ImpactSnapshot {
  snapshotId: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  metricPayloadJson: string | null;
}
