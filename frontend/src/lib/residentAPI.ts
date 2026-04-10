import type {
  CreateResidentRequest,
  Resident,
  ResidentDetail,
  ResidentFormOptions,
  ResidentListItem,
  ResidentSafehouseOption,
  PagedResult,
  ProcessRecording,
  HomeVisitation,
  ProcessRecordingFormOptions,
  SessionEntryRecordingRequest,
} from '../types/ResidentDetail';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Request failed: ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = `Request failed: ${res.status}`;

    try {
      const errorBody = JSON.parse(body);
      if (typeof errorBody?.error === 'string' && errorBody.error.length > 0) {
        message = errorBody.error;
      } else if (body.length > 0) {
        message = body;
      }
    } catch {
      if (body.length > 0) {
        message = body;
      }
    }

    throw new ApiError(res.status, message);

  }
  return res;
}

export async function getResidents(
  page = 1,
  pageSize = 20,
  search?: string,
  status?: string,
  safehouseId?: number,
  caseCategory?: string
): Promise<PagedResult<ResidentListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (safehouseId) params.set('safehouseId', String(safehouseId));
  if (caseCategory) params.set('caseCategory', caseCategory);
  const res = await apiFetch(`/api/residents?${params}`);
  return res.json();
}

export async function getResidentSafehouseOptions(): Promise<ResidentSafehouseOption[]> {
  const res = await apiFetch('/api/residents/filter-options');
  return res.json();
}

export async function getResidentById(id: number): Promise<ResidentDetail> {
  const res = await apiFetch(`/api/residents/${id}`);
  return res.json();
}

export async function getResidentFormOptions(): Promise<ResidentFormOptions> {
  const res = await apiFetch('/api/residents/form-options');
  return res.json();
}

export async function createResident(data: CreateResidentRequest): Promise<Resident> {
  const res = await apiFetch('/api/residents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateResident(id: number, data: Omit<Resident, 'residentId' | 'createdAt'>): Promise<Resident> {
  const res = await apiFetch(`/api/residents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteResident(id: number): Promise<void> {
  await apiFetch(`/api/residents/${id}`, { method: 'DELETE' });
}

export async function getResidentRecordings(residentId: number): Promise<ProcessRecording[]> {
  const res = await apiFetch(`/api/residents/${residentId}/recordings`);
  return res.json();
}

export async function addRecording(
  residentId: number,
  data: Omit<ProcessRecording, 'recordingId'>
): Promise<void> {
  await apiFetch(`/api/residents/${residentId}/recordings`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProcessRecordingFormOptions(): Promise<ProcessRecordingFormOptions> {
  const res = await apiFetch('/api/residents/recordings/form-options');
  return res.json();
}

export async function addSessionEntryRecording(
  residentId: number,
  data: SessionEntryRecordingRequest
): Promise<void> {
  await apiFetch(`/api/residents/${residentId}/recordings/session-entry`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteRecording(
  residentId: number,
  recordingId: number
): Promise<void> {
  await apiFetch(`/api/residents/${residentId}/recordings/${recordingId}`, {
    method: 'DELETE',
  });
}

export async function getResidentVisitations(residentId: number): Promise<HomeVisitation[]> {
  const res = await apiFetch(`/api/residents/${residentId}/visitations`);
  return res.json();
}

export async function addVisitation(
  residentId: number,
  data: Omit<HomeVisitation, 'visitationId'>
): Promise<void> {
  await apiFetch(`/api/residents/${residentId}/visitations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteVisitation(
  residentId: number,
  visitationId: number
): Promise<void> {
  await apiFetch(`/api/residents/${residentId}/visitations/${visitationId}`, {
    method: 'DELETE',
  });
}
