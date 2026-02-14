import type { LoadedPolicy } from './types.js';

const COMMON_DEV_INSTRUCTIONS = `You are operating under an explicit Judgment Layer (policy pack). Follow these rules:

1) If you need to perform an action outside the current policy (network access, writes outside allowed roots, risky commands), STOP and ask for approval.
2) Prefer small, reversible changes. If uncertain, propose options rather than guessing.
3) When blocked by a policy decision, produce an ANDON object in JSON:
   { "type": "stop|alert|deviation|concession", "question": "...", "context": "...", "proposedAction": "...", "confidence": 0.0-1.0 }
`;

export const BUILTIN_POLICIES: LoadedPolicy[] = [
  {
    id: 'safe',
    label: 'Safe',
    description: 'Read-only sandbox. Auto-approve read/list/search commands; decline writes by default.',
    sandboxPolicy: { type: 'readOnly' },
    approvalPolicy: 'untrusted',
    nonInteractiveDecision: 'decline',
    autoApprove: {
      commandActionTypes: ['read', 'listFiles', 'search'],
      commandRegex: ['^git\\s+(status|diff|log)\\b']
    },
    developerInstructions: COMMON_DEV_INSTRUCTIONS,
    source: 'builtin'
  },
  {
    id: 'standard',
    label: 'Standard',
    description:
      'Workspace-write (no network by default). Auto-approve read/list/search; prompt for writes and unknown commands.',
    sandboxPolicy: { type: 'workspaceWrite', networkAccess: false, writableRoots: ['$CWD'] },
    approvalPolicy: 'untrusted',
    nonInteractiveDecision: 'decline',
    autoApprove: {
      commandActionTypes: ['read', 'listFiles', 'search'],
      commandRegex: [
        '^pnpm\\b',
        '^git\\s+(status|diff|log|rev-parse|show)\\b',
        '^node\\s+-p\\b',
        '^cat\\b',
        '^ls\\b',
        '^rg\\b'
      ]
    },
    developerInstructions: COMMON_DEV_INSTRUCTIONS,
    source: 'builtin'
  },
  {
    id: 'power',
    label: 'Power',
    description: 'Full-access sandbox. Still records approvals, but defaults to accept-for-session when in doubt.',
    sandboxPolicy: { type: 'dangerFullAccess' },
    approvalPolicy: 'untrusted',
    nonInteractiveDecision: 'cancel',
    autoApprove: {
      commandActionTypes: ['read', 'listFiles', 'search', 'unknown'],
      filePathPrefixes: ['']
    },
    developerInstructions: COMMON_DEV_INSTRUCTIONS,
    source: 'builtin'
  }
];

