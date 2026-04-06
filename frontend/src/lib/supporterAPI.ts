import type { SupporterDetail, SupporterListItem, PagedResult } from '../types/SupporterDetail';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

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
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
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
  return res.json();
}

export async function deleteSupporter(id: number): Promise<void> {
  await apiFetch(`/api/supporters/${id}`, { method: 'DELETE' });
}
