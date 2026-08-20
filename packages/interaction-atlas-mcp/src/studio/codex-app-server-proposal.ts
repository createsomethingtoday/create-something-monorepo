import { createHash } from 'node:crypto';

import {
  compileTranscriptSrt,
  proposeTranscriptEdit,
  type CutOperation,
  type TranscriptEditorProject
} from '@create-something/atlas-composition';

import type { ManagedCodexProposalPreparation } from './managed-codex-proposal.js';

export type CodexAppServerRpc = {
  request(method: string, params: unknown): Promise<unknown>;
};

export type CodexAppServerEventRpc = CodexAppServerRpc & {
  subscribe(listener: (notification: { method: string; params: unknown }) => void): () => void;
  close(): void;
};

export type ManagedCodexProposalRun = {
  schema: 'create-something/atlas-managed-codex-proposal-run@1';
  proposalId: string;
  projectId: string;
  revisionId: string;
  threadId: string;
  turnId: string;
  dispatch: 'started-awaiting-local-proposal';
  proposalPolicy: 'return-local-edit-proposal-only';
  transfer: {
    includesAcceptedTranscript: true;
    transcriptDispatched: true;
    accountCredentialsRead: false;
  };
};

export type ManagedCodexProposalResult = {
  rationale: string;
  operations: CutOperation[];
};

export type ManagedCodexProposalDispatch = {
  project: TranscriptEditorProject;
  run: ManagedCodexProposalRun;
};

