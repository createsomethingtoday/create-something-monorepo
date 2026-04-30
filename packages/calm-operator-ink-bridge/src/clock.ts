import type { InkClock } from './types.js';

export const CENTRAL_TIME_ZONE = 'America/Chicago';

interface CentralParts {
  date: string;
  hour: number;
  minute: number;
}

function centralParts(nowMs: number): CentralParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).formatToParts(new Date(nowMs));

  const byType = new Map(parts.map((part) => [part.type, part.value]));
  const year = byType.get('year') ?? '1970';
  const month = byType.get('month') ?? '01';
  const day = byType.get('day') ?? '01';

  return {
    date: `${year}-${month}-${day}`,
    hour: Number(byType.get('hour') ?? 0),
    minute: Number(byType.get('minute') ?? 0)
  };
}

export function displayLocalTime(localTime: string): string {
  const [hourText, minuteText] = localTime.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

export function buildInkClock(nowMs = Date.now()): InkClock {
  const local = centralParts(nowMs);
  const localTime = `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;

  return {
    timezone: CENTRAL_TIME_ZONE,
    generated_at: new Date(nowMs).toISOString(),
    local_date: local.date,
    local_time: localTime,
    display_time: displayLocalTime(localTime),
    hour: local.hour,
    minute: local.minute
  };
}
