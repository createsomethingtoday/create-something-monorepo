import type { PublicAtlasTier } from '$lib/atlas/intake-policy';

export type WorkflowActorKind = 'human' | 'agent' | 'system' | 'policy';
export type WorkflowAuthorityState = 'run' | 'wait' | 'stop';
export type WorkflowInteractionEventType =
  | 'request'
  | 'recommendation'
  | 'approval_requested'
  | 'approval_decided'
  | 'action_proposed'
  | 'action_executed'
  | 'proof_attached'
  | 'recovery_triggered';

export type WorkflowInteractionEvent = {
  id: string;
  property: 'agency';
  workflowId: string | null;
  sessionId: string;
  correlationId: string;
  parentEventId: string | null;
  actorKind: WorkflowActorKind;
  actorIdHash: string | null;
  eventType: WorkflowInteractionEventType;
  authorityState: WorkflowAuthorityState;
  toolId: string | null;
  outcome: 'completed' | 'blocked' | 'failed' | 'cancelled';
  approvalRequired: boolean;
  proofRef: string | null;
  durationMs: number | null;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
};

type PublicMapInteractionInput = {
  correlationId: string;
  humanEventId: string;
  agentEventId: string;
  sessionId: string;
  actorIdHash: string;
  messageChars: number;
  mutationCount: number;
  tier: PublicAtlasTier;
  createdAt?: string;
};

export function buildPublicMapInteractionPair(
  input: PublicMapInteractionInput
): [WorkflowInteractionEvent, WorkflowInteractionEvent] {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const common = {
    property: 'agency' as const,
    workflowId: null,
    sessionId: input.sessionId,
    correlationId: input.correlationId,
    authorityState: 'wait' as const,
    outcome: 'completed' as const,
    approvalRequired: false,
    proofRef: null,
    durationMs: null,
    createdAt
  };

  return [
    {
      ...common,
      id: input.humanEventId,
      parentEventId: null,
      actorKind: 'human',
      actorIdHash: input.actorIdHash,
      eventType: 'request',
      toolId: null,
      metadata: {
        surface: 'public-map',
        messageChars: input.messageChars,
        tier: input.tier
      }
    },
    {
      ...common,
      id: input.agentEventId,
      parentEventId: input.humanEventId,
      actorKind: 'agent',
      actorIdHash: null,
      eventType: 'recommendation',
      toolId: 'public-atlas-mapping-agent',
      metadata: {
        surface: 'public-map',
        mutationCount: input.mutationCount,
        tier: input.tier
      }
    }
  ];
}
