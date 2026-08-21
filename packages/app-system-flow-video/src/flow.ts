// The full app system as data. When the system changes, edit THIS file and re-render —
// the composition reads everything (headings, branches, statuses, timings, the as-of
// stamp) from here.
//
// Verified 2026-08-21 against:
//   - packages/webflow-app-review-mcp/docs/exception-transparency-loop.md (rules, gates,
//     intake hold, briefing, shield, sweep — all automations marked LIVE there)
//   - packages/webflow-app-review-mcp/src/schema.ts (REVIEW_STATUS_OPTIONS,
//     MARKETPLACE_STATUS_OPTIONS, REVIEW_TYPE_OPTIONS, HOLD_REASON_OPTIONS — verbatim)
//   - the app-governance loop rollout notes (form validations, preflight receipt,
//     fail-open posture) and the preflight gate guardrail rows
//     (recQaZVM9BQAik8at / recOm7ZqCqbXlmEsD / recAIZJnheIHrdBiD)

export const AS_OF = 'System as of August 21, 2026';

export const palette = {
  bg: '#0b0c0e',
  surface: '#14161a',
  surface2: '#1a1d23',
  border: '#262a32',
  borderStrong: '#343945',
  text: '#e8eaed',
  muted: '#9aa0ab',
  faint: '#6b7280',
  blue: '#146ef5',
  green: '#3fb950',
  red: '#f85149',
  amber: '#d29922',
};

export const FPS = 30;

// The pipeline geography. Every scene lights up its station.
export const stations = [
  'Preflight',
  'Submit',
  'Intake',
  'Review',
  'Decide',
  'Marketplace',
] as const;

// Scene boundaries in seconds. DUR is each scene's length.
export const scenes = {
  title: { start: 0, dur: 6 },
  map: { start: 6, dur: 12 },
  preflight: { start: 18, dur: 16 },
  submit: { start: 34, dur: 20 },
  intake: { start: 54, dur: 18 },
  review: { start: 72, dur: 19 },
  exceptions: { start: 91, dur: 15 },
  gatesApprove: { start: 106, dur: 14 },
  gatesReject: { start: 120, dur: 18 },
  market: { start: 138, dur: 17 },
  statuses: { start: 155, dur: 15 },
  close: { start: 170, dur: 8 },
};

export const TOTAL_SECONDS = 178;

// Row semantics → color. proceed = green, hold = amber, warn = amber, block = red, info = blue.
export type BranchKind = 'proceed' | 'hold' | 'warn' | 'block' | 'info';

export interface Branch {
  cond: string; // the IF
  then: string; // the THEN
  kind: BranchKind;
}

export interface BranchSceneCopy {
  step: string;
  station: number; // index into stations
  heading: string;
  sub: string;
  branches: Branch[];
}

export const copy = {
  title: 'The app system',
  subtitle: 'One submission, every branch it can take.',

  mapHeading: 'Six stations, one loop',
  mapSub:
    'An app moves left to right. A rejection sends it back around as a new version record that remembers everything.',
  mapLoopLabel: 'resubmission → a new version record → back to Intake',

  closeTakeaway: 'Every branch, recorded.',
  closeLine: 'The record moves itself; people make the calls.',
};

