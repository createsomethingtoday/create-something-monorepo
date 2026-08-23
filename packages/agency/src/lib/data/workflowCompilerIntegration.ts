import type { PerformanceNarrativeScene } from '@create-something/canon';

export const workflowCompilerIntegrationHero = {
  title: 'Install one governed workflow contract in your repository.',
  lede: 'A paid, fixed-scope implementation for builders using the open-source Workflow Compiler: one repository, one consequential workflow, the required MCP or agent tools, a CI gate, and a portable client-owned handoff.',
  proof: [
    { label: 'Format', value: 'Paid · fixed scope' },
    { label: 'Boundary', value: '1 repo · 1 workflow' },
    { label: 'Ownership', value: 'Client-owned' }
  ]
};

export const workflowCompilerIntegrationScenes: PerformanceNarrativeScene[] = [
  {
    id: 'install',
    label: 'Install',
    summary: 'Compiler in your repository',
    title: 'Model the workflow where your builders already work.',
    detail:
      'We install Workflow Compiler in one repository, model one consequential workflow, and connect only the required MCP or agent tools. The definition remains local, inspectable, and portable.',
    tone: 'neutral',
    receipts: ['versioned workflow definition', 'tool boundary', 'ownership record']
  },
  {
    id: 'compile',
    label: 'Compile',
    summary: 'Policy becomes an artifact',
    title: 'Turn operating intent into a governed contract.',
    detail:
      'The compiler generates policies, approval contracts, golden cases, and receipts around the workflow. Pass, wait, and stop outcomes become explicit instead of living only in a prompt.',
    tone: 'review',
    receipts: ['policies', 'approval contracts', 'golden cases', 'receipts']
  },
  {
    id: 'gate',
    label: 'Handoff',
    summary: 'One CI gate and a portable system',
    title: 'Prove the boundary before the workflow can expand.',
    detail:
      'We add a CI gate, verify the governed bundle, document the operator boundary, and hand the system back to your team. Your builders keep the code, workflow, policies, receipts, and approval authority.',
    tone: 'allow',
    evidence: ['deterministic bundle', 'CI result', 'client-owned handoff']
  }
];

export const workflowCompilerIntegrationScope = [
  {
    label: 'Included',
    title: 'One production-shaped vertical slice',
    items: [
      'Install the compiler in one repository',
      'Model one consequential workflow',
      'Connect the required MCP or agent tools',
      'Generate policies, approval contracts, golden cases, and receipts',
      'Add one CI gate and portable handoff'
    ]
  },
  {
    label: 'Ready when',
    title: 'The workflow has a real owner',
    items: [
      'A builder can provide the repository',
      'A workflow owner can name the consequential decision',
      'Tool access and approval authority are available',
      'The team can review the golden cases and stop conditions'
    ]
  },
  {
    label: 'Separate scope',
    title: 'Operation and expansion stay explicit',
    items: [
      'No hosted control plane',
      'No live workflow execution',
      'No ongoing managed operation',
      'No additional workflows or repositories',
      'No new billing, identity, or vendor-account ownership'
    ]
  }
] as const;

export const workflowCompilerIntegrationHandoff = {
  owner: 'Builder + workflow owner',
  authority: 'Approve scope and governed cases',
  proof: 'Repository + workflow + tool boundary',
  state: 'ready' as const
};

export const workflowCompilerIntegrationClose = {
  title: 'Bring the repository and one workflow.',
  description:
    'Paid, fixed-scope implementation. Priced after fit. If the workflow still needs definition, start with Map. Ongoing operation is a separate Control engagement. No hosted control plane.'
} as const;
