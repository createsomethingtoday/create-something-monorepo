import type {
  InkSurface,
  OperatorBrief,
  OperatorPrioritySourceLink,
  StoredAlert,
  StoredDeviceHeartbeat,
  StoredHealthSnapshot
} from './types.js';
import { buildInkClock } from './clock.js';

const POOR_HEALTH_STATUSES = new Set(['fail', 'failed', 'error', 'down', 'poor', 'degraded']);

export function normalizeSurface(surface: string | null | undefined): InkSurface {
  const value = surface?.trim().toLowerCase();
  if (!value) return 'stopwatch';
  if (value === 'm5paper' || value === 'm5-paper') return 'm5paper';
  if (value === 'papers3' || value === 'paper-s3' || value === 'm5papers3') return 'papers3';
  return value;
}

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
      ? 150
      : alert.state === 'operator_priority'
        ? 45
        : alert.state === 'mcp_attention'
          ? 35
          : alert.state === 'agent_attention'
            ? 30
            : alert.state === 'daily_alarm'
              ? 30
              : alert.state === 'sms_love'
                ? 28
                : alert.state === 'approval_needed'
                  ? 25
                  : 0;

  const urgentWorkflowWeight =
    alert.urgent && alert.state !== 'operator_priority' && alert.state !== 'health_attention'
      ? 75
      : 0;
  return alert.severity + stateWeight + (alert.urgent ? 50 : 0) + urgentWorkflowWeight;
}

function selectAlert(alerts: StoredAlert[]): StoredAlert | undefined {
  return [...alerts].sort((left, right) => {
    const score = alertScore(right) - alertScore(left);
    if (score !== 0) return score;
    return right.updated_at - left.updated_at;
  })[0];
}

function selectHealth(snapshots: StoredHealthSnapshot[]): StoredHealthSnapshot | undefined {
  return snapshots.filter(isPoorHealth).sort((left, right) => {
    const severity = right.severity - left.severity;
    if (severity !== 0) return severity;
    return right.updated_at - left.updated_at;
  })[0];
}

function headlineForAlert(alert: StoredAlert): string {
  switch (alert.state) {
    case 'operator_priority':
      if (payloadString(alert, 'signal') === 'langfuse') return 'QUALITY DRIFT';
      if (payloadString(alert, 'signal') === 'health') return 'HEALTH ATTENTION';
      return 'OPERATOR PRIORITY';
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
    case 'sms_love':
      return 'LOVE';
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

function payloadString(alert: StoredAlert, key: string): string {
  const value = alert.payload[key];
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizedSourceLinks(value: unknown): OperatorPrioritySourceLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((link) => {
      if (typeof link !== 'object' || link === null) return null;
      const record = link as Record<string, unknown>;
      const label =
        typeof record.label === 'string' ? record.label.replace(/\s+/g, ' ').trim() : '';
      if (!label) return null;
      const url = typeof record.url === 'string' ? record.url.trim() : '';
      const kind = typeof record.kind === 'string' ? record.kind.trim() : '';
      const id = typeof record.id === 'string' ? record.id.trim() : '';
      return {
        label,
        ...(url ? { url } : {}),
        ...(kind ? { kind } : {}),
        ...(id ? { id } : {})
      };
    })
    .filter((link): link is OperatorPrioritySourceLink => Boolean(link))
    .slice(0, 8);
}

function signalForBrief(brief: OperatorBrief, sourceLinks: OperatorPrioritySourceLink[]): string {
  const payloadSignal =
    brief.selected_alert?.state === 'operator_priority' &&
    typeof brief.selected_alert.payload.signal === 'string'
      ? brief.selected_alert.payload.signal.trim()
      : '';
  if (payloadSignal) return payloadSignal;
  if (sourceLinks[0]?.kind) return sourceLinks[0].kind;
  if (brief.selected_health) return 'health';
  if (
    brief.selected_alert?.state === 'mcp_attention' ||
    brief.selected_alert?.state === 'agent_attention'
  )
    return 'health';
  return brief.state === 'clear' ? 'clear' : 'operator';
}

function detailLabelForBrief(
  brief: OperatorBrief,
  sourceLinks: OperatorPrioritySourceLink[]
): string {
  if (sourceLinks[0]?.label) return compact(sourceLinks[0].label, 42);
  if (brief.selected_alert?.external_id) return compact(brief.selected_alert.external_id, 42);
  if (brief.selected_alert?.source) return compact(brief.selected_alert.source, 42);
  if (brief.selected_health?.source) return compact(brief.selected_health.source, 42);
  return '';
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
  const activeAlerts = input.alerts.filter((alert) => {
    if (alert.status !== 'active') return false;
    if (alert.expires_at !== null && alert.expires_at <= now) return false;
    return true;
  });
  const poorHealth = input.health.filter(isPoorHealth);
  const selectedAlert = selectAlert(activeAlerts);
  const selectedHealth = selectHealth(input.health);
  const generatedAt = new Date(now).toISOString();
  const clock = buildInkClock(now);

  if (selectedAlert) {
    return {
      state: selectedAlert.state,
      headline: compact(headlineForAlert(selectedAlert), 22),
      line1: compact(selectedAlert.subject || selectedAlert.source || 'Attention needed', 28),
      line2: line2ForAlert(selectedAlert),
      detail: compact(selectedAlert.detail || selectedAlert.reason || selectedAlert.subject, 120),
      action: compact(selectedAlert.action || 'Review source', 42),
      urgent: selectedAlert.urgent || selectedAlert.severity >= 80,
      generated_at: generatedAt,
      clock,
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
      line1: compact(selectedHealth.component || selectedHealth.source || 'System health', 28),
      line2: compact(selectedHealth.summary || selectedHealth.status, 46),
      detail: compact(
        selectedHealth.detail || selectedHealth.summary || selectedHealth.status,
        120
      ),
      action: 'Review health source',
      urgent: selectedHealth.severity >= 80,
      generated_at: generatedAt,
      clock,
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
    clock,
    surface,
    counts: {
      active_alerts: 0,
      poor_health: 0
    },
    device: input.device ?? null
  };
}

export function toFirmwareBrief(brief: OperatorBrief): Record<string, unknown> {
  const sourceLinks =
    brief.selected_alert?.state === 'operator_priority'
      ? normalizedSourceLinks(brief.selected_alert.payload.source_links)
      : [];
  const signal = signalForBrief(brief, sourceLinks);
  const detailLabel = detailLabelForBrief(brief, sourceLinks);

  return {
    state: brief.state,
    headline: brief.headline,
    line1: brief.line1,
    line2: brief.line2,
    detail: brief.detail,
    action: brief.action,
    urgent: brief.urgent,
    generated_at: brief.generated_at,
    clock: brief.clock,
    surface: brief.surface,
    counts: brief.counts,
    signal,
    ...(detailLabel ? { detail_label: detailLabel } : {}),
    ...(sourceLinks.length > 0 ? { source_links: sourceLinks } : {})
  };
}
