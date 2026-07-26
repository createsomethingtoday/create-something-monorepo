import type { AgentAdmission, AgentAdmissionDecision } from './types.js';
import type { ControlRunAdmission } from './control-worker.js';

type RateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

const CONTROL_BUDGETED_OPERATIONS = new Set(['start', 'process', 'mcp:control_run_start']);

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

export class CloudflareControlRunAdmission implements ControlRunAdmission {
  constructor(
    private readonly tenantLimiter: RateLimiter,
    private readonly budgetLimiter: RateLimiter
  ) {}

  async check(input: Parameters<ControlRunAdmission['check']>[0]) {
    const scopeKey = `${input.context.scope.accountId}:${input.context.scope.tenantId}:${input.context.scope.workspaceAccountId}`;
    const tenant = await this.tenantLimiter.limit({ key: scopeKey });
    if (!tenant.success) return 'rate_limited' as const;
    if (!CONTROL_BUDGETED_OPERATIONS.has(input.operation)) return 'allowed' as const;
    const budget = await this.budgetLimiter.limit({ key: scopeKey });
    return budget.success ? 'allowed' as const : 'rate_limited' as const;
  }
}
