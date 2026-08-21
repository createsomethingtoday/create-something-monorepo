import type { PlaybookFieldVariant } from '$lib/components/PlaybookField.svelte';

export type HighIntentSearchIntent =
  | 'marketplace-review'
  | 'workflow-recovery'
  | 'workflow-control';

export interface HighIntentSearchScene {
  id: string;
  label: string;
  summary: string;
  title: string;
  detail: string;
  tone: 'allow' | 'review' | 'block' | 'neutral';
  evidence?: string[];
  receipts?: string[];
}

export interface HighIntentSearchLanding {
  path: `/${string}`;
  intent: HighIntentSearchIntent;
  eyebrow: string;
  headline: string;
  lede: string;
  seoTitle: string;
  seoDescription: string;
  keywords: string;
  noindex: true;
  primaryCtaLabel: string;
  primaryCtaHref: `/map?${string}`;
  primaryConversionEvent: 'workflow_draft_started';
  secondaryCtaLabel: string;
  secondaryCtaHref: `/${string}`;
  playbookVariant: PlaybookFieldVariant;
  proof: Array<{ label: string; value: string }>;
  stage: {
    eyebrow: string;
    title: string;
    description: string;
    scenes: HighIntentSearchScene[];
  };
  handoff: {
    eyebrow: string;
    title: string;
    description: string;
    owner: string;
    authority: string;
    proof: string;
    state: 'draft' | 'review' | 'ready' | 'stop';
    steps: Array<{ label: string; title: string; detail: string }>;
  };
}

