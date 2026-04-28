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
  payload?: Record<string, unknown>;
}

export interface StoredAlert extends Required<Omit<InkAlertInput, 'expires_at' | 'payload'>> {
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
