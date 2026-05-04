export type InkSurface =
  | 'core-ink'
  | 't-embed'
  | 'trmnl-x'
  | 'reterminal-e1001'
  | 'm5paper'
  | 'papers3'
  | string;

export interface ClockSnapshot {
  timezone: string;
  iso: string;
  local_date: string;
  local_time_24: string;
  display_time: string;
  display_date: string;
  day_period: 'morning' | 'afternoon' | 'evening' | 'night';
}

export type OperatorState =
  | 'clear'
  | 'mcp_attention'
  | 'agent_attention'
  | 'health_attention'
  | 'approval_needed'
  | 'blocked'
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

export type OperatorDecisionUrgency = 'none' | 'note' | 'attention' | 'urgent' | 'blocked' | string;

export interface OperatorDecisionInput {
  id?: string;
  source?: string;
  subject?: string;
  summary?: string;
  reason?: string;
  detail?: string;
  action?: string;
  state?: OperatorState;
  urgency?: OperatorDecisionUrgency;
  decision_required?: boolean;
  can_step_away?: boolean;
  owner?: string;
  artifact?: string;
  confidence?: number;
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

export interface HealthReviewRun {
  id: string;
  trigger: string;
  state: HealthReviewReport['state'];
  checked: number;
  healthy_count: number;
  poor_count: number;
  stale_count: number;
  urgent: boolean;
  summary: string;
  detail: string;
  action: string;
  collected_count: number;
  created_at: number;
  report: HealthReviewReport;
  collected: Array<{ ok: boolean; component: string; status?: string }>;
}
