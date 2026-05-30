import React, { CSSProperties, useMemo, useState } from 'react';
import { tokens } from '../../styles/tokens';
import {
  buildLiveQueueWalkthroughPrompt,
  buildPinnedReviewSetPrompt,
  coursePromptBodies,
  defaultAgentEmbeds,
  starterPrompt,
  type PromptItem,
  type ReviewerAgentEmbed,
  type ReviewerCourseView,
  type ScreenshotAsset,
  type WalkthroughReviewItem
} from './TemplateReviewerDifyCourseData';

export type {
  ReviewerAgentEmbed,
  ReviewerCourseView,
  ScreenshotAsset,
  WalkthroughReviewItem
} from './TemplateReviewerDifyCourseData';

export interface TemplateReviewerDifyCourseProps {
  title?: string;
  eyebrow?: string;
  intro?: string;
  difyChatUrl?: string;
  agentInstructionsUrl?: string;
  courseDocUrl?: string;
  defaultView?: ReviewerCourseView;
  screenshotAssets?: string | ScreenshotAsset[];
  walkthroughReviewSet?: string | WalkthroughReviewItem[];
  walkthroughBatchSize?: number;
  agentEmbeds?: string | ReviewerAgentEmbed[];
  showPilotCalculator?: boolean;
  compact?: boolean;
}

type TrainingModule = {
  id: string;
  title: string;
  context: string;
  outcome: string;
  buildsOn?: string;
  keyPoints: string[];
  practice: string;
  expectedOutput?: string;
  reviewerChecks?: string[];
  commonFailure?: string;
  screenshots: string[];
  prompt?: string;
};

type ScreenshotRequirement = {
  id: string;
  required: boolean;
  moment: string;
  capture: string;
  why: string;
  redact: string;
  placement: string;
};

type AgentPracticeFocusMode = 'split' | 'prompt' | 'chat';
type AgentPracticeSupportPanel = 'review-set' | 'sandbox' | 'coverage';

type CoverageBoundaryItem = {
  area: string;
  agentCovers: string;
  reviewerConfirms: string;
  evidence: 'Auto' | 'Partial' | 'Manual';
};

const webflowBrand = {
  blue: '#146EF5',
  black: '#080808',
  white: '#FFFFFF',
  gray900: '#171717',
  gray800: '#222222',
  gray700: '#363636',
  gray600: '#5A5A5A',
  gray500: '#757575',
  gray300: '#ABABAB',
  gray200: '#D8D8D8',
  gray100: '#F0F0F0',
  green: '#00D722',
  yellow: '#FFAE13'
} as const;

const trainingModules: TrainingModule[] = [
  {
    id: 'purpose',
    title: 'Let Dify gather the evidence',
    context: 'Role card',
    outcome: 'Reviewer knows what to hand to Dify and what to keep for themselves.',
    buildsOn: 'Start here. This creates the role card used by the rest of the workflow.',
    keyPoints: [
      'Dify gathers evidence from the published URL and supporting tools.',
      'The reviewer makes the final call on every finding.',
      'Writes and status changes only happen after the reviewer approves the exact action.'
    ],
    practice: 'Ask Dify for a short role card before the review starts.',
    expectedOutput:
      'A compact role card that names what Dify can help with, what needs approval, the evidence order, and when sandbox/run_code is used.',
    reviewerChecks: [
      'Dify names the write boundary.',
      'Evidence is separated from judgment.',
      'The answer is short enough to scan before starting a review.'
    ],
    commonFailure: 'Dify returns a long policy explanation instead of a quick role card.',
    screenshots: ['S1', 'S2'],
    prompt: coursePromptBodies.purpose
  },
  {
    id: 'safe-flow',
    title: 'Keep control at speed',
    context: 'Batch intake',
    outcome: 'Reviewer can move faster without losing the evidence trail.',
    buildsOn: 'Module 1 role card and no-write boundary.',
    keyPoints: [
      'Start with the queue row or review context before checking a URL.',
      'Use validator evidence first for the published site.',
      'Keep every write tied to a clear reviewer approval.'
    ],
    practice: 'Ask Dify for a compact batch-intake card before review starts.',
    expectedOutput:
      'A short batch-intake card that names required row fields, optional context, evidence order, write boundary, and the next input needed.',
    reviewerChecks: [
      'The asset and URL are identified before review.',
      'Validator evidence comes before sandbox checks.',
      'Writes require reviewer approval.'
    ],
    commonFailure: 'Dify returns a long workflow explanation instead of a compact intake card.',
    screenshots: ['S3', 'S8'],
    prompt: coursePromptBodies.safeFlow
  },
  {
    id: 'single-review',
    title: 'Run one clean lane',
    context: 'Single URL',
    outcome: 'Reviewer can complete one clean evidence lane inside a larger parallel workflow.',
    buildsOn: 'Module 2 confirmed asset context and validator-first plan.',
    keyPoints: [
      'Ask for a read-only review of one published URL.',
      'Require evidence labels: Auto, Partial, Manual.',
      'Ask for draft feedback separately from status changes.'
    ],
    practice: 'Review one published URL and ask for a draft only.',
    expectedOutput:
      'One grouped review with confirmed findings, caveats, manual checks, and draft feedback that the reviewer can accept or edit.',
    reviewerChecks: [
      'Findings are labeled Auto, Partial, or Manual.',
      'Draft feedback does not overstate partial evidence.',
      'No external write has been made.'
    ],
    commonFailure: 'Dify treats a partial validator result as a confirmed failure.',
    screenshots: ['S8', 'S10', 'S12'],
    prompt: coursePromptBodies.singleReview
  },
  {
    id: 'typed-batch',
    title: 'Typed-list batch',
    context: 'Typed rows',
    outcome: 'Reviewer can review several clear queue rows in one Dify chat.',
    buildsOn: 'Module 3 evidence shape, repeated across multiple rows.',
    keyPoints: [
      'Paste the template name, version ID, and published URL for each item.',
      'Ask Dify to review each URL independently.',
      'Keep output grouped by template so feedback is easy to approve.'
    ],
    practice: 'Paste 3-5 rows and ask for read-only draft feedback for each.',
    expectedOutput:
      'A grouped response per template, with independent evidence and draft feedback for each URL.',
    reviewerChecks: [
      'Each template has its own evidence block.',
      'Findings do not mix between URLs.',
      'The output is ready for reviewer approval or edits.'
    ],
    commonFailure: 'Dify collapses batch findings into one generic summary.',
    screenshots: ['S5', 'S12'],
    prompt: coursePromptBodies.typedBatch
  },
  {
    id: 'screenshot-batch',
    title: 'Screenshot batch',
    context: 'Screenshot rows',
    outcome: 'Reviewer can use a screenshot without letting Dify guess missing fields.',
    buildsOn: 'Module 4 batch structure, but the rows come from a screenshot extraction.',
    keyPoints: [
      'The screenshot needs to show template names and published URLs.',
      'Dify extracts the list and asks for confirmation before review.',
      'Missing or unclear URLs are blocked until the reviewer clarifies them.'
    ],
    practice: 'Upload a queue screenshot and confirm the extracted rows before review begins.',
    expectedOutput:
      'An extracted list of template names and published URLs, followed by a request for confirmation before review begins.',
    reviewerChecks: [
      'Every extracted URL appears in the screenshot.',
      'Unclear rows are marked blocked or need confirmation.',
      'Review waits until the extracted rows are confirmed.'
    ],
    commonFailure: 'Dify guesses missing URLs or starts reviewing before confirmation.',
    screenshots: ['S6', 'S7'],
    prompt: coursePromptBodies.screenshotBatch
  },
  {
    id: 'multi-tab',
    title: 'Multi-tab review lanes',
    context: 'Tab lane',
    outcome: 'Reviewer can run several Dify chat lanes at once without mixing assets.',
    buildsOn: 'Module 3 single-lane prompt, opened in several Dify tabs.',
    keyPoints: [
      'Open the Dify chat URL in multiple browser tabs.',
      'Run one asset or one small batch per tab so each chat stays easy to audit.',
      'Name or repeat the template name/version ID at the top of every tab prompt.'
    ],
    practice:
      'Open 3 Dify chat tabs, run one published URL in each, then compare the grouped drafts before approving anything.',
    expectedOutput:
      'Each tab returns a compact lane summary with evidence labels, caveats, manual checks, and draft feedback for only that asset or small batch.',
    reviewerChecks: [
      'Each tab has a clear template name, version ID, and published URL.',
      'The reviewer can tell which draft belongs to which asset.',
      'No tab writes feedback or status until exact approval is given.'
    ],
    commonFailure: 'The reviewer loses track of which tab belongs to which template.',
    screenshots: ['S2', 'S17', 'S18'],
    prompt: coursePromptBodies.multiTab
  },
  {
    id: 'agent-feedback',
    title: 'Refresh old feedback',
    context: 'Refresh evidence',
    outcome: 'Reviewer treats old feedback as background, not proof.',
    buildsOn: 'Current evidence from Modules 3, 4, 5, or 6.',
    keyPoints: [
      'Existing Agent Review Feedback can speed up context.',
      'Fresh published-site evidence still anchors the current review.',
      'Old findings need current support before they become new feedback.'
    ],
    practice: 'Ask Dify to compare existing feedback with fresh published-site evidence.',
    expectedOutput:
      'A comparison that keeps old feedback as context and refreshes current published-site evidence before recommending draft feedback.',
    reviewerChecks: [
      'Dify does not copy old feedback as proof.',
      'Current URL evidence supports every retained finding.',
      'Stale or unsupported findings are marked as caveats.'
    ],
    commonFailure: 'Dify repeats old feedback without fresh evidence.',
    screenshots: ['S8', 'S10'],
    prompt: coursePromptBodies.agentFeedback
  },
  {
    id: 'status-actions',
    title: 'Approve Webflow-ready feedback',
    context: 'Approval gate',
    outcome: 'Reviewer can approve precise feedback that sounds like Webflow.',
    buildsOn: 'Draft feedback and caveats from the active review lane or batch.',
    keyPoints: [
      'Feedback is knowledgeable: specific, evidence-backed, and never condescending.',
      'Feedback is empowering: it tells the creator what to fix next.',
      'Feedback is down-to-earth: plain, direct, and easy to act on.',
      'Approval names the exact feedback or status action.',
      'Dify confirms whether a write was made or withheld.'
    ],
    practice:
      'Ask Dify to rewrite one draft in Webflow voice, then approve the exact final version in a safe demo context.',
    expectedOutput:
      'A clear creator-facing draft plus a confirmation that names exactly what was written, what was not changed, and which reviewer approval authorized the action.',
    reviewerChecks: [
      'The draft is useful without sounding harsh or vague.',
      'The approval includes the exact field or status action.',
      'Dify confirms no extra status change occurred.',
      'The final response leaves a clear audit trail.'
    ],
    commonFailure: 'Dify treats a broad "looks good" as permission to write.',
    screenshots: ['S13', 'S14'],
    prompt: coursePromptBodies.statusActions
  },
  {
    id: 'manual-override',
    title: 'Go manual when evidence is thin',
    context: 'Manual stop',
    outcome: 'Reviewer knows when to stop and check manually.',
    buildsOn: 'Any caveat, contradiction, blocked URL, or Partial/Manual evidence label.',
    keyPoints: [
      'Stop if tool coverage is unavailable, contradictory, or too shallow.',
      'Escalate if the page requires Designer-only evidence.',
      'Use a manual checklist instead of forcing an unsupported conclusion.'
    ],
    practice: 'Ask for a fallback checklist when validation cannot prove the issue.',
    expectedOutput:
      'A manual checklist that tells the reviewer what to verify in Designer, the public URL, or Airtable before deciding.',
    reviewerChecks: [
      'Dify says what it could not prove.',
      'Manual checks are specific and actionable.',
      'No unsupported conclusion is presented as final.'
    ],
    commonFailure: 'Dify keeps trying tools after evidence is already too shallow.',
    screenshots: ['S15'],
    prompt: coursePromptBodies.manualOverride
  },
  {
    id: 'narrow-follow-up',
    title: 'Ask focused follow-ups',
    context: 'Focused pass',
    outcome: 'Reviewer asks for focused passes like typos or content text only.',
    buildsOn: 'A completed review lane where the reviewer wants one narrow extra pass.',
    keyPoints: [
      'Ask follow-ups by scope, not by broad re-review.',
      'Useful narrow scopes include typos only, utility pages only, forms only, and headings only.',
      'Keep quoted text short and enough to locate the issue.'
    ],
    practice: 'Ask for a typos/content-only pass after the main review.',
    expectedOutput:
      'A focused result that only covers the requested scope and avoids reopening the entire template review.',
    reviewerChecks: [
      'Dify stays within the requested follow-up scope.',
      'Text quotes are short and locate the issue.',
      'Findings are still evidence-labeled.'
    ],
    commonFailure: 'Dify turns a narrow follow-up into a broad re-review.',
    screenshots: ['S11'],
    prompt: coursePromptBodies.narrowFollowUp
  },
  {
    id: 'pilot',
    title: 'Measure the time saved',
    context: 'Pilot data',
    outcome: 'Reviewer records useful measurement data.',
    buildsOn: 'The completed batch or multi-tab review session.',
    keyPoints: [
      'Track active minutes, tool switches, draft reuse, corrections, and rework.',
      'Compare manual sequential review with Dify-assisted parallel review.',
      'Use the pilot to tune prompts and evidence requirements.'
    ],
    practice: 'Record one manual review block and one Dify-assisted batch block.',
    expectedOutput:
      'A simple before/after record with active minutes, accepted drafts, corrections, manual checks, and any rework.',
    reviewerChecks: [
      'The reviewer records active time, not elapsed time.',
      'Corrections and rework are included.',
      'Results are compared by batch size.'
    ],
    commonFailure: 'The pilot measures total elapsed time without tracking reviewer effort.',
    screenshots: ['S16'],
    prompt: coursePromptBodies.pilot
  }
];

