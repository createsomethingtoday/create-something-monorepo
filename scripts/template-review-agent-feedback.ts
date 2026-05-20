#!/usr/bin/env tsx

import process from 'node:process';

import { OpenAI } from 'openai';

import {
  AirtableClient,
  type TemplateReviewAsset,
  type TemplateReviewVersion,
} from '../packages/webflow-template-review-mcp/src/airtable.ts';
import {
  DEFAULT_AIRTABLE_BASE_ID,
  REVIEW_STATUS_OPTIONS,
} from '../packages/webflow-template-review-mcp/src/schema.ts';

type Args = {
  dryRun: boolean;
  overwrite: boolean;
  limit: number;
  versionId?: string;
  model: string;
  historyLimit: number;
  crawlMaxPages: number;
  crawlMaxDepth: number;
  skipCrawl: boolean;
  statuses: string[];
};

type PageSummary = {
  url: string;
  status: number | null;
  title?: string;
  description?: string;
  h1?: string[];
  h2?: string[];
  textSnippet?: string;
};

type SiteCrawlResult = {
  startUrl: string;
  discoveredPages: PageSummary[];
  visitedCount: number;
  maxDepth: number;
  maxPages: number;
  error?: string;
};

const READY_FOR_REVIEW_VIEW_ID = 'viwlVxrTFxnP0O9xp';

