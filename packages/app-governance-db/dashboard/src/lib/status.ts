/**
 * Semantic tone mappings per docs/CANON_DATABASE_LAYER_DESIGN.md §4 and §6.
 * Color is state, never decoration.
 */
import type { StatusBadgeTone } from '@create-something/canon/components';
import { ageHours } from './format';

export interface BadgeSpec {
  tone: StatusBadgeTone;
  emphasis?: boolean;
}

/** findings.status lifecycle */
export function findingStatusBadge(status: string): BadgeSpec {
  switch (status) {
    case 'flagged':
      return { tone: 'warning' };
    case 'in_progress':
      return { tone: 'info' };
    case 'needs_decision':
      return { tone: 'warning', emphasis: true };
    case 'shipped':
      return { tone: 'success' };
    case 'parked':
    default:
      return { tone: 'neutral' };
  }
}

/** findings.priority */
export function priorityBadge(priority: string | null): BadgeSpec {
  switch (priority) {
    case 'P0':
      return { tone: 'error' };
    case 'P1':
      return { tone: 'warning' };
    case 'P2':
      return { tone: 'info' };
    default:
      return { tone: 'neutral' };
  }
}

/** items.triage_state */
export function triageBadge(state: string): BadgeSpec {
  switch (state) {
    case 'new':
      return { tone: 'info' };
    case 'categorized':
    case 'linked':
      return { tone: 'success' };
    case 'ignored':
    default:
      return { tone: 'neutral' };
  }
}

/** notifications.status */
export function notificationBadge(status: string): BadgeSpec {
  switch (status) {
    case 'queued':
      return { tone: 'info' };
    case 'sent':
      return { tone: 'success' };
    case 'failed':
      return { tone: 'error' };
    case 'skipped':
    default:
      return { tone: 'neutral' };
  }
}

/** Cursor freshness — the gauge needle (§6). */
export function freshnessBadge(lastSyncedAt: string | null): BadgeSpec & { label: string } {
  const hours = ageHours(lastSyncedAt);
  if (hours < 1) return { tone: 'success', label: 'current' };
  if (hours < 24) return { tone: 'warning', label: 'aging' };
  return { tone: 'error', label: lastSyncedAt ? 'stale' : 'never synced' };
}

/** apps.visibility */
export function visibilityBadge(visibility: string | null): BadgeSpec {
  switch (visibility) {
    case 'PUBLIC':
      return { tone: 'success' };
    case 'PRIVATE':
      return { tone: 'neutral' };
    default:
      return { tone: 'neutral' };
  }
}

/** apps.review_status */
export function reviewStatusBadge(status: string | null): BadgeSpec {
  switch (status) {
    case 'APPROVED':
      return { tone: 'success' };
    case 'PENDING':
      return { tone: 'warning' };
    case 'DENIED':
      return { tone: 'error' };
    default:
      return { tone: 'neutral' };
  }
}

/** atlas_canvases.status / atlas_nodes.status */
export function atlasStatusBadge(status: string): BadgeSpec {
  switch (status) {
    case 'run':
      return { tone: 'success' };
    case 'wait':
      return { tone: 'warning' };
    case 'stop':
      return { tone: 'error' };
    default:
      return { tone: 'neutral' };
  }
}

/** source_records.identity_state */
export function identityBadge(state: string): BadgeSpec {
  switch (state) {
    case 'mapped':
      return { tone: 'success' };
    case 'missing_substrate':
    case 'blocked':
      return { tone: 'warning' };
    case 'duplicate':
      return { tone: 'error' };
    default:
      return { tone: 'neutral' };
  }
}

/** source_records.migration_state and source_import_runs.status */
export function migrationBadge(state: string): BadgeSpec {
  switch (state) {
    case 'ready':
    case 'imported':
    case 'succeeded':
    case 'approved':
    case 'completed':
      return { tone: 'success' };
    case 'discovered':
    case 'started':
    case 'proposed':
    case 'running':
      return { tone: 'info' };
    case 'skipped':
    case 'blocked':
    case 'rate_limited':
    case 'canceled':
      return { tone: 'warning' };
    case 'error':
    case 'failed':
    case 'rejected':
      return { tone: 'error' };
    default:
      return { tone: 'neutral' };
  }
}

/** Human-readable label for snake_case states. */
export function stateLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ');
}
