import type { ClockSnapshot } from './types.js';

export const CLOCK_TIME_ZONE = 'America/Chicago';

function partsFor(nowMs: number): Map<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLOCK_TIME_ZONE,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(new Date(nowMs));

  return new Map(parts.map((part) => [part.type, part.value]));
}

function twoDigitMonth(monthName: string): string {
  const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(
    monthName
  );
  return String(monthIndex >= 0 ? monthIndex + 1 : 1).padStart(2, '0');
}

function displayTime(hour: number, minuteText: string): string {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

function dayPeriod(hour: number): ClockSnapshot['day_period'] {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
}

export function buildClockSnapshot(nowMs = Date.now()): ClockSnapshot {
  const safeNowMs = Number.isFinite(nowMs) ? nowMs : Date.now();
  const parts = partsFor(safeNowMs);
  const weekday = parts.get('weekday') ?? 'Thu';
  const month = parts.get('month') ?? 'Jan';
  const day = parts.get('day') ?? '01';
  const year = parts.get('year') ?? '1970';
  const hourText = parts.get('hour') ?? '00';
  const minuteText = parts.get('minute') ?? '00';
  const hour = Number(hourText);

  return {
    timezone: CLOCK_TIME_ZONE,
    iso: new Date(safeNowMs).toISOString(),
    local_date: `${year}-${twoDigitMonth(month)}-${day}`,
    local_time_24: `${hourText}:${minuteText}`,
    display_time: displayTime(Number.isFinite(hour) ? hour : 0, minuteText),
    display_date: `${weekday} ${month} ${day}`,
    day_period: dayPeriod(Number.isFinite(hour) ? hour : 0)
  };
}