const screenshotRequirements: ScreenshotRequirement[] = [
  {
    id: 'S1',
    required: true,
    moment: 'Live Dify UI orientation',
    capture: 'Dify Studio view with instructions, model selector, knowledge, rubric, and tools.',
    why: 'Shows reviewers what a correctly configured Dify reviewer looks like.',
    redact: 'Secrets, unrelated tools, account menus.',
    placement: 'Live Dify UI Orientation'
  },
  {
    id: 'S2',
    required: true,
    moment: 'Published chat orientation',
    capture: 'Dify chat home with Start New chat and saved starters such as Check My Queue.',
    why: 'Helps reviewers find the actual place to work.',
    redact: 'Sidebar chats that include private creator names if risky.',
    placement: 'Live Dify UI Orientation'
  },
  {
    id: 'S3',
    required: false,
    moment: 'System check',
    capture: 'Tool-availability response after asking whether review tools are connected.',
    why: 'Builds confidence that Hub and validator tools are connected.',
    redact: 'Raw auth details or trace IDs if exposed.',
    placement: 'Module 2'
  },
  {
    id: 'S4',
    required: true,
    moment: 'Queue review',
    capture:
      'Queue output with template name, version ID, published URL, status, and assignment state.',
    why: 'Teaches reviewers which row data to use before review.',
    redact: 'Extra queue rows, creator emails, internal notes.',
    placement: 'Module 2'
  },
  {
    id: 'S5',
    required: true,
    moment: 'Typed-list batch',
    capture: 'Reviewer prompt with 3-5 templates and published URLs pasted into Dify.',
    why: 'Shows the cleanest parallel-review input format.',
    redact: 'Any template not approved for training.',
    placement: 'Module 4'
  },
  {
    id: 'S6',
    required: true,
    moment: 'Screenshot batch',
    capture: 'Airtable or queue screenshot with visible template names and published URLs.',
    why: 'Teaches the screenshot workflow and the need to confirm extracted rows.',
    redact: 'Emails, unrelated fields, hidden/private Airtable columns.',
    placement: 'Module 5'
  },
  {
    id: 'S7',
    required: true,
    moment: 'Screenshot extraction confirmation',
    capture: 'Agent response showing the extracted list before review begins.',
    why: 'Reinforces that Dify does not guess missing URLs.',
    redact: 'Normal row redaction only.',
    placement: 'Module 5'
  },
  {
    id: 'S8',
    required: true,
    moment: 'Validator-first evidence',
    capture: 'Agent response showing published-site validation was used with coverage/caveats.',
    why: 'Shows the normal first pass and partial-coverage language.',
    redact: 'Long raw JSON unless needed.',
    placement: 'Evidence Workflow'
  },
  {
    id: 'S9',
    required: true,
    moment: 'Targeted sandbox/run_code check',
    capture:
      'Dify response showing sandbox/run_code used for a validator gap or reviewer-requested public-site check.',
    why: 'Clarifies that sandbox access is available when the reviewer needs a bounded check after validator coverage.',
    redact: 'Full HTML dumps, irrelevant console output.',
    placement: 'Evidence Workflow'
  },
  {
    id: 'S10',
    required: true,
    moment: 'Evidence labels',
    capture: 'Output section where findings are labeled Auto, Partial, and Manual.',
    why: 'Teaches reviewers not to treat partial findings as final failures.',
    redact: 'N/A.',
    placement: 'Module 3'
  },
  {
    id: 'S11',
    required: false,
    moment: 'Narrow follow-up',
    capture: 'Reviewer asks for typos/content-only review and Dify returns scoped findings.',
    why: 'Shows how to stay in one chat without expanding scope.',
    redact: 'Long page excerpts; quote only enough text to identify.',
    placement: 'Module 9'
  },
  {
    id: 'S12',
    required: true,
    moment: 'Draft feedback',
    capture:
      'Dify output separating confirmed summary, caveats, draft feedback, and manual checks.',
    why: 'Shows the expected answer shape.',
    redact: 'Creator-sensitive feedback if not anonymized.',
    placement: 'Module 3'
  },
  {
    id: 'S13',
    required: true,
    moment: 'Write approval',
    capture: 'Reviewer prompt approving exact draft feedback and limiting the write action.',
    why: 'Teaches the difference between vague approval and safe approval.',
    redact: 'Any production write if not in a safe demo context.',
    placement: 'Module 7'
  },
  {
    id: 'S14',
    required: true,
    moment: 'No-write confirmation',
    capture: 'Agent response saying no external write was made, or showing approved saved result.',
    why: 'Reinforces write safety and evidence trail.',
    redact: 'Raw Airtable payloads.',
    placement: 'Module 7'
  },
  {
    id: 'S15',
    required: true,
    moment: 'Manual fallback',
    capture: 'Dify returns a manual checklist when validator/sandbox evidence is unclear.',
    why: 'Shows reviewers what to do when tools cannot prove the issue.',
    redact: 'N/A.',
    placement: 'Module 8'
  },
  {
    id: 'S16',
    required: true,
    moment: 'Pilot measurement',
    capture:
      'Timing tracker with active minutes, tool switches, draft reuse, corrections, and rework.',
    why: 'Helps managers run the time-savings pilot.',
    redact: 'Reviewer names if sharing broadly.',
    placement: 'Time Savings'
  },
  {
    id: 'S17',
    required: true,
    moment: 'Multiple Dify chat tabs',
    capture:
      'Browser with several Dify chat tabs open, each clearly tied to one template or small batch.',
    why: 'Shows the third parallel-review mode: several live review lanes at once.',
    redact: 'Private chat titles, creator names, internal notes, and unrelated tabs.',
    placement: 'Parallel Review Modes'
  },
  {
    id: 'S18',
    required: true,
    moment: 'Lane comparison before approval',
    capture:
      'Reviewer comparing compact draft summaries across Dify tabs before approving any write.',
    why: 'Teaches reviewers to keep speed and judgment together.',
    redact: 'Creator-sensitive feedback if not anonymized.',
    placement: 'Parallel Review Modes'
  }
];

const parallelReviewModes = [
  {
    label: 'Typed batch',
    title: 'Paste rows into one chat',
    detail: 'Best for 3-5 clean queue rows with template name, version ID, and published URL.',
    output: 'One grouped draft per template'
  },
  {
    label: 'Screenshot batch',
    title: 'Upload a visible queue list',
    detail:
      'Best when the queue already shows published URLs. Dify extracts first, then waits for confirmation.',
    output: 'Confirmed extraction, then grouped drafts'
  },
  {
    label: 'Multi-tab lanes',
    title: 'Open several Dify chats',
    detail: 'Best for true side-by-side work. Run one asset or small batch in each tab.',
    output: 'Compact lane summaries to compare'
  }
];

const stopSignals = [
  'The published URL is missing, blocked, or not the template being reviewed.',
  'The reviewer cannot tell which draft belongs to which template.',
  'Tool evidence conflicts with what the reviewer can see manually.',
  'The finding depends on Designer-only configuration.',
  'Dify cannot explain whether the finding is Auto, Partial, or Manual.'
];

const coverageBoundaryItems: CoverageBoundaryItem[] = [
  {
    area: 'Published pages',
    agentCovers:
      'Public URLs, crawl coverage, status codes, metadata, headings, links, forms, and visible text.',
    reviewerConfirms:
      'Designer page structure, intended page count, unpublished states, visual polish, and whether missing pages are intentional.',
    evidence: 'Auto'
  },
  {
    area: 'Submission guidelines',
    agentCovers:
      'Guideline-linked findings when the issue is visible in validator output, public HTML, or review context.',
    reviewerConfirms:
      'Guideline calls that require marketplace judgment, template quality standards, or creator intent.',
    evidence: 'Partial'
  },
  {
    area: 'CMS and components',
    agentCovers:
      'Published CMS output, collection-page behavior, visible empty states, and obvious reusable-page issues.',
    reviewerConfirms:
      'CMS schema quality, class naming, component organization, symbol usage, bindings, and Designer editability.',
    evidence: 'Manual'
  },
  {
    area: 'Interactions and responsiveness',
    agentCovers:
      'Basic public-page observations, responsive screenshots when requested, and visible broken interaction symptoms.',
    reviewerConfirms:
      'Designer breakpoint decisions, interaction setup, animation intent, and quality of the editing experience.',
    evidence: 'Partial'
  },
  {
    area: 'Write actions',
    agentCovers:
      'Draft feedback, caveats, and a proposed next step after review context confirms the permitted actions.',
    reviewerConfirms:
      'The final decision, exact feedback text, status change, request-changes action, approval, or rejection.',
    evidence: 'Manual'
  }
];

