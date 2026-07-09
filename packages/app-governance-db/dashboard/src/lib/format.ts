/** Formatting helpers — machine values read as machine values (mono, honest). */

/** D1 datetime('now') emits "YYYY-MM-DD HH:MM:SS" (UTC, no timezone marker). */
export function parseDbDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes('T') ? value : `${value.replace(' ', 'T')}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Relative time for telemetry rows; absolute value belongs in `title`. */
export function relativeTime(value: string | null | undefined): string {
  const date = parseDbDate(value);
  if (!date) return 'never';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 0) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Hours since the timestamp; Infinity when never synced. */
export function ageHours(value: string | null | undefined): number {
  const date = parseDbDate(value);
  if (!date) return Infinity;
  return (Date.now() - date.getTime()) / 3_600_000;
}

/** Short display timestamp: "2026-07-06 14:03" */
export function shortTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 16);
}

/** Truncate long machine values in the middle so both ends stay legible. */
export function truncateMiddle(value: string | null | undefined, max = 32): string {
  if (!value) return '—';
  if (value.length <= max) return value;
  const half = Math.floor((max - 1) / 2);
  return `${value.slice(0, half)}…${value.slice(-half)}`;
}

/** Excerpt prose for triage rows. */
export function excerpt(value: string | null | undefined, max = 320): string {
  if (!value) return '';
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max)}…`;
}
