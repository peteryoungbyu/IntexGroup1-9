import type { ReportSection } from '../types/ReportSection';
import type { ImpactSnapshot } from '../types/DashboardMetric';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;

async function apiFetch(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { credentials: 'include' });
}

export async function getAnnualReport(year: number): Promise<ReportSection[]> {
  const res = await apiFetch(`/api/reports/annual/${year}`);
  return res.json();
}

export async function getDonationTrends(months = 12): Promise<ReportSection> {
  const res = await apiFetch(`/api/reports/donation-trends?months=${months}`);
  return res.json();
}

export async function getReintegrationOutcomes(): Promise<ReportSection> {
  const res = await apiFetch('/api/reports/reintegration');
  return res.json();
}

export async function getSafehouseComparison(): Promise<ReportSection> {
  const res = await apiFetch('/api/reports/safehouse-comparison');
  return res.json();
}

export async function getPublicImpact(count = 6): Promise<ImpactSnapshot[]> {
  const res = await apiFetch(`/api/public/impact?count=${count}`);
  return res.json();
}

export interface PublicOrgSummary {
  totalGirlsServed: number;
  numberOfSafehouses: number;
  yearsOperating: number;
  staffAndVolunteers: number;
}

export async function getPublicOrgSummary(): Promise<PublicOrgSummary> {
  const res = await apiFetch('/api/public/org-summary');
  return res.json();
}

export async function getAdminDashboard() {
  const res = await apiFetch('/api/admin/dashboard');
  return res.json();
}
