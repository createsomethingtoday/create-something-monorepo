export function parseRetryAfter(value, nowMs = Date.now()) {
  if (typeof value !== 'string') return null;

  const text = value.trim();
  const seconds = Number(text);
  if (Number.isFinite(seconds)) return seconds * 1000;

  const parsedDate = Date.parse(text);
  if (Number.isNaN(parsedDate)) return null;
  return parsedDate - nowMs;
}