const TEMPLATE_REVIEW_POLICY = {
  internalFaq: {
    slaDays: 3,
    reviewLifecycle: [
      'Ready for Review and Response to Review should be checked promptly.',
      'Creators do not see internal reviewer comments directly.',
      'If a creator resubmits, prior issues may still exist; reviewers should not assume the latest response fixed everything.',
    ],
    hardRules: [
      'License page is required even for single-page templates.',
      'Changelog page is recommended but not required.',
      'Affiliate links are not allowed in templates.',
      'Templates are not allowed to retain an installed Library on submission or after publish.',
      'Ecommerce templates for intangible products may be acceptable without a product image.',
      'Thumbnail guidance in internal FAQ: 750x995 and max 300kb.',
    ],
    ecommerceChecks: [
      'Internal admin review checks should confirm commerceConfig values are unset/false for forbidden ecommerce setup states before publish.',
      'If ecommerce business address, shipping, tax, or processor configuration has been baked into a template and cannot be removed, reviewers may need to require a rebuilt clean project.',
    ],
  },
  submissionGuidelines: {
    topLevel: [
      'To be publishable, templates must meet all submission requirements and achieve at least Good on all rubric sections.',
      'A style guide page is required.',
      'An instructions page is required when advanced interactions, hidden components, or GSAP custom code are used.',
      'If GSAP is present in custom code, instructions must explain animated selectors, editable variables, and safe removal steps.',
      'License, instructions, changelog, and style guide pages may live at root or inside folders; validate that required utility pages are discoverable, return 200, and are correctly linked rather than requiring root-only slugs.',
      'Visible utility links such as Licenses, Instructions, Changelog, or Style Guide must point to the matching utility page, not an unrelated CMS/detail page.',
      'License page must include the required license intro text and linked license details for assets.',
      'Footer should include Powered by Webflow linking to Webflow homepage.',
      'Custom branded 404 page with navigation and CTAs is required.',
    ],
    designSystem: [
      'Use reusable components for nav, footer, and CTAs.',
      'Variables and class naming should be consistent and human-readable.',
      'Hover, pressed, and focus states should be styled.',
    ],
    contentAndLayout: [
      'Avoid placeholder copy and empty links.',
      'Content should fit the template category and remain globally appropriate.',
      'Responsive layouts should be fluid and usable across breakpoints.',
      'Forms need labels, legible placeholders, correct field types, and customized success states.',
    ],
    seoAndAccessibility: [
      'Each page should have unique titles, descriptions, OG metadata, and sound heading hierarchy.',
      'Main pages should pass PageSpeed-based SEO and accessibility expectations.',
      'Contrast, alt text, keyboard/screen-reader structure, and descriptive link labels matter.',
    ],
    assets: [
      'Images should be optimized, preferably modern formats, with below-the-fold lazy loading and explicit dimensions/aspect ratio handling.',
      'Premium or trademarked graphics/logos are not allowed except functional social/account/payment-store icon usage that does not imply endorsement.',
      'Nav logo should match template name and be easy to replace.',
    ],
  },
  rubric: {
    areas: [
      'Overall user experience',
      'Graphic design',
      'Typography',
      'Interaction design',
      'Hierarchy',
      'Layout design quality',
      'Responsive design',
      'Conversion best practices',
      'Site optimization',
      'Accessibility',
    ],
    interpretation: [
      'Good is the minimum acceptable bar in every rubric section.',
      'Satisfactory may still receive one revision cycle but should be treated as below the publish bar.',
      'Drafts should prioritize concrete reviewer checks tied to rubric failure risk, not generic QA commentary.',
    ],
  },
  webflowWayChecklist: {
    core: [
      'Submission should clear both the submission guidelines and quality rubric before publish.',
      'Licenses and changelog pages should use noindex head code when present.',
      'Homepage SEO title should match the template naming formula.',
    ],
    designUsability: [
      'No layout bugs across desktop, tablet, mobile landscape, and mobile portrait.',
      'Dynamic pages should not be blank.',
      'Use one consistent class naming system across the template.',
      'Audit Panel should show one H1 per page, no skipped heading levels, and no missing alt text.',
      'Nav, footer, and CTAs should be Components with title-cased names.',
      'Unused interactions and unused styles/classes should be cleaned up.',
      'Color, typography, and spacing variables should be reusable, human-readable, and breakpoint-aware.',
      'Static pages should have meta title, meta description, and OG tags; CMS pages should use dynamic SEO tags.',
      '404 page should be branded and images should define dimensions.',
      'Below-the-fold images should lazy load; modern formats should be used where possible.',
      'Hover/press states should prefer simple CSS transitions.',
    ],
    performanceFunctionality: [
      'No legacy interactions; use Interactions 2.0.',
      'Large videos should be compressed and provide pause/skip controls.',
      'Ecommerce templates should have a functional cart styled consistently with the site.',
      'Ecommerce product pages should include add-to-cart, description, and product image for tangible products.',
    ],
    technicalSafety: [
      'Page-level custom code should be avoided except approved noindex/meta or font antialiasing cases.',
      'Site-level custom code should be minimal, typically only font smoothing.',
      'Ecommerce setup steps like business address, shipping, tax, payment provider, hosting, and checkout should remain unchecked in the template submission state.',
      'Responsive images should be enabled in project settings.',
      'No trademarked logos, branded content, or premium stock assets; use replaceable placeholders and properly licensed assets.',
      'License page must include the required opening license statement exactly.',
    ],
  },
} as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getAirtableApiKey(): string {
  return process.env.AIRTABLE_API_KEY?.trim() || process.env.AIRTABLE_PAT?.trim() || requireEnv('AIRTABLE_API_KEY');
}

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const statuses: string[] = [];
  let versionId: string | undefined;
  let model = process.env.OPENAI_MODEL?.trim() || 'gpt-4.1-mini';
  let limit = 10;
  let historyLimit = 3;
  let crawlMaxPages = 10;
  let crawlMaxDepth = 2;

  for (let index = 0; index < raw.length; index += 1) {
    const arg = raw[index];
    const next = raw[index + 1];

    if (arg === '--version-id' && next) {
      versionId = next;
      index += 1;
      continue;
    }
    if (arg === '--model' && next) {
      model = next;
      index += 1;
      continue;
    }
    if (arg === '--limit' && next) {
      limit = toPositiveInt(next, limit);
      index += 1;
      continue;
    }
    if (arg === '--history-limit' && next) {
      historyLimit = toPositiveInt(next, historyLimit);
      index += 1;
      continue;
    }
    if (arg === '--crawl-max-pages' && next) {
      crawlMaxPages = toPositiveInt(next, crawlMaxPages);
      index += 1;
      continue;
    }
    if (arg === '--crawl-max-depth' && next) {
      crawlMaxDepth = toPositiveInt(next, crawlMaxDepth);
      index += 1;
      continue;
    }
    if (arg === '--status' && next) {
      statuses.push(next);
      index += 1;
      continue;
    }
  }

  return {
    dryRun: raw.includes('--dry-run'),
    overwrite: raw.includes('--overwrite'),
    limit,
    versionId,
    model,
    historyLimit,
    crawlMaxPages,
    crawlMaxDepth,
    skipCrawl: raw.includes('--skip-crawl'),
    statuses: statuses.length > 0 ? statuses : [REVIEW_STATUS_OPTIONS[0]],
  };
}