const designerConfirmationChecks = [
  'Open the Designer or Preview URL when a finding depends on layout, interaction feel, breakpoint quality, CMS setup, class/component organization, or editability.',
  'Treat validator and sandbox output as evidence, not the final marketplace decision.',
  'Ask Dify for a coverage boundary when a batch includes Partial or Manual findings.'
];

function parseScreenshotAssets(value: string | ScreenshotAsset[] | undefined): ScreenshotAsset[] {
  if (Array.isArray(value)) return value;
  if (!value || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is ScreenshotAsset => {
      if (!entry || typeof entry !== 'object') return false;
      const asset = entry as Partial<ScreenshotAsset>;
      return typeof asset.id === 'string' && typeof asset.url === 'string';
    });
  } catch {
    return [];
  }
}

function parseWalkthroughReviewItems(
  value: string | WalkthroughReviewItem[] | undefined
): WalkthroughReviewItem[] {
  if (Array.isArray(value)) return value.filter(isWalkthroughReviewItem);
  if (!value || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isWalkthroughReviewItem) : [];
  } catch {
    return [];
  }
}

function isWalkthroughReviewItem(entry: unknown): entry is WalkthroughReviewItem {
  if (!entry || typeof entry !== 'object') return false;
  const item = entry as Partial<WalkthroughReviewItem>;
  return typeof item.name === 'string' && typeof item.publishedUrl === 'string';
}

function parseReviewerAgentEmbeds(
  value: string | ReviewerAgentEmbed[] | undefined
): ReviewerAgentEmbed[] {
  if (Array.isArray(value)) return value.filter(isReviewerAgentEmbed);
  if (!value || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isReviewerAgentEmbed) : [];
  } catch {
    return [];
  }
}

function isReviewerAgentEmbed(entry: unknown): entry is ReviewerAgentEmbed {
  if (!entry || typeof entry !== 'object') return false;
  const item = entry as Partial<ReviewerAgentEmbed>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.embedUrl === 'string' &&
    item.embedUrl.startsWith('https://')
  );
}

function mergeReviewerAgentEmbeds(agents: ReviewerAgentEmbed[]) {
  if (!agents.length) return defaultAgentEmbeds;

  const customById = new Map(agents.map((agent) => [agent.id, agent]));
  const defaultIds = new Set(defaultAgentEmbeds.map((agent) => agent.id));
  const mergedDefaults = defaultAgentEmbeds.map((agent) => customById.get(agent.id) ?? agent);
  const customOnly = agents.filter((agent) => !defaultIds.has(agent.id));

  return [...mergedDefaults, ...customOnly];
}

function normalizeView(view: string | undefined): ReviewerCourseView {
  if (view === 'modules' || view === 'agents' || view === 'screenshots' || view === 'pilot') {
    return view;
  }
  return 'overview';
}

function clampNumber(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(value, 999));
}

function usePilotCalculator() {
  const [assetCount, setAssetCount] = useState(10);
  const [manualMinutes, setManualMinutes] = useState(18);
  const [difyMinutes, setDifyMinutes] = useState(8);
  const [reworkMinutes, setReworkMinutes] = useState(8);

  const manualTotal = assetCount * manualMinutes;
  const difyTotal = assetCount * difyMinutes + reworkMinutes;
  const savedMinutes = Math.max(0, manualTotal - difyTotal);
  const savedPercent = manualTotal > 0 ? Math.round((savedMinutes / manualTotal) * 100) : 0;

  return {
    assetCount,
    manualMinutes,
    difyMinutes,
    reworkMinutes,
    manualTotal,
    difyTotal,
    savedMinutes,
    savedPercent,
    setAssetCount: (value: number) => setAssetCount(clampNumber(value, 10)),
    setManualMinutes: (value: number) => setManualMinutes(clampNumber(value, 18)),
    setDifyMinutes: (value: number) => setDifyMinutes(clampNumber(value, 8)),
    setReworkMinutes: (value: number) => setReworkMinutes(clampNumber(value, 8))
  };
}

