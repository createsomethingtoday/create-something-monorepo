// Link overlay for the web companion (wrop). The video stays link-free; the web page
// pairs each scene with the live surfaces it describes. Same contract as flow.ts:
// verify these against the live system before bumping AS_OF.
//
// URL sources (verified 2026-08-21):
//   - Automation ids: packages/webflow-app-review-mcp/docs/exception-transparency-loop.md
//     (automations table) + the Review Status Trigger id from the race-free-gate recipe.
//   - View-scoped link format: same doc, "Open Asset Version links" section.
//   - Slack thread permalinks: ts values recorded in the runbook/case log
//     (p-format = ts with the dot removed).

const BASE = 'https://airtable.com/appMoIgXMTTTNIc3p';
const SLACK = 'https://webflow.enterprise.slack.com/archives';

export interface LinkChip {
  label: string;
  href?: string; // absent = a repo path or name, shown as text
  note?: string;
}

export interface RosterEntry {
  name: string;
  href: string;
  role: string;
}

// Per-scene "open the machinery" strips. Keys match branchScenes in flow.ts.
export const sceneLinks: Record<string, LinkChip[]> = {
  preflight: [
    {
      label: 'Guardrail: a preflight failure is never final by itself',
      href: 'https://airtable.com/appXfYXnivsUT1kLg/tblqkbW0SptshgPiw/recQaZVM9BQAik8at',
    },
    {
      label: 'Guardrail: a preflight pass does not replace e2e review',
      href: 'https://airtable.com/appXfYXnivsUT1kLg/tblqkbW0SptshgPiw/recOm7ZqCqbXlmEsD',
    },
    {
      label: 'Policy: partner runtime findings route as flags',
      href: 'https://airtable.com/appXfYXnivsUT1kLg/tblqkbW0SptshgPiw/recAIZJnheIHrdBiD',
    },
  ],
  submit: [
    { label: '🖌️Asset Versions (where the record lands)', href: `${BASE}/tblHxZ2hgSFLZxsZu` },
    {
      label: 'Dev-docs update: submission artifacts (PR #958)',
      href: 'https://github.com/webflow/openapi-internal/pull/958',
    },
  ],
  intake: [
    { label: '⚖️Intake hold automation', href: `${BASE}/wflMSqzPwS501b7Ar` },
    { label: '⚖️Prior-exemptions briefing automation', href: `${BASE}/wflbhgluc2d2cAMWI` },
    {
      label: 'Example: Storesynk thread (first organic intake hold)',
      href: `${SLACK}/C0BN54FQU84/p1787163755502789`,
      note: 'private channel',
    },
    { label: 'Partner App Flag Sync ops', note: 'packages/webflow-automation/partner-flag-sync' },
  ],
  review: [
    {
      label: 'Review checklists (🆎Asset Types · App record)',
      href: `${BASE}/tblt3vUYrxIwvdI6F/rec8UQzOkwrwQr7bf`,
    },
    {
      label: 'Runbook: exception transparency loop',
      note: 'packages/webflow-app-review-mcp/docs/exception-transparency-loop.md',
    },
  ],
  exceptions: [
    { label: '⚖️Exception Status → channel automation', href: `${BASE}/wflBcRnidEULHXzUn` },
    { label: '⚖️Exception Items — datetime stamps', href: `${BASE}/wflwRPrmqvWN8HrAn` },
    { label: '⚖️Exception release automation', href: `${BASE}/wfleu2e0kOz68y9xK` },
    {
      label: '⚖️Exception Decisions view',
      href: `${BASE}/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak`,
    },
    { label: '⚖️Exception history (interface)', href: `${BASE}/pagPQGkWRHE4J8uUy` },
    {
      label: '#app-review-exceptions',
      href: `${SLACK}/C0BN54FQU84`,
      note: 'private channel',
    },
  ],
  gatesApprove: [
    { label: '⚖️Approval Gate + Partnership Shield', href: `${BASE}/wflqWGjY4PsXCog3U` },
    { label: '🖌️Review Status Trigger (creator emails, error statuses)', href: `${BASE}/wflHI29nzYv35Wtd0` },
  ],
  gatesReject: [
    { label: '⚖️Approval Gate + Partnership Shield', href: `${BASE}/wflqWGjY4PsXCog3U` },
    { label: '⚖️Denied exception w/o rejection — daily sweep', href: `${BASE}/wflcn4fLNsPCNzCpX` },
    {
      label: 'Example: Wistia v2 thread (what the history answers)',
      href: `${SLACK}/C04DDRJ5VGT/p1786999489905209`,
    },
    {
      label: 'Precedent: the 8/18 written disposition (decision format)',
      href: 'https://docs.google.com/document/d/1xjI6tlMLjwaCMOgL_8b-H0e36V6zHmOWbshgmZtAys4',
    },
  ],
  market: [
    { label: '👛Assets (marketplace status lives here)', href: `${BASE}/tblRwzpWoLgE9MrUm` },
    {
      label: 'App Rejection Insights (why rejections happen)',
      href: 'https://wrop.wf.app/w/app-rejection-insights-26on3m',
    },
  ],
  statuses: [
    { label: '🖌️Asset Versions (the status field)', href: `${BASE}/tblHxZ2hgSFLZxsZu` },
  ],
};

