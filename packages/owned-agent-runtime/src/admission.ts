import type { AgentAdmission, AgentAdmissionDecision } from './types.js';

type RateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

export class CloudflareAgentAdmission implements AgentAdmission {
  constructor(
    private readonly clientLimiter: RateLimiter,
    private readonly budgetLimiter: RateLimiter
  ) {}

  async check(input: {
    request: Request;
    agentId: string;
  }): Promise<AgentAdmissionDecision> {
    const client = input.request.headers.get('cf-connecting-ip') ?? 'unattributed';
    const clientResult = await this.clientLimiter.limit({ key: `${input.agentId}:${client}` });
    if (!clientResult.success) return 'rate_limited';

    const budgetResult = await this.budgetLimiter.limit({ key: input.agentId });
    return budgetResult.success ? 'allowed' : 'rate_limited';
  }
}
