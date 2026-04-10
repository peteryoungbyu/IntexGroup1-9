import type {
  Supporter,
  Donation,
  SupporterDetail,
  SupporterListItem,
  PagedResult,
} from '../types/SupporterDetail';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;

export interface DonorChurnRunResult {
  success: boolean;
  exitCode: number;
  startedAtUtc: string;
  finishedAtUtc: string;
  standardOutput: string;
  standardError: string;
}

export interface SupporterChurnItem {
  supporterId: number;
  displayName: string;
  churnProbability: number | null;
  likelyChurn: boolean | null;
}

export interface DonorPledgeOptions {
  programAreas: string[];
  safehouseIds: number[];
}

export interface SupporterFormOptions {
  supporterTypes: string[];
  relationshipTypes: string[];
  regions: string[];
  countries: string[];
  acquisitionChannels: string[];
  statuses: string[];
}

export interface CreateSupporterRequest {
  supporterType: string;
  organizationName: string | null;
  firstName: string;
  lastName: string;
  relationshipType: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  firstDonationDate: string;
  acquisitionChannel: string;
}

function extractErrorMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to view donor history.';
    case 404:
      return 'No donor history is linked to this account.';
    default:
      return 'Unable to load donor history right now.';
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}

export async function getSupporters(
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string
): Promise<PagedResult<SupporterListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  const res = await apiFetch(`/api/supporters?${params}`);
  return res.json();
}

export async function getSupporterById(id: number): Promise<SupporterDetail> {
  const res = await apiFetch(`/api/supporters/${id}`);
  return res.json();
}

export async function getMyDonorHistory(): Promise<SupporterDetail | null> {
  const res = await fetch(`${BASE}/api/donor/me`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(extractErrorMessage(res.status));
  return res.json();
}

export async function deleteSupporter(id: number): Promise<void> {
  await apiFetch(`/api/supporters/${id}`, { method: 'DELETE' });
}

export async function getSupporterFormOptions(): Promise<SupporterFormOptions> {
  const res = await apiFetch('/api/supporters/form-options');
  return res.json();
}

export async function createSupporter(
  data: CreateSupporterRequest
): Promise<Supporter> {
  const res = await apiFetch('/api/supporters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSupporter(
  id: number,
  data: Omit<Supporter, 'supporterId' | 'createdAt'>
): Promise<Supporter> {
  const res = await apiFetch(`/api/supporters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addDonation(
  supporterId: number,
  data: Omit<Donation, 'donationId'>
): Promise<Donation> {
  const res = await apiFetch(`/api/supporters/${supporterId}/donations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function createDonorPledge(
  amount: number,
  isRecurring: boolean,
  programArea: string | null,
  safehouseId: number | null
): Promise<Donation> {
  const res = await apiFetch('/api/donor/me/pledge', {
    method: 'POST',
    body: JSON.stringify({ amount, isRecurring, programArea, safehouseId }),
  });
  return res.json();
}

export async function getDonorPledgeOptions(): Promise<DonorPledgeOptions> {
  const res = await fetch(`${BASE}/api/donor/me/pledge-options`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    return {
      programAreas: ['Education', 'Maintenance', 'Operations', 'Outreach', 'Transport', 'Wellbeing'],
      safehouseIds: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    };
  }

  return res.json();
}

export async function deleteDonation(
  supporterId: number,
  donationId: number
): Promise<void> {
  await apiFetch(`/api/supporters/${supporterId}/donations/${donationId}`, {
    method: 'DELETE',
  });
}

export async function runDonorChurnInference(
  asOfDate?: string
): Promise<DonorChurnRunResult> {
  const res = await apiFetch('/api/supporters/churn/run', {
    method: 'POST',
    body: JSON.stringify({ asOfDate: asOfDate || null }),
  });
  return res.json();
}

export async function getSupporterChurnPredictions(): Promise<
  SupporterChurnItem[]
> {
  const res = await apiFetch('/api/supporters/churn');
  return res.json();
}