export const branchScenes: Record<string, BranchSceneCopy> = {
  preflight: {
    step: '01 / Preflight',
    station: 0,
    heading: 'Before submission: the developer runs the gate',
    sub: 'The preflight app runs the review’s own checks on the developer’s machine. The verdict is SUBMIT or DO NOT SUBMIT.',
    branches: [
      {
        cond: 'Every check passes',
        then: 'The preflight app issues a wfpre_… receipt. The receipt admits the app to the queue; the full testing round still runs.',
        kind: 'proceed',
      },
      {
        cond: 'A check clearly fails',
        then: 'Fix and re-run. A preflight failure is never marketplace ineligibility by itself.',
        kind: 'warn',
      },
      {
        cond: 'A result is ambiguous',
        then: 'A human reviewer takes over. Ambiguous results never trigger an automated rejection.',
        kind: 'info',
      },
      {
        cond: 'The developer disputes a finding',
        then: 'Each disputed finding becomes one exception item. That is the appeal path.',
        kind: 'info',
      },
    ],
  },

  submit: {
    step: '02 / Submit',
    station: 1,
    heading: 'The form checks the packet',
    sub: 'The submission form validates everything before a record exists. Nothing incomplete reaches the queue.',
    branches: [
      {
        cond: 'New app',
        then: 'The form requires a published .webflow.io testing site. Designer Extension and Hybrid apps also need source maps.',
        kind: 'block',
      },
      {
        cond: 'App update',
        then: 'Updates need the testing site too, and must answer “does this update ship a bundle?” A yes adds the source-map requirement.',
        kind: 'block',
      },
      {
        cond: 'A preflight receipt is given but invalid',
        then: 'The form refuses the submission (400). If the verifier is down while receipts are optional, it fails open.',
        kind: 'block',
      },
      {
        cond: 'The form itself is stale (an old client)',
        then: 'A structured 409 reloads the form and keeps the developer’s draft.',
        kind: 'info',
      },
      {
        cond: 'The listing isn’t in English',
        then: 'The form warns at submit: the listing must be in English, and it must disclose non-English app UX.',
        kind: 'warn',
      },
      {
        cond: 'Everything validates',
        then: 'The form creates one version record in the system of record and maps every answer to a field.',
        kind: 'proceed',
      },
    ],
  },

  intake: {
    step: '03 / Intake',
    station: 2,
    heading: 'Automations meet the record first',
    sub: 'Before any person opens the submission, the automations have already checked three doors and one flag.',
    branches: [
      {
        cond: 'The creator is a partner account',
        then: 'A daily sync flags the app 🤝 Partnership. The sync sets the flag and never clears it.',
        kind: 'info',
      },
      {
        cond: 'Any exception item on this app is undecided (any version, including this one)',
        then: 'Intake holds it: ⏸️ On Hold, plus a DM to the reviewer. Nobody spends review time before the decisions land.',
        kind: 'hold',
      },
      {
        cond: 'The app carries approved exemptions and nothing is undecided',
        then: 'A DM briefs the assigned reviewer: only recorded items are exempt, and the history lives on the record.',
        kind: 'info',
      },
      {
        cond: 'Neither',
        then: 'The version waits in queue as 🆕 Ready for Review.',
        kind: 'proceed',
      },
      {
        cond: 'A reviewer deliberately needs to proceed anyway',
        then: 'Set 🏃🏾 In Review; the intake hold only matches Ready for Review.',
        kind: 'info',
      },
    ],
  },

  review: {
    step: '04 / Review',
    station: 3,
    heading: 'The review round',
    sub: 'What kind of submission arrived sets the checklist. What the checklist finds sets the path.',
    branches: [
      {
        cond: 'New Asset / Asset Update / Meta Update / Delist',
        then: 'Each review type has its own lane: the full checklist for a new asset; bundle diff, regression, and changed-code review for an update.',
        kind: 'info',
      },
      {
        cond: 'A blocking finding has no exemption',
        then: 'Stop early: hold the version, file one exception item per finding. Don’t test an app that has to change anyway.',
        kind: 'hold',
      },
      {
        cond: 'Partner app + the finding is site-side runtime behavior',
        then: 'It becomes a flag routed to the exception loop instead of a blocker.',
        kind: 'info',
      },
      {
        cond: 'Not a partner app + the finding is site-side',
        then: 'Rejection is the default.',
        kind: 'block',
      },
      {
        cond: 'The finding is control-plane (Designer surface, Webflow API, credentials)',
        then: 'It blocks everyone, partner or not.',
        kind: 'block',
      },
      {
        cond: 'Findings are clear',
        then: 'The full testing round runs, then the decision.',
        kind: 'proceed',
      },
    ],
  },

  exceptions: {
    step: '05 / Exceptions',
    station: 4,
    heading: 'When findings wait for decisions: the exception loop',
    sub: 'The loop has its own video. The short version: every item gets a named decision, and nothing waits on a person to push it along.',
    branches: [
      {
        cond: 'The item is technical (Security, Custom Code / Scopes)',
        then: 'An automation recommends twice a day. It may record item-level denials; it can never approve.',
        kind: 'info',
      },
      {
        cond: 'The item is a business call (Pricing / Billing, partnership stakes)',
        then: 'The partner lead recommends. A person always makes the final allow or deny.',
        kind: 'info',
      },
      {
        cond: 'An exemption is granted',
        then: 'That one item is exempt. The version still needs every other item plus a full testing round.',
        kind: 'warn',
      },
      {
        cond: 'The last item is decided',
        then: 'The version releases itself back to 🆕 Ready for Review and the reviewer gets a DM.',
        kind: 'proceed',
      },
    ],
  },

  gatesApprove: {
    step: '06 / Decide · approving',
    station: 4,
    heading: 'Flipping ✅ Approved: what the gates check',
    sub: 'A decision is a field change, and the gates inspect every change before an email can fire.',
    branches: [
      {
        cond: 'ANY exception is undecided: this version’s, an item’s, or any version of this app’s',
        then: 'The gate blocks it: back to ⏸️ On Hold, a post to the channel, a DM to the decider. The MCP refuses with a 409 too.',
        kind: 'block',
      },
      {
        cond: 'Denied exception items exist',
        then: 'A warning posts: verify the denied items were actually fixed before this approval stands.',
        kind: 'warn',
      },
      {
        cond: 'The publishing checklist is incomplete',
        then: 'The version lands in an 🚨 error status. Nothing goes out until the checklist is done.',
        kind: 'block',
      },
      {
        cond: 'The approval is clean',
        then: 'The pipeline emails the creator. ✅ Approved (No Notification) stays silent by design.',
        kind: 'proceed',
      },
    ],
  },

  gatesReject: {
    step: '07 / Decide · rejecting',
    station: 4,
    heading: 'Flipping ❌ Rejected: what the gates check',
    sub: 'Rejections carry feedback in two registers: the technical finding and the plain-English translation.',
    branches: [
      {
        cond: 'No rejection reason is recorded',
        then: 'The version lands in an 🚨 error status. No email goes out without a reason.',
        kind: 'block',
      },
      {
        cond: 'The app is a partnership app',
        then: 'The shield converts it to ❌ Rejected (No Notification) and routes it to partnerships. The creator gets no email.',
        kind: 'hold',
      },
      {
        cond: '…unless the rejection came from a DENIED exception',
        then: 'Then the email is the partnerships decision. The shield steps aside and the feedback goes out.',
        kind: 'info',
      },
      {
        cond: 'A denial is recorded but the rejection never went out',
        then: 'A daily 9:00 AM sweep reminds the channel until it does. Silence is not a state.',
        kind: 'info',
      },
      {
        cond: 'The rejection is clean',
        then: 'The feedback emails in both registers and closes with the developer toolkit: the preflight and remediation skills.',
        kind: 'proceed',
      },
    ],
  },

  market: {
    step: '08 / Marketplace',
    station: 5,
    heading: 'After the decision',
    sub: 'Approval is a beginning. Rejection is a round-trip.',
    branches: [
      {
        cond: 'Approved',
        then: 'The listing moves through marketplace states: 1️⃣ Upcoming → 2️⃣ Scheduled → 3️⃣ Published.',
        kind: 'proceed',
      },
      {
        cond: 'The app must come down later',
        then: '4️⃣ Delisted. The record and its history stay.',
        kind: 'info',
      },
      {
        cond: 'Changes were requested instead',
        then: '📤 Changes Requested → the developer replies → 🔁 Response to Review puts it back in the round.',
        kind: 'info',
      },
      {
        cond: 'The submission is abandoned',
        then: 'It archives: ☠️ Archived (Auto). The trail stays readable.',
        kind: 'info',
      },
      {
        cond: 'The developer resubmits after a rejection',
        then: 'A new version record goes straight back to Intake, where the app’s exception history is already waiting.',
        kind: 'proceed',
      },
    ],
  },
};

