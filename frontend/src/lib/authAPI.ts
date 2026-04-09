import type { AuthSession } from '../types/AuthSession';
import type { TwoFactorStatus } from '../types/TwoFactorStatus';
import { API_BASE_URL } from './apiBase';

const BASE = API_BASE_URL;
export const REQUIRES_TWO_FACTOR_ERROR = 'requiresTwoFactor';

function normalizeAuthSignal(value: unknown): string {
  return typeof value === 'string'
    ? value.replace(/[^a-z0-9]/gi, '').toLowerCase()
    : '';
}

function isTwoFactorRequired(body: unknown): boolean {
  if (typeof body === 'string') {
    return (
      normalizeAuthSignal(body) === REQUIRES_TWO_FACTOR_ERROR.toLowerCase()
    );
  }

  if (typeof body !== 'object' || body === null) {
    return false;
  }

  const b = body as Record<string, unknown>;
  if (b['requiresTwoFactor'] === true) {
    return true;
  }

  return [b['title'], b['detail'], b['message']].some(
    (value) =>
      normalizeAuthSignal(value) === REQUIRES_TWO_FACTOR_ERROR.toLowerCase()
  );
}

function extractError(body: unknown): string {
  if (typeof body !== 'object' || body === null) return 'An error occurred';
  const b = body as Record<string, unknown>;
  if (typeof b['detail'] === 'string') return b['detail'];
  if (typeof b['title'] === 'string') return b['title'];
  if (typeof b['errors'] === 'object' && b['errors'] !== null) {
    const first = Object.values(b['errors'] as Record<string, unknown[]>)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  }
  if (typeof b['message'] === 'string') return b['message'];
  return 'An error occurred';
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
}

export async function getAuthSession(): Promise<AuthSession> {
  const res = await apiFetch('/api/auth/me');
  return res.json();
}

export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean,
  twoFactorCode?: string,
  twoFactorRecoveryCode?: string
): Promise<void> {
  const param = rememberMe ? '?useCookies=true' : '?useSessionCookies=true';
  const res = await apiFetch(`/api/auth/login${param}`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      twoFactorCode,
      twoFactorRecoveryCode,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (isTwoFactorRequired(body)) {
    throw new Error(REQUIRES_TWO_FACTOR_ERROR);
  }
  if (!res.ok) {
    throw new Error(extractError(body));
  }
}

export async function registerUser(
  email: string,
  password: string
): Promise<void> {
  const res = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(extractError(body));
  }
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

export async function getExternalProviders(): Promise<
  { name: string; displayName: string }[]
> {
  const res = await apiFetch('/api/auth/providers');
  return res.ok ? res.json() : [];
}

export function buildExternalLoginUrl(
  provider: string,
  returnPath: string
): string {
  return `${BASE}/api/auth/external-login?provider=${encodeURIComponent(provider)}&returnPath=${encodeURIComponent(returnPath)}`;
}

export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const res = await apiFetch('/api/auth/manage/2fa', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractError(body));
  }
  return body as TwoFactorStatus;
}

export async function enableTwoFactor(code: string): Promise<TwoFactorStatus> {
  const res = await apiFetch('/api/auth/manage/2fa', {
    method: 'POST',
    body: JSON.stringify({
      enable: true,
      twoFactorCode: code,
      resetRecoveryCodes: true,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractError(body));
  }
  if (
    typeof body !== 'object' ||
    body === null ||
    (body as Partial<TwoFactorStatus>).isTwoFactorEnabled !== true
  ) {
    throw new Error('Two-factor authentication was not enabled.');
  }
  return body as TwoFactorStatus;
}

export async function disableTwoFactor(): Promise<void> {
  const res = await apiFetch('/api/auth/manage/2fa', {
    method: 'POST',
    body: JSON.stringify({ enable: false }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(extractError(body));
  }
}

export async function resetRecoveryCodes(): Promise<TwoFactorStatus> {
  const res = await apiFetch('/api/auth/manage/2fa', {
    method: 'POST',
    body: JSON.stringify({ resetRecoveryCodes: true }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(extractError(body));
  }
  return body as TwoFactorStatus;
}