// Control room: every automation the page mentions, with a direct link.
export const automations: RosterEntry[] = [
  {
    name: '⚖️Intake hold — undecided exceptions on the app',
    href: `${BASE}/wflMSqzPwS501b7Ar`,
    role: 'Holds a submission at intake while any exception item is undecided.',
  },
  {
    name: '⚖️Exception release — resume when all items decided',
    href: `${BASE}/wfleu2e0kOz68y9xK`,
    role: 'Flips the version back to Ready for Review the moment the last item lands.',
  },
  {
    name: '⚖️Approval Gate + Partnership Shield',
    href: `${BASE}/wflqWGjY4PsXCog3U`,
    role: 'No approval while items are undecided; partner rejections send no creator email.',
  },
  {
    name: '⚖️Exception Status → #app-review-exceptions',
    href: `${BASE}/wflBcRnidEULHXzUn`,
    role: 'Posts every decision. A denial auto-flips the version to Rejected and emails feedback.',
  },
  {
    name: '⚖️Exception Items — datetime stamps',
    href: `${BASE}/wflwRPrmqvWN8HrAn`,
    role: 'Stamps request and decision datetimes on every exception item.',
  },
  {
    name: '⚖️Exception → 👛Asset auto-link',
    href: `${BASE}/wfl7w27lIpKXIS3QP`,
    role: 'History attaches to the app itself, not just one version.',
  },
  {
    name: '⚖️Prior-exemptions briefing → reviewer DM',
    href: `${BASE}/wflbhgluc2d2cAMWI`,
    role: 'Briefs the assigned reviewer at intake: what is exempt, where the history lives.',
  },
  {
    name: '⚖️Denied exception w/o rejection — daily sweep',
    href: `${BASE}/wflcn4fLNsPCNzCpX`,
    role: '9:00 AM Central safety net for any denial whose rejection never went out.',
  },
  {
    name: '⏸️App On Hold → #app-review-exceptions',
    href: `${BASE}/wflZxJWJUDm58R5r6`,
    role: 'Every hold is visible in the channel, never silent.',
  },
  {
    name: '🖌️Review Status Trigger',
    href: `${BASE}/wflHI29nzYv35Wtd0`,
    role: 'The native pipeline: creator emails on clean decisions, error statuses on incomplete ones.',
  },
];

export const surfaces: LinkChip[] = [
  { label: '⚖️Exception Decisions view', href: `${BASE}/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak` },
  { label: '⚖️Exceptions page — 📝Review Team Dashboard', href: `${BASE}/pagUxgsM6AAQK51Oh` },
  { label: '⚖️Exception history page', href: `${BASE}/pagPQGkWRHE4J8uUy` },
  { label: '🖌️Asset Versions table', href: `${BASE}/tblHxZ2hgSFLZxsZu` },
  { label: '⚖️Exceptions table (per item)', href: `${BASE}/tblnbaaIbIulWl0b7` },
  { label: '👛Assets table', href: `${BASE}/tblRwzpWoLgE9MrUm` },
  { label: '#app-review-exceptions', href: `${SLACK}/C0BN54FQU84`, note: 'private' },
  { label: '#marketplace-app-reviews', href: `${SLACK}/C04DDRJ5VGT` },
];

