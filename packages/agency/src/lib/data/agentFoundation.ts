import type { PerformanceCampaignProof, PerformanceNarrativeScene } from '@create-something/canon';

export const agentFoundationHero = {
  title: 'Build an agent you can keep building.',
  lede: 'For builders and operating teams with an idea, prototype, or stalled Codex project: we deliver one useful capability in your GitHub repository, establish the data, tools, policy, tests, and runbook around it, and onboard you to continue in your own environment. Production access and operation are promoted separately.',
  proof: [
    { label: 'Unit', value: '1 role · 1 job' },
    { label: 'Delivery', value: 'Working foundation' },
    { label: 'Ownership', value: 'Client repository' },
    { label: 'Continuation', value: 'Codex-ready' }
  ] satisfies PerformanceCampaignProof[]
};

export const agentFoundationScenes: PerformanceNarrativeScene[] = [
  {
    id: 'bound',
    label: 'Bound the job',
    summary: 'One role and one useful capability',
    title: 'Start with the work the agent must perform.',
    detail:
      'Bring the repository or prototype, the role the agent serves, one representative input, and an acceptable result. We name what the agent may read, propose, change, and must stop before implementation expands.',
    tone: 'review',
    receipts: ['named owner', 'representative case', 'authority boundary']
  },
  {
    id: 'build',
    label: 'Build the foundation',
    summary: 'A working vertical slice in your repository',
    title: 'Deliver the capability and the system around it.',
    detail:
      'We implement the data path, required tools or MCP surface, agent instructions, policy gates, golden cases, and runbook for one end-to-end capability. Unavailable production dependencies remain visibly blocked or bound to approved development fixtures.',
    tone: 'neutral',
    receipts: ['working capability', 'tests and stop cases', 'known limits']
  },
  {
    id: 'continue',
    label: 'Continue with Codex',
    summary: 'A handoff your team exercises',
    title: 'Make one bounded change before the handoff closes.',
    detail:
      'Your team uses Codex in its own environment to inspect the project, run the verifier, make one agreed change, and rerun the relevant check. The exercise proves the continuation path—not every future change or production use.',
    tone: 'allow',
    evidence: ['documented bootstrap', 'bounded continuation change', 'verifier rerun']
  }
];

export const agentFoundationLayers = [
  {
    label: 'Database',
    title: 'State your agent can understand.',
    detail:
      'Schemas, fixtures or approved development bindings, state ownership, and data assumptions for the bounded capability.'
  },
  {
    label: 'Automation',
    title: 'Tools your agent can use.',
    detail:
      'The executable path, required tools or MCP surface, deterministic checks, and explicit blocked actions.'
  },
  {
    label: 'Judgment',
    title: 'Policy that decides when to act or stop.',
    detail:
      'Instructions, approvals, stop conditions, evaluation cases, and uncertainty behavior stored as inspectable artifacts.'
  }
] as const;

export const agentFoundationStages = [
  {
    state: 'Stage 1 · Agent Foundation',
    title: 'Continuation-ready in the accepted development path.',
    items: [
      'One useful end-to-end capability',
      'Client-owned repository, source, tests, and runbook',
      'Codex onboarding and one bounded continuation change',
      'Working, blocked, unknown, and next states recorded'
    ]
  },
  {
    state: 'Stage 2 · Production Promotion',
    title: 'Live authority and operation are separately scoped.',
    items: [
      'Production credentials, bindings, and data migration',
      'Deployment, rollback, monitoring, and recovery',
      'Live integration and negative-path verification',
      'Named operator or real-user acceptance'
    ]
  }
] as const;

export const agentFoundationHandoff = {
  owner: 'Builder + capability owner',
  authority: 'Approve one role, job, and boundary',
  proof: 'Repository + verifier + continuation exercise',
  state: 'ready' as const
};
