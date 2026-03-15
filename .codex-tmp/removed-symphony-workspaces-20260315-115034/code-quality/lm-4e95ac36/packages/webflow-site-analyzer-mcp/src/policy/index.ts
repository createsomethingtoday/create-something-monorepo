import { createHash } from 'node:crypto';

const SUBMISSION_GUIDELINES_URL = 'https://webflow.com/templates/submission-guidelines';
const GRADING_RUBRIC_URL = 'https://webflow.com/templates/grading-rubric';
const CACHE_TTL_MS = 15 * 60 * 1000;

interface PolicySourceSnapshot {
  url: string;
  title: string;
  fetchedAt: string;
  contentHash: string;
}

interface GuidelineSection {
  name: string;
  items: string[];
}

interface RubricRow {
  criteria: string;
  satisfactory: string;
  good: string;
  exceptional: string;
}

export interface WebflowPolicySnapshot {
  policyVersion: string;
  generatedAt: string;
  sources: {
    submissionGuidelines: PolicySourceSnapshot;
    gradingRubric: PolicySourceSnapshot;
  };
  submissionGuidelines: {
    sections: GuidelineSection[];
  };
  gradingRubric: {
    criteriaRows: RubricRow[];
  };
}

let cachedSnapshot: WebflowPolicySnapshot | null = null;
let cacheTimestamp = 0;

export async function getWebflowPolicySnapshot(forceRefresh = false): Promise<WebflowPolicySnapshot> {
  const now = Date.now();
  if (!forceRefresh && cachedSnapshot && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const [guidelines, rubric] = await Promise.all([
    fetchHtmlSnapshot(SUBMISSION_GUIDELINES_URL),
    fetchHtmlSnapshot(GRADING_RUBRIC_URL),
  ]);

  const snapshot: WebflowPolicySnapshot = {
    policyVersion: createVersionHash(guidelines.contentHash, rubric.contentHash),
    generatedAt: new Date().toISOString(),
    sources: {
      submissionGuidelines: {
        url: SUBMISSION_GUIDELINES_URL,
        title: guidelines.title,
        fetchedAt: guidelines.fetchedAt,
        contentHash: guidelines.contentHash,
      },
      gradingRubric: {
        url: GRADING_RUBRIC_URL,
        title: rubric.title,
        fetchedAt: rubric.fetchedAt,
        contentHash: rubric.contentHash,
      },
    },
    submissionGuidelines: {
      sections: extractGuidelineSections(guidelines.html),
    },
    gradingRubric: {
      criteriaRows: extractRubricRows(rubric.html),
    },
  };

  cachedSnapshot = snapshot;
  cacheTimestamp = now;
  return snapshot;
}

export async function refreshWebflowPolicySnapshot(): Promise<WebflowPolicySnapshot> {
  return getWebflowPolicySnapshot(true);
}

function createVersionHash(guidelinesHash: string, rubricHash: string): string {
  return createHash('sha256')
    .update(`${guidelinesHash}:${rubricHash}`)
    .digest('hex')
    .slice(0, 16);
}

async function fetchHtmlSnapshot(url: string): Promise<{ html: string; title: string; fetchedAt: string; contentHash: string }> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'create-something-policy-ingestor/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const html = await response.text();
  const fetchedAt = new Date().toISOString();
  const title = extractTitle(html);
  const contentHash = createHash('sha256').update(normalizeWhitespace(stripHtml(html))).digest('hex');

  return { html, title, fetchedAt, contentHash };
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(normalizeWhitespace(stripHtml(match[1]))) : 'Untitled';
}

function extractGuidelineSections(html: string): GuidelineSection[] {
  const sectionNames = [
    'Start Here',
    'Required Pages',
    'Design Systems',
    'Interactions and GSAP',
    'SEO',
    'Accessibility',
    'Images and Assets',
    'Layout and Content',
    'Forms and Conversion Design',
    'Custom Code and Site Settings',
    'CMS and Ecommerce',
    'Template listing information',
  ];

  return sectionNames
    .map((name) => {
      const segment = getSectionSegment(html, name);
      const items = extractListItems(segment ?? '').slice(0, 40);
      return { name, items };
    })
    .filter((section) => section.items.length > 0);
}

function extractRubricRows(html: string): RubricRow[] {
  const rows: RubricRow[] = [];
  const tableRows = html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const rowMatch of tableRows) {
    const cells = Array.from(rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi))
      .map((cellMatch) => decodeHtmlEntities(normalizeWhitespace(stripHtml(cellMatch[1]))))
      .filter(Boolean);

    if (cells.length < 4) {
      continue;
    }

    if (cells[0].toLowerCase() === 'criteria') {
      continue;
    }

    rows.push({
      criteria: cells[0],
      satisfactory: cells[1],
      good: cells[2],
      exceptional: cells[3],
    });
  }

  return rows;
}

function getSectionSegment(html: string, heading: string): string | null {
  const escapedHeading = escapeRegExp(heading);
  const sectionStart = new RegExp(`<h[2-4][^>]*>\\s*${escapedHeading}\\s*<\\/h[2-4]>`, 'i');
  const startMatch = sectionStart.exec(html);

  if (!startMatch || startMatch.index === undefined) {
    return null;
  }

  const segmentStart = startMatch.index + startMatch[0].length;
  const afterStart = html.slice(segmentStart);
  const nextHeadingMatch = afterStart.match(/<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>/i);
  const segmentEnd = nextHeadingMatch && nextHeadingMatch.index !== undefined
    ? segmentStart + nextHeadingMatch.index
    : html.length;

  return html.slice(segmentStart, segmentEnd);
}

function extractListItems(htmlSegment: string): string[] {
  if (!htmlSegment) {
    return [];
  }

  return Array.from(htmlSegment.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => decodeHtmlEntities(normalizeWhitespace(stripHtml(match[1]))))
    .filter((item) => item.length > 0);
}

function stripHtml(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(input: string): string {
  const decoded = input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
