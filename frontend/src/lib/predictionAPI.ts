import type { PredictionResult } from '../types/ResidentDetail';

const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

async function apiFetch(path: string): Promise<Response> {
  return fetch(`${BASE}${path}`, { credentials: 'include' });
}

export async function getPredictionsForResident(residentId: number): Promise<PredictionResult[]> {
  const res = await apiFetch(`/api/predictions/resident/${residentId}`);
  return res.json();
}

export async function getPredictionsForSupporter(supporterId: number): Promise<PredictionResult[]> {
  const res = await apiFetch(`/api/predictions/supporter/${supporterId}`);
  return res.json();
}

export async function getPredictionsByModel(modelName: string, limit = 50): Promise<PredictionResult[]> {
  const res = await apiFetch(`/api/predictions/model/${encodeURIComponent(modelName)}?limit=${limit}`);
  return res.json();
}