export const examples: LinkChip[] = [
  {
    label: 'Storesynk v68 — first organic intake hold + 14-item filing',
    href: `${SLACK}/C0BN54FQU84/p1787163755502789`,
    note: 'private channel',
  },
  {
    label: 'Storesynk — converting an informal exemption into per-item records',
    href: `${SLACK}/C04DDRJ5VGT/p1787147904565719`,
  },
  {
    label: 'Wistia v2 — the exception history answering a resubmission question',
    href: `${SLACK}/C04DDRJ5VGT/p1786999489905209`,
  },
  {
    label: 'Knock — partnership-flag ruling by creator, not by name',
    href: `${SLACK}/C0BN54FQU84/p1787159018989629`,
    note: 'private channel',
  },
  {
    label: 'Written disposition, 8/18 — the per-item decision format',
    href: 'https://docs.google.com/document/d/1xjI6tlMLjwaCMOgL_8b-H0e36V6zHmOWbshgmZtAys4',
  },
  {
    label: 'Storesynk finding-by-finding map — narrow waiver + fix list, not blanket exemption',
    href: 'https://docs.google.com/document/d/1O-yjnb1I0lnp0gTE-vvMAnrORIK3NPscAEXO4gvaoCc',
  },
];

export const related: LinkChip[] = [
  {
    label: 'App review governance arc (interactive walkthrough)',
    href: 'https://wrop.wf.app/w/app-review-governance-submission-decisio-7cwthh',
  },
  {
    label: 'App Rejection Insights (every rejection, classified)',
    href: 'https://wrop.wf.app/w/app-rejection-insights-26on3m',
  },
  {
    label: 'Bundle Diff (what changed between versions)',
    href: 'https://wrop.wf.app/w/bundle-diff-app-review-wfmtzl',
  },
  {
    label: 'Companion video source',
    note: 'packages/app-system-flow-video (edit src/flow.ts, re-render)',
  },
];

// ---------------------------------------------------------------------------
// Surfaces: every place an action completes, who operates it, and how.
// Verified against the runbook's reviewer workflow, the MCP write postures
// (README + 8/20 code-gate deploy), decision-rights v2, and the scheduled-run
// setup notes.
// ---------------------------------------------------------------------------

export interface SurfaceCard {
  name: string;
  who: string;
  where?: string; // URL or path, shown as text when not linkable
  href?: string;
  actions: string[];
  note?: string;
}

