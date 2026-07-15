export type BrowserWorkspaceEventType =
  | 'session.ready'
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
};

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
