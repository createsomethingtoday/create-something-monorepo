import { createHash } from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
import readline from 'node:readline';
import { promisify } from 'node:util';

import {
  type CutOperation,
  type ProposeTranscriptEditInput,
  type TranscriptEditorProject
} from '@create-something/atlas-composition';

const execFileAsync = promisify(execFile);

export type CodexAccountStatus =
  | { state: 'ready'; authMode: 'chatgpt' }
  | { state: 'unauthenticated' | 'unsupported-auth' | 'unavailable' };

export type RequestCodexTranscriptProposal = {
  id: string;
  operatorPrompt: string;
  requestedAt: string;
  operatorConfirmedPrivateContent: boolean;
};

export type CodexTranscriptProposalRunner = {
  propose: (
    project: TranscriptEditorProject,
    request: RequestCodexTranscriptProposal
  ) => Promise<ProposeTranscriptEditInput>;
};

type JsonRpcMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: unknown;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function managedCodexCommand(): string {
  return process.env.ATLAS_CODEX_PATH?.trim() || 'codex';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonObject(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ?? text;
  const parsed = JSON.parse(fenced.trim()) as unknown;
  const result = asRecord(parsed);
  if (!Object.keys(result).length) throw new Error('Managed Codex did not return a proposal object.');
  return result;
}

function normalizeOperations(value: unknown): CutOperation[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Managed Codex did not return any cut operations.');
  return value.map((candidate, index) => {
    const operation = asRecord(candidate);
    const kind = operation.kind;
    const segmentIds = operation.transcriptSegmentIds;
    if (
      typeof operation.id !== 'string'
      || !['keep', 'remove', 'replace-text'].includes(String(kind))
      || !Array.isArray(segmentIds)
      || !segmentIds.length
      || !segmentIds.every((id) => typeof id === 'string' && id.trim())
      || !Number.isInteger(operation.startUs)
      || !Number.isInteger(operation.endUs)
      || typeof operation.reason !== 'string'
    ) throw new Error(`Managed Codex returned invalid cut operation ${index + 1}.`);
    return {
      id: operation.id.trim(),
      kind: kind as CutOperation['kind'],
      transcriptSegmentIds: segmentIds.map((id) => (id as string).trim()),
      startUs: operation.startUs as number,
      endUs: operation.endUs as number,
      reason: operation.reason.trim()
    };
  });
}

function requestContext(project: TranscriptEditorProject, request: RequestCodexTranscriptProposal): string {
  const revision = project.revisions.find((candidate) => candidate.id === project.currentRevisionId);
  if (!revision) throw new Error('The media project has no current revision.');
  const context = {
    projectId: project.id,
    baseRevisionId: project.currentRevisionId,
    sourceAssets: project.sourceAssets.map((asset) => ({ id: asset.id, media: asset.media })),
    transcriptSegments: project.transcriptSegments.map((segment) => ({
      id: segment.id,
      assetId: segment.assetId,
      startUs: segment.startUs,
      endUs: segment.endUs,
      text: segment.text
    })),
    currentCutList: revision.cutList,
    operatorPrompt: request.operatorPrompt
  };
  return JSON.stringify(context);
}

export async function getCodexManagedAccountStatus(
  command = managedCodexCommand()
): Promise<CodexAccountStatus> {
  try {
    const result = await execFileAsync(command, ['login', 'status'], { timeout: 5_000, maxBuffer: 16 * 1024 });
    const publicStatus = `${result.stdout}\n${result.stderr}`;
    return /logged in using chatgpt/i.test(publicStatus)
      ? { state: 'ready', authMode: 'chatgpt' }
      : { state: 'unsupported-auth' };
  } catch {
    return { state: 'unauthenticated' };
  }
}

async function runReadOnlyCodexTurn(prompt: string): Promise<{ threadId: string; turnId: string; text: string; completedAt: string }> {
  const appServer = spawn(managedCodexCommand(), ['app-server', '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
  if (!appServer.stdin || !appServer.stdout) throw new Error('Managed Codex App Server is unavailable.');
  const stdout = readline.createInterface({ input: appServer.stdout });
  const stderr = readline.createInterface({ input: appServer.stderr });
  stderr.on('line', () => undefined);
  let nextId = 1;
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();
  const agentText: string[] = [];
  let threadId = '';
  let turnId = '';
  let doneResolve: ((value: { threadId: string; turnId: string; text: string; completedAt: string }) => void) | undefined;
  let doneReject: ((reason: Error) => void) | undefined;
  const complete = new Promise<{ threadId: string; turnId: string; text: string; completedAt: string }>((resolve, reject) => {
    doneResolve = resolve;
    doneReject = reject;
  });
  const fail = (message: string) => doneReject?.(new Error(message));
  const request = (method: string, params?: Record<string, unknown>): Promise<unknown> => {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      appServer.stdin.write(`${JSON.stringify({ id, method, ...(params ? { params } : {}) })}\n`);
    });
  };
  stdout.on('line', (line) => {
    let message: JsonRpcMessage;
    try { message = JSON.parse(line) as JsonRpcMessage; } catch { return; }
    if (typeof message.id === 'number' && message.method === undefined) {
      const waiting = pending.get(message.id);
      if (!waiting) return;
      pending.delete(message.id);
      if (message.error !== undefined) waiting.reject(new Error('Managed Codex request failed.'));
      else waiting.resolve(message.result);
      return;
    }
    if (message.method === 'item/agentMessage/delta') {
      const delta = asText(asRecord(message.params).delta);
      if (delta) agentText.push(delta);
    }
    if (message.method === 'turn/completed') {
      const turn = asRecord(asRecord(message.params).turn);
      if (turn.status !== 'completed') {
        fail('Managed Codex did not complete the proposal turn.');
        return;
      }
      doneResolve?.({ threadId, turnId, text: agentText.join(''), completedAt: new Date().toISOString() });
    }
  });
  appServer.once('error', () => fail('Managed Codex App Server is unavailable.'));
  appServer.once('exit', () => {
    for (const waiting of pending.values()) waiting.reject(new Error('Managed Codex App Server exited.'));
  });
  try {
    await request('initialize', {
      clientInfo: { name: 'atlas-transcript-editor', title: 'Atlas Transcript Editor', version: '0.1.0' },
      capabilities: { experimentalApi: true }
    });
    appServer.stdin.write(`${JSON.stringify({ method: 'initialized' })}\n`);
    const threadResult = asRecord(await request('thread/start', {
      cwd: process.cwd(),
      approvalPolicy: 'untrusted',
      developerInstructions: 'You are a read-only video transcript editor. Do not call tools, read files, change files, make network requests, or take any action. Return only the requested JSON proposal.'
    }));
    threadId = asText(asRecord(threadResult.thread).id);
    if (!threadId) throw new Error('Managed Codex did not return a thread id.');
    const turnResult = asRecord(await request('turn/start', {
      threadId,
      input: [{ type: 'text', text: prompt }],
      approvalPolicy: 'untrusted',
      sandboxPolicy: { type: 'readOnly' }
    }));
    turnId = asText(asRecord(turnResult.turn).id);
    if (!turnId) throw new Error('Managed Codex did not return a turn id.');
    let timeout: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        complete,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Managed Codex proposal timed out.')), 120_000);
        })
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  } finally {
    stdout.close();
    stderr.close();
    appServer.kill();
  }
}

