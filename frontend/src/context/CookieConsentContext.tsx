import { createContext, useContext, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'new-dawn-cookie-consent';

interface CookieConsentContextValue {
  acknowledged: boolean;
  acknowledgeConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [acknowledged, setAcknowledged] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'acknowledged'
  );

  const acknowledgeConsent = () => {
    localStorage.setItem(STORAGE_KEY, 'acknowledged');
    setAcknowledged(true);
  };

  return (
    <CookieConsentContext.Provider value={{ acknowledged, acknowledgeConsent }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) throw new Error('useCookieConsent must be used inside CookieConsentProvider');
  return ctx;
}
