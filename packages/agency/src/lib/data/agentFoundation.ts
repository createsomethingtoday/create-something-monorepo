import type { PerformanceCampaignProof } from '@create-something/canon';

export const agentFoundationHero = {
  title: 'An AI agent for one job your team needs done.',
  lede: 'Bring an idea, a repeated task, or a project that stalled. We build and test one useful job. You keep the code and instructions, and we help you make the next change. Going live is a separate project.',
  proof: [
    { label: 'Scope', value: '1 role · 1 job' },
    { label: 'Ownership', value: 'Your code and instructions' },
    { label: 'Handoff', value: 'You make the next change' }
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
    purpose: 'Checks you can run again'
  },
  {
    path: 'RUNBOOK.md',
    purpose: 'How to start it, its limits, and how to recover'
  },
  {
    path: 'CONTINUATION.md',
    purpose: 'The next agreed change'
  }
] as const;

export const agentFoundationChecks = [
  'Your team can start the project by following the setup guide.',
  'One real example produces the agreed result.',
  'One failure case makes the agent stop.',
  'You make one agreed change with Codex.',
  'The checks pass again after your change.'
] as const;

export const agentFoundationStages = [
  {
    state: 'Agent Foundation',
    title: 'One job works in the agreed test environment.',
    items: [
      'The repository includes the source, rules, tests, and runbook.',
      'You can see what works, what is blocked, and what needs checking.',
      'You complete one change with Codex before handoff.'
    ]
  },
  {
    state: 'Production Promotion',
    title: 'Going live is a separate project.',
    items: [
      'Live account access, service connections, and moving data',
      'Deployment, rollback, monitoring, and recovery',
      'Checking connected tools and testing with real users'
    ]
  }
] as const;

export const agentFoundationFit = [
  { label: 'Project', value: 'An idea or an existing project' },
  { label: 'Role', value: 'The person or team the agent serves' },
  { label: 'Input', value: 'One real example of the work' },
  { label: 'Result', value: 'What a good result looks like, including when to stop' }
] as const;
