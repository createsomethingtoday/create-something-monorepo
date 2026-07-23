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
    id: 'launch-change-24h',
    title: 'Move Friday’s launch',
    startMinuteOfDay: 480,
    dayStart: '08:00',
    dayEnd: '07:58 +1',
    spanMinutes: 1438
  },
  scenes: [
    {
      id: 'signal',
      start: 0,
      duration: 180,
      label: '01 / SIGNAL',
      title: 'One request starts the run.',
      caption: 'At 08:00, a launch change becomes governed work—not another email thread.',
      eventIds: ['signal-request'],
      focusEventId: 'signal-request'
    },
    {
      id: 'autonomous',
      start: 180,
      duration: 480,
      label: '02 / RUN',
      title: 'Agents gather. Functions verify.',
      caption:
        'Agents use connected capabilities. Deterministic functions verify what must be true.',
      eventIds: ['agent-context', 'function-dependencies', 'agent-plan', 'function-safe-prep'],
      focusEventId: 'agent-plan'
    },
    {
      id: 'wait',
      start: 660,
      duration: 420,
      label: '03 / WAIT',
      title: 'Only the blocked decision waits.',
      caption: 'The live change pauses for a human. Safe preparation keeps moving.',
      eventIds: ['approval-gate', 'safe-work'],
      focusEventId: 'approval-gate'
    },
    {
      id: 'continue',
      start: 1080,
      duration: 240,
      label: '04 / CONTINUE',
      title: 'Approval resumes the run.',
      caption:
        'The decision is recorded once. Programmatic execution continues from its checkpoint.',
      eventIds: ['human-approval', 'function-apply'],
      focusEventId: 'human-approval'
    },
    {
      id: 'overnight',
      start: 1320,
      duration: 240,
      label: '05 / OVERNIGHT',
      title: 'The system keeps working.',
      caption: 'Agents synchronize and monitor overnight. Every transition leaves a receipt.',
      eventIds: ['agent-sync', 'overnight-monitor', 'function-reconcile'],
      focusEventId: 'overnight-monitor'
    },
    {
      id: 'proof',
      start: 1560,
      duration: 240,
      label: '06 / PROOF',
      title: 'A full day becomes proof.',
      caption: 'At 07:58, the owner can see what ran, waited, continued, and completed.',
      eventIds: ['agent-proof', 'run-complete'],
      focusEventId: 'run-complete'
    }
  ],
  events: [
    {
      id: 'signal-request',
      minute: 0,
      clock: '08:00',
      actor: 'system',
      execution: 'observe',
      state: 'signal',
      title: 'Launch change received',
      summary: 'Move Friday’s customer launch without losing ownership, approval, or trace.',
      receipt: {
        id: 'R-001',
        state: 'signal',
        label: 'Signal captured',
        evidence: 'Request, requester, target date, and source attached',
        owner: 'Launch operations'
      }
    },
    {
      id: 'agent-context',
      minute: 4,
      clock: '08:04',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Context gathered',
      summary: 'The agent reads customer, project, and launch state through governed connections.',
      capability: 'CRM + Project MCPs',
      rationale: 'Gather current state before selecting any action.',
      receipt: {
        id: 'R-002',
        state: 'running',
        label: 'Context read',
        evidence: 'Four source records and current owners linked',
        owner: 'Launch agent'
      }
    },
    {
      id: 'function-dependencies',
      minute: 35,
      clock: '08:35',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Dependencies verified',
      summary:
        'A deterministic function checks schedule, inventory, permissions, and downstream dates.',
      capability: 'validate_launch_dependencies()',
      receipt: {
        id: 'R-003',
        state: 'running',
        label: '18 checks passed',
        evidence: 'Versioned validation result and input hashes stored',
        owner: 'Launch validator'
      }
    },
    {
      id: 'agent-plan',
      minute: 92,
      clock: '09:32',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Safe sequence proposed',
      summary: 'The agent separates reversible preparation from the approval-gated live change.',
      capability: 'Calendar + Inventory MCPs',
      rationale: 'Prepare everything safe before asking a human to unblock the mutation.',
      receipt: {
        id: 'R-004',
        state: 'running',
        label: 'Plan recorded',
        evidence: 'Ordered actions, policy boundary, owner, and rollback path attached',
        owner: 'Launch agent'
      }
    },
    {
      id: 'function-safe-prep',
      minute: 180,
      clock: '11:00',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Change set prepared',
      summary: 'Draft updates are generated and validated without touching the live launch date.',
      capability: 'prepare_change_set()',
      receipt: {
        id: 'R-005',
        state: 'running',
        label: 'Draft ready',
        evidence: 'Dry-run diff and rollback payload stored',
        owner: 'Launch function'
      }
    },
    {
      id: 'approval-gate',
      minute: 310,
      clock: '13:10',
      actor: 'agent',
      execution: 'mcp',
      state: 'waiting',
      title: 'Live change needs approval',
      summary: 'Only the external date mutation pauses. The rest of the run stays active.',
      capability: 'Policy OS gate',
      rationale: 'External commitments cross the declared human authority boundary.',
      receipt: {
        id: 'R-006',
        state: 'waiting',
        label: 'Waiting on owner',
        evidence: 'Decision packet delivered with impact, diff, and rollback',
        owner: 'Operations lead'
      },
      gate: {
        id: 'GATE-LAUNCH-DATE',
        blocking: true,
        owner: 'Operations lead',
        prompt: 'Approve moving the external launch date?',
        safeWorkWhileWaiting: ['Draft customer updates', 'Prepare system changes'],
        onApprove: {
          state: 'continued',
          receiptLabel: 'Approval recorded'
        },
        onReject: {
          state: 'stopped',
          receiptLabel: 'Change stopped by owner',
          checkpoint: 'Validated draft remains resumable'
        },
        onTimeout: {
          state: 'stopped',
          afterMinutes: 170,
          escalation: 'Notify workflow owner and hold the external date',
          receiptLabel: 'Change stopped at deadline',
          checkpoint: 'Validated draft remains resumable'
        }
      }
    },
    {
      id: 'safe-work',
      minute: 342,
      clock: '13:42',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Safe work continues',
      summary: 'The agent drafts customer updates and prepares reversible system changes.',
      capability: 'Docs + Messaging MCPs',
      rationale: 'Continue reversible work while the gated mutation remains locked.',
      receipt: {
        id: 'R-007',
        state: 'running',
        label: 'Preparation complete',
        evidence: 'Draft messages and dry-run changes linked',
        owner: 'Launch agent'
      }
    },
    {
      id: 'human-approval',
      minute: 392,
      clock: '14:32',
      actor: 'human',
      execution: 'judgment',
      state: 'continued',
      title: 'Operations lead approves',
      summary: 'One blocking decision is recorded with owner, policy, impact, and time.',
      receipt: {
        id: 'R-008',
        state: 'continued',
        label: 'Run continued',
        evidence: 'Approval identity and decision context stored',
        owner: 'Operations lead'
      }
    },
    {
      id: 'function-apply',
      minute: 395,
      clock: '14:35',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Approved change applied',
      summary: 'The validated mutation executes from the saved checkpoint with rollback attached.',
      capability: 'apply_launch_change()',
      receipt: {
        id: 'R-009',
        state: 'running',
        label: 'Mutation applied',
        evidence: 'Before, after, policy version, and rollback stored',
        owner: 'Launch function'
      }
    },
    {
      id: 'agent-sync',
      minute: 540,
      clock: '17:00',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Connected systems synchronized',
      summary: 'The agent updates project, CRM, calendar, and customer-facing launch state.',
      capability: 'CRM + Project + Calendar MCPs',
      rationale: 'Propagate the approved source change through its governed dependencies.',
      receipt: {
        id: 'R-010',
        state: 'running',
        label: 'Four systems aligned',
        evidence: 'Per-system write receipts and readback attached',
        owner: 'Launch agent'
      }
    },
    {
      id: 'overnight-monitor',
      minute: 850,
      clock: '22:10',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Overnight guardrail check',
      summary: 'The agent watches for drift and stays inside the approved mutation boundary.',
      capability: 'Monitoring MCP',
      rationale: 'Observe downstream state and escalate only if the approved boundary is exceeded.',
      receipt: {
        id: 'R-011',
        state: 'running',
        label: 'Guardrail healthy',
        evidence: 'Observed state and policy evaluation stored',
        owner: 'Launch monitor'
      }
    },
    {
      id: 'function-reconcile',
      minute: 1120,
      clock: '02:40',
      actor: 'function',
      execution: 'programmatic',
      state: 'running',
      title: 'Launch state reconciled',
      summary: 'A deterministic check confirms no source or downstream state has drifted.',
      capability: 'reconcile_launch_state()',
      receipt: {
        id: 'R-012',
        state: 'running',
        label: 'No drift found',
        evidence: 'Source snapshots and comparison hash stored',
        owner: 'Reconciliation function'
      }
    },
    {
      id: 'agent-proof',
      minute: 1425,
      clock: '07:45 +1',
      actor: 'agent',
      execution: 'mcp',
      state: 'running',
      title: 'Proof packet assembled',
      summary: 'The agent connects every signal, decision, action, outcome, and recovery path.',
      capability: 'Receipt store',
      rationale:
        'Summarize the run from durable receipts rather than reconstructing it from messages.',
      receipt: {
        id: 'R-013',
        state: 'running',
        label: 'Proof assembled',
        evidence: 'Thirteen receipts linked into one run record',
        owner: 'Launch agent'
      }
    },
    {
      id: 'run-complete',
      minute: 1438,
      clock: '07:58 +1',
      actor: 'system',
      execution: 'observe',
      state: 'completed',
      title: 'Launch workflow complete',
      summary: 'The owner sees what ran, what waited, who decided, and what changed.',
      receipt: {
        id: 'R-014',
        state: 'completed',
        label: 'Run complete',
        evidence: 'Final state readback and complete receipt chain stored',
        owner: 'Launch operations'
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
