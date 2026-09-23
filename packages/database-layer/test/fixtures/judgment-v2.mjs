export const snapshot = {
  schemaVersion: 'judgment-evidence.v2',
  caseId: 'exception:synthetic-2',
  groupId: 'app:synthetic-2',
  cutoff: '2026-09-01T12:00:00Z',
  certification: 'synthetic',
  context: {
    finding: 'naming',
    applicableGuideline: 'The developer must acknowledge the naming finding.'
  },
  facts: { identityMatches: true },
  eligibility: { scope: 'complete', mandatoryHumanReview: false },
  sources: [
    {
      id: 'developer',
      entityId: 'exception:synthetic-2',
      sourceRef: 'fixture:developer',
      observedAt: '2026-09-01T11:00:00Z',
      capturedAt: '2026-09-01T11:05:00Z',
      text: 'I acknowledge the naming finding. We can address it next week.'
    }
  ]
};
export const questionSet = {
  schemaVersion: 'judgment-questions.v2',
  id: 'exception-support',
  version: '1',
  questions: [
    {
      id: 'ack',
      version: '1',
      evidenceIds: ['developer'],
      type: 'noul',
      instructions: {
        task: 'Does the developer explicitly acknowledge the naming finding?',
        boundary: 'A promise to fix alone is not acknowledgment.'
      },
      criteria: { true: 'Explicit acknowledgment', false: 'No explicit acknowledgment' }
    },
    {
      id: 'route',
      version: '1',
      evidenceIds: ['developer'],
      type: 'choice',
      instructions: 'Which finding does the response address?',
      criteria: {
        naming: 'Naming finding',
        security: 'Security finding',
        none: 'No matching finding'
      }
    },
    {
      id: 'detail',
      version: '1',
      evidenceIds: ['developer'],
      type: 'score',
      instructions: 'How specific is the proposed remediation?',
      criteria: [
        'No remediation described',
        'Action described without timing',
        'Action and timing described'
      ]
    }
  ]
};
export const response = {
  model: 'jev-1.13.0',
  answers: {
    ack: { type: 'noul', noul: 0.81 },
    route: {
      type: 'choice',
      choice: 'naming',
      probabilities: { naming: 0.9, security: 0.05, none: 0.05 },
      confidence: 0.85
    },
    detail: {
      type: 'score',
      score: 1.6,
      legend: {
        0: 'No remediation described',
        1: 'Action described without timing',
        2: 'Action and timing described'
      },
      probabilities: { 0: 0.1, 1: 0.2, 2: 0.7 },
      confidence: 0.6
    }
  },
  usage: { input_tokens: 240, output_tokens: 35 }
};
export const trace = {
  invocationId: 'local:fixture',
  providerRequestId: null,
  adapterVersion: 'fixture-v1',
  startedAt: '2026-09-01T12:01:00Z',
  completedAt: '2026-09-01T12:01:01Z',
  latencyMs: 1000
};
export function policy(questionSetDigest) {
  return {
    schemaVersion: 'judgment-policy.v2',
    id: 'exception-advisory',
    version: '1',
    questionSetDigest,
    rules: [
      {
        id: 'identity',
        applicability: 'applicable',
        mode: 'require',
        source: { kind: 'fact', factId: 'identityMatches' },
        operator: 'eq',
        threshold: 1
      },
      {
        id: 'acknowledgment',
        applicability: 'applicable',
        mode: 'require',
        source: { kind: 'answer', questionId: 'ack', metric: 'noul' },
        operator: 'gte',
        threshold: 0.8
      },
      {
        id: 'security',
        applicability: 'not_applicable',
        mode: 'forbid',
        source: {
          kind: 'answer',
          questionId: 'route',
          metric: 'choice_probability',
          option: 'security'
        },
        operator: 'gte',
        threshold: 0.3
      }
    ]
  };
}
