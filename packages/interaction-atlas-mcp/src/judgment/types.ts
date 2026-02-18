export type JudgmentDecisionType = 'allow' | 'require_human_review' | 'block';

export interface JudgmentRule {
  id: string;
  priority: number;
  when: {
    toolNames?: string[];
    hasWriteIntent?: boolean;
    hasHumanReviewStep?: boolean;
    introspectionOk?: boolean;
    accountIds?: string[];
  };
  then: {
    decision: JudgmentDecisionType;
    reason: string;
  };
}

export interface JudgmentPolicy {
  id: string;
  name: string;
  description?: string;
  rules: JudgmentRule[];
}

export interface JudgmentDecision {
  decision: JudgmentDecisionType;
  reason: string;
  matchedRuleIds: string[];
  atlasSignals: {
    touchpoint?: string;
    aiTask?: string;
    humanOversight?: string;
    constraint?: string;
  };
}

export interface JudgmentEvaluationInput {
  toolName: string;
  accountId: string;
  readOnly: boolean;
  hasWriteIntent?: boolean;
  hasHumanReviewStep?: boolean;
  introspectionOk?: boolean;
}

export interface JudgmentEstimateScenario {
  id: string;
  toolName: string;
  hasWriteIntent?: boolean;
  hasHumanReviewStep?: boolean;
  introspectionOk?: boolean;
}

export interface JudgmentEstimateSummary {
  before: Record<JudgmentDecisionType, number>;
  after: Record<JudgmentDecisionType, number>;
  delta: Record<JudgmentDecisionType, number>;
  scenarioCount: number;
}
