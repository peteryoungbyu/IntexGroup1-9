const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

// Normalize to avoid accidental double slashes when building request URLs.
export const API_BASE_URL = configuredBase.replace(/\/+$/, '');

if (import.meta.env.DEV) {
  console.info(
    '[api] BASE URL:',
    API_BASE_URL || '(same-origin via Vite proxy)'
  );
}
