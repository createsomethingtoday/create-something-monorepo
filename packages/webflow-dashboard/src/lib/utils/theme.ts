import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function getStoredTheme(): Theme | null {
	if (!browser) return null;
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === 'dark' || stored === 'light' ? stored : null;
}

export function getSystemTheme(): Theme {
	if (!browser) return 'light';
	return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export function resolveTheme(): Theme {
	return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
	if (!browser) return;
	if (theme === 'dark') {
		document.documentElement.setAttribute('data-theme', 'dark');
	} else {
		document.documentElement.removeAttribute('data-theme');
	}
}

/**
 * Persist an explicit user choice. Call only from user-initiated actions —
 * writing on read would freeze the OS preference on first visit.
 */
export function persistTheme(theme: Theme): void {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, theme);
}

export function onSystemThemeChange(callback: (theme: Theme) => void): () => void {
	if (!browser) return () => {};
	const media = window.matchMedia(DARK_QUERY);
	const handler = (event: MediaQueryListEvent) => callback(event.matches ? 'dark' : 'light');
	media.addEventListener('change', handler);
	return () => media.removeEventListener('change', handler);
}
