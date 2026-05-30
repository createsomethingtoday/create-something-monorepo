export type ReviewerCourseView = 'overview' | 'modules' | 'agents' | 'screenshots' | 'pilot';

export interface ScreenshotAsset {
  id: string;
  url: string;
  alt?: string;
  caption?: string;
}

export interface WalkthroughReviewItem {
  name: string;
  publishedUrl: string;
  versionId?: string;
  assetId?: string;
  status?: string;
  notes?: string;
}

export interface ReviewerAgentEmbed {
  id: string;
  name: string;
  embedUrl: string;
  role?: string;
}

export type PromptItem = {
  id: string;
  label: string;
  body: string;
};

export const defaultAgentEmbeds: ReviewerAgentEmbed[] = [
  {
    id: 'eric-hub',
    name: 'ERIC HUB',
    role: 'Template reviewer agent',
    embedUrl: 'https://udify.app/chatbot/yQFSjVPEPQOUi3EK'
  },
  {
    id: 'natalia-hub',
    name: 'NATALIA HUB',
    role: 'Template reviewer agent',
    embedUrl: 'https://udify.app/chatbot/UFJEfdLz5PVhKETI'
  },
  {
    id: 'mariana-hub',
    name: 'MARIANA HUB',
    role: 'Template reviewer agent',
    embedUrl: 'https://udify.app/chatbot/KqRs1GTWwH7ibVbt'
  },
  {
    id: 'vicki-hub',
    name: 'VICKI HUB',
    role: 'Template reviewer agent',
    embedUrl: 'https://udify.app/chatbot/zSHH89gR94W5jGgm'
  }
];

export const coursePromptBodies = {
  purpose:
    'Before we start, give me a short role card for this review workflow. Use only these headings: Can help with, Needs my approval, Evidence order, Sandbox/run_code use. Keep it under 120 words. Keep this read-only. Do not write feedback or change status.',
  safeFlow:
    'Using the role card above, give me a compact batch-intake card before review starts. Use only these headings: Required fields, Optional context, Evidence order, Write boundary, Next input. Keep it under 150 words. Start read-only. End by asking me to paste rows or upload a queue screenshot.',
  singleReview:
    'Using the confirmed asset context and validator-first plan above, review this Webflow template from the published URL. Do not write or change status. Separate confirmed findings, caveats, manual checks, and draft feedback.',
  typedBatch:
    'Using the same evidence shape from the single-lane review, review these templates in parallel from their published URLs. For each item, use validator evidence first. Use sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return separate draft feedback with evidence labels.',
  screenshotBatch:
    'Extract the template names and published URLs from this screenshot so we can use the same batch-review structure. Show me the extracted list first. Do not review anything until I confirm the list.',
  multiTab:
    'I am running this chat as one lane in a parallel review, using the same single-lane evidence shape. Review only this template from the published URL below. Use validator evidence first. Use targeted sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return a compact lane summary with confirmed findings, caveats, manual checks, and draft feedback. Do not write or change status.',
  agentFeedback:
    'Using the current evidence gathered above, compare this existing Agent Review Feedback with fresh evidence from the current published URL. Treat old feedback as context only. Keep, revise, or discard each finding based on current evidence, and label each result Auto, Partial, or Manual.',
  statusActions:
    'Using the confirmed findings, caveats, and draft feedback above, rewrite this feedback so it is specific, helpful, and creator-facing. Preserve the evidence and caveats. Then wait for my exact approval before writing anything or changing status.',
  manualOverride:
    'Based on the caveats or Partial/Manual findings above, stop the tool attempts if the current tools cannot prove the issue. Return a manual checklist that says what could not be verified, what I should inspect in Designer or the public URL, and what evidence would be needed before writing feedback.',
  coverageBoundary:
    'Using the current validator, sandbox, and review-context evidence, create a coverage boundary against the Webflow Marketplace submission guidelines. Use only these headings: Agent-covered, Needs Designer confirmation, Manual blockers, Safe next step. Label each item Auto, Partial, or Manual. Do not write feedback or change status.',
  narrowFollowUp:
    'Using the same published URL and evidence context above, run a narrow follow-up pass for visible typos, placeholder copy, and content issues only. Do not expand into design or status recommendations.',
  pilot:
    'Using this completed review batch as the sample, help me log time-savings data. Track active reviewer minutes, number of assets, tool switches, accepted drafts, edited drafts, manual checks, corrections, and rework. Return a compact before/after summary.'
} as const;

export const starterPrompt: PromptItem = {
  id: 'starter',
  label: 'Parallel review starter',
  body: 'Help me run parallel Webflow Marketplace template reviews in Dify. Start read-only. I will provide either a typed list, a queue screenshot, or one template per chat tab. For every template, use published-site validator evidence first. If I ask for a bounded public-site check at any point, use sandbox/run_code to fill that specific gap. Keep findings grouped by template, label evidence as Auto, Partial, or Manual, and return draft feedback for reviewer approval. Do not write feedback or change status unless I approve the exact action.'
};

export function buildLiveQueueWalkthroughPrompt(batchSize = 3): PromptItem {
  return {
    id: 'walkthrough-live-queue',
    label: 'Live queue walkthrough',
    body: `Pull up to ${batchSize} review-ready submissions from the review queue or Airtable-backed review tools for a training walkthrough. Start read-only. Only use rows that include a template name, version ID, current review status, and published URL. Show me the rows first and wait for my confirmation before reviewing. After I confirm, review the published URLs in parallel with validator evidence first. Use targeted sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return grouped draft feedback per template. If queue tools are unavailable, ask me to paste rows or upload a queue screenshot. Do not write feedback or change status.`
  };
}

export function buildPinnedReviewSetPrompt(items: WalkthroughReviewItem[]): PromptItem {
  const rows = items.length
    ? items.map((item, index) => `${index + 1}. ${formatReviewItem(item)}`).join('\n')
    : '- No pinned walkthrough rows are configured.';

  return {
    id: 'walkthrough-pinned-set',
    label: 'Pinned URL walkthrough',
    body: `Use this walkthrough review set for a read-only parallel review. First confirm the rows below and ask me to approve the set before reviewing. After I confirm, review each published URL independently with validator evidence first. Use targeted sandbox/run_code when validator coverage is unavailable, incomplete, contradicted, or when I ask for a bounded public-site check. Return grouped draft feedback per template. Label evidence as Auto, Partial, or Manual. Do not write feedback or change status.\n\nRows:\n${rows}`
  };
}

function formatReviewItem(item: WalkthroughReviewItem): string {
  const parts = [
    item.name,
    item.versionId ? `Version ID: ${item.versionId}` : '',
    item.assetId ? `Asset ID: ${item.assetId}` : '',
    item.status ? `Status: ${item.status}` : '',
    `Published URL: ${item.publishedUrl}`,
    item.notes ? `Notes: ${item.notes}` : ''
  ].filter(Boolean);

  return parts.join(' | ');
}
