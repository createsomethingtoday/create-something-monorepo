import type { PerformanceNarrativeScene } from '@create-something/canon';

export const workflowCompilerIntegrationHero = {
  title: 'Add a tested workflow to your existing project.',
  lede: 'For teams with a developer: we use the open-source Workflow Compiler to add one workflow to your repository. The project includes the required tools, automated checks, and a handover your team keeps.',
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
    title: 'Define the workflow in your project.',
    detail:
      'We install Workflow Compiler in one repository and define one workflow. We connect only the MCP or agent tools it needs. Your team keeps the definition.',
    tone: 'neutral',
    receipts: ['versioned workflow definition', 'tool boundary', 'ownership record']
  },
  {
    id: 'compile',
    label: 'Compile',
    summary: 'Policy becomes an artifact',
    title: 'Turn the plan into rules and tests.',
    detail:
      'The compiler generates rules, approval definitions, test cases, and result records. These define when work can run, must wait, or must stop.',
    tone: 'review',
    receipts: ['policies', 'approval contracts', 'golden cases', 'receipts']
  },
  {
    id: 'gate',
    label: 'Handoff',
    summary: 'One CI gate and a portable system',
    title: 'Check the workflow before giving it more access.',
    detail:
      'We add automated checks to your release process and verify the generated files. Your team keeps the code, workflow, rules, results, and approval rights.',
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
    'This is a paid project with an agreed scope, quoted after review. Start with Map if the task is unclear. Hosting is not included; ongoing support is a separate Control service.'
} as const;
