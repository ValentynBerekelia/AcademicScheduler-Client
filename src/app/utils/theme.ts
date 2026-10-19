export type ThemePreference = 'light' | 'dark' | 'system';

// Mirror of the server setting, so the login page and the first paint use the right theme
export const THEME_STORAGE_KEY = 'theme';

const media = () => window.matchMedia('(prefers-color-scheme: dark)');
let unsubscribe: (() => void) | null = null;

function setDark(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}

export function storedTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Applies the theme now and, for "system", keeps following the OS setting. */
export function applyTheme(theme: ThemePreference) {
  unsubscribe?.();
  unsubscribe = null;

  if (theme === 'system') {
    const mql = media();
    setDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mql.addEventListener('change', onChange);
    unsubscribe = () => mql.removeEventListener('change', onChange);
  } else {
    setDark(theme === 'dark');
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // storage unavailable (private mode) — the theme still applies for this visit
  }
}
