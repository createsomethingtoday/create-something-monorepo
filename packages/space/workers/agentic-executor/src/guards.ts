import type { AgenticTask } from './types';

export class GuardError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function usdUnits(value: number): number {
  const units = Math.ceil(value * 1_000_000);
  if (!Number.isSafeInteger(units) || units <= 0) throw new GuardError('USD amount is outside supported precision/range');
  return units;
}
export interface SpendPolicy {
  maxTask: number; lifetimeUsd: number; lifetimeTasks: number;
  inputRate: number; outputRate: number; callReservation: number; maxRequestBytes: number; timeoutMs: number;
}
export function readPolicy(env: object): SpendPolicy {
  const config = env as Record<string, unknown>;
  const number = (name: string, integer = false) => {
    const raw = config[name];
    const n = typeof raw === 'string' && raw.trim() ? Number(raw) : NaN;
    if (!Number.isFinite(n) || n <= 0 || (integer && !Number.isSafeInteger(n))) {
      throw new GuardError(`Required spending policy ${name} is missing or invalid`, 503);
    }
    return n;
  };
  const policy = {
    maxTask: number('AGENTIC_MAX_TASK_USD'), lifetimeUsd: number('AGENTIC_LIFETIME_BUDGET_USD'),
    lifetimeTasks: number('AGENTIC_LIFETIME_TASK_LIMIT', true),
    inputRate: number('AGENTIC_INPUT_USD_PER_MILLION'),
    outputRate: number('AGENTIC_OUTPUT_USD_PER_MILLION'),
    callReservation: number('AGENTIC_CALL_RESERVATION_USD'),
    maxRequestBytes: number('AGENTIC_MAX_REQUEST_BYTES', true),
    timeoutMs: number('AGENTIC_SESSION_TIMEOUT_MS', true)
  };
  for (const amount of [policy.maxTask,policy.lifetimeUsd,policy.callReservation]) usdUnits(amount);
  const maximumCall = (policy.maxRequestBytes * policy.inputRate + 16384 * policy.outputRate) / 1_000_000;
  if (policy.callReservation < maximumCall) throw new GuardError('Call reservation is below configured maximum request charge',503);
  if (policy.callReservation > policy.maxTask || policy.maxTask > policy.lifetimeUsd || policy.timeoutMs > 86400000 || policy.maxRequestBytes > 1_000_000) {
    throw new GuardError('Spending policy bounds are inconsistent', 503);
  }
  return policy;
}
export function validateTask(value: unknown, policy: SpendPolicy): AgenticTask {
  const task = value as AgenticTask;
  const id = (v: unknown) => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(v);
  if (!task || !id(task.issueId) || !id(task.epicId) || (task.convoyId !== undefined && !id(task.convoyId)) ||
      typeof task.budget !== 'number' || !Number.isFinite(task.budget) || task.budget < policy.callReservation || task.budget > policy.maxTask ||
      (task.acceptanceCriteria !== undefined && (!Array.isArray(task.acceptanceCriteria) || task.acceptanceCriteria.length > 100 || task.acceptanceCriteria.some(v => typeof v !== 'string' || v.length > 4000)))) {
    throw new GuardError('Invalid task identity, finite budget, or acceptance criteria');
  }
  usdUnits(task.budget);
  return { issueId: task.issueId, epicId: task.epicId, budget: task.budget,
    ...(task.convoyId ? {convoyId: task.convoyId} : {}),
    ...(task.acceptanceCriteria ? {acceptanceCriteria: task.acceptanceCriteria} : {}) };
}
export async function fingerprint(task: AgenticTask): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(task)));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function authorized(request: Request, token?: string): Promise<boolean> {
  if (!token || token.length < 32) return false;
  const expected = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`Bearer ${token}`));
  const supplied = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(request.headers.get('Authorization') || ''));
  return new Uint8Array(expected).reduce((diff, byte, i) => diff | (byte ^ new Uint8Array(supplied)[i]), 0) === 0;
}
export function guardResponse(error: unknown): Response {
  return Response.json({error: error instanceof GuardError ? error.message : 'Operation failed; outcome may need reconciliation'},
    {status: error instanceof GuardError ? error.status : 503});
}
