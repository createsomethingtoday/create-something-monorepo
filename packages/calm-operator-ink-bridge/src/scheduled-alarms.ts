import type { InkAlertInput } from './types.js';
import { buildInkClock, CENTRAL_TIME_ZONE } from './clock.js';

export { CENTRAL_TIME_ZONE } from './clock.js';
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

export function dueDailyAlarms(env: AlarmEnv, nowMs = Date.now()): DueDailyAlarm[] {
  const clock = buildInkClock(nowMs);
  const localTime = clock.local_time;
  const configuredTimes = configuredDailyAlarmTimes(env);
  if (!configuredTimes.includes(localTime)) return [];

  const ttlMs = alarmTtlMs(env);
  const display = clock.display_time;

  return [
    {
      id: `daily-alarm:${clock.local_date}:${localTime}`,
      local_date: clock.local_date,
      local_time: localTime,
      display_time: display,
      alert: {
        id: `daily-alarm:${clock.local_date}:${localTime}`,
        state: 'daily_alarm',
        category: 'alarm',
        severity: 95,
        subject: `${display} CT alarm`,
        reason: 'Daily calm operator alarm',
        detail: `Daily alarm for ${display} CT.`,
        action: 'Clear alarm when awake.',
        source: 'calm-operator-alarm',
        external_id: `${clock.local_date}:${localTime}`,
        urgent: true,
        ttl_ms: ttlMs,
        payload: {
          local_date: clock.local_date,
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
