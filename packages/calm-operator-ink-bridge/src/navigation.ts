import type { InkSurface } from './types.js';
import { normalizeSurface, surfaceProfile } from './surfaces.js';

export interface InkNavigationAction {
  id: string;
  label: string;
  short_label: string;
  bucket: 'operator' | 'rhythm' | 'calm' | 'settings';
  kind: 'remote' | 'local';
  method?: 'GET' | 'POST';
  endpoint?: string;
  refresh: 'none' | 'partial' | 'full';
  description: string;
}

export interface InkNavigationBucket {
  id: InkNavigationAction['bucket'];
  label: string;
  short_label: string;
  description: string;
  actions: InkNavigationAction[];
}

export interface InkNavigationContract {
  surface: InkSurface;
  generated_at: string;
  primary_bucket: InkNavigationBucket['id'];
  buckets: InkNavigationBucket[];
}

const BASE_ACTIONS: InkNavigationAction[] = [
  {
    id: 'sync',
    label: 'Sync Brief',
    short_label: 'Sync',
    bucket: 'operator',
    kind: 'remote',
    method: 'GET',
    endpoint: '/ink/brief',
    refresh: 'full',
    description: 'Fetch the latest operator brief.'
  },
  {
    id: 'mcp_review',
    label: 'MCP Review',
    short_label: 'MCP',
    bucket: 'operator',
    kind: 'remote',
    method: 'POST',
    endpoint: '/ink/health-review/request',
    refresh: 'full',
    description: 'Run MCP and agent health review.'
  },
  {
    id: 'clock',
    label: 'Clock',
    short_label: 'Clock',
    bucket: 'rhythm',
    kind: 'remote',
    method: 'GET',
    endpoint: '/ink/clock',
    refresh: 'partial',
    description: 'Show Central Time without constant e-ink refresh.'
  },
  {
    id: 'daily_alarms',
    label: 'Daily Rhythm',
    short_label: 'Rhythm',
    bucket: 'rhythm',
    kind: 'remote',
    method: 'POST',
    endpoint: '/ink/alarms/run',
    refresh: 'partial',
    description: 'Check local rhythm alarms.'
  },
  {
    id: 'calm_reset',
    label: 'Calm Reset',
    short_label: 'Reset',
    bucket: 'calm',
    kind: 'local',
    refresh: 'none',
    description: 'A short breathing/reset surface; no network required.'
  },
  {
    id: 'stone_garden',
    label: 'Stone Garden',
    short_label: 'Garden',
    bucket: 'calm',
    kind: 'local',
    refresh: 'partial',
    description: 'A slow, e-ink-native calm play surface.'
  },
  {
    id: 'alert_settings',
    label: 'Alert Settings',
    short_label: 'Alerts',
    bucket: 'settings',
    kind: 'local',
    refresh: 'none',
    description: 'Toggle beep/vibration/sound behavior on-device.'
  }
];

function bucketCopy(id: InkNavigationBucket['id']): Omit<InkNavigationBucket, 'actions'> {
  switch (id) {
    case 'operator':
      return {
        id,
        label: 'Operator',
        short_label: 'Ops',
        description: 'Work surfaces that may need judgment.'
      };
    case 'rhythm':
      return {
        id,
        label: 'Rhythm',
        short_label: 'Time',
        description: 'Clock and daily alarm surfaces.'
      };
    case 'calm':
      return {
        id,
        label: 'Calm',
        short_label: 'Calm',
        description: 'Consolidated calm tools; replaces the old Games bucket.'
      };
    case 'settings':
      return {
        id,
        label: 'Settings',
        short_label: 'Set',
        description: 'Device-local preferences.'
      };
  }
}

function actionsForSurface(surface: InkSurface): InkNavigationAction[] {
  const profile = surfaceProfile(surface);
  if (profile.id === 'core-ink') {
    return BASE_ACTIONS.filter((action) => action.id !== 'daily_alarms');
  }
  return BASE_ACTIONS;
}

export function buildInkNavigation(surface: string | null | undefined, nowMs = Date.now()): InkNavigationContract {
  const normalized = normalizeSurface(surface);
  const actions = actionsForSurface(normalized);
  const bucketIds: InkNavigationBucket['id'][] = ['operator', 'rhythm', 'calm', 'settings'];
  const buckets = bucketIds
    .map((id) => ({
      ...bucketCopy(id),
      actions: actions.filter((action) => action.bucket === id)
    }))
    .filter((bucket) => bucket.actions.length > 0);

  return {
    surface: normalized,
    generated_at: new Date(nowMs).toISOString(),
    primary_bucket: 'operator',
    buckets
  };
}