// Every state the version record can hold — verbatim from the schema (23 review statuses),
// grouped by what they mean. Legend colors: queue = blue, oversight = faint,
// round-trip = amber, outcomes = per-status, errors = red, archive = faint.
export interface StatusGroup {
  group: string;
  color: 'blue' | 'green' | 'red' | 'amber' | 'faint';
  items: string[];
}

export const statusGroups: StatusGroup[] = [
  {
    group: 'Queue',
    color: 'blue',
    items: ['🆕Ready for Review', '🏃🏾In Review', 'Training Check'],
  },
  {
    group: 'Oversight',
    color: 'faint',
    items: [
      '👀Admin Feedback Review',
      '👀Managed Feedback Review',
      '👀Admin Approval Review',
      '👀Admin Rejection Review',
    ],
  },
  {
    group: 'Round-trip',
    color: 'amber',
    items: [
      '📤Changes Requested',
      '📤Changes Requested (No Notification)',
      '🔁Response to Review',
    ],
  },
  {
    group: 'Outcomes',
    color: 'green',
    items: [
      '✅Approved',
      '✅Approved (No Notification)',
      '⏸️On Hold',
      '❌Rejected',
      '❌Rejected (No Notification)',
    ],
  },
  {
    group: 'Pipeline errors',
    color: 'red',
    items: [
      '🚨Error: Reason Missing',
      '🚨Error: Release Missing',
      '🚨Error: Feedback Missing',
      '🚨Error: Review Not Started',
      '🚨Error: Field Missing (Email, Type, etc.)',
      '🚨Error: Publishing Checklist Incomplete',
    ],
  },
  {
    group: 'Archive',
    color: 'faint',
    items: ['☠️Archived', '☠️Archived (Auto)'],
  },
];

export const statusesHeading = 'Every state the record can hold';
export const statusesSub =
  '23 review statuses, verbatim from the system of record. Error statuses are the pipeline refusing to send an incomplete decision.';
