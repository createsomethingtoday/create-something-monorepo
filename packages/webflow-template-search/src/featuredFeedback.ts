import { z } from 'zod';

export const FEATURED_REVIEW_FIELD = '⭐Reviewer Pick Reason (featured templates)';

export const FEATURED_REVIEWER_PICK_FIELD = 'Reviewer pick (featured templates)';

export interface AirtableFeaturedRecord {
  id: string;
  fields: Record<string, unknown>;
}

export interface FeaturedReviewItem {
  id: string;
  name: string;
  isReviewerPick: boolean;
  originalRationale: string;
  reviewUrl: string | null;
  previewUrl: string | null;
  listingUrl: string | null;
  descriptionShort: string;
  descriptionLongText: string;
  templateType: string;
  categories: string;
  categoryGroups: string;
  notes: string;
  featureHighlight: string;
  primaryImageUrl: string | null;
  secondaryImageUrl: string | null;
}

export interface FeaturedSiteEvidence {
  url: string;
  status: number | null;
  title: string;
  headings: string[];
  textSnippet: string;
  signals: string[];
}

export interface FeaturedReviewDraft {
  rationale: string;
  evidence: string[];
  confidence: 'high' | 'medium' | 'low';
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function stripHtml(value: unknown): string {
  return text(value).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function attachmentUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const entry of value) {
    if (entry && typeof entry === 'object' && 'url' in entry) {
      const url = text((entry as { url?: unknown }).url);
      if (url.startsWith('https://')) return url;
    }
  }
  return null;
}

export function buildFeaturedPublishedFormula(): string {
  return 'AND({⚙️🆎Type (Text)}="Template🏗️",{🚀Marketplace Status}="3️⃣Published🚀",OR({🥞Is Currently Featured? (🏗️ only)}=1,{ℹ️Is Featured? (🖥️, 🏗️only)}=1))';
}

export function normalizeFeaturedRecord(record: AirtableFeaturedRecord): FeaturedReviewItem {
  const fields = record.fields;
  return {
    id: record.id,
    name: text(fields.Name),
    isReviewerPick: fields[FEATURED_REVIEWER_PICK_FIELD] === true,
    originalRationale: text(fields[FEATURED_REVIEW_FIELD]),
    reviewUrl: text(fields['🔗Website URL']) || text(fields['🔗Preview Site URL']) || null,
    previewUrl: text(fields['🔗Preview Site URL']) || null,
    listingUrl: text(fields['🔗Listing URL']) || text(fields['🏸Admin Detail Page Path (🏗️ only)']) || null,
    descriptionShort: text(fields['ℹ️Description (Short)']),
    descriptionLongText: stripHtml(fields['ℹ️Description (Long).html']).slice(0, 1_200),
    templateType: text(fields['🥞Template Type (🏗️ only)']),
    categories: text(fields['ℹ️🪣Categories (Text)']),
    categoryGroups: text(fields['ℹ️🪣Category Group(s) (Text)']),
    notes: text(fields['ℹ️Notes']).slice(0, 1_200),
    featureHighlight: text(fields['ℹ️✨Features Highlighted']),
    primaryImageUrl: attachmentUrl(fields['🖼️Thumbnail Image']),
    secondaryImageUrl: attachmentUrl(fields['🖼️Thumbnail Image (Secondary)']),
  };
}

function reviewInstructions(item: FeaturedReviewItem): string {
  const existingInstruction = item.originalRationale
    ? 'Preserve every supported idea in the existing human note. Improve its clarity and specificity without changing the reviewer judgment.'
    : 'Write a new rationale only from the supplied Marketplace metadata, published-site evidence, and template images.';
  return [
    'Write public-facing Webflow Marketplace copy explaining why this template was Featured.',
    existingInstruction,
    'State the standout design or experience qualities and the buyer fit.',
    'Do not invent functionality, performance, accessibility, conversion, or quality claims that the evidence does not support.',
    'Do not mention AI assistance, internal review tools, scores, approval state, or the review process.',
    'Use one or two concise sentences, 80 to 360 characters total.',
    'Return JSON with exactly: rationale, evidence, confidence.',
    'evidence must contain two to four short source-grounded observations; confidence must be high, medium, or low.',
  ].join(' ');
}

export function buildFeaturedReviewPrompt(
  item: FeaturedReviewItem,
  siteEvidence: FeaturedSiteEvidence,
): string {
  const metadata = {
    name: item.name,
    existingHumanNote: item.originalRationale || null,
    descriptionShort: item.descriptionShort || null,
    descriptionLongText: item.descriptionLongText || null,
    templateType: item.templateType || null,
    categories: item.categories || null,
    categoryGroups: item.categoryGroups || null,
    notes: item.notes || null,
    featureHighlight: item.featureHighlight || null,
    listingUrl: item.listingUrl,
    publishedSite: siteEvidence,
  };
  return `${reviewInstructions(item)}\n\nReview evidence JSON:\n${JSON.stringify(metadata)}`;
}

