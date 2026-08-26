export function parseRetryAfter(value, nowMs = Date.now()) {
  if (!Number.isFinite(nowMs)) throw new TypeError('nowMs must be a finite number');
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text.length === 0) return null;
  if (/^\d+$/.test(text)) {
    const milliseconds = Number(text) * 1000;
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }
  if (/^[+-]?\d+(?:\.\d*)?$/.test(text)) return null;

  const parsedDate = Date.parse(text);
  if (Number.isNaN(parsedDate)) return null;
  return Math.max(0, parsedDate - nowMs);
}
