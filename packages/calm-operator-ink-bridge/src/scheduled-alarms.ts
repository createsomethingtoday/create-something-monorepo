import type { InkAlertInput } from './types.js';

export const CENTRAL_TIME_ZONE = 'America/Chicago';
export const DEFAULT_DAILY_ALARMS_CT = '06:00,09:00';
export const DEFAULT_ALARM_TTL_MS = 45 * 60 * 1000;

interface AlarmEnv {
  DAILY_ALARMS_CT?: string;
  ALARM_TTL_MS?: string;
}

export interface DueDailyAlarm {
  id: string;
  local_date: string;
  local_time: string;
  display_time: string;
  alert: InkAlertInput;
}

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

function alarmTtlMs(env: AlarmEnv): number {
  const parsed = Number(env.ALARM_TTL_MS);
  if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  return DEFAULT_ALARM_TTL_MS;
}

function normalizeAlarmTime(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2}):([0-5]\d)$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function configuredDailyAlarmTimes(env: AlarmEnv): string[] {
  const source = env.DAILY_ALARMS_CT?.trim() || DEFAULT_DAILY_ALARMS_CT;
  return [...new Set(source.split(',').map(normalizeAlarmTime).filter((time): time is string => Boolean(time)))];
}

function displayTime(localTime: string): string {
  const [hourText, minuteText] = localTime.split(':');
  const hour = Number(hourText);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minuteText} ${suffix}`;
}

export function dueDailyAlarms(env: AlarmEnv, nowMs = Date.now()): DueDailyAlarm[] {
  const local = centralParts(nowMs);
  const localTime = `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`;
  const configuredTimes = configuredDailyAlarmTimes(env);
  if (!configuredTimes.includes(localTime)) return [];

  const ttlMs = alarmTtlMs(env);
  const display = displayTime(localTime);

  return [
    {
      id: `daily-alarm:${local.date}:${localTime}`,
      local_date: local.date,
      local_time: localTime,
      display_time: display,
      alert: {
        id: `daily-alarm:${local.date}:${localTime}`,
        state: 'daily_alarm',
        category: 'alarm',
        severity: 95,
        subject: `${display} CT alarm`,
        reason: 'Daily calm operator alarm',
        detail: `Daily alarm for ${display} CT.`,
        action: 'Clear alarm when awake.',
        source: 'calm-operator-alarm',
        external_id: `${local.date}:${localTime}`,
        urgent: true,
        ttl_ms: ttlMs,
        payload: {
          local_date: local.date,
          local_time: localTime,
          timezone: CENTRAL_TIME_ZONE
        }
      }
    }
  ];
}

export function shouldRunHealthReviewAtUtcHour(utcHours: string | undefined, nowMs = Date.now()): boolean {
  const configured = (utcHours?.trim() || '4,13,18,23')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 23);
  const date = new Date(nowMs);
  return configured.includes(date.getUTCHours());
}
