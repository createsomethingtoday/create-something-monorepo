const MS_PER_DAY = 1000 * 60 * 60 * 24;

function resolveDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const resolvedDate = typeof date === 'string' ? new Date(date) : date;
  return Number.isNaN(resolvedDate.getTime()) ? null : resolvedDate;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDayDifference(date: Date, now: Date): number {
  return Math.round(
    (startOfLocalDay(date).getTime() - startOfLocalDay(now).getTime()) / MS_PER_DAY
  );
}

export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';

  try {
    const resolvedDate = resolveDate(dateStr);
    if (!resolvedDate) return '—';

    return resolvedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
}

export function formatNumericDate(dateStr?: string): string {
  if (!dateStr) return '';

  try {
    const resolvedDate = resolveDate(dateStr);
    if (!resolvedDate) return '';

    return resolvedDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit'
    });
  } catch {
    return '';
  }
}

export function formatLongDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const resolvedDate = resolveDate(date);
    if (!resolvedDate) return '';

    return resolvedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

export function formatDateTime(date: Date | string | null | undefined): string {
  const resolvedDate = resolveDate(date);
  if (!resolvedDate) return '';

  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(resolvedDate);
  } catch {
    return '';
  }
}

export function formatRelativePastDate(
  date: Date | string | null | undefined,
  now: Date = new Date()
): string {
  const resolvedDate = resolveDate(date);
  if (!resolvedDate) return '';

  const diffDays = -localDayDifference(resolvedDate, now);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  return formatLongDate(resolvedDate);
}

export function formatRelativeFutureDate(
  date: Date | string | null | undefined,
  now: Date = new Date()
): string {
  const resolvedDate = resolveDate(date);
  if (!resolvedDate) return '';

  const diffDays = localDayDifference(resolvedDate, now);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'tomorrow';
  if (diffDays > 1 && diffDays < 7) return `in ${diffDays} days`;

  return formatShortDate(resolvedDate.toISOString());
}

export function formatRelativeAge(
  date: Date | string | null | undefined,
  now: Date = new Date()
): string {
  const resolvedDate = resolveDate(date);
  if (!resolvedDate) return '';

  const diffDays = Math.floor((now.getTime() - resolvedDate.getTime()) / MS_PER_DAY);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function formatRelativeScheduleDate(
  date: Date | string | null | undefined,
  now: Date = new Date()
): string {
  const resolvedDate = resolveDate(date);
  if (!resolvedDate) return '';

  const diffMs = resolvedDate.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / MS_PER_DAY);

  if (diffDays === 0) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) return 'Today';
    if (diffHours === 1) return 'in 1 hour';
    return `in ${diffHours} hours`;
  }
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  return `in ${diffDays} days`;
}

export function formatCompactNumber(num?: number | null): string {
  if (num === undefined || num === null) return '0';
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatWholeNumber(num?: number | null, fallback = 'N/A'): string {
  if (num === undefined || num === null) return fallback;
  return num.toLocaleString();
}

export function formatCompactCurrency(num?: number | null): string {
  if (num === undefined || num === null) return '$0';
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}

export function formatWholeCurrency(num?: number | null): string {
  if (num === undefined || num === null) return '$0';
  return `$${num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}