export const highIntentSearchLandings: HighIntentSearchLanding[] = [
  {
    path: '/marketplace-review-automation',
    intent: 'marketplace-review',
    eyebrow: 'Marketplace workflow review',
    headline: 'Automate marketplace evidence preparation. Keep final judgment human.',
    lede:
      'Turn scattered submissions, policy checks, and reviewer context into a complete evidence packet. The system prepares the case; your reviewer keeps approval authority.',
    seoTitle: 'Marketplace Review Automation | CREATE SOMETHING .agency',
    seoDescription:
      'Prepare marketplace review evidence with explicit human approval boundaries, inspectable packets, and zero automated external writes.',
    keywords:
      'marketplace review automation, marketplace approval workflow, submission review automation, seller approval workflow, evidence review workflow',
    noindex: true,
    primaryCtaLabel: 'Map your marketplace review workflow',
    primaryCtaHref:
      '/map?source=google-search&intent=marketplace-review&lane=high-intent-search',
    primaryConversionEvent: 'workflow_draft_started',
    secondaryCtaLabel: 'Inspect the field report',
    secondaryCtaHref: '/field-reports/template-review',
    playbookVariant: 'marketplace-review',
    proof: [
      { label: 'Evidence packets', value: '49/50 packets' },
      { label: 'Official judgment', value: 'final approval blocked' },
      { label: 'Production authority', value: '0 external writes' }
    ],
    stage: {
      eyebrow: 'Preparation is not approval',
      title: 'Move the evidence. Protect the decision.',
      description:
        'The useful automation boundary ends before official marketplace judgment. These three states stay visible throughout the review.',
      scenes: [
        {
          id: 'prepare',
          label: 'Prepare',
          summary: '49/50 packets',
          title: 'Assemble the review case before a reviewer opens it.',
          detail:
            'A bounded shadow sample produced usable evidence packets for 49 of 50 selected cases. That proves packet completion, not decision accuracy or reviewer time saved.',
          tone: 'allow',
          evidence: ['49/50 packets', 'dated source records', 'policy findings kept separate']
        },
        {
          id: 'decide',
          label: 'Decide',
          summary: 'Human authority retained',
          title: 'Keep official marketplace judgment with the reviewer.',
          detail:
            'The best current specialist still missed one of two historical exceptional examples. Automated final approval remains blocked while evidence preparation stays useful.',
          tone: 'block',
          receipts: ['final approval blocked', 'decision owner: human reviewer']
        },
        {
          id: 'write',
          label: 'Write',
          summary: 'No external mutation',
          title: 'Require a separate, explicit write boundary.',
          detail:
            'The public proof lane is read-only. Submission status, reviewer messages, approvals, and external records do not change from this workflow.',
          tone: 'review',
          receipts: ['0 external writes', 'approval required before mutation']
        }
      ]
    },
    handoff: {
      eyebrow: 'Private workflow draft',
      title: 'Map the review queue you already operate.',
      description:
        'Name one submission path, its evidence sources, the reviewer who decides, and the first safe boundary. Nothing is submitted to an external marketplace.',
      owner: 'Your marketplace operator',
      authority: 'Draft the workflow; no external writes',
      proof: 'Private map with owner, gate, and required evidence',
      state: 'draft',
      steps: [
        {
          label: 'Scope',
          title: 'Name one review queue.',
          detail: 'Choose the submission type and current reviewer handoff.'
        },
        {
          label: 'Boundary',
          title: 'Mark preparation versus judgment.',
          detail: 'Separate objective evidence checks from the official approval decision.'
        },
        {
          label: 'Next move',
          title: 'Receive a bounded first map.',
          detail: 'Review the owner, permissions, stops, and proof before any build decision.'
        }
      ]
    }
  },
  {
    path: '/ai-workflow-recovery',
    intent: 'workflow-recovery',
    eyebrow: 'AI workflow recovery',
    headline: 'Bring us the workflow that no longer holds up.',
    lede:
      'Recover a brittle agent or automation by tracing the failure, decision path, permissions, missing evidence, and safe stopping point before deciding what to repair.',
    seoTitle: 'AI Workflow Recovery | CREATE SOMETHING .agency',
    seoDescription:
      'Diagnose a broken AI agent or workflow with a failure map, permissions review, missing-evidence check, and a repair, replace, or stop recommendation.',
    keywords:
      'AI agent recovery, fix broken AI agent, AI workflow troubleshooting, AI workflow failure, AI agent audit',
    noindex: true,
    primaryCtaLabel: 'Start a private recovery draft',
    primaryCtaHref:
      '/map?source=google-search&intent=workflow-recovery&lane=high-intent-search',
    primaryConversionEvent: 'workflow_draft_started',
    secondaryCtaLabel: 'See the control model',
    secondaryCtaHref: '/control',
    playbookVariant: 'workflow-recovery',
    proof: [
      { label: 'Diagnosis', value: 'Failure and decision map' },
      { label: 'Evidence', value: 'Missing evidence diagnosis' },
      { label: 'Recommendation', value: 'Repair, replace, or stop' }
    ],
    stage: {
      eyebrow: 'Diagnose before repair',
      title: 'Find where the workflow stopped being trustworthy.',
      description:
        'Recovery starts with the Database, then the Automation path, then the Judgment policy. Each layer produces a distinct finding.',
      scenes: [
        {
          id: 'failure',
          label: 'Failure',
          summary: 'Trace the broken path',
          title: 'Build the Failure and decision map.',
          detail:
            'Reconstruct the starting state, trigger, tool calls, decision points, output, and first moment the workflow stopped matching operator expectations.',
          tone: 'review',
          evidence: ['Failure and decision map', 'starting state', 'first broken handoff']
        },
        {
          id: 'authority',
          label: 'Authority',
          summary: 'Inspect permissions',
          title: 'Review the permissions and tool path.',
          detail:
            'Check which identities, connectors, tools, and actions the workflow can reach. Re-establish run, wait, and stop conditions before another live attempt.',
          tone: 'block',
          receipts: ['permissions review', 'run / wait / stop', 'rollback owner']
        },
        {
          id: 'evidence',
          label: 'Evidence',
          summary: 'Name what is missing',
          title: 'Complete the Missing evidence diagnosis.',
          detail:
            'Separate an automation failure from an observability failure. The recovery plan names the receipt, readback, or comparison required to trust the next run.',
          tone: 'neutral',
          evidence: ['Missing evidence diagnosis', 'required readback', 'recovery proof']
        },
        {
          id: 'decision',
          label: 'Decision',
          summary: 'Choose the safe move',
          title: 'Make a Repair, replace, or stop recommendation.',
          detail:
            'The outcome can be a repair plan, a smaller replacement path, or a stop decision. Recovery is not assumed to mean preserving the current stack.',
          tone: 'allow',
          receipts: ['Repair, replace, or stop', 'owner', 'verification gate']
        }
      ]
    },
    handoff: {
      eyebrow: 'Private recovery draft',
      title: 'Start with the failed run, not a sales demo.',
      description:
        'Describe the workflow, what changed, and the evidence you still have. The first output is a private diagnostic map—not a production mutation.',
      owner: 'Your workflow operator',
      authority: 'Read and diagnose; no production mutation',
      proof: 'Failure map and recovery recommendation',
      state: 'review',
      steps: [
        {
          label: 'Input',
          title: 'Name the failed workflow.',
          detail: 'Bring the last known-good state, current failure, and affected operator.'
        },
        {
          label: 'Trace',
          title: 'Rebuild the decision and tool path.',
          detail: 'Locate the data, automation, judgment, permission, and evidence break.'
        },
        {
          label: 'Recommend',
          title: 'Choose repair, replacement, or stop.',
          detail: 'Review the recovery plan and verification gate before changing production.'
        }
      ]
    }
  },
  {
    path: '/ai-workflow-control',
    intent: 'workflow-control',
    eyebrow: 'Human approval and control',
    headline: 'Put operators and AI agents on the same Playbook.',
    lede:
      'Define which work can advance, which decisions wait for a person, what must stop, and which receipt proves the result—inside a Playbook your team owns.',
    seoTitle: 'Human Approval for AI Workflows | CREATE SOMETHING .agency',
    seoDescription:
      'Design human approval, decision boundaries, stop conditions, and proof for AI workflows in a client-owned operating Playbook.',
    keywords:
      'AI workflow human approval, AI agent approval workflow, AI decision boundary, AI workflow stop conditions, human in the loop workflow control',
    noindex: true,
    primaryCtaLabel: 'Map the approval boundary',
    primaryCtaHref:
      '/map?source=google-search&intent=workflow-control&lane=high-intent-search',
    primaryConversionEvent: 'workflow_draft_started',
    secondaryCtaLabel: 'Inspect workflow control',
    secondaryCtaHref: '/workflows/human-in-the-loop-ai',
    playbookVariant: 'workflow-control',
    proof: [
      { label: 'Authority', value: 'Decision boundary' },
      { label: 'Control states', value: 'Run, wait, and stop conditions' },
      { label: 'Handoff', value: 'Client-owned Playbook' }
    ],
    stage: {
      eyebrow: 'Offense and defense',
      title: 'Let known work move. Protect every judgment call.',
      description:
        'Human-in-the-loop only works when the loop names an owner, a decision, a deadline, a safe stop, and the evidence needed to resume.',
      scenes: [
        {
          id: 'run',
          label: 'Run',
          summary: 'Approved work advances',
          title: 'Give routine work an allowed path.',
          detail:
            'Known signals can advance through approved tools and actions without asking a person to reconstruct context at every step.',
          tone: 'allow',
          evidence: ['allowed action', 'named route', 'Decision boundary']
        },
        {
          id: 'wait',
          label: 'Wait',
          summary: 'Judgment reaches an owner',
          title: 'Turn approval into an operating state.',
          detail:
            'A wait state carries the source, proposed action, decision owner, deadline, and resume path instead of sending an unstructured notification.',
          tone: 'review',
          receipts: ['owner', 'decision packet', 'resume path']
        },
        {
          id: 'stop',
          label: 'Stop',
          summary: 'Unsafe work stays blocked',
          title: 'Define the conditions that end the run.',
          detail:
            'Missing authority, ambiguous evidence, tool drift, and failed verification become explicit stop states with recovery ownership.',
          tone: 'block',
          evidence: ['Run, wait, and stop conditions', 'stop reason', 'recovery owner']
        },
        {
          id: 'own',
          label: 'Own',
          summary: 'The Playbook stays',
          title: 'Keep the operating knowledge with your team.',
          detail:
            'The map, decision rules, permissions, runbook, receipts, and recovery path become a Client-owned Playbook that survives model and vendor changes.',
          tone: 'neutral',
          receipts: ['Client-owned Playbook', 'rules', 'history', 'recovery path']
        }
      ]
    },
    handoff: {
      eyebrow: 'Approval-boundary draft',
      title: 'Map one decision your agent should not make alone.',
      description:
        'Start with the moment automation becomes judgment. The private map names what runs, who decides, what stops, and which proof permits the next step.',
      owner: 'Your decision owner',
      authority: 'Define the boundary; keep approval human',
      proof: 'Client-owned Playbook draft',
      state: 'draft',
      steps: [
        {
          label: 'Signal',
          title: 'Name the decision-triggering change.',
          detail: 'Identify the event that should run, wait, or stop the workflow.'
        },
        {
          label: 'Decision',
          title: 'Assign authority and evidence.',
          detail: 'Name who decides and what they need to see.'
        },
        {
          label: 'Proof',
          title: 'Keep the result attached.',
          detail: 'Record the decision, action, outcome, and recovery path.'
        }
      ]
    }
  }
];

export function getHighIntentSearchLanding(
  intent: HighIntentSearchIntent
): HighIntentSearchLanding {
  const landing = highIntentSearchLandings.find((entry) => entry.intent === intent);
  if (!landing) throw new Error(`Unknown high-intent search landing: ${intent}`);
  return landing;
}
