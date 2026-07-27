export type BrowserWorkspaceEventType =
  | 'session.ready'
  | 'session.resumed'
  | 'session.closed'
  | 'turn.started'
  | 'agent.message'
  | 'command.started'
  | 'command.output'
  | 'file.changed'
  | 'diff.updated'
  | 'approval.requested'
  | 'approval.resolved'
  | 'turn.completed'
  | 'turn.failed'
  | 'runtime.error';

export type BrowserWorkspaceEvent = {
  sequence: number;
  at: string;
  type: BrowserWorkspaceEventType;
  message: string;
  status?: 'running' | 'completed' | 'failed' | 'pending' | 'declined' | 'accepted';
  approvalId?: string;
  approvalKind?: 'command' | 'file';
  command?: string;
  paths?: string[];
  reason?: string;
  scope?: string;
};

export type WorkspaceWorkState =
  | 'idle'
  | 'planning'
  | 'running'
  | 'approval'
  | 'success'
  | 'warning'
  | 'failure';

export type BrowserSessionStatus =
  | 'opening'
  | 'ready'
  | 'running'
  | 'completed'
  | 'failed'
  | 'closed';

export type BrowserPreviewStatus =
  | 'idle'
  | 'starting'
  | 'ready'
  | 'blocked'
  | 'crashed'
  | 'stopped';

export function sessionWorkState(
  status: BrowserSessionStatus | null,
  hasPendingApproval: boolean
): WorkspaceWorkState {
  if (hasPendingApproval) return 'approval';
  if (status === 'opening') return 'planning';
  if (status === 'running') return 'running';
  if (status === 'ready' || status === 'completed') return 'success';
  if (status === 'failed') return 'failure';
  return 'idle';
}

export function previewWorkState(status: BrowserPreviewStatus | null): WorkspaceWorkState {
  if (status === 'starting') return 'planning';
  if (status === 'ready') return 'success';
  if (status === 'blocked') return 'warning';
  if (status === 'crashed') return 'failure';
  return 'idle';
}

export function eventWorkState(event: BrowserWorkspaceEvent): WorkspaceWorkState {
  if (event.type === 'approval.requested') return 'approval';
  if (event.type === 'runtime.error' || event.type === 'turn.failed' || event.status === 'failed') {
    return 'failure';
  }
  if (event.status === 'declined') return 'warning';
  if (
    event.type === 'turn.started' ||
    event.type === 'command.started' ||
    event.type === 'command.output' ||
    event.type === 'agent.message' ||
    event.status === 'running' ||
    event.status === 'pending'
  ) {
    return 'running';
  }
  if (
    event.type === 'session.ready' ||
    event.type === 'session.resumed' ||
    event.type === 'file.changed' ||
    event.type === 'diff.updated' ||
    event.type === 'turn.completed' ||
    event.status === 'completed' ||
    event.status === 'accepted'
  ) {
    return 'success';
  }
  return 'idle';
}

export function mergeWorkspaceEvents(
  current: BrowserWorkspaceEvent[],
  incoming: BrowserWorkspaceEvent[]
): BrowserWorkspaceEvent[] {
  const bySequence = new Map(current.map((event) => [event.sequence, event]));
  for (const event of incoming) bySequence.set(event.sequence, event);
  return [...bySequence.values()].sort((left, right) => left.sequence - right.sequence);
}

export function pendingWorkspaceApprovals(
  events: BrowserWorkspaceEvent[]
): BrowserWorkspaceEvent[] {
  const resolved = new Set(
    events
      .filter((event) => event.type === 'approval.resolved' && event.approvalId)
      .map((event) => event.approvalId)
  );
  return events.filter(
    (event) =>
      event.type === 'approval.requested' &&
      Boolean(event.approvalId) &&
      !resolved.has(event.approvalId)
  );
}
