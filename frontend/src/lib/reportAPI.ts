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

export async function getPublicImpactByDate(
  snapshotDate: string
): Promise<ImpactSnapshot[]> {
  const encodedDate = encodeURIComponent(snapshotDate);
  const res = await apiFetch(`/api/public/impact?snapshotDate=${encodedDate}`);
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

async function apiPost(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { method: 'POST', credentials: 'include' });
}

export interface InferenceResult {
  success: boolean;
  updatedCount: number;
  startedAtUtc: string;
  finishedAtUtc: string;
  message: string;
  error: string;
}

export async function runReintegrationReadiness(): Promise<InferenceResult> {
  const res = await apiPost('/api/reports/inference/reintegration-readiness');
  return res.json();
}

export async function runDonorUpsell(): Promise<InferenceResult> {
  const res = await apiPost('/api/reports/inference/donor-upsell');
  return res.json();
}

export async function runInterventionEffectiveness(): Promise<InferenceResult> {
  const res = await apiPost('/api/reports/inference/intervention-effectiveness');
  return res.json();
}

export async function runSocialMediaDonations(): Promise<InferenceResult> {
  const res = await apiPost('/api/reports/inference/social-media-donations');
  return res.json();
}

export async function runResidentRisk(): Promise<InferenceResult> {
  const res = await apiPost('/api/reports/inference/resident-risk');
  return res.json();
}

export interface PredictionRow {
  predictionId: number;
  residentId: number | null;
  supporterId: number | null;
  modelName: string;
  score: number;
  label: string | null;
  featureImportanceJson?: string | null;
  generatedAt: string;
}

export async function getPredictionsByModel(modelName: string, limit = 100): Promise<PredictionRow[]> {
  const res = await apiFetch(`/api/predictions/model/${encodeURIComponent(modelName)}?limit=${limit}`);
  return res.json();
}

export type ReportInferenceColumnFormat =
  | 'text'
  | 'percent'
  | 'currency'
  | 'badge'
  | 'datetime';

export interface ReportInferenceColumn {
  key: string;
  label: string;
  format: ReportInferenceColumnFormat;
}

export type ReportInferenceRow = Record<string, string | number | null>;

export interface ReportInferenceTable {
  jobKey: string;
  note: string | null;
  columns: ReportInferenceColumn[];
  rows: ReportInferenceRow[];
}

export async function getInferenceResults(
  jobKey: string,
  limit = 100
): Promise<ReportInferenceTable> {
  const res = await apiFetch(
    `/api/reports/inference-results/${encodeURIComponent(jobKey)}?limit=${limit}`
  );
  return res.json();
}
