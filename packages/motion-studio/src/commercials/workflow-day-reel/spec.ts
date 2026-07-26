import type { WorkflowFilmSpec } from '../workflow-film/schema';

export const WORKFLOW_DAY_REEL_SPEC = {
  format: 'workflow-film/v1',
  compositionId: 'CreateSomethingWorkflowDayReel',
  fps: 30,
  width: 1080,
  height: 1920,
  durationInFrames: 1800,
  safeArea: {
    top: 150,
    right: 80,
    bottom: 280,
    left: 80
  },
  workflow: {
    id: 'nurse-onboarding-24h',
    title: 'Move one nurse into recruiter onboarding',
    startMinuteOfDay: 480,
    dayStart: '08:00',
    dayEnd: '07:58 +1',
    spanMinutes: 1438
  },
  provenance: {
    scenario: 'Nurse intake through recruiter-approved onboarding handoff',
    publicTreatment: 'Anonymized client-safe composite grounded in the NPG delivery contract',
    sourceArtifacts: [
      'packages/agency/src/lib/delivery/abundance-context.ts',
      'docs/deliveries/abundance/2026-05-14-project-update.md',
      'evals/langfuse/dify/abundance-hub.eval.ts',
      'config/delivery/projects/abundance.json'
    ]
  },
  scenes: [
    {
      id: 'signal',
      start: 0,
      duration: 180,
      label: '01 / INTAKE',
      title: 'One intake starts the run.',
      caption: 'At 08:00, a completed nurse intake becomes governed matching and onboarding work.',
      eventIds: ['intake-received'],
      focusEventId: 'intake-received'
    },
    {
      id: 'autonomous',
      start: 180,
      duration: 480,
      label: '02 / MATCH',
      title: 'Agents search. Functions verify.',
      caption:
        'Agents read approved systems. Deterministic checks verify fit, readiness, and gaps.',
      eventIds: ['profile-context', 'role-discovery', 'requirements-check', 'shortlist-drafted'],
      focusEventId: 'shortlist-drafted'
    },
    {
      id: 'wait',
      start: 660,
      duration: 420,
      label: '03 / APPROVAL',
      title: 'Only recruiter judgment waits.',
      caption: 'The protected funnel write pauses. Safe onboarding preparation keeps moving.',
      eventIds: ['recruiter-gate', 'safe-onboarding-prep'],
      focusEventId: 'recruiter-gate'
    },
    {
      id: 'continue',
      start: 1080,
      duration: 240,
      label: '04 / ONBOARD',
      title: 'Approval resumes the run.',
      caption:
        'One recruiter decision is recorded. Funnel and onboarding state advance from the checkpoint.',
      eventIds: ['recruiter-approval', 'stage-role', 'onboarding-record'],
      focusEventId: 'recruiter-approval'
    },
    {
      id: 'overnight',
      start: 1320,
      duration: 240,
      label: '05 / SYSTEMS',
      title: 'Every system keeps its boundary.',
      caption:
        'Database, funnel, email, and onboarding state reconcile without bypassing authorization.',
      eventIds: ['email-handoff', 'systems-reconcile'],
      focusEventId: 'systems-reconcile'
    },
    {
      id: 'proof',
      start: 1560,
      duration: 240,
      label: '06 / PROOF',
      title: 'A full day becomes proof.',
      caption: 'At 07:58, the recruiter sees what matched, waited, advanced, and stayed protected.',
      eventIds: ['proof-assembled', 'run-complete'],
      focusEventId: 'run-complete'
    }
  ],
  events: [
    {
      id: 'intake-received',
      minute: 0,
      clock: '08:00',
      actor: 'system',
      execution: 'observe',
      state: 'signal',
      title: 'Nurse intake received',
      summary:
        'A completed intake enters the run with its source, consent, and privacy boundary attached.',
      receipt: {
        id: 'R-001',
        state: 'signal',
        label: 'Intake captured',
        evidence: 'Sanitized profile context, source, consent, and intake time attached',
        owner: 'Staffing operations'
      }
    },
    {
      id: 'profile-context',
      minute: 4,
      clock: '08:04',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Profile context gathered',
      summary:
        'The agent reads sanctioned profile history from the staffing database through the Staff MCP.',
      capability: 'Staffing DB + Staff MCP',
      rationale: 'Read approved profile context before proposing any match.',
      receipt: {
        id: 'R-002',
        state: 'running',
        label: 'Profile context read',
        evidence: 'Sanitized profile snapshot and intake history linked',
        owner: 'Matching agent'
      }
    },
    {
      id: 'role-discovery',
      minute: 35,
      clock: '08:35',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Current roles discovered',
      summary: 'The agent searches current public nursing roles through the read-only Jobs MCP.',
      capability: 'Public Jobs MCP',
      rationale: 'Ground recommendations in returned job facts without writing to the funnel.',
      receipt: {
        id: 'R-003',
        state: 'running',
        label: 'Job facts recorded',
        evidence: 'Public role IDs, status, requirements, and source query linked',
        owner: 'Matching agent'
      }
    },
    {
      id: 'requirements-check',
      minute: 92,
      clock: '09:32',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Requirements verified',
      summary:
        'A deterministic function checks specialty, license, availability, and required profile fields.',
      capability: 'validate_profile_requirements()',
      receipt: {
        id: 'R-004',
        state: 'running',
        label: 'Requirements checked',
        evidence: 'Versioned checks, gaps, and input hashes stored',
        owner: 'Matching validator'
      }
    },
    {
      id: 'shortlist-drafted',
      minute: 180,
      clock: '11:00',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Explainable shortlist drafted',
      summary:
        'The agent ranks roles with visible fit reasons, missing-information flags, and no outreach.',
      capability: 'Jobs MCP + Matching DB',
      rationale: 'Recommend from durable facts while keeping staffing judgment with the recruiter.',
      receipt: {
        id: 'R-005',
        state: 'running',
        label: 'Shortlist recorded',
        evidence: 'Ranked roles, fit reasons, gaps, and source job IDs attached',
        owner: 'Matching agent'
      }
    },
    {
      id: 'recruiter-gate',
      minute: 310,
      clock: '13:10',
      actor: 'agent',
      execution: 'mcp',
      state: 'waiting',
      title: 'Onboarding handoff needs approval',
      summary:
        'Only funnel staging and candidate outreach pause. Read-only and draft work remains active.',
      capability: 'Recruiter review gate',
      rationale: 'A protected staffing step crosses the declared human authority boundary.',
      receipt: {
        id: 'R-006',
        state: 'waiting',
        label: 'Waiting on recruiter',
        evidence: 'Shortlist, fit reasons, gaps, exact role, and proposed handoff delivered',
        owner: 'Recruiter / account owner'
      },
      gate: {
        id: 'GATE-ONBOARDING-HANDOFF',
        blocking: true,
        owner: 'Recruiter / account owner',
        prompt: 'Approve this role for recruiter follow-up and onboarding preparation?',
        safeWorkWhileWaiting: [
          'Verify the role remains public',
          'Prepare onboarding and email drafts'
        ],
        onApprove: {
          state: 'continued',
          receiptLabel: 'Recruiter approval recorded'
        },
        onReject: {
          state: 'stopped',
          receiptLabel: 'Onboarding handoff stopped',
          checkpoint: 'Verified shortlist remains resumable'
        },
        onTimeout: {
          state: 'stopped',
          afterMinutes: 170,
          escalation: 'Notify the workflow owner and keep discovery read-only',
          receiptLabel: 'Onboarding handoff stopped at deadline',
          checkpoint: 'Verified shortlist remains resumable'
        }
      }
    },
    {
      id: 'safe-onboarding-prep',
      minute: 342,
      clock: '13:42',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Safe onboarding prep continues',
      summary:
        'The system builds an onboarding checklist, email draft, and connector-status report without sending.',
      capability: 'Email + Forms connection status',
      receipt: {
        id: 'R-007',
        state: 'running',
        label: 'Draft handoff ready',
        evidence: 'Checklist, unsent email, form needs, and connection states linked',
        owner: 'Onboarding function'
      }
    },
    {
      id: 'recruiter-approval',
      minute: 392,
      clock: '14:32',
      actor: 'human',
      execution: 'judgment',
      state: 'continued',
      title: 'Recruiter approves the handoff',
      summary:
        'One protected decision is recorded with approver, exact role, scope, policy, and time.',
      receipt: {
        id: 'R-008',
        state: 'continued',
        label: 'Run continued',
        evidence: 'Recruiter identity, selected role, approved scope, and timestamp stored',
        owner: 'Recruiter / account owner'
      }
    },
    {
      id: 'stage-role',
      minute: 395,
      clock: '14:35',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Approved role staged',
      summary: 'The confirmed role moves into the recruiter funnel from the saved checkpoint.',
      capability: 'send_job_to_funnel()',
      receipt: {
        id: 'R-009',
        state: 'running',
        label: 'Role staged',
        evidence: 'Confirmation, before/after state, and idempotency key stored',
        owner: 'Funnel function'
      }
    },
    {
      id: 'onboarding-record',
      minute: 540,
      clock: '17:00',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Onboarding record opened',
      summary:
        'The agent links the approved role, fit reasons, checklist, and recruiter-owned next step.',
      capability: 'Staffing DB + Onboarding workspace',
      rationale: 'Carry the approved decision forward without widening its authority.',
      receipt: {
        id: 'R-010',
        state: 'running',
        label: 'Onboarding state opened',
        evidence: 'Database record, selected role, checklist, and owner linked',
        owner: 'Onboarding agent'
      }
    },
    {
      id: 'email-handoff',
      minute: 850,
      clock: '22:10',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Email handoff held safely',
      summary:
        'The draft remains unsent until the account owner authorizes the outbound connection.',
      capability: 'Email connection gate',
      rationale:
        'Prepare candidate communication without claiming or bypassing channel authorization.',
      receipt: {
        id: 'R-011',
        state: 'running',
        label: 'Unsent draft protected',
        evidence: 'Draft, intended owner, connection state, and blocked-send reason stored',
        owner: 'Onboarding agent'
      }
    },
    {
      id: 'systems-reconcile',
      minute: 1120,
      clock: '02:40',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'All system state reconciled',
      summary:
        'A deterministic check compares database, funnel, onboarding, and email authorization state.',
      capability: 'reconcile_onboarding_state()',
      receipt: {
        id: 'R-012',
        state: 'running',
        label: 'Boundaries intact',
        evidence: 'Source snapshots, comparison hash, and unsent-email state stored',
        owner: 'Reconciliation function'
      }
    },
    {
      id: 'proof-assembled',
      minute: 1425,
      clock: '07:45 +1',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Recruiter proof assembled',
      summary:
        'The agent links intake, job facts, fit reasons, decision, onboarding state, and channel boundary.',
      capability: 'Receipt store',
      rationale: 'Summarize from durable receipts rather than reconstructing work from messages.',
      receipt: {
        id: 'R-013',
        state: 'running',
        label: 'Proof assembled',
        evidence: 'Thirteen receipts linked into one recruiter review record',
        owner: 'Matching agent'
      }
    },
    {
      id: 'run-complete',
      minute: 1438,
      clock: '07:58 +1',
      actor: 'system',
      execution: 'observe',
      state: 'completed',
      title: 'Onboarding workflow complete',
      summary:
        'The recruiter sees what ran, what waited, what advanced, and what remains protected.',
      receipt: {
        id: 'R-014',
        state: 'completed',
        label: 'Run complete',
        evidence: 'Final readback and complete receipt chain stored',
        owner: 'Staffing operations'
      }
    }
  ],
  closingLabel: 'One governed day',
  closingLines: ['Agents run.', 'Humans decide.', 'Every step', 'leaves proof.'],
  closingPromise: 'Agents run. Humans decide. Every step leaves proof.',
  callToAction: 'Control one workflow.',
  destination: 'createsomething.agency/control',
  music: {
    title: 'Proof Over Time',
    credit: 'Original score for CREATE SOMETHING',
    character: 'restrained 60-second product-film score',
    asset: 'audio/workflow-day-reel/proof-over-time.mp3',
    bpm: 120,
    beatFrames: 15,
    hitFrames: {
      signal: 0,
      autonomous: 180,
      wait: 660,
      safeWork: 870,
      continue: 1080,
      overnight: 1320,
      proof: 1560,
      close: 1680
    }
  }
} as const satisfies WorkflowFilmSpec;

export const WORKFLOW_DAY_REEL_CONFIG = {
  durationInFrames: WORKFLOW_DAY_REEL_SPEC.durationInFrames,
  fps: WORKFLOW_DAY_REEL_SPEC.fps,
  width: WORKFLOW_DAY_REEL_SPEC.width,
  height: WORKFLOW_DAY_REEL_SPEC.height
} as const;