export function buildOpenAiReviewRequest(args: {
  item: FeaturedReviewItem;
  model: string;
  siteEvidence: FeaturedSiteEvidence;
}): Record<string, unknown> {
  const { item, model, siteEvidence } = args;
  const content: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: buildFeaturedReviewPrompt(item, siteEvidence),
    },
  ];
  for (const url of [item.primaryImageUrl, item.secondaryImageUrl]) {
    if (url) content.push({ type: 'image_url', image_url: { url, detail: 'low' } });
  }
  return {
    model,
    temperature: 0.2,
    max_tokens: 280,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a careful Webflow Marketplace editor. Your rationale must be useful to a buyer and traceable to the supplied evidence.',
      },
      { role: 'user', content },
    ],
  };
}

export function buildAnthropicReviewRequest(args: {
  item: FeaturedReviewItem;
  model: string;
  siteEvidence: FeaturedSiteEvidence;
  imageContent: Array<Record<string, unknown>>;
}): Record<string, unknown> {
  const { item, model, siteEvidence, imageContent } = args;
  return {
    model,
    max_tokens: 640,
    system:
      'You are a careful Webflow Marketplace editor. Your rationale must be useful to a buyer and traceable to the supplied evidence.',
    tools: [
      {
        name: 'submit_featured_review',
        description: 'Submit the final public Featured-template rationale and its supporting review evidence.',
        input_schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            rationale: { type: 'string', minLength: 80, maxLength: 360 },
            evidence: {
              type: 'array',
              minItems: 2,
              maxItems: 4,
              items: { type: 'string', minLength: 8, maxLength: 180 },
            },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          },
          required: ['rationale', 'evidence', 'confidence'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'submit_featured_review' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildFeaturedReviewPrompt(item, siteEvidence) },
          ...imageContent,
        ],
      },
    ],
  };
}

const reviewDraftSchema = z.object({
  rationale: z.string().trim().min(80).max(420),
  evidence: z.array(z.string().trim().min(8).max(180)).min(2).max(4),
  confidence: z.enum(['high', 'medium', 'low']),
}).strict();

const STOPWORDS = new Set(['with', 'this', 'that', 'theme', 'template', 'unique', 'great', 'good', 'design']);

function significantWords(value: string): string[] {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter((word) => word.length >= 4 && !STOPWORDS.has(word)) ?? [];
}

export function parseReviewDraft(
  raw: string,
  item: FeaturedReviewItem,
  siteEvidence: FeaturedSiteEvidence,
): FeaturedReviewDraft {
  if (siteEvidence.status !== 200) {
    throw new Error(`Published-site review did not return 200 for ${item.name}.`);
  }
  let parsed: unknown;
  try {
    const normalized = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const firstBrace = normalized.indexOf('{');
    const lastBrace = normalized.lastIndexOf('}');
    const candidate = firstBrace >= 0 && lastBrace > firstBrace
      ? normalized.slice(firstBrace, lastBrace + 1)
      : normalized;
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error('Model review was not valid JSON.');
  }
  const draft = reviewDraftSchema.parse(parsed);
  if (item.originalRationale) {
    const sourceWords = [...new Set(significantWords(item.originalRationale))];
    const proposed = draft.rationale.toLowerCase();
    const preservedWordCount = sourceWords.filter((word) => proposed.includes(word)).length;
    const requiredWordCount = Math.min(2, sourceWords.length);
    if (preservedWordCount < requiredWordCount) {
      throw new Error(`Proposed rationale does not preserve the existing human note for ${item.name}.`);
    }
  }
  return draft;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function visibleText(value: string): string {
  return decodeHtml(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function firstMatch(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match?.[1] ? visibleText(match[1]).slice(0, 240) : '';
}

export function summarizePublishedSite(
  url: string,
  status: number | null,
  html: string,
): FeaturedSiteEvidence {
  const headings: string[] = [];
  const headingPattern = /<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi;
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingPattern.exec(html)) && headings.length < 8) {
    const heading = visibleText(headingMatch[1]).slice(0, 180);
    if (heading) headings.push(heading);
  }

  const lower = html.toLowerCase();
  const signals = [
    [/\bgsap\b/, 'GSAP'],
    [/\blenis\b/, 'Lenis'],
    [/\blottie\b/, 'Lottie'],
    [/(three(?:\.min)?\.js|threejs)/, 'Three.js'],
    [/\bswiper\b/, 'Swiper'],
    [/<canvas\b/, 'canvas'],
    [/<video\b/, 'video'],
    [/<form\b/, 'form'],
  ]
    .filter(([pattern]) => (pattern as RegExp).test(lower))
    .map(([, label]) => label as string);

  return {
    url,
    status,
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    headings,
    textSnippet: visibleText(html).slice(0, 1_200),
    signals,
  };
}

export function assertFeaturedFeedbackWriteAllowed(
  env: Record<string, string | undefined>,
  proposalArtifact: string,
): void {
  if (env.AIRTABLE_FEATURED_FEEDBACK_WRITE_APPROVED !== '1') {
    throw new Error('Set AIRTABLE_FEATURED_FEEDBACK_WRITE_APPROVED=1 only for the approved Airtable write pass.');
  }
  if (!proposalArtifact.trim()) {
    throw new Error('A durable proposal artifact is required before Airtable writes.');
  }
}
