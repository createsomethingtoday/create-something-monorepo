export function parseRetryAfter(value, nowMs = Date.now()) {
  if (typeof nowMs !== 'number' || !Number.isFinite(nowMs)) {
    throw new TypeError('nowMs must be a finite number');
  }

  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text === '') return null;

  if (/^[0-9]+$/.test(text)) {
    const milliseconds = Number(text) * 1000;
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }

  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;

  if (
    !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(
      text
    )
  )
    return null;

  const parsedDate = Date.parse(text);
  if (Number.isNaN(parsedDate)) return null;
  return Math.max(0, parsedDate - nowMs);
}
