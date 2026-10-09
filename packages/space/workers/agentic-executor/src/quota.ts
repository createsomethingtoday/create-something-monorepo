import { fingerprint, guardResponse, GuardError, readPolicy, validateTask, usdUnits } from './guards.ts';
import type { Env } from './types';
interface Receipt { fingerprint: string; deadline: number; status: 'reserved' | 'queued' }
// One named object for the entire deployment, not one per caller/task/window.
// Full allocations remain charged for its lifetime, including uncertain queue outcomes.
export class AgenticQuota {
  private state: DurableObjectState;
  private env: Env;
  constructor(state: DurableObjectState, env: Env) { this.state = state; this.env = env; }
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method !== 'POST') return new Response('Not found', {status:404});
      const path = new URL(request.url).pathname;
      if (path !== '/admit' && path !== '/verify') return new Response('Not found', {status:404});
      const policy = readPolicy(this.env);
      const task = validateTask(await request.json(), policy);
      const hash = await fingerprint(task);
      const key = `task:${task.issueId}`;
      if (path === '/verify') {
        const receipt = await this.state.storage.get<Receipt>(key);
        if (!receipt || receipt.fingerprint !== hash) throw new GuardError('Task lacks matching admission',403);
        return Response.json(receipt);
      }
      const result = await this.state.storage.transaction(async storage => {
        const existing = await storage.get<Receipt>(key);
        if (existing) {
          if (existing.fingerprint !== hash) throw new GuardError('Task ID already belongs to different input',409);
          return {receipt:existing, created:false};
        }
        const totals = await storage.get<{units:number; tasks:number}>('totals') || {units:0,tasks:0};
        if (totals.tasks >= policy.lifetimeTasks || totals.units + usdUnits(task.budget) > Math.floor(policy.lifetimeUsd * 1_000_000)) {
          throw new GuardError('Lifetime admission quota exhausted',429);
        }
        const receipt: Receipt = {fingerprint:hash, deadline:Date.now()+policy.timeoutMs, status:'reserved'};
        await storage.put('totals', {units:totals.units+usdUnits(task.budget),tasks:totals.tasks+1});
        await storage.put(key,receipt);
        return {receipt,created:true};
      });
      if (result.created) {
        // Persist-before-send: a timeout/crash never automatically repeats the send.
        // A delivered message can verify a reserved receipt even if this acknowledgement was lost.
        await this.env.AGENTIC_QUEUE.send(task);
        result.receipt.status = 'queued';
        await this.state.storage.put(key,result.receipt);
      }
      return Response.json({success:true,taskId:task.issueId,status:result.receipt.status,duplicate:!result.created});
    } catch (error) { return guardResponse(error); }
  }
}
export function quota(env: Env): DurableObjectStub {
  return env.AGENTIC_QUOTA.get(env.AGENTIC_QUOTA.idFromName('deployment-lifetime-v1'));
}