export function createCodexTranscriptProposalRunner(): CodexTranscriptProposalRunner {
  return {
    async propose(project, request) {
      if (!request.operatorConfirmedPrivateContent) {
        throw new Error('Operator confirmation is required before private transcript content is sent to managed Codex.');
      }
      if (!request.id.trim() || !request.operatorPrompt.trim()) throw new Error('A proposal id and operator prompt are required.');
      const account = await getCodexManagedAccountStatus();
      if (account.state !== 'ready') throw new Error('Connect a ChatGPT account in Codex before requesting an agent proposal.');
      const context = requestContext(project, request);
      const startedAt = new Date().toISOString();
      const prompt = [
        'Review the private transcript context below and propose a complete replacement cut list.',
        'Return strict JSON only with this exact shape:',
        '{"rationale":"...","operations":[{"id":"...","kind":"keep|remove|replace-text","transcriptSegmentIds":["..."],"startUs":0,"endUs":1,"reason":"..."}]}',
        'Use only segment IDs and timestamps supplied in the context. Keep every source interval that is not intentionally removed. This is a suggestion only; do not claim it is applied or approved.',
        context
      ].join('\n\n');
      const result = await runReadOnlyCodexTurn(prompt);
      const parsed = parseJsonObject(result.text);
      const rationale = asText(parsed.rationale);
      if (!rationale) throw new Error('Managed Codex did not return proposal rationale.');
      return {
        id: request.id.trim(),
        baseRevisionId: project.currentRevisionId,
        proposedBy: 'codex-managed-session',
        rationale,
        operations: normalizeOperations(parsed.operations),
        instruction: { id: `instruction:${request.id.trim()}`, text: request.operatorPrompt.trim(), source: 'operator', createdAt: request.requestedAt },
        agentRun: {
          provider: 'codex-app-server',
          threadId: result.threadId,
          turnId: result.turnId,
          startedAt,
          completedAt: result.completedAt,
          inputSha256: sha256(prompt),
          responseSha256: sha256(result.text),
          usage: 'managed-account-unreported'
        }
      };
    }
  };
}
