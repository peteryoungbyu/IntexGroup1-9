import type { CaseConference } from '../types/ResidentDetail';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
}

export async function addCaseConference(
  data: Omit<CaseConference, 'conferenceId'>
): Promise<void> {
  await apiFetch('/api/case-conferences', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteCaseConference(id: number): Promise<void> {
  await apiFetch(`/api/case-conferences/${id}`, { method: 'DELETE' });
}