function stripHtml(value: string | undefined, limit = 600): string | undefined {
  if (!value) return undefined;
  const normalized = value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return undefined;
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function clip(value: string | undefined, limit: number): string | undefined {
  if (!value) return undefined;
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function normalizeUrl(raw: string, origin: string): string | null {
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return null;
    if (['mailto:', 'tel:', 'javascript:'].includes(url.protocol)) return null;
    url.hash = '';
    url.pathname = url.pathname.replace(/\/$/, '') || '/';
    return url.toString();
  } catch {
    return null;
  }
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

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? clip(decodeHtml(stripHtml(match[1], 200) ?? ''), 200) : undefined;
}

function extractMetaDescription(html: string): string | undefined {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  return match ? clip(decodeHtml(match[1].trim()), 240) : undefined;
}

function extractHeadings(html: string, tagName: 'h1' | 'h2'): string[] {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && values.length < 4) {
    const text = stripHtml(decodeHtml(match[1]), 160);
    if (text) values.push(text);
  }
  return values;
}

function extractTextSnippet(html: string): string | undefined {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const text = stripHtml(bodyMatch?.[1] ?? html, 420);
  return text ? clip(text, 420) : undefined;
}

function extractLinks(html: string, origin: string): string[] {
  const links = new Set<string>();
  const regex = /<a\b[^>]*href=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const normalized = normalizeUrl(match[1], origin);
    if (normalized) links.add(normalized);
  }
  return [...links];
}

async function discoverSitePages(
  startUrl: string,
  options: { maxPages: number; maxDepth: number },
): Promise<SiteCrawlResult> {
  const start = new URL(startUrl);
  const queue: Array<{ url: string; depth: number }> = [{ url: start.toString(), depth: 0 }];
  const queued = new Set<string>([start.toString()]);
  const visited = new Set<string>();
  const discoveredPages: PageSummary[] = [];

  while (queue.length > 0 && visited.size < options.maxPages) {
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const response = await fetch(current.url, {
        headers: {
          'User-Agent': 'create-something-template-review-agent/0.1',
        },
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        discoveredPages.push({
          url: current.url,
          status: response.status,
        });
        continue;
      }

      const html = await response.text();
      discoveredPages.push({
        url: current.url,
        status: response.status,
        title: extractTitle(html),
        description: extractMetaDescription(html),
        h1: extractHeadings(html, 'h1'),
        h2: extractHeadings(html, 'h2'),
        textSnippet: extractTextSnippet(html),
      });

      if (current.depth >= options.maxDepth) {
        continue;
      }

      for (const link of extractLinks(html, start.origin)) {
        if (!visited.has(link) && !queued.has(link) && queued.size + visited.size < options.maxPages * 3) {
          queued.add(link);
          queue.push({ url: link, depth: current.depth + 1 });
        }
      }
    } catch (error) {
      discoveredPages.push({
        url: current.url,
        status: null,
        description: error instanceof Error ? clip(error.message, 240) : clip(String(error), 240),
      });
    }
  }

  return {
    startUrl: start.toString(),
    discoveredPages,
    visitedCount: visited.size,
    maxDepth: options.maxDepth,
    maxPages: options.maxPages,
  };
}

function serializeAsset(asset: TemplateReviewAsset): Record<string, unknown> {
  return {
    assetId: asset.assetId,
    templateName: asset.templateName,
    descriptionShort: clip(asset.descriptionShort, 300),
    descriptionLongText: stripHtml(asset.descriptionLongHtml, 700),
    websiteUrl: asset.websiteUrl,
    previewSiteUrl: asset.previewSiteUrl,
    marketplaceStatus: asset.marketplaceStatus,
    latestReviewStatus: asset.latestReviewStatus,
    latestReviewDate: asset.latestReviewDate,
    latestReviewFeedback: clip(asset.latestReviewFeedback, 500),
    rejectionFeedback: clip(asset.rejectionFeedback, 500),
    qualityRating: asset.qualityRating,
    priceString: asset.priceString,
    submittedDate: asset.submittedDate,
    decisionDate: asset.decisionDate,
  };
}

