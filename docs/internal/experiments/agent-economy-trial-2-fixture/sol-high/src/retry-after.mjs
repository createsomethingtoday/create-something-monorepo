export function parseRetryAfter(value, nowMs = Date.now()) {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    throw new TypeError('nowMs must be a finite number');
  }
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text.length === 0) return null;

  if (/^[0-9]+$/.test(text)) {
    const milliseconds = Number(text) * 1000;
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }
  if (Number.isFinite(Number(text))) return null;

  const parsedDate = Date.parse(text);
  if (Number.isNaN(parsedDate)) return null;
  return Math.max(0, parsedDate - nowMs);
}
