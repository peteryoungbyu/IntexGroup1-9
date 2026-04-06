import Cookies from 'js-cookie';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const COOKIE_NAME = 'new-dawn-theme';
type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = Cookies.get(COOKIE_NAME);
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    Cookies.set(COOKIE_NAME, theme, { expires: 365, sameSite: 'Lax' });
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
