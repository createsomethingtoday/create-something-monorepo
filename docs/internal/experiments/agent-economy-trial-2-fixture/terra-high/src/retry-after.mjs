const shortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const longWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseHttpDate(text) {
  const isAsctime =
    /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) {1,2}\d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/.test(
      text
    );
  const parsed = Date.parse(isAsctime ? `${text} GMT` : text);
  if (Number.isNaN(parsed)) return null;
  const date = new Date(parsed);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const asctimeDay = String(date.getUTCDate()).padStart(2, ' ');
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}:${String(date.getUTCSeconds()).padStart(2, '0')}`;
  const accepted = [
    date.toUTCString(),
    `${longWeekdays[date.getUTCDay()]}, ${day}-${month}-${String(year).slice(-2)} ${time} GMT`,
    `${shortWeekdays[date.getUTCDay()]} ${month} ${asctimeDay} ${time} ${year}`
  ];
  return accepted.includes(text) ? parsed : null;
}

export function parseRetryAfter(value, nowMs = Date.now()) {
  if (!Number.isFinite(nowMs)) throw new TypeError('nowMs must be a finite number');
  if (typeof value !== 'string') return null;

  const text = value.trim();
  if (text.length === 0) return null;
  if (/^\d+$/.test(text)) {
    const milliseconds = Number(text) * 1000;
    return Number.isSafeInteger(milliseconds) ? milliseconds : null;
  }
  if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;

  const parsedDate = parseHttpDate(text);
  if (parsedDate === null) return null;
  return Math.max(0, parsedDate - nowMs);
}