function serializeVersion(version: TemplateReviewVersion): Record<string, unknown> {
  return {
    versionId: version.versionId,
    assetId: version.assetId,
    versionNumber: version.versionNumber,
    reviewStatus: version.reviewStatus,
    reviewOwner: version.reviewOwner,
    qualityRating: version.qualityRating,
    improvementAreas: version.improvementAreas,
    reviewFeedback: clip(version.reviewFeedback, 600),
    agentReviewFeedback: clip(version.agentReviewFeedback, 600),
    rejectionFeedback: clip(version.rejectionFeedback, 500),
    rejectReason: clip(version.rejectReason, 280),
    submissionDatetime: version.createdAt,
    decisionDate: version.decisionDate,
    createdBy: version.createdBy,
  };
}

function serializeHistory(versions: TemplateReviewVersion[]): Array<Record<string, unknown>> {
  return versions.map((version) => ({
    versionId: version.versionId,
    versionNumber: version.versionNumber,
    reviewStatus: version.reviewStatus,
    qualityRating: version.qualityRating,
    improvementAreas: version.improvementAreas,
    reviewFeedback: clip(version.reviewFeedback, 320),
    rejectionFeedback: clip(version.rejectionFeedback, 320),
    rejectReason: clip(version.rejectReason, 180),
    createdAt: version.createdAt,
    decisionDate: version.decisionDate,
  }));
}

function serializePages(crawl: SiteCrawlResult | null): Record<string, unknown> {
  if (!crawl) {
    return {
      status: 'not_attempted',
    };
  }

  return {
    status: crawl.error ? 'error' : 'ok',
    startUrl: crawl.startUrl,
    visitedCount: crawl.visitedCount,
    maxDepth: crawl.maxDepth,
    maxPages: crawl.maxPages,
    error: crawl.error,
    pages: crawl.discoveredPages.slice(0, 8),
  };
}


function completionText(content: string | Array<{ type?: string; text?: string }> | null | undefined): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .map((item) => (typeof item?.text === 'string' ? item.text : ''))
    .join('\n')
    .trim();
}

function formatFeedback(model: string, body: string): string {
  const timestamp = new Date().toISOString();
  return `[AI supplemental review draft | ${timestamp} | ${model}]\n\n${body.trim()}`;
}


