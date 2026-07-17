import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ActionExecution, ActionExecutor, ActionRequest } from './service';

type EvenTerminalExecutorOptions = {
  instancesDir: string;
  fetchImpl?: typeof fetch;
};

type InstanceReceipt = {
  pid: number;
  port: number;
  token: string;
  startedAt: string | number;
};

export function createEvenTerminalExecutor(options: EvenTerminalExecutorOptions): ActionExecutor {
  return async (request) => {
    if (['inspect', 'dismiss', 'open_detail'].includes(request.type)) return { upstreamStatus: 200 };
    const instance = await newestLiveInstance(options.instancesDir);
    const route = routeFor(request);
    const response = await (options.fetchImpl ?? fetch)(`http://127.0.0.1:${instance.port}${route.path}`, {
      method: 'POST',
      headers: new Headers({
        authorization: `Bearer ${instance.token}`,
        'content-type': 'application/json'
      }),
      body: JSON.stringify(route.body)
    });
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : `Even Terminal returned ${response.status}.`);
    return {
      upstreamStatus: response.status,
      detail: typeof result.sessionId === 'string' ? `Session ${result.sessionId}` : undefined
    } satisfies ActionExecution;
  };
}

function routeFor(request: ActionRequest): { path: string; body: Record<string, unknown> } {
  const common = { sessionId: request.taskId, provider: 'codex' };
  if (request.type === 'follow_up') return { path: '/api/prompt', body: { ...common, text: request.text } };
  if (request.type === 'answer') return { path: '/api/question-response', body: { ...common, answer: request.text } };
  if (request.type === 'approve') return { path: '/api/permission-response', body: { ...common, decision: 'allow' } };
  if (request.type === 'deny') return { path: '/api/permission-response', body: { ...common, decision: 'deny' } };
  if (request.type === 'interrupt') return { path: '/api/interrupt', body: common };
  throw new Error(`Even Terminal does not support action ${request.type}.`);
}

async function newestLiveInstance(instancesDir: string): Promise<InstanceReceipt> {
  const receipts: InstanceReceipt[] = [];
  for (const name of await readdir(instancesDir)) {
    if (!name.endsWith('.json')) continue;
    try {
      const value = JSON.parse(await readFile(join(instancesDir, name), 'utf8')) as Partial<InstanceReceipt>;
      if (
        typeof value.pid === 'number' &&
        typeof value.port === 'number' &&
        typeof value.token === 'string' &&
        (typeof value.startedAt === 'string' || typeof value.startedAt === 'number') &&
        isAlive(value.pid)
      ) receipts.push(value as InstanceReceipt);
    } catch {
      // Stale and malformed receipts are ignored; no token is surfaced.
    }
  }
  receipts.sort((left, right) => startedAtMs(right.startedAt) - startedAtMs(left.startedAt));
  const newest = receipts[0];
  if (!newest) throw new Error('No live Even Terminal instance is available.');
  return newest;
}

function startedAtMs(value: string | number): number {
  return typeof value === 'number' ? value : Date.parse(value);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
