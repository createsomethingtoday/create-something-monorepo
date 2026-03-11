import { normalizeAssetStatus } from './asset-actions';

export interface StatusColorTheme {
  bg: string;
  text: string;
  border: string;
  accent: string;
}

const defaultTheme: StatusColorTheme = {
  bg: 'var(--color-bg-subtle)',
  text: 'var(--color-fg-secondary)',
  border: 'var(--color-border-default)',
  accent: 'var(--color-fg-muted)'
};

const statusThemes: Record<string, StatusColorTheme> = {
  Scheduled: {
    bg: 'var(--color-info-muted)',
    text: 'var(--color-info-ink)',
    border: 'var(--color-info-border)',
    accent: 'var(--color-info)'
  },
  Published: {
    bg: 'var(--color-success-muted)',
    text: 'var(--color-success-ink)',
    border: 'var(--color-success-border)',
    accent: 'var(--color-success)'
  },
  Upcoming: {
    bg: 'var(--color-data-3-muted)',
    text: 'var(--color-data-3-ink)',
    border: 'var(--color-data-3-border)',
    accent: 'var(--color-data-3)'
  },
  Delisted: {
    bg: 'var(--color-warning-muted)',
    text: 'var(--color-warning-ink)',
    border: 'var(--color-warning-border)',
    accent: 'var(--color-warning)'
  },
  Rejected: {
    bg: 'var(--color-error-muted)',
    text: 'var(--color-error-ink)',
    border: 'var(--color-error-border)',
    accent: 'var(--color-error)'
  },
  Draft: {
    bg: 'var(--color-info-muted)',
    text: 'var(--color-info-ink)',
    border: 'var(--color-info-border)',
    accent: 'var(--color-info)'
  }
};

export function getStatusColorTheme(status: string): StatusColorTheme {
  return statusThemes[normalizeAssetStatus(status)] ?? defaultTheme;
}