export const surfaceCards: SurfaceCard[] = [
  {
    name: 'Preflight app',
    who: 'The developer',
    where: 'Runs on the developer’s machine; install link on the submission form',
    actions: [
      'Run the review’s own checks locally. The verdict is SUBMIT or DO NOT SUBMIT.',
      'A pass issues a wfpre_… receipt to paste into the submission form.',
    ],
  },
  {
    name: 'Submission form',
    who: 'The developer',
    where: 'wf-app-form-cloud',
    actions: [
      'Submit a new app or an update. The server validates the packet and refuses incomplete ones.',
      'A clean submit creates the version record and maps every answer to a field.',
    ],
  },
  {
    name: 'Airtable — 👛Marketplace Assets base + 📝Review Team Dashboard',
    who: 'Reviewers, the partner lead, the final decision-maker',
    href: 'https://airtable.com/appMoIgXMTTTNIc3p/tblHxZ2hgSFLZxsZu/viwM48eXQT4Mxc4Ak',
    where: '⚖️Exception Decisions view',
    actions: [
      'File an exception: fill Item, Type, and Rationale first, then flip ⚖️Status to 🆕Requested. The flip is the trigger; fill text first, flip second.',
      'Hold: set ⏸️Hold Reason and notes, then flip 📝Review Status to ⏸️On Hold.',
      'Decide an item: set ✅Approved or ❌Denied with decision notes. The automations post the decision and stamp the datetimes.',
      'Approve or reject the version: flip 📝Review Status. The gates inspect the change before any email can fire.',
    ],
    note: 'The Asset Version record is the decision record. Every field change fires the same automations no matter which surface wrote it.',
  },
  {
    name: 'App Review MCP — reviewer tools',
    who: 'Reviewers and review agents',
    where: 'webflow-app-review-mcp.createsomething.workers.dev (bearer-gated)',
    actions: [
      'Read the queue, assets, versions, and the full review context.',
      'Save draft feedback, set review status, request changes, approve, reject.',
      'Create and update exception items. Create deliberately leaves the status blank; the requester flips it (the sequencing rule).',
      'The code enforces the gates too: approving with undecided exceptions returns a 409, and so does a premature version-level denial.',
      'Marketplace status and broad metadata writes stay operator-gated.',
    ],
  },
  {
    name: 'Exception Decisions MCP — decision-maker tools',
    who: 'The partner lead, the final decision-maker, the recommendation automation',
    where: 'exceptions.mcp.createsomething.agency (per-person keys)',
    actions: [
      'Every key carries an identity. Decisions stamp their owner and sign the decision notes.',
      'Item decisions are individual. Version-level approval refuses while any item is undecided.',
      'A version-level denial requires confirm_release: true, because the follow-through emails the developer.',
      'recommend_exception_item records advice without deciding. draft_developer_update composes a status update the partner lead sends personally.',
      'Automation keys may record item-level denials only. The server refuses approvals and version-level actions from them.',
    ],
  },
  {
    name: 'Slack — #app-review-exceptions + #marketplace-app-reviews',
    who: 'Everyone in the loop',
    href: 'https://webflow.enterprise.slack.com/archives/C0BN54FQU84',
    where: '#app-review-exceptions (private) · #marketplace-app-reviews',
    actions: [
      'Discussion happens in the threads. Decisions do not: nothing here is a decision record; the Asset Version record is.',
      'Every request, hold, decision, and release posts automatically. Reviewers get DMs at intake holds, releases, and briefings.',
    ],
  },
  {
    name: 'Scheduled recommendation runner',
    who: 'The automation identity (advisory only)',
    where: 'launchd, 8:30 + 13:30 Central',
    actions: [
      'Twice a day it reads pending technical items and writes advisory recommendations under its own identity.',
      'If it never runs, nothing breaks: the loop degrades to manual recommendation.',
    ],
  },
  {
    name: 'Webhook worker leg',
    who: 'Marketplace Asset Bot',
    where: 'Airtable webhooks → app-review worker → Slack',
    actions: [
      'Watches the ⚖️ and ⏸️ fields on every surface: the Airtable UI, the interface, the MCPs, and the raw API.',
      'Threads per-item events under the version’s exception root and writes the thread anchor back to the record.',
    ],
  },
];

// The decision chain: who does what, and what each operator cannot do.
export interface Operator {
  role: string;
  does: string;
  cannot?: string;
}

export const operators: Operator[] = [
  {
    role: 'Developer',
    does: 'Runs preflight, submits, fixes, resubmits. Gets the feedback email in both registers, with the toolkit.',
    cannot: 'See internal holds or exception debates; the record carries what they need.',
  },
  {
    role: 'Reviewer',
    does: 'Runs the round, files exception items, holds the version. Resumes with a full testing round after decisions land.',
    cannot: 'Approve past an undecided exception. The gates revert it and the MCP refuses.',
  },
  {
    role: 'Partner lead — Greg Kelly',
    does: 'Recommends on business items. Communicates exemption scope and open items to the developer, composing from the records.',
    cannot: 'Make the final allow or deny.',
  },
  {
    role: 'Final decision — Adam Lehman & team',
    does: 'The only allow / deny. Rules per item; version-level actions are person-only.',
  },
  {
    role: 'Recommendation automation',
    does: 'Advisory recommendations on technical items, twice a day. May record item-level denials: a deny waives nothing.',
    cannot: 'Approve anything, decide for a person, or touch the version level. The server refuses its key.',
  },
  {
    role: 'Marketplace Asset Bot',
    does: 'Posts, threads, stamps, holds, releases, reminds.',
    cannot: 'Decide.',
  },
];

// ---------------------------------------------------------------------------
// The two Dify chat agents, and the graduation path they are prior art for.
// ⚠️ The agents' chat URLs act AS their owners (per-person MCP keys) — they are
// credentials, never published. The page names the surfaces; it does not link them.
// ---------------------------------------------------------------------------

