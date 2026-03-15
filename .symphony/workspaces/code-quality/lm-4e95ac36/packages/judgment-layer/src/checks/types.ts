export type CheckOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'neq';

export type CheckSeverity = 'low' | 'medium' | 'high' | 'critical';

export type JudgmentCheck = {
  id: string;
  description?: string;
  enabled: boolean;

  server: string;
  tool: string;
  argsJson: string;
  valuePath: string;

  operator: CheckOperator;
  target: string | number | boolean;

  severity: CheckSeverity;
  cooldownMinutes: number;
  notifyChannel: string;
  suggestionPrompt?: string;
  allowAutoWrite: boolean;
};

export type ChecksFile = {
  checks: JudgmentCheck[];
};

