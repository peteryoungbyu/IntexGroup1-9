import type {
  Supporter,
  Donation,
  SupporterDetail,
  SupporterListItem,
  PagedResult,
} from '../types/SupporterDetail';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;

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
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
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

export async function getMyDonorHistory(): Promise<SupporterDetail> {
  const res = await apiFetch('/api/donor/me');
  if (!res.ok) {
    throw new Error(extractErrorMessage(res.status));
  }
  return res.json();
}

export async function deleteSupporter(id: number): Promise<void> {
  await apiFetch(`/api/supporters/${id}`, { method: 'DELETE' });
}

export async function createSupporter(data: Omit<Supporter, 'supporterId' | 'createdAt'>): Promise<Supporter> {
  const res = await apiFetch('/api/supporters', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSupporter(id: number, data: Omit<Supporter, 'supporterId' | 'createdAt'>): Promise<Supporter> {
  const res = await apiFetch(`/api/supporters/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addDonation(supporterId: number, data: Omit<Donation, 'donationId'>): Promise<Donation> {
  const res = await apiFetch(`/api/supporters/${supporterId}/donations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteDonation(supporterId: number, donationId: number): Promise<void> {
  await apiFetch(`/api/supporters/${supporterId}/donations/${donationId}`, { method: 'DELETE' });
}