async function generateFeedback(
  openai: OpenAI,
  args: Args,
  asset: TemplateReviewAsset,
  currentVersion: TemplateReviewVersion,
  history: TemplateReviewVersion[],
  crawl: SiteCrawlResult | null,
): Promise<string> {
  const systemPrompt = [
    'You are generating supplemental internal review notes for Webflow Template Reviewers.',
    'This is internal reviewer support, not creator-facing copy and not a final approval/rejection decision.',
    'Use only the provided Airtable data and sandbox crawl summaries.',
    'Apply the provided internal reviewer FAQ guidance, Webflow submission guidelines, and rubric thresholds.',
    'Assume the publish bar is Good-or-better across every rubric section.',
    'If crawl coverage is partial or missing, say that explicitly.',
    'Do not claim you reviewed pages that were not provided.',
    'Focus on likely policy/rubric risks, manual verification priorities, and what a human reviewer should inspect next.',
    'Treat the crawl as supplemental initial-review evidence rather than a final decision.',
    'Be concise and specific.',
  ].join(' ');

  const userPrompt = [
    'Generate supplemental review feedback for the current template version.',
    '',
    'Output requirements:',
    '- Use exactly these headings: Scope, Likely Risks, Manual Checks.',
    '- Under each heading, use short dash bullets.',
    '- Keep the whole output under 1400 characters.',
    '- Mention uncertainty directly when evidence is incomplete.',
    '- If prior review history exists, call out recurring patterns briefly.',
    '- Prefer findings that map to submission requirements or rubric sections over generic observations.',
    '- Call out likely issues such as missing required pages, weak conversion design, typography/accessibility risks, empty or misleading links, trademark/logo misuse, library attachment risks, GSAP instruction/documentation gaps, ecommerce misconfiguration, licensing/asset concerns, Audit Panel failures, inconsistent naming/variables/components, or legacy interaction/custom-code risks when the evidence suggests them.',
    '- Do not recommend approval unless the evidence strongly suggests Good-or-better quality across all rubric areas; otherwise frame as reviewer checks and likely risk areas.',
    '',
    `Policy JSON:\n${JSON.stringify(TEMPLATE_REVIEW_POLICY, null, 2)}`,
    '',
    `Asset JSON:\n${JSON.stringify(serializeAsset(asset), null, 2)}`,
    '',
    `Current version JSON:\n${JSON.stringify(serializeVersion(currentVersion), null, 2)}`,
    '',
    `Prior versions JSON:\n${JSON.stringify(serializeHistory(history), null, 2)}`,
    '',
    `Sandbox crawl JSON:\n${JSON.stringify(serializePages(crawl), null, 2)}`,
  ].join('\n');

  const response = await openai.chat.completions.create({
    model: args.model,
    temperature: 0.2,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const text = completionText(response.choices[0]?.message?.content);
  if (!text) {
    throw new Error('OpenAI returned an empty review draft.');
  }
  return formatFeedback(args.model, text);
}

function logCandidate(version: TemplateReviewVersion, asset: TemplateReviewAsset): void {
  const versionLabel = version.versionNumber ?? '?';
  console.log(`- ${asset.templateName} | ${version.versionId} | v${versionLabel} | ${version.reviewStatus ?? 'Unknown status'}`);
}

async function main() {
  const args = parseArgs();
  const airtableClient = new AirtableClient({
    apiKey: getAirtableApiKey(),
    baseId: process.env.AIRTABLE_BASE_ID?.trim() || DEFAULT_AIRTABLE_BASE_ID,
  });
  const openai = new OpenAI({
    apiKey: requireEnv('OPENAI_API_KEY'),
  });

  const versions = args.versionId
    ? [await airtableClient.getVersionById(args.versionId)]
    : await airtableClient.listVersionsForAgentFeedback({
        limit: args.limit,
        includeStatuses: args.statuses,
        includeExistingFeedback: args.overwrite,
        viewId: READY_FOR_REVIEW_VIEW_ID,
      });

  const candidates = versions.filter((version): version is TemplateReviewVersion => Boolean(version));
  if (candidates.length === 0) {
    console.log('No candidate Asset Versions matched the current filter.');
    return;
  }

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const version of candidates) {
    try {
      if (!version.assetId) {
        throw new Error(`Version ${version.versionId} is missing its linked asset id.`);
      }

      const asset = await airtableClient.getAssetById(version.assetId);
      if (!asset) {
        throw new Error(`Asset ${version.assetId} is not available in template-review scope.`);
      }

      if (version.agentReviewFeedback && !args.overwrite) {
        skipCount += 1;
        console.log(`Skipping ${version.versionId}; agent feedback already exists.`);
        continue;
      }

      logCandidate(version, asset);

      const history = (await airtableClient.listVersionsForAsset(asset.assetId, Math.max(args.historyLimit + 1, 5)))
        .filter((item) => item.versionId !== version.versionId)
        .slice(0, args.historyLimit);

      const siteUrl = asset.websiteUrl;
      let crawl: SiteCrawlResult | null = null;

      if (siteUrl && !args.skipCrawl) {
        try {
          crawl = await discoverSitePages(siteUrl, {
            maxPages: args.crawlMaxPages,
            maxDepth: args.crawlMaxDepth,
          });
        } catch (error) {
          crawl = {
            startUrl: siteUrl,
            discoveredPages: [],
            visitedCount: 0,
            maxDepth: args.crawlMaxDepth,
            maxPages: args.crawlMaxPages,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      const feedback = await generateFeedback(openai, args, asset, version, history, crawl);

      if (args.dryRun) {
        console.log(feedback);
        console.log('');
      } else {
        await airtableClient.updateVersionReview(version.versionId, {
          agent_review_feedback: feedback,
        });
      }

      successCount += 1;
    } catch (error) {
      errorCount += 1;
      console.error(
        `[template-review:agent-feedback] ${version.versionId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: errorCount === 0,
        processed: candidates.length,
        succeeded: successCount,
        skipped: skipCount,
        failed: errorCount,
        dryRun: args.dryRun,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
