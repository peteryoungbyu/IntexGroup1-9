import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'new-dawn-cookie-consent-v2';
const LEGACY_STORAGE_KEY = 'new-dawn-cookie-consent';
const LEGACY_THEME_COOKIE = 'new-dawn-theme';

export type CookieConsentChoice = 'necessary' | 'preferences';

interface CookieConsentContextValue {
  consentChoice: CookieConsentChoice | null;
  canUsePreferences: boolean;
  acceptNecessaryOnly: () => void;
  acceptPreferences: () => void;
  resetConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function getStoredChoice(): CookieConsentChoice | null {
  if (typeof window === 'undefined') return null;

  const storedChoice = localStorage.getItem(STORAGE_KEY);
  return storedChoice === 'necessary' || storedChoice === 'preferences'
    ? storedChoice
    : null;
}

function clearCookie(name: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function clearLegacyConsentArtifacts() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(LEGACY_STORAGE_KEY);
  clearCookie(LEGACY_THEME_COOKIE);
  document.documentElement.removeAttribute('data-bs-theme');
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consentChoice, setConsentChoice] = useState<CookieConsentChoice | null>(
    () => getStoredChoice()
  );

  useEffect(() => {
    clearLegacyConsentArtifacts();
  }, []);

  const persistChoice = (choice: CookieConsentChoice) => {
    clearLegacyConsentArtifacts();
    localStorage.setItem(STORAGE_KEY, choice);
    setConsentChoice(choice);
  };

  const acceptNecessaryOnly = () => {
    persistChoice('necessary');
  };

  const acceptPreferences = () => {
    persistChoice('preferences');
  };

  const resetConsent = () => {
    clearLegacyConsentArtifacts();
    localStorage.removeItem(STORAGE_KEY);
    setConsentChoice(null);
  };

  return (
    <CookieConsentContext.Provider
      value={{
        consentChoice,
        canUsePreferences: consentChoice === 'preferences',
        acceptNecessaryOnly,
        acceptPreferences,
        resetConsent,
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used inside CookieConsentProvider');
  return ctx;
}
