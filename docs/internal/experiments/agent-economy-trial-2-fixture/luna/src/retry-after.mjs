const shortWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const longWeekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseHttpDate(text, nowMs) {
  const leapSecond = / \d{2}:\d{2}:60(?: GMT| \d{4})$/u.test(text) ? 1_000 : 0;
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
    const now = new Date(nowMs);
    const currentYear = now.getUTCFullYear();
    let year = Math.floor(currentYear / 100) * 100 + Number(shortYear);
    parsed = Date.UTC(
      year,
      months.indexOf(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
    const boundaryYear = currentYear + 50;
    const boundaryDay = Math.min(
      now.getUTCDate(),
      new Date(Date.UTC(boundaryYear, now.getUTCMonth() + 1, 0)).getUTCDate()
    );
    const fiftyYearsAhead = Date.UTC(
      boundaryYear,
      now.getUTCMonth(),
      boundaryDay,
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds()
    );
    const nextCentury = Date.UTC(
      year + 100,
      months.indexOf(month),
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    );
    if (nextCentury + leapSecond <= fiftyYearsAhead) {
      year += 100;
      parsed = nextCentury;
    }
    if (parsed + leapSecond > fiftyYearsAhead) {
      year -= 100;
      parsed = Date.UTC(
        year,
        months.indexOf(month),
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      );
    }
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
  const acceptedRfc850 = `${day}-${month}-${String(year).slice(-2)} ${time} GMT`;
  const valid = rfc850
    ? comparableText.slice(comparableText.indexOf(',') + 2) === acceptedRfc850
    : accepted.includes(comparableText);
  return valid ? parsed + leapSecond : null;
}

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

  const parsedDate = parseHttpDate(text, nowMs);
  if (parsedDate === null) return null;
  return Math.max(0, parsedDate - nowMs);
}
