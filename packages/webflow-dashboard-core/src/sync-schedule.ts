export interface SyncMetadata {
  lastSyncTime: string;
  expectedLastSyncTime: string;
  nextSyncTime: string;
  syncSchedule: string;
  dataWindow: string;
  timeUntilNextSync: string;
  freshnessSource: 'schedule-estimate' | 'airtable-field' | 'airtable-record-created-time';
  isEstimated: boolean;
  isStale: boolean;
  staleSinceHours: number | null;
}

interface SyncMetadataOptions {
  actualLastSyncTime?: string | null;
  actualSource?: 'field' | 'record-created-time' | 'none';
  staleThresholdHours?: number;
}

/**
 * Marketplace Insights schedule. Each weekly snapshot covers the 30 days that end
 * Monday 16:00 UTC and is published on Tuesday, after the daily warehouse load
 * holds every order in that window. (Publishing on Monday missed the window's
 * last hours: the orders table had not loaded them yet.)
 */
const HOUR_MS = 60 * 60 * 1000;
const WINDOW_END_HOUR_UTC = 16;
const PUBLISH_DELAY_HOURS = 24;

/** Most recent Monday 16:00 UTC at or before `date`. */
function windowEndAtOrBefore(date: Date): Date {
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), WINDOW_END_HOUR_UTC)
  );
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  if (end.getTime() > date.getTime()) end.setUTCDate(end.getUTCDate() - 7);
  return end;
}

/** Window end (Monday 16:00 UTC) of the newest snapshot that should be published by `now`. */
export function getLastSyncTime(now: Date = new Date()): Date {
  return windowEndAtOrBefore(new Date(now.getTime() - PUBLISH_DELAY_HOURS * HOUR_MS));
}

/** When the next snapshot is due (Tuesday 16:00 UTC). */
export function getNextSyncTime(now: Date = new Date()): Date {
  return new Date(getLastSyncTime(now).getTime() + (7 * 24 + PUBLISH_DELAY_HOURS) * HOUR_MS);
}

export function getTimeUntilNextSync(now: Date = new Date()): string {
  const nextSync = getNextSyncTime(now);
  const diffMs = nextSync.getTime() - now.getTime();

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days === 0) {
    if (hours === 0) {
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  }

  if (days === 1) {
    return 'tomorrow';
  }

  return `in ${days} days`;
}

export function getSyncMetadata(
  options: SyncMetadataOptions = {},
  now: Date = new Date()
): SyncMetadata {
  const expectedLastSync = getLastSyncTime(now);
  const nextSync = getNextSyncTime(now);
  const staleThresholdHours = options.staleThresholdHours ?? 12;

  let reportedLastSync = expectedLastSync;
  let freshnessSource: SyncMetadata['freshnessSource'] = 'schedule-estimate';
  let isEstimated = true;

  if (options.actualLastSyncTime) {
    const parsed = new Date(options.actualLastSyncTime);
    if (!Number.isNaN(parsed.getTime())) {
      reportedLastSync = parsed;
      freshnessSource =
        options.actualSource === 'field'
          ? 'airtable-field'
          : options.actualSource === 'record-created-time'
            ? 'airtable-record-created-time'
            : 'schedule-estimate';
      isEstimated = freshnessSource !== 'airtable-field';
    }
  }

  const staleDeltaMs = expectedLastSync.getTime() - reportedLastSync.getTime();
  const staleThresholdMs = staleThresholdHours * 60 * 60 * 1000;
  const isStale = staleDeltaMs > staleThresholdMs;

  return {
    lastSyncTime: reportedLastSync.toISOString(),
    expectedLastSyncTime: expectedLastSync.toISOString(),
    nextSyncTime: nextSync.toISOString(),
    syncSchedule: 'Weekly on Tuesdays, covering the 30 days to Monday 16:00 UTC',
    dataWindow: 'Rolling 30-day window',
    timeUntilNextSync: getTimeUntilNextSync(now),
    freshnessSource,
    isEstimated,
    isStale,
    staleSinceHours: isStale ? Math.floor(staleDeltaMs / (60 * 60 * 1000)) : null
  };
}
