import type {
  ResidentDetail,
  ResidentListItem,
  PagedResult,
} from '../types/ResidentDetail';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
}

export async function getResidents(
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string,
  safehouseId?: number
): Promise<PagedResult<ResidentListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (safehouseId) params.set('safehouseId', String(safehouseId));
  const res = await apiFetch(`/api/residents?${params}`);
  return res.json();
}

export async function getResidentById(id: number): Promise<ResidentDetail> {
  const res = await apiFetch(`/api/residents/${id}`);
  return res.json();
}

export async function deleteResident(id: number): Promise<void> {
  await apiFetch(`/api/residents/${id}`, { method: 'DELETE' });
}