function tonePillStyle(tone: 'required' | 'optional' | 'safe' | 'warning'): CSSProperties {
  if (tone === 'required') {
    return {
      background: 'rgba(20, 110, 245, 0.16)',
      borderColor: 'rgba(20, 110, 245, 0.36)',
      color: webflowBrand.white
    };
  }

  if (tone === 'safe') {
    return {
      background: 'rgba(0, 215, 34, 0.14)',
      borderColor: 'rgba(0, 215, 34, 0.32)',
      color: webflowBrand.white
    };
  }

  if (tone === 'warning') {
    return {
      background: 'rgba(255, 174, 19, 0.14)',
      borderColor: 'rgba(255, 174, 19, 0.32)',
      color: webflowBrand.white
    };
  }

  return {
    background: webflowBrand.gray800,
    borderColor: webflowBrand.gray700,
    color: webflowBrand.gray200
  };
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

const coursePromptCount = trainingModules.filter((module) => module.prompt).length;

const courseCss = `
  .cs-reviewer-course,
  .cs-reviewer-course * {
    box-sizing: border-box;
  }

  .cs-reviewer-course {
    width: 100%;
    min-height: 100vh;
    min-height: 100svh;
    min-width: 0;
    color: ${webflowBrand.white};
    font-family: ${tokens.typography.fontFamily.sans};
    background: ${webflowBrand.black};
    border: 0;
    border-radius: 0;
    overflow: hidden;
  }

  .cs-reviewer-course button,
  .cs-reviewer-course input {
    font: inherit;
  }

  .cs-reviewer-course a {
    color: inherit;
  }

  @keyframes cs-reviewer-sidebar-enter {
    from {
      opacity: 0;
      transform: translateX(-0.35rem);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .cs-reviewer-shell {
    display: grid;
    grid-template-columns: minmax(17rem, 22rem) minmax(0, 1fr);
    min-height: 100vh;
    min-height: 100svh;
    background: ${webflowBrand.black};
    transition: grid-template-columns 260ms ${tokens.animation.easing.standard};
    will-change: grid-template-columns;
  }

  .cs-reviewer-shell-collapsed {
    grid-template-columns: 4.75rem minmax(0, 1fr);
  }

  .cs-reviewer-sidebar {
    display: flex;
    flex-direction: column;
    gap: 1.15rem;
    background: #000000;
    border-right: 1px solid ${webflowBrand.gray800};
    padding: clamp(1rem, 1.4vw, 1.625rem);
    min-width: 0;
    overflow: hidden;
    transition:
      padding 260ms ${tokens.animation.easing.standard},
      gap 260ms ${tokens.animation.easing.standard};
  }

  .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-title,
  .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-intro,
  .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-tabs,
  .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-reference-details {
    animation: cs-reviewer-sidebar-enter 180ms ${tokens.animation.easing.standard} both;
  }

  .cs-reviewer-sidebar-collapsed {
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 0.75rem;
  }

  .cs-reviewer-sidebar-top {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    min-width: 0;
  }

  .cs-reviewer-sidebar-panel {
    opacity: 1;
    transform: translateX(0);
    transition:
      opacity 180ms ${tokens.animation.easing.standard},
      transform 220ms ${tokens.animation.easing.standard};
  }

  .cs-reviewer-sidebar-collapsed .cs-reviewer-sidebar-panel {
    opacity: 0;
    transform: translateX(-0.5rem);
    pointer-events: none;
  }

  .cs-reviewer-brand-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .cs-reviewer-sidebar-collapsed .cs-reviewer-brand-row {
    flex-direction: column;
  }

  .cs-reviewer-brand-mark {
    display: block;
    width: 2.125rem;
    height: auto;
    flex: 0 0 auto;
    color: ${webflowBrand.blue};
  }

  .cs-reviewer-sidebar-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    min-height: 2.5rem;
    border: 1px solid ${webflowBrand.gray700};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    color: ${webflowBrand.gray200};
    cursor: pointer;
    padding: 0;
    margin-left: auto;
  }

  .cs-reviewer-sidebar-collapsed .cs-reviewer-sidebar-toggle {
    margin-left: 0;
  }

  .cs-reviewer-sidebar-toggle svg {
    width: 1.125rem;
    height: 1.125rem;
    display: block;
  }

  .cs-reviewer-sidebar-toggle:hover {
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-main {
    display: flex;
    align-items: stretch;
    justify-content: center;
    min-width: 0;
    min-height: 100vh;
    min-height: 100svh;
    background: ${webflowBrand.black};
    padding: clamp(1rem, 2.4vw, 2.75rem);
  }

  .cs-reviewer-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .cs-reviewer-eyebrow {
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.semibold};
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .cs-reviewer-title {
    margin: 0.25rem 0 0;
    font-family: ${tokens.typography.fontFamily.tight};
    font-size: clamp(2rem, 2.6vw, 3rem);
    font-weight: ${tokens.typography.fontWeight.bold};
    line-height: 1.04;
    color: ${webflowBrand.white};
  }

  .cs-reviewer-intro {
    margin: 0.75rem 0 0;
    color: ${webflowBrand.gray200};
    font-size: ${tokens.typography.fontSize.body};
    line-height: ${tokens.typography.lineHeight.relaxed};
  }

  .cs-reviewer-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .cs-reviewer-trust-details {
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    color: ${webflowBrand.gray200};
  }

  .cs-reviewer-trust-details summary {
    min-height: 2.5rem;
    padding: 0.75rem;
    color: ${webflowBrand.white};
    cursor: pointer;
    font-size: ${tokens.typography.fontSize.bodySm};
    font-weight: ${tokens.typography.fontWeight.semibold};
  }

  .cs-reviewer-trust-grid {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    border-top: 1px solid ${webflowBrand.gray800};
    padding: 0.75rem;
  }

  .cs-reviewer-trust-row strong,
  .cs-reviewer-trust-row span {
    display: block;
  }

  .cs-reviewer-trust-row strong {
    color: ${webflowBrand.white};
    font-size: ${tokens.typography.fontSize.caption};
  }

  .cs-reviewer-trust-row span {
    margin-top: 0.2rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.45;
  }

  .cs-reviewer-link,
  .cs-reviewer-tab,
  .cs-reviewer-module-button,
  .cs-reviewer-copy {
    min-height: 2.5rem;
    border: 1px solid ${webflowBrand.gray700};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    color: ${webflowBrand.gray200};
    cursor: pointer;
    text-decoration: none;
    transition:
      background ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      border-color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      color ${tokens.animation.duration.micro} ${tokens.animation.easing.standard},
      transform ${tokens.animation.duration.micro} ${tokens.animation.easing.standard};
  }

  .cs-reviewer-link,
  .cs-reviewer-copy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    padding: 0.625rem 0.875rem;
    font-size: ${tokens.typography.fontSize.bodySm};
    font-weight: ${tokens.typography.fontWeight.semibold};
  }

  .cs-reviewer-copy.cs-reviewer-primary {
    background: ${webflowBrand.blue};
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-link:hover,
  .cs-reviewer-tab:hover,
  .cs-reviewer-module-button:hover,
  .cs-reviewer-copy:hover {
    background: ${webflowBrand.gray800};
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-copy.cs-reviewer-primary:hover {
    background: #0f5dd1;
    color: ${webflowBrand.white};
  }

  .cs-reviewer-tabs {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cs-reviewer-nav-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cs-reviewer-nav-group + .cs-reviewer-nav-group {
    margin-top: 0.25rem;
  }

  .cs-reviewer-nav-heading {
    margin: 0.35rem 0 0;
    color: ${webflowBrand.gray500};
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.semibold};
    text-transform: uppercase;
  }

  .cs-reviewer-tab {
    width: 100%;
    padding: 0.75rem;
    text-align: left;
  }

  .cs-reviewer-tab-label {
    display: block;
    color: ${webflowBrand.white};
    font-weight: ${tokens.typography.fontWeight.semibold};
    line-height: 1.25;
  }

  .cs-reviewer-tab-note {
    display: block;
    margin-top: 0.25rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.35;
  }

  .cs-reviewer-tab[aria-pressed='true'],
  .cs-reviewer-module-button[aria-pressed='true'] {
    background: rgba(20, 110, 245, 0.14);
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-tab.cs-reviewer-tab-secondary {
    min-height: 2.75rem;
    background: #080808;
  }

  .cs-reviewer-metric-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .cs-reviewer-mini-metric {
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    padding: 0.75rem;
    background: ${webflowBrand.gray900};
  }

  .cs-reviewer-mini-value {
    display: block;
    font-family: ${tokens.typography.fontFamily.tight};
    font-size: ${tokens.typography.fontSize.h4};
    font-weight: ${tokens.typography.fontWeight.bold};
    line-height: ${tokens.typography.lineHeight.tight};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-mini-label {
    display: block;
    margin-top: 0.25rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
  }

  .cs-reviewer-panel {
    width: 100%;
    max-width: 98rem;
    min-height: calc(100vh - clamp(2rem, 4.8vw, 5.5rem));
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #0d0d0d;
    padding: clamp(1rem, 2vw, 2rem);
  }

  .cs-reviewer-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .cs-reviewer-h2,
  .cs-reviewer-h3,
  .cs-reviewer-h4 {
    margin: 0;
    font-family: ${tokens.typography.fontFamily.tight};
    line-height: 1.04;
    color: ${webflowBrand.white};
  }

  .cs-reviewer-h2 {
    font-size: clamp(2.25rem, 3.2vw, 4.25rem);
  }

  .cs-reviewer-h3 {
    font-size: ${tokens.typography.fontSize.h4};
  }

  .cs-reviewer-h4 {
    font-size: ${tokens.typography.fontSize.h5};
  }

  .cs-reviewer-muted {
    color: ${webflowBrand.gray300};
  }

  .cs-reviewer-body {
    color: ${webflowBrand.gray200};
    line-height: ${tokens.typography.lineHeight.relaxed};
  }

  .cs-reviewer-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 0.875rem;
  }

  .cs-reviewer-card {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #050505;
    padding: 1rem;
  }

  .cs-reviewer-card.cs-reviewer-card-blue {
    background: ${webflowBrand.blue};
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-card.cs-reviewer-card-blue .cs-reviewer-body,
  .cs-reviewer-card.cs-reviewer-card-blue .cs-reviewer-eyebrow {
    color: rgba(255, 255, 255, 0.84);
  }

  .cs-reviewer-start {
    display: grid;
    grid-template-columns: minmax(0, 1.25fr) minmax(19rem, 0.75fr);
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .cs-reviewer-start.cs-reviewer-start-focused {
    grid-template-columns: minmax(0, 1.4fr) minmax(18rem, 0.6fr);
  }

  .cs-reviewer-start.cs-reviewer-start-simple {
    display: block;
  }

  .cs-reviewer-start-main {
    min-height: 24rem;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #050505;
    padding: clamp(1.25rem, 2.2vw, 2rem);
  }

  .cs-reviewer-start-simple .cs-reviewer-start-main {
    min-height: auto;
  }

  .cs-reviewer-start-aside {
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
  }

  .cs-reviewer-start-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.625rem;
    margin-top: 1rem;
  }

  .cs-reviewer-mode-summary {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.625rem;
    margin-top: 1rem;
  }

  .cs-reviewer-mode-summary div {
    min-width: 0;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    padding: 0.75rem;
  }

  .cs-reviewer-mode-summary span,
  .cs-reviewer-mode-summary strong,
  .cs-reviewer-mode-summary small {
    display: block;
  }

  .cs-reviewer-mode-summary span {
    color: ${webflowBrand.blue};
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.bold};
  }

  .cs-reviewer-mode-summary strong {
    margin-top: 0.2rem;
    color: ${webflowBrand.white};
    font-size: ${tokens.typography.fontSize.bodySm};
  }

  .cs-reviewer-mode-summary small {
    margin-top: 0.25rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.45;
  }

  .cs-reviewer-primary-path-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.875rem;
    margin-bottom: 1rem;
  }

  .cs-reviewer-path-card {
    min-height: 12.5rem;
    justify-content: space-between;
  }

  .cs-reviewer-icon-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    background: rgba(20, 110, 245, 0.16);
    color: ${webflowBrand.blue};
    border: 1px solid rgba(20, 110, 245, 0.42);
    margin-bottom: 0.75rem;
  }

  .cs-reviewer-icon-badge svg {
    width: 1rem;
    height: 1rem;
    display: block;
  }

  .cs-reviewer-mode-button-label {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .cs-reviewer-mode-button-label svg {
    width: 1rem;
    height: 1rem;
    color: ${webflowBrand.blue};
  }

  .cs-reviewer-mode-toggle {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-top: 0.875rem;
  }

  .cs-reviewer-mode-toggle button {
    min-width: 0;
    min-height: 4.5rem;
    border: 1px solid ${webflowBrand.gray700};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    color: ${webflowBrand.gray200};
    padding: 0.75rem;
    text-align: left;
    cursor: pointer;
  }

  .cs-reviewer-mode-toggle button[aria-pressed='true'] {
    background: rgba(20, 110, 245, 0.14);
    border-color: ${webflowBrand.blue};
  }

  .cs-reviewer-mode-toggle small {
    display: block;
    margin-top: 0.25rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.35;
  }

  .cs-reviewer-secondary-access {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.875rem;
    margin-top: 1rem;
  }

  .cs-reviewer-secondary-access-closed {
    grid-template-columns: minmax(0, 1fr);
  }

  .cs-reviewer-coverage-grid {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 0.875rem;
  }

  .cs-reviewer-coverage-row {
    display: grid;
    grid-template-columns: minmax(8.5rem, 0.42fr) minmax(0, 1fr) minmax(0, 1fr);
    gap: 0.75rem;
    align-items: start;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #050505;
    padding: 0.75rem;
  }

  .cs-reviewer-coverage-area {
    display: flex;
    gap: 0.625rem;
    align-items: flex-start;
    min-width: 0;
  }

  .cs-reviewer-coverage-area strong,
  .cs-reviewer-coverage-area span,
  .cs-reviewer-coverage-row p,
  .cs-reviewer-coverage-label {
    display: block;
  }

  .cs-reviewer-coverage-area strong {
    color: ${webflowBrand.white};
    font-size: ${tokens.typography.fontSize.bodySm};
    line-height: 1.3;
  }

  .cs-reviewer-coverage-area span:not(.cs-reviewer-icon-badge) {
    margin-top: 0.2rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
  }

  .cs-reviewer-coverage-label {
    margin-bottom: 0.25rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.semibold};
    text-transform: uppercase;
  }

  .cs-reviewer-coverage-row p {
    margin: 0;
    color: ${webflowBrand.gray200};
    font-size: ${tokens.typography.fontSize.bodySm};
    line-height: 1.45;
  }

  .cs-reviewer-designer-checks {
    margin: 0.875rem 0;
    border: 1px solid rgba(20, 110, 245, 0.34);
    border-radius: ${tokens.radii.md};
    background: rgba(20, 110, 245, 0.1);
    padding: 0.875rem;
  }

  .cs-reviewer-designer-checks h5 {
    margin: 0.2rem 0 0;
    color: ${webflowBrand.white};
    font-family: ${tokens.typography.fontFamily.tight};
    font-size: ${tokens.typography.fontSize.body};
    line-height: 1.25;
  }

  .cs-reviewer-reference-details {
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #050505;
  }

  .cs-reviewer-reference-details summary {
    min-height: 3rem;
    padding: 0.875rem 1rem;
    color: ${webflowBrand.white};
    cursor: pointer;
    font-weight: ${tokens.typography.fontWeight.semibold};
  }

  .cs-reviewer-reference-details-body {
    border-top: 1px solid ${webflowBrand.gray800};
    padding: 1rem;
  }

  .cs-reviewer-control-bar {
    display: flex;
    gap: 0.375rem;
    margin-bottom: 1.25rem;
  }

  .cs-reviewer-control-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 999px;
    background: ${webflowBrand.gray700};
  }

  .cs-reviewer-control-dot:nth-child(2) {
    background: ${webflowBrand.gray500};
  }

  .cs-reviewer-control-dot:nth-child(3) {
    background: ${webflowBrand.blue};
  }

  .cs-reviewer-step-list,
  .cs-reviewer-output-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    margin-top: 1rem;
  }

  .cs-reviewer-step-row,
  .cs-reviewer-output-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.75rem;
    align-items: flex-start;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    padding: 0.75rem;
  }

  .cs-reviewer-output-row {
    grid-template-columns: minmax(7.5rem, 0.35fr) minmax(0, 1fr);
  }

  .cs-reviewer-flow {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.5rem;
    margin: 1rem 0;
  }

  .cs-reviewer-flow-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 3rem;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    padding: 0.75rem;
    color: ${webflowBrand.gray200};
    font-size: ${tokens.typography.fontSize.bodySm};
  }

  .cs-reviewer-live-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.875rem;
    margin-bottom: 0.875rem;
  }

  .cs-reviewer-live-toolbar-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-width: 0;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #050505;
    padding: 1rem;
  }

  .cs-reviewer-focus-grid {
    display: grid;
    grid-template-columns: minmax(24rem, 0.9fr) minmax(0, 1.1fr);
    gap: 1rem;
    align-items: start;
    transition: grid-template-columns ${tokens.animation.duration.micro} ${tokens.animation.easing.standard};
  }

  .cs-reviewer-focus-grid-prompt {
    grid-template-columns: minmax(0, 1.35fr) minmax(22rem, 0.65fr);
  }

  .cs-reviewer-focus-grid-chat {
    grid-template-columns: minmax(20rem, 0.55fr) minmax(0, 1.45fr);
  }

  .cs-reviewer-secondary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .cs-reviewer-agent-rail,
  .cs-reviewer-agent-workspace,
  .cs-reviewer-agent-list,
  .cs-reviewer-review-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .cs-reviewer-agent-list-inline {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .cs-reviewer-agent-button {
    min-height: 3.25rem;
    min-width: min(100%, 13rem);
    border: 1px solid ${webflowBrand.gray700};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    color: ${webflowBrand.gray200};
    padding: 0.75rem;
    text-align: left;
    cursor: pointer;
  }

  .cs-reviewer-agent-button span {
    display: block;
  }

  .cs-reviewer-agent-button span:first-child {
    color: ${webflowBrand.white};
    font-weight: ${tokens.typography.fontWeight.semibold};
  }

  .cs-reviewer-agent-button span + span {
    margin-top: 0.2rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
  }

  .cs-reviewer-agent-button[aria-pressed='true'] {
    background: rgba(20, 110, 245, 0.14);
    border-color: ${webflowBrand.blue};
  }

  .cs-reviewer-workspace-frame {
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.lg};
    background: #030303;
    padding: 1rem;
    margin-top: 1rem;
  }

  .cs-reviewer-workspace-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .cs-reviewer-focus-note {
    margin: 0.15rem 0 0;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.35;
  }

  .cs-reviewer-view-switch {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    padding: 0.25rem;
  }

  .cs-reviewer-view-switch button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    min-height: 2.5rem;
    border: 1px solid ${webflowBrand.gray700};
    border-radius: ${tokens.radii.md};
    background: transparent;
    color: ${webflowBrand.gray200};
    padding: 0;
    cursor: pointer;
  }

  .cs-reviewer-view-switch button svg {
    width: 1rem;
    height: 1rem;
    display: block;
  }

  .cs-reviewer-view-switch button:hover {
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-view-switch button[aria-pressed='true'] {
    background: ${webflowBrand.blue};
    border-color: ${webflowBrand.blue};
    color: ${webflowBrand.white};
  }

  .cs-reviewer-prompt-card {
    min-height: 48rem;
  }

  .cs-reviewer-walkthrough-cue {
    border: 1px solid rgba(20, 110, 245, 0.36);
    border-radius: ${tokens.radii.md};
    background: rgba(20, 110, 245, 0.12);
    padding: 0.75rem;
    color: ${webflowBrand.gray100};
    font-size: ${tokens.typography.fontSize.bodySm};
    line-height: 1.45;
  }

  .cs-reviewer-walkthrough-cue strong {
    display: block;
    color: ${webflowBrand.white};
    margin-bottom: 0.2rem;
  }

  .cs-reviewer-embed-card {
    min-height: 48rem;
  }

  .cs-reviewer-iframe-wrap {
    flex: 1;
    min-height: 43.75rem;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    overflow: hidden;
    background: #000000;
  }

  .cs-reviewer-embed-frame {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 43.75rem;
    border: 0;
    background: #000000;
  }

  .cs-reviewer-review-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.75rem;
    align-items: flex-start;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: ${webflowBrand.gray900};
    padding: 0.75rem;
  }

  .cs-reviewer-review-row strong,
  .cs-reviewer-review-row span,
  .cs-reviewer-review-row a {
    display: block;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  .cs-reviewer-review-row strong {
    color: ${webflowBrand.white};
  }

  .cs-reviewer-review-row span {
    margin-top: 0.2rem;
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.45;
  }

  .cs-reviewer-review-row a {
    margin-top: 0.25rem;
    color: ${webflowBrand.gray100};
    font-size: ${tokens.typography.fontSize.caption};
  }

  .cs-reviewer-number {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.45rem;
    height: 1.45rem;
    flex: 0 0 auto;
    border-radius: 999px;
    background: ${webflowBrand.blue};
    color: ${webflowBrand.white};
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.bold};
  }

  .cs-reviewer-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.75rem;
  }

  .cs-reviewer-pill {
    display: inline-flex;
    align-items: center;
    min-height: 1.75rem;
    border: 1px solid;
    border-radius: 999px;
    padding: 0.25rem 0.55rem;
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.semibold};
  }

  .cs-reviewer-module-layout {
    display: grid;
    grid-template-columns: minmax(13rem, 18rem) minmax(0, 1fr);
    gap: 1rem;
  }

  .cs-reviewer-module-nav {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .cs-reviewer-module-button {
    width: 100%;
    padding: 0.65rem;
    text-align: left;
  }

  .cs-reviewer-module-context {
    display: inline-flex;
    width: fit-content;
    margin-top: 0.4rem;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: 999px;
    background: #050505;
    color: ${webflowBrand.gray200};
    padding: 0.18rem 0.5rem;
    font-size: ${tokens.typography.fontSize.caption};
    line-height: 1.25;
  }

  .cs-reviewer-list {
    margin: 0.75rem 0 0;
    padding-left: 1.1rem;
    color: ${webflowBrand.gray200};
    line-height: ${tokens.typography.lineHeight.relaxed};
  }

  .cs-reviewer-list li + li {
    margin-top: 0.35rem;
  }

  .cs-reviewer-prompt {
    margin-top: 1rem;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #000000;
    padding: 0.875rem;
    color: ${webflowBrand.gray100};
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: ${tokens.typography.fontSize.bodySm};
    line-height: ${tokens.typography.lineHeight.relaxed};
    white-space: pre-wrap;
  }

  .cs-reviewer-prompt-scroll {
    max-height: 34rem;
    overflow: auto;
  }

  .cs-reviewer-focus-grid-prompt .cs-reviewer-prompt-scroll {
    max-height: 40rem;
  }

  .cs-reviewer-focus-grid-chat .cs-reviewer-prompt-scroll {
    max-height: 26rem;
  }

  .cs-reviewer-section-divider {
    height: 1px;
    background: ${webflowBrand.gray800};
    margin: 1rem 0;
  }

  .cs-reviewer-screenshot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
    gap: 0.75rem;
  }

  .cs-reviewer-screenshot-card {
    min-width: 0;
    border: 1px solid ${webflowBrand.gray800};
    border-radius: ${tokens.radii.md};
    background: #050505;
    overflow: hidden;
  }

  .cs-reviewer-screenshot-media {
    display: flex;
    align-items: center;
    justify-content: center;
    aspect-ratio: 16 / 9;
    background: #000000;
    border-bottom: 1px solid ${webflowBrand.gray800};
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.bodySm};
    text-align: center;
    padding: 1rem;
  }

  .cs-reviewer-screenshot-media img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cs-reviewer-screenshot-body {
    padding: 1rem;
  }

  .cs-reviewer-input-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
    gap: 0.75rem;
    margin: 1rem 0;
  }

  .cs-reviewer-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .cs-reviewer-field label {
    color: ${webflowBrand.gray300};
    font-size: ${tokens.typography.fontSize.caption};
    font-weight: ${tokens.typography.fontWeight.semibold};
  }

  .cs-reviewer-field input {
    width: 100%;
    min-height: 2.5rem;
    border: 1px solid ${webflowBrand.gray700};
    border-radius: ${tokens.radii.md};
    background: #000000;
    color: ${webflowBrand.white};
    padding: 0.55rem 0.65rem;
  }

  .cs-reviewer-result {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    gap: 0.75rem;
  }

  @media (max-width: 1180px) {
    .cs-reviewer-start {
      grid-template-columns: 1fr;
    }

    .cs-reviewer-start.cs-reviewer-start-focused,
    .cs-reviewer-live-toolbar,
    .cs-reviewer-focus-grid,
    .cs-reviewer-focus-grid-prompt,
    .cs-reviewer-focus-grid-chat,
    .cs-reviewer-secondary-grid,
    .cs-reviewer-primary-path-grid,
    .cs-reviewer-secondary-access,
    .cs-reviewer-coverage-row {
      grid-template-columns: 1fr;
    }

    .cs-reviewer-flow {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.5rem), 1fr));
    }

    .cs-reviewer-workspace-bar {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (max-width: 860px) {
    .cs-reviewer-shell,
    .cs-reviewer-module-layout {
      grid-template-columns: 1fr;
    }

    .cs-reviewer-sidebar {
      border-right: 0;
      border-bottom: 1px solid ${webflowBrand.gray800};
    }

    .cs-reviewer-tabs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cs-reviewer-mode-summary,
    .cs-reviewer-view-switch {
      grid-template-columns: 1fr;
      width: 100%;
      justify-content: stretch;
    }

    .cs-reviewer-view-switch button {
      flex: 1 1 0;
    }
  }

  @media (max-width: 560px) {
    .cs-reviewer-main,
    .cs-reviewer-sidebar {
      padding: 0.875rem;
    }

    .cs-reviewer-title {
      font-size: 1.75rem;
    }

    .cs-reviewer-tab {
      padding: 0.625rem;
    }

    .cs-reviewer-tab-note {
      display: none;
    }

    .cs-reviewer-metric-stack {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .cs-reviewer-mini-metric {
      padding: 0.625rem;
    }

    .cs-reviewer-mini-value {
      font-size: 1.25rem;
    }

    .cs-reviewer-output-row {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cs-reviewer-shell,
    .cs-reviewer-sidebar,
    .cs-reviewer-focus-grid,
    .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-title,
    .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-intro,
    .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-tabs,
    .cs-reviewer-sidebar:not(.cs-reviewer-sidebar-collapsed) .cs-reviewer-reference-details {
      animation: none;
      transition: none;
    }
  }
`;

type ReviewerCourseIconName =
  | 'practice'
  | 'agent'
  | 'approve'
  | 'typed'
  | 'screenshot'
  | 'tabs'
  | 'split'
  | 'prompt'
  | 'chat'
  | 'coverage'
  | 'designer';

function ReviewerCourseIcon({ name }: { name: ReviewerCourseIconName }) {
  const commonProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    'aria-hidden': true,
    focusable: 'false'
  } as const;

  if (name === 'practice') {
    return (
      <svg {...commonProps}>
        <path d="M6 6.5H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 17.5H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'agent') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="6" width="16" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8.5 11.5H8.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M15.5 11.5H15.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M10 15H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 3.5V6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'approve') {
    return (
      <svg {...commonProps}>
        <path
          d="M5 12.5L10 17L19 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'screenshot') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="6" width="16" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 14H13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'tabs') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="7" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="5" width="7" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === 'split') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 5.5V18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'prompt') {
    return (
      <svg {...commonProps}>
        <path d="M7 5H17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 10H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 15H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'chat') {
    return (
      <svg {...commonProps}>
        <path
          d="M5 7.5C5 6.12 6.12 5 7.5 5H16.5C17.88 5 19 6.12 19 7.5V13.5C19 14.88 17.88 16 16.5 16H10L6.5 19V16H7.5C6.12 16 5 14.88 5 13.5V7.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'coverage') {
    return (
      <svg {...commonProps}>
        <path
          d="M5 6.5H19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 12H19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M5 17.5H19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M8 5V19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M16 5V19"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (name === 'designer') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9H16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8 13H12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M15 13L18 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M6 7H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 12H18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M6 17H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M8.5 5V19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      {collapsed ? (
        <path
          d="M12 12H17M14.75 9.75L17 12L14.75 14.25"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M17 12H12M14.25 9.75L12 12L14.25 14.25"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function TemplateReviewerDifyCourse({
  title = 'Parallel reviews with Dify',
  eyebrow = 'Webflow Marketplace reviews',
  intro = 'Learn how to review multiple templates at once in Dify, using evidence-first agent work, Webflow-ready feedback, and reviewer-owned approval.',
  difyChatUrl = '',
  agentInstructionsUrl = '',
  courseDocUrl = '',
  defaultView = 'overview',
  screenshotAssets = [],
  walkthroughReviewSet = [],
  walkthroughBatchSize = 3,
  agentEmbeds = [],
  showPilotCalculator = true,
  compact = false
}: TemplateReviewerDifyCourseProps) {
  const [activeView, setActiveView] = useState<ReviewerCourseView>(normalizeView(defaultView));
  const [activeModuleId, setActiveModuleId] = useState(trainingModules[0]?.id ?? 'purpose');
  const [activeAgentId, setActiveAgentId] = useState('');
  const [copiedPromptId, setCopiedPromptId] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pilot = usePilotCalculator();

  const screenshotMap = useMemo(() => {
    const assets = parseScreenshotAssets(screenshotAssets);
    return new Map(assets.map((asset) => [asset.id.toUpperCase(), asset]));
  }, [screenshotAssets]);

  const reviewItems = useMemo(
    () => parseWalkthroughReviewItems(walkthroughReviewSet),
    [walkthroughReviewSet]
  );
  const reviewerAgents = useMemo(
    () => mergeReviewerAgentEmbeds(parseReviewerAgentEmbeds(agentEmbeds)),
    [agentEmbeds]
  );
  const visibleAgents = reviewerAgents;
  const activeAgent =
    visibleAgents.find((agent) => agent.id === activeAgentId) ?? visibleAgents[0] ?? null;
  const normalizedBatchSize = Math.max(1, Math.min(10, Math.round(walkthroughBatchSize || 3)));
  const liveQueuePrompt = useMemo(
    () => buildLiveQueueWalkthroughPrompt(normalizedBatchSize),
    [normalizedBatchSize]
  );
  const pinnedReviewSetPrompt = useMemo(
    () => buildPinnedReviewSetPrompt(reviewItems),
    [reviewItems]
  );

  const activeModule =
    trainingModules.find((module) => module.id === activeModuleId) ?? trainingModules[0];

  async function copyPrompt(prompt: PromptItem) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(prompt.body);
    }
    setCopiedPromptId(prompt.id);
    window.setTimeout(() => setCopiedPromptId(''), 1800);
  }

  return (
    <section className="cs-reviewer-course" aria-label={title}>
      <style>{courseCss}</style>
      <div className={`cs-reviewer-shell${sidebarCollapsed ? ' cs-reviewer-shell-collapsed' : ''}`}>
        <aside
          className={`cs-reviewer-sidebar${
            sidebarCollapsed ? ' cs-reviewer-sidebar-collapsed' : ''
          }`}
          aria-label={`${eyebrow} course navigation`}
        >
          <div className="cs-reviewer-sidebar-top">
            <div className="cs-reviewer-brand-row">
              <svg
                className="cs-reviewer-brand-mark"
                viewBox="0 0 1080 674"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M1080 0L735.386 673.684H411.695L555.916 394.481H549.445C430.464 548.934 252.942 650.61 -0.000488281 673.684V398.344C-0.000488281 398.344 161.813 388.787 256.938 288.776H-0.000488281V0.0053214H288.771V237.515L295.252 237.489L413.254 0.0053214H631.644V236.009L638.126 235.999L760.555 0H1080Z"
                  fill="currentColor"
                />
              </svg>
              <button
                className="cs-reviewer-sidebar-toggle"
                type="button"
                aria-label={sidebarCollapsed ? 'Show course sidebar' : 'Hide course sidebar'}
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
                onClick={() => setSidebarCollapsed((current) => !current)}
              >
                <SidebarToggleIcon collapsed={sidebarCollapsed} />
              </button>
            </div>
            {!sidebarCollapsed ? <h2 className="cs-reviewer-title">{title}</h2> : null}
            {!compact && !sidebarCollapsed ? <p className="cs-reviewer-intro">{intro}</p> : null}
          </div>

          {!sidebarCollapsed ? (
            <nav className="cs-reviewer-tabs" aria-label="Course views">
              <div className="cs-reviewer-nav-group">
                <div className="cs-reviewer-nav-heading">Primary workflow</div>
                {[
                  ['overview', 'Start', 'Choose the path'],
                  ['modules', 'Practice lanes', 'Learn the patterns'],
                  ['agents', 'Live Dify', 'Run the rehearsal']
                ].map(([view, label, note]) => (
                  <button
                    type="button"
                    className="cs-reviewer-tab"
                    aria-pressed={activeView === view}
                    key={view}
                    onClick={() => setActiveView(view as ReviewerCourseView)}
                  >
                    <span className="cs-reviewer-tab-label">{label}</span>
                    <span className="cs-reviewer-tab-note">{note}</span>
                  </button>
                ))}
              </div>
            </nav>
          ) : null}

          {!compact && !sidebarCollapsed ? (
            <SidebarReferenceDetails
              agentInstructionsUrl={agentInstructionsUrl}
              courseDocUrl={courseDocUrl}
              difyChatUrl={difyChatUrl}
              reviewerAgentCount={visibleAgents.length}
            />
          ) : null}
        </aside>

        <main className="cs-reviewer-main">
          {activeView === 'overview' ? (
            <OverviewView
              copiedPromptId={copiedPromptId}
              onCopyPrompt={copyPrompt}
              onSelectAgents={() => setActiveView('agents')}
              onSelectModules={() => setActiveView('modules')}
            />
          ) : null}

          {activeView === 'modules' ? (
            <ModulesView
              activeModule={activeModule}
              activeModuleId={activeModuleId}
              copiedPromptId={copiedPromptId}
              onCopyPrompt={copyPrompt}
              onSelectModule={setActiveModuleId}
            />
          ) : null}

          {activeView === 'agents' ? (
            <AgentPracticeView
              activeAgent={activeAgent}
              agents={visibleAgents}
              copiedPromptId={copiedPromptId}
              liveQueuePrompt={liveQueuePrompt}
              onCopyPrompt={copyPrompt}
              onSelectAgent={setActiveAgentId}
              pinnedReviewSetPrompt={pinnedReviewSetPrompt}
              reviewItems={reviewItems}
            />
          ) : null}

          {activeView === 'screenshots' ? <ScreenshotsView screenshotMap={screenshotMap} /> : null}

          {activeView === 'pilot' && showPilotCalculator ? <PilotView pilot={pilot} /> : null}

          {activeView === 'pilot' && !showPilotCalculator ? (
            <section className="cs-reviewer-panel">
              <h3 className="cs-reviewer-h3">Pilot calculator is hidden</h3>
              <p className="cs-reviewer-body">
                Enable the pilot calculator prop to show time-savings inputs.
              </p>
            </section>
          ) : null}
        </main>
      </div>
    </section>
  );
}

function SidebarReferenceDetails({
  agentInstructionsUrl,
  courseDocUrl,
  difyChatUrl,
  reviewerAgentCount
}: {
  agentInstructionsUrl: string;
  courseDocUrl: string;
  difyChatUrl: string;
  reviewerAgentCount: number;
}) {
  return (
    <details className="cs-reviewer-reference-details">
      <summary>Reference</summary>
      <div className="cs-reviewer-reference-details-body">
        <div className="cs-reviewer-metric-stack" aria-label="Course summary">
          <div className="cs-reviewer-mini-metric">
            <span className="cs-reviewer-mini-value">{trainingModules.length}</span>
            <span className="cs-reviewer-mini-label">Modules</span>
          </div>
          <div className="cs-reviewer-mini-metric">
            <span className="cs-reviewer-mini-value">{coursePromptCount}</span>
            <span className="cs-reviewer-mini-label">Prompts</span>
          </div>
          <div className="cs-reviewer-mini-metric">
            <span className="cs-reviewer-mini-value">{reviewerAgentCount}</span>
            <span className="cs-reviewer-mini-label">Agent lanes</span>
          </div>
        </div>

        <div className="cs-reviewer-actions" style={{ marginTop: '0.75rem' }}>
          {difyChatUrl.trim() ? (
            <a className="cs-reviewer-link" href={difyChatUrl} target="_blank" rel="noreferrer">
              Open Dify
            </a>
          ) : null}
          {courseDocUrl.trim() ? (
            <a className="cs-reviewer-link" href={courseDocUrl} target="_blank" rel="noreferrer">
              Course doc
            </a>
          ) : null}
          {agentInstructionsUrl.trim() ? (
            <a
              className="cs-reviewer-link"
              href={agentInstructionsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Agent instructions
            </a>
          ) : null}
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <TrustedContextDetails />
        </div>
      </div>
    </details>
  );
}

function TrustedContextDetails() {
  return (
    <details className="cs-reviewer-trust-details">
      <summary>How Dify gets trusted context</summary>
      <div className="cs-reviewer-trust-grid">
        {[
          {
            label: 'Instructions',
            detail: 'Set the reviewer role, no-write boundary, evidence order, and approval rules.'
          },
          {
            label: 'Knowledge',
            detail: 'Keeps submission guidelines and the grading rubric close to the agent.'
          },
          {
            label: 'MCP tools',
            detail:
              'Loads current review context, queue data, validator output, and safe write tools.'
          },
          {
            label: 'E2B sandbox',
            detail:
              'Available when reviewers need bounded public-site checks beyond validator coverage.'
          }
        ].map((item) => (
          <div className="cs-reviewer-trust-row" key={item.label}>
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function OverviewView({
  copiedPromptId,
  onCopyPrompt,
  onSelectAgents,
  onSelectModules
}: {
  copiedPromptId: string;
  onCopyPrompt: (prompt: PromptItem) => void;
  onSelectAgents: () => void;
  onSelectModules: () => void;
}) {
  const [activeModeLabel, setActiveModeLabel] = useState(parallelReviewModes[0]?.label ?? '');
  const activeMode =
    parallelReviewModes.find((mode) => mode.label === activeModeLabel) ?? parallelReviewModes[0];
  const modeIconByLabel: Record<string, ReviewerCourseIconName> = {
    'Typed batch': 'typed',
    'Screenshot batch': 'screenshot',
    'Multi-tab lanes': 'tabs'
  };

  return (
    <section className="cs-reviewer-panel">
      <div className="cs-reviewer-start cs-reviewer-start-simple">
        <div className="cs-reviewer-start-main">
          <div className="cs-reviewer-eyebrow">Start here</div>
          <h3 className="cs-reviewer-h2">Run reviews in parallel</h3>
          <p className="cs-reviewer-body">
            Give Dify clear published URLs, let the agent gather evidence across lanes, then compare
            the drafts before anything is written back.
          </p>

          <div className="cs-reviewer-start-actions">
            <button
              className="cs-reviewer-copy cs-reviewer-primary"
              type="button"
              onClick={onSelectModules}
            >
              <ReviewerCourseIcon name="practice" />
              Start with practice lanes
            </button>
            <button className="cs-reviewer-copy" type="button" onClick={onSelectAgents}>
              <ReviewerCourseIcon name="agent" />
              Open live Dify
            </button>
            <button
              className="cs-reviewer-copy"
              type="button"
              onClick={() => onCopyPrompt(starterPrompt)}
            >
              <ReviewerCourseIcon name="typed" />
              {copiedPromptId === starterPrompt.id ? 'Copied starter prompt' : 'Copy starter'}
            </button>
          </div>
        </div>
      </div>

      <div className="cs-reviewer-primary-path-grid" aria-label="Primary course experiences">
        <article className="cs-reviewer-card cs-reviewer-path-card">
          <div>
            <span className="cs-reviewer-icon-badge">
              <ReviewerCourseIcon name="practice" />
            </span>
            <div className="cs-reviewer-eyebrow">Learn</div>
            <h4 className="cs-reviewer-h3">Practice the lane</h4>
          </div>
          <p className="cs-reviewer-body">
            Learn the evidence order, role boundary, batch patterns, and manual stop signals.
          </p>
        </article>

        <article className="cs-reviewer-card cs-reviewer-path-card">
          <div>
            <span className="cs-reviewer-icon-badge">
              <ReviewerCourseIcon name="agent" />
            </span>
            <div className="cs-reviewer-eyebrow">Run</div>
            <h4 className="cs-reviewer-h3">Use the embedded agent</h4>
          </div>
          <p className="cs-reviewer-body">
            Copy one walkthrough prompt, paste it into Dify, and keep prompt plus chat together.
          </p>
        </article>

        <article className="cs-reviewer-card cs-reviewer-path-card">
          <div>
            <span className="cs-reviewer-icon-badge">
              <ReviewerCourseIcon name="approve" />
            </span>
            <div className="cs-reviewer-eyebrow">Decide</div>
            <h4 className="cs-reviewer-h3">Compare before writing</h4>
          </div>
          <p className="cs-reviewer-body">
            Use evidence labels to approve, edit, or go manual. Nothing writes without reviewer
            approval.
          </p>
        </article>
      </div>

      <article className="cs-reviewer-card" style={{ marginBottom: '1rem' }}>
        <div className="cs-reviewer-section-head">
          <div>
            <div className="cs-reviewer-eyebrow">Choose the parallel mode</div>
            <h4 className="cs-reviewer-h3">{activeMode?.label}</h4>
            <p className="cs-reviewer-body" style={{ marginBottom: 0 }}>
              {activeMode?.detail}
            </p>
          </div>
          <span className="cs-reviewer-pill" style={tonePillStyle('required')}>
            {activeMode?.output}
          </span>
        </div>
        <div className="cs-reviewer-mode-toggle" role="group" aria-label="Parallel review mode">
          {parallelReviewModes.map((mode) => (
            <button
              type="button"
              key={mode.label}
              aria-pressed={activeModeLabel === mode.label}
              onClick={() => setActiveModeLabel(mode.label)}
            >
              <span className="cs-reviewer-mode-button-label">
                <ReviewerCourseIcon name={modeIconByLabel[mode.label] ?? 'typed'} />
                {mode.label}
              </span>
              <small>{mode.detail}</small>
            </button>
          ))}
        </div>
      </article>
    </section>
  );
}

function ModulesView({
  activeModule,
  activeModuleId,
  copiedPromptId,
  onCopyPrompt,
  onSelectModule
}: {
  activeModule: TrainingModule;
  activeModuleId: string;
  copiedPromptId: string;
  onCopyPrompt: (prompt: PromptItem) => void;
  onSelectModule: (moduleId: string) => void;
}) {
  return (
    <section className="cs-reviewer-panel">
      <div className="cs-reviewer-module-layout">
        <nav className="cs-reviewer-module-nav" aria-label="Training modules">
          {trainingModules.map((module, index) => (
            <button
              type="button"
              className="cs-reviewer-module-button"
              aria-pressed={activeModuleId === module.id}
              key={module.id}
              onClick={() => onSelectModule(module.id)}
            >
              <span>
                {index + 1}. {module.title}
              </span>
              <span className="cs-reviewer-module-context">{module.context}</span>
            </button>
          ))}
        </nav>

        <article className="cs-reviewer-card">
          <div className="cs-reviewer-section-head">
            <div>
              <div className="cs-reviewer-eyebrow">{activeModule.context}</div>
              <h3 className="cs-reviewer-h2">{activeModule.title}</h3>
              <p className="cs-reviewer-body">{activeModule.outcome}</p>
              {activeModule.buildsOn ? (
                <p className="cs-reviewer-body" style={{ marginTop: '0.625rem' }}>
                  <strong>Builds on:</strong> {activeModule.buildsOn}
                </p>
              ) : null}
            </div>
          </div>

          <h4 className="cs-reviewer-h3">Learn</h4>
          <ul className="cs-reviewer-list">
            {activeModule.keyPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <h4 className="cs-reviewer-h3" style={{ marginTop: '1rem' }}>
            Practice in Dify
          </h4>
          <p className="cs-reviewer-body">{activeModule.practice}</p>

          {activeModule.expectedOutput ? (
            <>
              <div className="cs-reviewer-section-divider" />
              <h4 className="cs-reviewer-h3">What good looks like</h4>
              <p className="cs-reviewer-body">{activeModule.expectedOutput}</p>
            </>
          ) : null}

          {activeModule.reviewerChecks?.length ? (
            <>
              <h4 className="cs-reviewer-h3" style={{ marginTop: '1rem' }}>
                Reviewer checks
              </h4>
              <ul className="cs-reviewer-list">
                {activeModule.reviewerChecks.map((check) => (
                  <li key={check}>{check}</li>
                ))}
              </ul>
            </>
          ) : null}

          {activeModule.commonFailure ? (
            <div className="cs-reviewer-prompt">Watch for: {activeModule.commonFailure}</div>
          ) : null}

          <div className="cs-reviewer-pills" aria-label="Screenshot references">
            {activeModule.screenshots.map((id) => (
              <span className="cs-reviewer-pill" style={tonePillStyle('required')} key={id}>
                {id}
              </span>
            ))}
          </div>

          {activeModule.prompt ? (
            <>
              <div className="cs-reviewer-prompt">{activeModule.prompt}</div>
              <button
                className="cs-reviewer-copy"
                type="button"
                onClick={() =>
                  onCopyPrompt({
                    id: activeModule.id,
                    label: activeModule.title,
                    body: activeModule.prompt ?? ''
                  })
                }
              >
                {copiedPromptId === activeModule.id ? 'Copied' : 'Copy prompt'}
              </button>
            </>
          ) : null}
        </article>
      </div>
    </section>
  );
}

function AgentPracticeView({
  activeAgent,
  agents,
  copiedPromptId,
  liveQueuePrompt,
  onCopyPrompt,
  onSelectAgent,
  pinnedReviewSetPrompt,
  reviewItems
}: {
  activeAgent: ReviewerAgentEmbed | null;
  agents: ReviewerAgentEmbed[];
  copiedPromptId: string;
  liveQueuePrompt: PromptItem;
  onCopyPrompt: (prompt: PromptItem) => void;
  onSelectAgent: (agentId: string) => void;
  pinnedReviewSetPrompt: PromptItem;
  reviewItems: WalkthroughReviewItem[];
}) {
  const [focusMode, setFocusMode] = useState<AgentPracticeFocusMode>('split');
  const [openSupportPanel, setOpenSupportPanel] = useState<AgentPracticeSupportPanel | ''>('');
  const defaultPrompt = reviewItems.length ? pinnedReviewSetPrompt : liveQueuePrompt;
  const focusOptions: Array<{
    id: AgentPracticeFocusMode;
    label: string;
    note: string;
    icon: ReviewerCourseIconName;
  }> = [
    { id: 'split', label: 'Split', note: 'Prompt and chat together', icon: 'split' },
    { id: 'prompt', label: 'Prompt', note: 'Read and edit the prompt', icon: 'prompt' },
    { id: 'chat', label: 'Chat', note: 'Watch the Dify run', icon: 'chat' }
  ];
  const activeFocusOption =
    focusOptions.find((option) => option.id === focusMode) ?? focusOptions[0];

  return (
    <section className="cs-reviewer-panel">
      <div className="cs-reviewer-section-head">
        <div>
          <div className="cs-reviewer-eyebrow">Live practice</div>
          <h3 className="cs-reviewer-h2">Run the Dify rehearsal</h3>
          <p className="cs-reviewer-body">
            This is where reviewers practice the real motion: choose an agent, copy a review prompt,
            paste it into Dify, and confirm the evidence boundary before trusting the new workflow.
            Practice lanes teach the pattern. Live Dify proves it with the agent.
          </p>
        </div>
      </div>

      <div className="cs-reviewer-live-toolbar">
        <div className="cs-reviewer-live-toolbar-group">
          <div>
            <div className="cs-reviewer-eyebrow">Reviewer agent</div>
            <h4 className="cs-reviewer-h3">Choose the Dify lane</h4>
          </div>
          <div className="cs-reviewer-agent-list cs-reviewer-agent-list-inline">
            {agents.map((agent) => (
              <button
                type="button"
                className="cs-reviewer-agent-button"
                aria-pressed={activeAgent?.id === agent.id}
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
              >
                <span>{agent.name}</span>
                <span>{agent.role ?? 'Reviewer agent'}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      <section className="cs-reviewer-workspace-frame" aria-label="Prompt and Dify chat workspace">
        <div className="cs-reviewer-workspace-bar">
          <div>
            <div className="cs-reviewer-eyebrow">Workspace view</div>
            <h4 className="cs-reviewer-h3">{activeFocusOption.label} view</h4>
            <p className="cs-reviewer-focus-note">{activeFocusOption.note}</p>
          </div>
          <div className="cs-reviewer-view-switch" role="group" aria-label="Change prompt and chat view">
            {focusOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                aria-pressed={focusMode === option.id}
                aria-label={`${option.label} view: ${option.note}`}
                title={`${option.label}: ${option.note}`}
                onClick={() => setFocusMode(option.id)}
              >
                <ReviewerCourseIcon name={option.icon} />
                <span className="cs-reviewer-sr-only">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className={`cs-reviewer-focus-grid cs-reviewer-focus-grid-${focusMode}`}>
          <article className="cs-reviewer-card cs-reviewer-prompt-card">
            <div className="cs-reviewer-eyebrow">Walkthrough prompt</div>
            <h4 className="cs-reviewer-h3">Copy, paste, then watch the run</h4>
            <p className="cs-reviewer-body">
              Use the live queue prompt when the agent should pull eligible rows. Use the pinned
              prompt when this course page supplies the review set.
            </p>
            <div className="cs-reviewer-walkthrough-cue">
              <strong>Walkthrough recording path</strong>
              Copy this prompt into the selected Dify agent. For transparency, briefly show Dify's
              backend conversation logs in a separate tab during the recording.
            </div>
            <div className="cs-reviewer-start-actions">
              <button
                className="cs-reviewer-copy cs-reviewer-primary"
                type="button"
                onClick={() => onCopyPrompt(defaultPrompt)}
              >
                {copiedPromptId === defaultPrompt.id ? 'Copied prompt' : 'Copy walkthrough prompt'}
              </button>
            </div>
            <div className="cs-reviewer-prompt cs-reviewer-prompt-scroll">{defaultPrompt.body}</div>
          </article>

          <article className="cs-reviewer-card cs-reviewer-embed-card">
            <div className="cs-reviewer-section-head">
              <div>
                <div className="cs-reviewer-eyebrow">Embedded Dify chat</div>
                <h4 className="cs-reviewer-h3">{activeAgent?.name ?? 'No agent configured'}</h4>
              </div>
              {activeAgent?.embedUrl ? (
                <a
                  className="cs-reviewer-link"
                  href={activeAgent.embedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open tab
                </a>
              ) : null}
            </div>
            {activeAgent?.embedUrl ? (
              <div className="cs-reviewer-iframe-wrap">
                <iframe
                  className="cs-reviewer-embed-frame"
                  title={`${activeAgent.name} Dify chat`}
                  src={activeAgent.embedUrl}
                  allow="microphone"
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="cs-reviewer-body">
                Add agent embed URLs in the component props to make each reviewer lane available.
              </p>
            )}
          </article>
        </div>

      </section>

      <div
        className={`cs-reviewer-secondary-access${
          openSupportPanel ? '' : ' cs-reviewer-secondary-access-closed'
        }`}
        aria-label="Live chat support panels"
      >
        <article className="cs-reviewer-card">
          <div className="cs-reviewer-eyebrow">Support panels</div>
          <h4 className="cs-reviewer-h3">Keep the main workspace clear</h4>
          <p className="cs-reviewer-body">
            Open the supporting context only when the reviewer needs it. The prompt and chat stay
            primary.
          </p>
          <div className="cs-reviewer-start-actions">
            {(
              [
                ['coverage', 'Coverage boundary', 'coverage'],
                ['review-set', reviewItems.length ? 'Pinned URLs' : 'Queue source', 'typed'],
                ['sandbox', 'Sandbox guidance', 'designer']
              ] as Array<[AgentPracticeSupportPanel, string, ReviewerCourseIconName]>
            ).map(([id, label, icon]) => (
              <button
                className="cs-reviewer-copy"
                type="button"
                aria-pressed={openSupportPanel === id}
                key={id}
                onClick={() =>
                  setOpenSupportPanel((current) =>
                    current === id ? '' : id
                  )
                }
              >
                <ReviewerCourseIcon name={icon} />
                {label}
              </button>
            ))}
          </div>
        </article>

        {openSupportPanel ? (
          <article className="cs-reviewer-card">
            {openSupportPanel === 'coverage' ? (
              <CoverageBoundaryPanel copiedPromptId={copiedPromptId} onCopyPrompt={onCopyPrompt} />
            ) : null}

            {openSupportPanel === 'review-set' ? (
              <>
                <div className="cs-reviewer-eyebrow">Review set</div>
                <h4 className="cs-reviewer-h3">
                  {reviewItems.length ? 'Pinned URLs on this page' : 'Live queue pull'}
                </h4>
                {reviewItems.length ? (
                  <div className="cs-reviewer-review-list">
                    {reviewItems.map((item, index) => (
                      <div
                        className="cs-reviewer-review-row"
                        key={`${item.name}-${item.publishedUrl}`}
                      >
                        <span className="cs-reviewer-number">{index + 1}</span>
                        <div>
                          <strong>{item.name}</strong>
                          <span>{[item.versionId, item.status].filter(Boolean).join(' | ')}</span>
                          <a href={item.publishedUrl} target="_blank" rel="noreferrer">
                            {item.publishedUrl}
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="cs-reviewer-body">
                    No pinned URLs are configured. The live queue prompt asks Dify to pull
                    review-ready rows through the review tools, show the rows first, and wait for
                    reviewer confirmation.
                  </p>
                )}
              </>
            ) : null}

            {openSupportPanel === 'sandbox' ? (
              <>
                <div className="cs-reviewer-eyebrow">Sandbox/run_code</div>
                <h4 className="cs-reviewer-h3">Available when the reviewer needs reassurance</h4>
                <p className="cs-reviewer-body">
                  The validator stays first. Sandbox/run_code is there for bounded public-site
                  checks: visible text, utility pages, forms, metadata, links, or a narrow
                  typo/content pass.
                </p>
                <ul className="cs-reviewer-list">
                  <li>Ask for the specific URL or path to fetch.</li>
                  <li>Keep the scope narrow enough to audit.</li>
                  <li>Require Auto, Partial, or Manual evidence labels.</li>
                </ul>
              </>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}

function CoverageBoundaryPanel({
  copiedPromptId,
  onCopyPrompt
}: {
  copiedPromptId: string;
  onCopyPrompt: (prompt: PromptItem) => void;
}) {
  const prompt: PromptItem = {
    id: 'coverage-boundary',
    label: 'Coverage boundary',
    body: coursePromptBodies.coverageBoundary
  };

  return (
    <>
      <div className="cs-reviewer-eyebrow">Guideline coverage</div>
      <h4 className="cs-reviewer-h3">Know what Dify can prove</h4>
      <p className="cs-reviewer-body">
        Use this when a reviewer needs to decide whether evidence is enough or whether the template
        still needs a Designer pass.
      </p>

      <div className="cs-reviewer-coverage-grid" aria-label="Agent coverage and Designer checks">
        {coverageBoundaryItems.map((item) => (
          <div className="cs-reviewer-coverage-row" key={item.area}>
            <div className="cs-reviewer-coverage-area">
              <span className="cs-reviewer-icon-badge">
                <ReviewerCourseIcon name={item.evidence === 'Manual' ? 'designer' : 'coverage'} />
              </span>
              <div>
                <strong>{item.area}</strong>
                <span>{item.evidence}</span>
              </div>
            </div>
            <div>
              <span className="cs-reviewer-coverage-label">Agent covers</span>
              <p>{item.agentCovers}</p>
            </div>
            <div>
              <span className="cs-reviewer-coverage-label">Reviewer confirms in Designer</span>
              <p>{item.reviewerConfirms}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="cs-reviewer-designer-checks">
        <div>
          <div className="cs-reviewer-eyebrow">Manual stop signal</div>
          <h5>Open Designer when the issue is not public-page evidence.</h5>
        </div>
        <ul className="cs-reviewer-list">
          {designerConfirmationChecks.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </div>

      <button className="cs-reviewer-copy" type="button" onClick={() => onCopyPrompt(prompt)}>
        <ReviewerCourseIcon name="coverage" />
        {copiedPromptId === prompt.id ? 'Copied coverage prompt' : 'Copy coverage prompt'}
      </button>
    </>
  );
}

function ScreenshotsView({ screenshotMap }: { screenshotMap: Map<string, ScreenshotAsset> }) {
  return (
    <section className="cs-reviewer-panel">
      <div className="cs-reviewer-section-head">
        <div>
          <div className="cs-reviewer-eyebrow">Capture guide</div>
          <h3 className="cs-reviewer-h2">Show the moments reviewers need to recognize</h3>
          <p className="cs-reviewer-body">
            Screenshots make the course practical. Capture the points where reviewers choose a
            parallel mode, confirm evidence quality, and decide whether to approve or go manual.
          </p>
        </div>
      </div>

      <div className="cs-reviewer-pills" style={{ marginBottom: '1rem' }}>
        <span className="cs-reviewer-pill" style={tonePillStyle('required')}>
          Required: {screenshotRequirements.filter((item) => item.required).length}
        </span>
        <span className="cs-reviewer-pill" style={tonePillStyle('optional')}>
          Optional: {screenshotRequirements.filter((item) => !item.required).length}
        </span>
        <span className="cs-reviewer-pill" style={tonePillStyle('warning')}>
          Redact secrets, emails, PII, and unrelated rows
        </span>
      </div>

      <div className="cs-reviewer-screenshot-grid">
        {screenshotRequirements.map((requirement) => {
          const asset = screenshotMap.get(requirement.id);

          return (
            <article className="cs-reviewer-screenshot-card" key={requirement.id}>
              <div className="cs-reviewer-screenshot-media">
                {asset ? (
                  <img src={asset.url} alt={asset.alt ?? requirement.moment} loading="lazy" />
                ) : (
                  <span>{requirement.id} screenshot needed</span>
                )}
              </div>
              <div className="cs-reviewer-screenshot-body">
                <div className="cs-reviewer-section-head" style={{ marginBottom: '0.5rem' }}>
                  <div>
                    <div className="cs-reviewer-eyebrow">{requirement.placement}</div>
                    <h4 className="cs-reviewer-h3">
                      {requirement.id}: {requirement.moment}
                    </h4>
                  </div>
                  <span
                    className="cs-reviewer-pill"
                    style={tonePillStyle(requirement.required ? 'required' : 'optional')}
                  >
                    {requirement.required ? 'Required' : 'Optional'}
                  </span>
                </div>
                <p className="cs-reviewer-body">
                  <strong>Capture:</strong> {requirement.capture}
                </p>
                <p className="cs-reviewer-body">
                  <strong>Why:</strong> {requirement.why}
                </p>
                <p className="cs-reviewer-body">
                  <strong>Redact:</strong> {requirement.redact}
                </p>
                {asset?.caption ? <p className="cs-reviewer-body">{asset.caption}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PilotView({ pilot }: { pilot: ReturnType<typeof usePilotCalculator> }) {
  return (
    <section className="cs-reviewer-panel">
      <div className="cs-reviewer-section-head">
        <div>
          <div className="cs-reviewer-eyebrow">For leads</div>
          <h3 className="cs-reviewer-h2">Measure the impact without slowing the review</h3>
          <p className="cs-reviewer-body">
            Use this as a directional calculator during onboarding. The pilot should track active
            minutes, corrections, rework, and whether the reviewer accepted or edited each draft.
          </p>
        </div>
      </div>

      <div className="cs-reviewer-input-grid">
        <NumberField
          label="Assets in batch"
          value={pilot.assetCount}
          onChange={pilot.setAssetCount}
        />
        <NumberField
          label="Manual minutes per asset"
          value={pilot.manualMinutes}
          onChange={pilot.setManualMinutes}
        />
        <NumberField
          label="Dify active minutes per asset"
          value={pilot.difyMinutes}
          onChange={pilot.setDifyMinutes}
        />
        <NumberField
          label="Correction and rework minutes"
          value={pilot.reworkMinutes}
          onChange={pilot.setReworkMinutes}
        />
      </div>

      <div className="cs-reviewer-result">
        <article className="cs-reviewer-card">
          <div className="cs-reviewer-eyebrow">Manual sequential review</div>
          <span className="cs-reviewer-mini-value">{formatMinutes(pilot.manualTotal)}</span>
          <p className="cs-reviewer-body">
            Opening each asset, reviewing existing feedback, checking Designer/public URLs,
            returning to Airtable, and entering feedback/status.
          </p>
        </article>
        <article className="cs-reviewer-card">
          <div className="cs-reviewer-eyebrow">Dify-assisted batch review</div>
          <span className="cs-reviewer-mini-value">{formatMinutes(pilot.difyTotal)}</span>
          <p className="cs-reviewer-body">
            Reviewing multiple published URLs in one chat, using validator-first evidence, targeted
            gap-fill, and grouped draft feedback.
          </p>
        </article>
        <article className="cs-reviewer-card">
          <div className="cs-reviewer-eyebrow">Estimated active time saved</div>
          <span className="cs-reviewer-mini-value">{formatMinutes(pilot.savedMinutes)}</span>
          <p className="cs-reviewer-body">
            {pilot.savedPercent}% reduction in active minutes for this batch, before final pilot
            calibration.
          </p>
        </article>
      </div>

      <div className="cs-reviewer-grid" style={{ marginTop: '1rem' }}>
        {[
          'Reviewer active minutes',
          'Number of tools switched',
          'Draft feedback reused without edits',
          'Draft feedback corrected by reviewer',
          'Manual checks still required',
          'Rework after status or feedback write'
        ].map((metric) => (
          <div className="cs-reviewer-flow-step" key={metric}>
            <span className="cs-reviewer-number">+</span>
            <span>{metric}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="cs-reviewer-field">
      <label>{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

export default TemplateReviewerDifyCourse;
