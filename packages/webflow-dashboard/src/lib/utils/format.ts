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

export function formatStableDraftDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const resolvedDate = typeof date === 'string' ? new Date(date) : date;
    if (Number.isNaN(resolvedDate.getTime())) return '';

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[resolvedDate.getUTCMonth()];
    const day = resolvedDate.getUTCDate();
    const year = resolvedDate.getUTCFullYear();
    const minutes = String(resolvedDate.getUTCMinutes()).padStart(2, '0');
    const hour24 = resolvedDate.getUTCHours();
    const hour12 = hour24 % 12 || 12;
    const meridiem = hour24 >= 12 ? 'PM' : 'AM';

    return `${month} ${day}, ${year}, ${hour12}:${minutes} ${meridiem} UTC`;
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
