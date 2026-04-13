export type ThemeName = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';
export const THEME_QUERY_KEYS = [
  'theme',
  'themeMode',
  'theme-mode',
  'color-scheme',
  'colorScheme',
  'appearance'
] as const;
export const THEME_CHANGE_EVENT = 'webflow-dashboard-cloud-theme-change';

export function readResolvedTheme(doc: Document = document): ThemeName {
  return doc.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function getThemeInitScript() {
  return `
(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const queryKeys = ${JSON.stringify(THEME_QUERY_KEYS)};
  const eventName = ${JSON.stringify(THEME_CHANGE_EVENT)};
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const normalizePreference = (value) => {
    if (!value) return null;
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'system') return 'auto';
    if (normalized === 'light' || normalized === 'dark' || normalized === 'auto') {
      return normalized;
    }
    return null;
  };

  const readQueryPreference = () => {
    const params = new URLSearchParams(window.location.search);
    for (const key of queryKeys) {
      const preference = normalizePreference(params.get(key));
      if (preference) return preference;
    }
    return null;
  };

  const readStoredPreference = () => {
    try {
      return normalizePreference(window.localStorage.getItem(storageKey));
    } catch {
      return null;
    }
  };

  const readPreference = () => readQueryPreference() || readStoredPreference() || 'auto';

  const applyTheme = () => {
    const preference = readPreference();
    const resolved = preference === 'dark' || (preference === 'auto' && media.matches)
      ? 'dark'
      : 'light';

    root.dataset.themePreference = preference;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;

    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: {
          theme: resolved,
          preference
        }
      })
    );
  };

  applyTheme();

  const handlePreferenceChange = () => {
    if (readPreference() === 'auto') {
      applyTheme();
    }
  };

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', handlePreferenceChange);
  } else if (typeof media.addListener === 'function') {
    media.addListener(handlePreferenceChange);
  }
})();
`.trim();
}
