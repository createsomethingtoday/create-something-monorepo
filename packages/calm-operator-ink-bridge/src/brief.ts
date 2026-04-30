import type { OperatorBrief, StoredAlert, StoredDeviceHeartbeat, StoredHealthSnapshot } from './types.js';
import { normalizeSurface, surfaceProfile } from './surfaces.js';

const POOR_HEALTH_STATUSES = new Set(['fail', 'failed', 'error', 'down', 'poor', 'degraded']);

export function isPoorHealth(snapshot: StoredHealthSnapshot): boolean {
  return POOR_HEALTH_STATUSES.has(snapshot.status.trim().toLowerCase()) || snapshot.severity >= 70;
}

function compact(value: string, max: number): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  if (max <= 1) return trimmed.slice(0, max);
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function alertScore(alert: StoredAlert): number {
  const stateWeight =
    alert.state === 'blocked'
      ? 40
      : alert.state === 'mcp_attention'
        ? 35
        : alert.state === 'agent_attention'
        ? 30
        : alert.state === 'daily_alarm'
          ? 30
          : alert.state === 'approval_needed'
            ? 25
            : 0;

  return alert.severity + stateWeight + (alert.urgent ? 50 : 0);
}

function selectAlert(alerts: StoredAlert[]): StoredAlert | undefined {
  return [...alerts].sort((left, right) => {
    const score = alertScore(right) - alertScore(left);
    if (score !== 0) return score;
    return right.updated_at - left.updated_at;
  })[0];
}

function selectHealth(snapshots: StoredHealthSnapshot[]): StoredHealthSnapshot | undefined {
  return snapshots
    .filter(isPoorHealth)
    .sort((left, right) => {
      const severity = right.severity - left.severity;
      if (severity !== 0) return severity;
      return right.updated_at - left.updated_at;
    })[0];
}

function headlineForAlert(alert: StoredAlert): string {
  switch (alert.state) {
    case 'mcp_attention':
      return 'MCP ATTENTION';
    case 'agent_attention':
      return 'AGENT ATTENTION';
    case 'health_attention':
      return 'HEALTH ATTENTION';
    case 'approval_needed':
      return 'APPROVAL NEEDED';
    case 'blocked':
      return 'BLOCKED';
    case 'slack_attention':
      return 'SLACK';
    case 'calendar_attention':
      return 'CALENDAR';
    case 'daily_alarm':
      return 'ALARM';
    default:
      return alert.urgent ? 'JUDGMENT NEEDED' : 'OPERATOR NOTE';
  }
}

function line2ForAlert(alert: StoredAlert): string {
  if (alert.reason) return compact(alert.reason, 46);
  if (alert.detail) return compact(alert.detail, 46);
  if (alert.category) return compact(alert.category, 46);
  return 'needs attention';
}

export function buildOperatorBrief(input: {
  surface?: string | null;
  alerts: StoredAlert[];
  health: StoredHealthSnapshot[];
  device?: StoredDeviceHeartbeat | null;
  now?: number;
}): OperatorBrief {
  const now = input.now ?? Date.now();
  const surface = normalizeSurface(input.surface);
  const profile = surfaceProfile(surface);
  const activeAlerts = input.alerts.filter((alert) => {
    if (alert.status !== 'active') return false;
    if (alert.expires_at !== null && alert.expires_at <= now) return false;
    return true;
  });
  const poorHealth = input.health.filter(isPoorHealth);
  const selectedAlert = selectAlert(activeAlerts);
  const selectedHealth = selectHealth(input.health);
  const generatedAt = new Date(now).toISOString();

  if (selectedAlert) {
    return {
      state: selectedAlert.state,
      headline: compact(headlineForAlert(selectedAlert), profile.headlineChars),
      line1: compact(selectedAlert.subject || selectedAlert.source || 'Attention needed', profile.line1Chars),
      line2: compact(line2ForAlert(selectedAlert), profile.line2Chars),
      detail: compact(selectedAlert.detail || selectedAlert.reason || selectedAlert.subject, profile.detailChars),
      action: compact(selectedAlert.action || 'Review source', profile.actionChars),
      urgent: selectedAlert.urgent || selectedAlert.severity >= 80,
      generated_at: generatedAt,
      surface,
      counts: {
        active_alerts: activeAlerts.length,
        poor_health: poorHealth.length
      },
      selected_alert: selectedAlert,
      device: input.device ?? null
    };
  }

  if (selectedHealth) {
    return {
      state: 'health_attention',
      headline: 'HEALTH ATTENTION',
      line1: compact(selectedHealth.component || selectedHealth.source || 'System health', profile.line1Chars),
      line2: compact(selectedHealth.summary || selectedHealth.status, profile.line2Chars),
      detail: compact(selectedHealth.detail || selectedHealth.summary || selectedHealth.status, profile.detailChars),
      action: compact('Review health source', profile.actionChars),
      urgent: selectedHealth.severity >= 80,
      generated_at: generatedAt,
      surface,
      counts: {
        active_alerts: activeAlerts.length,
        poor_health: poorHealth.length
      },
      selected_health: selectedHealth,
      device: input.device ?? null
    };
  }

  return {
    state: 'clear',
    headline: 'CALM OPERATOR',
    line1: 'No decisions',
    line2: 'pending',
    detail: 'Live alerts only.',
    action: 'You can step away.',
    urgent: false,
    generated_at: generatedAt,
    surface,
    counts: {
      active_alerts: 0,
      poor_health: 0
    },
    device: input.device ?? null
  };
}

export function toFirmwareBrief(brief: OperatorBrief): Record<string, unknown> {
  const profile = surfaceProfile(brief.surface);
  const decisionRequired = brief.state !== 'clear';
  return {
    state: brief.state,
    headline: brief.headline,
    line1: brief.line1,
    line2: brief.line2,
    detail: brief.detail,
    action: brief.action,
    urgent: brief.urgent,
    generated_at: brief.generated_at,
    surface: brief.surface,
    counts: brief.counts,
    operator_contract: {
      decision_required: decisionRequired,
      can_step_away: !decisionRequired,
      state: brief.state,
      reason: brief.line2,
      action: brief.action,
      urgent: brief.urgent
    },
    surface_profile: {
      id: profile.id,
      role: profile.role,
      display: profile.display,
      refresh: profile.refresh,
      supports_lists: profile.supportsLists,
      supports_detail_drilldown: profile.supportsDetailDrilldown
    }
  };
}