const LOCAL_TRANSCRIPT_EDIT_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rationale', 'operations'],
  properties: {
    rationale: { type: 'string', minLength: 1 },
    operations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'transcriptSegmentIds', 'startUs', 'endUs', 'reason'],
        properties: {
          id: { type: 'string', minLength: 1 },
          kind: { enum: ['keep', 'remove', 'replace-text'] },
          transcriptSegmentIds: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 1 }
          },
          startUs: { type: 'integer', minimum: 0 },
          endUs: { type: 'integer', minimum: 1 },
          reason: { type: 'string', minLength: 1 }
        }
      }
    }
  }
} as const;

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Codex App Server ${label} returned an invalid response.`);
  }
  return value as Record<string, unknown>;
}

function responseId(response: unknown, objectKey: 'thread' | 'turn'): string {
  const object = asRecord(asRecord(response, `${objectKey}/start`)[objectKey], objectKey);
  const id = object.id;
  if (typeof id !== 'string' || !id.trim()) {
    throw new Error(`Codex App Server ${objectKey}/start did not return an id.`);
  }
  return id;
}

function currentAcceptedTranscriptHash(project: TranscriptEditorProject): string {
  return createHash('sha256').update(compileTranscriptSrt(project)).digest('hex');
}

function assertDispatchablePreparation(
  project: TranscriptEditorProject,
  preparation: ManagedCodexProposalPreparation
): void {
  if (preparation.status !== 'ready-for-local-dispatch' || !preparation.transfer.includesAcceptedTranscript) {
    throw new Error('Managed Codex proposal dispatch requires explicit accepted-transcript consent.');
  }
  if (preparation.projectId !== project.id || preparation.revisionId !== project.currentRevisionId) {
    throw new Error('Managed Codex proposal preparation no longer matches the current accepted revision.');
  }
  if (preparation.context.acceptedTranscriptSha256 !== currentAcceptedTranscriptHash(project)) {
    throw new Error('Managed Codex proposal preparation no longer matches the accepted transcript.');
  }
}

export function parseManagedCodexProposalResult(output: string): ManagedCodexProposalResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Managed Codex proposal result must be valid JSON.');
  }
  const result = asRecord(parsed, 'proposal result');
  const keys = Object.keys(result).sort();
  if (keys.length !== 2 || keys[0] !== 'operations' || keys[1] !== 'rationale') {
    throw new Error('Managed Codex proposal result must contain only rationale and operations.');
  }
  if (typeof result.rationale !== 'string' || !Array.isArray(result.operations)) {
    throw new Error('Managed Codex proposal result has invalid rationale or operations.');
  }
  return { rationale: result.rationale, operations: result.operations as CutOperation[] };
}

/**
 * Validates a completed Codex response through the existing proposal contract.
 * The returned project has one proposed edit only: it never approves, applies,
 * renders, or mutates the supplied project.
 */
export function materializeManagedCodexProposal(
  project: TranscriptEditorProject,
  preparation: ManagedCodexProposalPreparation,
  output: string
): TranscriptEditorProject {
  assertDispatchablePreparation(project, preparation);
  const result = parseManagedCodexProposalResult(output);
  return proposeTranscriptEdit(project, {
    id: preparation.id,
    baseRevisionId: preparation.revisionId,
    proposedBy: 'managed-codex',
    rationale: result.rationale,
    operations: result.operations
  });
}

function notificationRecord(params: unknown): Record<string, unknown> | null {
  return params && typeof params === 'object' && !Array.isArray(params)
    ? params as Record<string, unknown>
    : null;
}

function notificationTurnId(params: Record<string, unknown>): string | null {
  const turn = notificationRecord(params.turn);
  const id = turn?.id;
  return typeof id === 'string' ? id : null;
}

/**
 * Runs one explicit App Server proposal request to completion and materializes
 * its final agent message through the local proposal contract. Agent messages
 * are intentionally the only completion item consumed; reasoning, tool calls,
 * and raw provider events never enter Atlas state.
 */
export async function dispatchManagedCodexProposal(
  project: TranscriptEditorProject,
  preparation: ManagedCodexProposalPreparation,
  rpc: CodexAppServerEventRpc,
  timeoutMs = 300_000
): Promise<ManagedCodexProposalDispatch> {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Managed Codex proposal dispatch requires a positive timeout.');
  }
  const outputs = new Map<string, string[]>();
  const completed = new Set<string>();
  let activeRun: ManagedCodexProposalRun | null = null;
  let resolveOutput!: (output: string) => void;
  let rejectOutput!: (error: Error) => void;
  const output = new Promise<string>((resolve, reject) => {
    resolveOutput = resolve;
    rejectOutput = reject;
  });
  const key = (threadId: string, turnId: string) => `${threadId}:${turnId}`;
  const settle = () => {
    if (!activeRun) return;
    const runKey = key(activeRun.threadId, activeRun.turnId);
    if (!completed.has(runKey)) return;
    const message = outputs.get(runKey)?.at(-1);
    if (!message) {
      rejectOutput(new Error('Codex completed without a final proposal message.'));
      return;
    }
    resolveOutput(message);
  };
  const unsubscribe = rpc.subscribe((notification) => {
    const params = notificationRecord(notification.params);
    if (!params) return;
    if (notification.method === 'item/completed') {
      const item = notificationRecord(params.item);
      const threadId = params.threadId;
      const turnId = params.turnId;
      if (
        item?.type === 'agentMessage' &&
        typeof item.text === 'string' &&
        typeof threadId === 'string' &&
        typeof turnId === 'string'
      ) {
        const itemKey = key(threadId, turnId);
        outputs.set(itemKey, [...(outputs.get(itemKey) ?? []), item.text]);
      }
      settle();
      return;
    }
    if (notification.method === 'turn/completed') {
      const threadId = params.threadId;
      const turnId = notificationTurnId(params);
      if (typeof threadId === 'string' && turnId) completed.add(key(threadId, turnId));
      settle();
    }
  });
  const timeout = setTimeout(
    () => rejectOutput(new Error('Timed out waiting for the managed Codex proposal.')),
    timeoutMs
  );
  try {
    activeRun = await startManagedCodexProposalRun(project, preparation, rpc);
    settle();
    const next = materializeManagedCodexProposal(project, preparation, await output);
    return { project: next, run: activeRun };
  } finally {
    clearTimeout(timeout);
    unsubscribe();
    rpc.close();
  }
}

function buildProposalInstruction(
  project: TranscriptEditorProject,
  preparation: ManagedCodexProposalPreparation
): string {
  const manifest = project.transcriptSegments
    .map((segment) => `${segment.id}: ${segment.startUs}-${segment.endUs}`)
    .join('\n');
  return [
    'You are preparing one local, reviewable transcript edit proposal for Atlas Studio.',
    'Return JSON only that satisfies the supplied schema. Do not render media, apply edits, or request credentials.',
    'Use only the supplied transcript segment IDs and timestamp ranges. Keep every source interval that is not intentionally removed.',
    'Do not include hidden reasoning, execution steps, or private context outside the proposal fields.',
    `Atlas project: ${project.id}`,
    `Accepted revision: ${preparation.revisionId}`,
    `Operator instruction: ${preparation.prompt}`,
    'Allowed segment manifest:',
    manifest,
    'Accepted transcript (explicitly consented for this single local Codex turn):',
    compileTranscriptSrt(project)
  ].join('\n\n');
}

/**
 * Starts one ephemeral Codex App Server turn after the separately recorded
 * accepted-transcript consent. The caller owns process transport and result
 * collection; this boundary creates no Atlas revision and exposes no result
 * text in its local receipt.
 */
export async function startManagedCodexProposalRun(
  project: TranscriptEditorProject,
  preparation: ManagedCodexProposalPreparation,
  rpc: CodexAppServerRpc
): Promise<ManagedCodexProposalRun> {
  assertDispatchablePreparation(project, preparation);

  await rpc.request('initialize', {
    clientInfo: { name: 'atlas-studio', title: 'Atlas Studio', version: '0.1.0' },
    capabilities: { experimentalApi: false, requestAttestation: false }
  });
  const threadResponse = await rpc.request('thread/start', {
    approvalPolicy: 'never',
    ephemeral: true,
    sandbox: 'read-only'
  });
  const threadId = responseId(threadResponse, 'thread');
  const turnResponse = await rpc.request('turn/start', {
    threadId,
    input: [{ type: 'text', text: buildProposalInstruction(project, preparation), text_elements: [] }],
    outputSchema: LOCAL_TRANSCRIPT_EDIT_OUTPUT_SCHEMA
  });
  const turnId = responseId(turnResponse, 'turn');

  return {
    schema: 'create-something/atlas-managed-codex-proposal-run@1',
    proposalId: preparation.id,
    projectId: project.id,
    revisionId: preparation.revisionId,
    threadId,
    turnId,
    dispatch: 'started-awaiting-local-proposal',
    proposalPolicy: 'return-local-edit-proposal-only',
    transfer: {
      includesAcceptedTranscript: true,
      transcriptDispatched: true,
      accountCredentialsRead: false
    }
  };
}
