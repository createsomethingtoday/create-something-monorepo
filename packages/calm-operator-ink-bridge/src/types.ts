export type InkSurface = 'core-ink' | 'm5paper' | 'papers3' | string;

export type OperatorState =
  | 'clear'
  | 'mcp_attention'
  | 'agent_attention'
  | 'health_attention'
  | 'approval_needed'
  | 'blocked'
  | 'sms_love'
  | 'slack_attention'
  | 'calendar_attention'
  | 'daily_alarm'
  | 'operator_attention'
  | 'disconnected'
  | string;

export interface InkAlertInput {
  id?: string;
  state?: OperatorState;
  category?: string;
  severity?: number;
  subject?: string;
  reason?: string;
  detail?: string;
  action?: string;
  source?: string;
  external_id?: string;
  urgent?: boolean;
  expires_at?: number | string;
  ttl_ms?: number;
  payload?: Record<string, unknown>;
}

export interface StoredAlert extends Required<Omit<InkAlertInput, 'expires_at' | 'payload' | 'ttl_ms'>> {
  status: 'active' | 'cleared';
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  payload: Record<string, unknown>;
}

export interface HealthSnapshotInput {
  id?: string;
  source?: string;
  component?: string;
  status?: string;
  summary?: string;
  detail?: string;
  severity?: number;
  observed_at?: number | string;
  payload?: Record<string, unknown>;
}

export interface RemoteHealthCheckConfig {
  id?: string;
  source?: string;
  component: string;
  url: string;
  method?: string;
  type?: 'agent' | 'mcp' | 'job' | 'service' | string;
  registry_id?: string;
  expected_status?: number;
  expected_text?: string;
  json_rules?: RemoteHealthJsonRule[];
  timeout_ms?: number;
  severity?: number;
  token_env?: string;
  action?: string;
}

export interface RemoteHealthJsonRule {
  path: string;
  equals?: string | number | boolean | null;
  min?: number;
  max?: number;
  includes?: string;
  truthy?: boolean;
}

export interface RemoteHealthCheckResult {
  ok: boolean;
  check: RemoteHealthCheckConfig;
  snapshot: HealthSnapshotInput;
}

export interface StoredHealthSnapshot
  extends Required<Omit<HealthSnapshotInput, 'observed_at' | 'payload'>> {
  observed_at: number;
  updated_at: number;
  payload: Record<string, unknown>;
}

export interface DeviceHeartbeatInput {
  device_id?: string;
  surface?: string;
  firmware_version?: string;
  battery_percent?: number;
  battery_mv?: number;
  charging?: boolean;
  power_mode?: string;
  ip_hint?: string;
  payload?: Record<string, unknown>;
}

export interface StoredDeviceHeartbeat extends Required<Omit<DeviceHeartbeatInput, 'payload'>> {
  received_at: number;
  payload: Record<string, unknown>;
}

export interface InkClock {
  timezone: string;
  generated_at: string;
  local_date: string;
  local_time: string;
  display_time: string;
  hour: number;
  minute: number;
}

export interface OperatorEventInput {
  type?: string;
  source?: string;
  summary?: string;
  escalate?: boolean;
  alert?: InkAlertInput;
  payload?: Record<string, unknown>;
}

export interface OperatorBrief {
  state: OperatorState;
  headline: string;
  line1: string;
  line2: string;
  detail: string;
  action: string;
  urgent: boolean;
  generated_at: string;
  clock: InkClock;
  surface: InkSurface;
  counts: {
    active_alerts: number;
    poor_health: number;
  };
  selected_alert?: StoredAlert;
  selected_health?: StoredHealthSnapshot;
  device?: StoredDeviceHeartbeat | null;
}

export interface HealthReviewItem {
  id: string;
  source: string;
  component: string;
  status: string;
  summary: string;
  detail: string;
  severity: number;
  observed_at: number;
  updated_at: number;
  age_ms: number;
  stale: boolean;
  poor: boolean;
  payload: Record<string, unknown>;
}

export interface HealthReviewReport {
  ok: true;
  state: 'clear' | 'health_attention';
  generated_at: string;
  checked: number;
  healthy_count: number;
  poor_count: number;
  stale_count: number;
  stale_after_ms: number;
  headline: string;
  summary: string;
  detail: string;
  action: string;
  urgent: boolean;
  items: HealthReviewItem[];
}

export type HealthReviewRunTrigger =
  | 'manual'
  | 'scheduled'
  | 'device_request'
  | 'health_checks_run'
  | 'unknown'
  | string;

export type HealthReviewRunStatus = 'completed' | 'failed';

export interface StoredHealthReviewRun {
  id: string;
  trigger: HealthReviewRunTrigger;
  status: HealthReviewRunStatus;
  ok: boolean;
  state: HealthReviewReport['state'] | 'failed' | string;
  collected_count: number;
  checked: number;
  healthy_count: number;
  poor_count: number;
  stale_count: number;
  urgent: boolean;
  started_at: number;
  finished_at: number;
  duration_ms: number;
  error: string;
  report: HealthReviewReport | null;
  payload: Record<string, unknown>;
}
