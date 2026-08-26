const shortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const longWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseHttpDate(text, nowMs) {
  const leapSecond = /:60(?: GMT)?$/u.test(text) ? 1_000 : 0;
  const comparableText = leapSecond ? text.replace(':60', ':59') : text;
  const isAsctime =
    /^(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) {1,2}\d{1,2} \d{2}:\d{2}:\d{2} \d{4}$/.test(
      comparableText
    );
  const rfc850 =
    /^(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{2}):(\d{2}):(\d{2}) GMT$/u.exec(
      comparableText
    );
  let parsed;
  if (rfc850) {
    const [, day, month, shortYear, hour, minute, second] = rfc850;
    const currentYear = new Date(nowMs).getUTCFullYear();
    let year = Math.floor(currentYear / 100) * 100 + Number(shortYear);
    if (year > currentYear + 50) year -= 100;
    parsed = Date.UTC(
      year,
      months.indexOf(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
  } else {
    parsed = Date.parse(isAsctime ? `${comparableText} GMT` : comparableText);
  }
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
  return accepted.includes(comparableText) ? parsed + leapSecond : null;
}

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

  const parsedDate = parseHttpDate(text, nowMs);
  if (parsedDate === null) return null;
  return Math.max(0, parsedDate - nowMs);
}
