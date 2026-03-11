export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '—';

  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
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
    return new Date(dateStr).toLocaleDateString('en-US', {
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
    const resolvedDate = typeof date === 'string' ? new Date(date) : date;
    return resolvedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

export function formatCompactNumber(num?: number | null): string {
  if (num === undefined || num === null) return '0';
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
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
