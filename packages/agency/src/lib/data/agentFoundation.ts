import type { PerformanceCampaignProof } from '@create-something/canon';

export const agentFoundationHero = {
  title: 'You started the agent. We’ll get one useful job working.',
  lede: 'For builders and operating teams with an idea, prototype, or stalled Codex project. We work in your GitHub repository, then help your team make the next change with Codex. The rules, tests, and runbook stay with you.',
  proof: [
    { label: 'Scope', value: '1 role · 1 job' },
    { label: 'Ownership', value: 'Your repository' },
    { label: 'Handoff', value: 'Your team makes the next change' }
  ] satisfies PerformanceCampaignProof[]
};

export const agentFoundationRepository = [
  {
    path: 'AGENTS.md',
    purpose: 'How Codex should work in the project'
  },
  {
    path: 'src/',
    purpose: 'One useful job, working end to end'
  },
  {
    path: 'policy/',
    purpose: 'Rules for what the agent may do, ask, or stop'
  },
  {
    path: 'evals/',
    purpose: 'One real example and one failure case'
  },
  {
    path: 'tests/',
    purpose: 'The verifier your team reruns'
  },
  {
    path: 'RUNBOOK.md',
    purpose: 'Setup, known limits, and recovery'
  },
  {
    path: 'CONTINUATION.md',
    purpose: 'The next agreed change'
  }
] as const;

export const agentFoundationChecks = [
  'A fresh checkout starts from the runbook.',
  'One real example produces the agreed result.',
  'One failure case makes the agent stop.',
  'Your team makes one agreed change with Codex.',
  'The verifier passes again.'
] as const;

export const agentFoundationStages = [
  {
    state: 'Agent Foundation',
    title: 'One job works in the agreed development environment.',
    items: [
      'The repository includes the source, rules, tests, and runbook.',
      'Working, blocked, unknown, and next states stay visible.',
      'Your team completes one change with Codex before handoff.'
    ]
  },
  {
    state: 'Production Promotion',
    title: 'Going live is a separate project.',
    items: [
      'Production credentials, bindings, and data migration',
      'Deployment, rollback, monitoring, and recovery',
      'Live integration checks and real-user verification'
    ]
  }
] as const;

export const agentFoundationFit = [
  { label: 'Project', value: 'An idea, prototype, repository, or stalled Codex project' },
  { label: 'Role', value: 'The person or team the agent serves' },
  { label: 'Input', value: 'One real example of the work' },
  { label: 'Result', value: 'What a good result looks like, including when to stop' }
] as const;