export const difyCard: SurfaceCard = {
  name: 'Dify chat agents — two operator surfaces',
  who: 'The final decision-maker and the partner lead, one agent each',
  where: 'Dify — each agent’s URL is held by its owner and treated as a credential',
  actions: [
    'Chat instead of tooling: list pending items, read one, record a recommendation or a decision, all in conversation.',
    'Each agent runs on its owner’s personal MCP key, so chatting with it IS acting as that person. That is why the URLs stay private.',
    'The partner-lead agent adds recommend_exception_item and draft_developer_update; the decision agent carries the allow / deny.',
  ],
  note: 'Revoking a surface = removing its entry from the key registry and re-uploading the secret.',
};

export interface GraduationStep {
  step: string;
  text: string;
}

// How an operator meets the system. The chat agent is the introduction;
// the destination is the same MCP in Claude; the routine parts become automation.
export const graduation: GraduationStep[] = [
  {
    step: '1 · Meet the skill in chat',
    text: 'A Dify agent introduces the tools with zero setup: the operator talks, the agent calls the MCP under their key. This is the proving ground for how the workflow reads in conversation.',
  },
  {
    step: '2 · Graduate to Claude',
    text: 'The same MCP connects to Claude as a custom connector; the personal key travels in the URL path for clients without header support. Same tools, same guardrails, same identity. Only the surface changes.',
  },
  {
    step: '3 · Automate what proved routine',
    text: 'Work the operator confirms as routine moves to the automation identity: advisory recommendations on a schedule, deny-only decision rights, and a server that refuses everything else from that key.',
  },
];

// ---------------------------------------------------------------------------
// The chat agent's own operating contract — pulled verbatim from the app's
// configured opening statement via the Dify Service API (read-only, 8/21).
// These are quotes: do not edit them here; edit the agent and re-fetch.
// ---------------------------------------------------------------------------

export const agentContract = {
  name: 'Exceptions Decisions',
  description: 'Standalone Webflow App Exceptions MCP — agent chat over the decision tools',
  tools: [
    'list_pending_exceptions',
    'get_exception_item',
    'decide_exception_item',
    'decide_version_exception',
    'whoami',
  ],
  inItsOwnWords: [
    'I’ll pull up the pending queue, walk you through each flagged finding, and explain what the code does and what it costs someone.',
    'If you want my read on severity or precedent, just ask — I’ll always label it as my opinion, never policy. You make every call.',
    'I only record a decision when you state it explicitly, and each one is attributed to you personally.',
    'Every item is decided individually, approving an exception doesn’t approve the app itself, and denying a version-level exception sends feedback straight to the developer — so I’ll always flag that before it happens.',
  ],
  howTo: [
    'Ask for the queue. The agent lists the pending items with plain-English summaries.',
    'Walk the items one at a time. Ask what the code does and what it costs someone; ask for the agent’s read on severity or precedent when you want one.',
    'State your decision explicitly — “approve item X”, “deny item Y”. The agent records only what you state, attributed to you.',
    'Expect a warning before any version-level denial: the follow-through emails the developer.',
  ],
  variant:
    'The partner-lead agent works the same way and adds two tools: recommend_exception_item (advice without deciding) and draft_developer_update (a status update the partner lead sends personally).',
};

// ---------------------------------------------------------------------------
// Chat embed (Dify bubble). PRODUCTION TOKEN, embedded by operator decision
// (Micah, 2026-08-21) with the identity risk explicitly acknowledged: this is
// the real Exceptions Decisions agent, running under its owner's personal
// decision key. Anyone with this page (or its source) can chat as that surface,
// and decisions stated in chat are recorded and attributed to Adam Lehman
// personally. The page banner states this to every viewer. A read-only viewer
// key + demo-agent path exists (exception-decisions-mcp v1.4.0, role "viewer")
// if this is ever flipped back.
// ---------------------------------------------------------------------------

export const chatEmbed: { token: string | null; baseUrl: string; production: boolean } = {
  token: 'LiJy3IyQpdxpvHUh',
  baseUrl: 'https://udify.app',
  production: true,
};
