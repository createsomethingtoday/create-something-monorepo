// Template submission guidelines for agent context. The source of truth is the
// Template Marketplace CMS ("Submission Guidelines" collection); the
// template-search Worker serves it (cached) at /api/templates/guidelines. This
// module adds a short in-isolate cache so repeated review turns do not refetch.

export const DEFAULT_GUIDELINES_URL = 'https://webflow-template-search.webflow-inc.workers.dev/api/templates/guidelines';
// Guidelines change about once a month; refresh=true bypasses this copy after an edit.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

export interface GuidelineBlock {
  id: string;
  kind: 'heading-2' | 'heading-3' | 'heading-4' | 'paragraph' | 'bullet' | 'numbered' | 'quote';
  html: string;
  text: string;
  requirementLevel: string | null;
  validatorChecks: string[];
}

export interface GuidelineSection {
  id: string;
  name: string;
  order: number;
  blocks: GuidelineBlock[];
}

export interface GuidelinesDocument {
  version: string;
  generatedAt?: string;
  sections: GuidelineSection[];
}

export type GuidelinesCacheStatus = 'hit' | 'miss' | 'stale';

let cached: { url: string; doc: GuidelinesDocument; fetchedAt: number } | null = null;

/** Test hook: forget the in-isolate copy. */
export function resetGuidelinesCache(): void {
  cached = null;
}

export async function getSubmissionGuidelines(
  options: { url?: string; refresh?: boolean; fetchImpl?: typeof fetch; now?: () => number } = {},
): Promise<{ doc: GuidelinesDocument; cache: GuidelinesCacheStatus; fetchedAt: string }> {
  const url = options.url ?? DEFAULT_GUIDELINES_URL;
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (!options.refresh && cached?.url === url && now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { doc: cached.doc, cache: 'hit', fetchedAt: new Date(cached.fetchedAt).toISOString() };
  }

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Guidelines request failed (${response.status})`);
    const doc = (await response.json()) as GuidelinesDocument;
    if (!Array.isArray(doc.sections)) throw new Error('Guidelines response has no sections');
    cached = { url, doc, fetchedAt: now() };
    return { doc, cache: 'miss', fetchedAt: new Date(cached.fetchedAt).toISOString() };
  } catch (error) {
    if (cached?.url === url) {
      return { doc: cached.doc, cache: 'stale', fetchedAt: new Date(cached.fetchedAt).toISOString() };
    }
    throw error;
  }
}

/** Keep one section (by id or name) and/or the rules a Validator check enforces. */
export function filterGuidelines(
  doc: GuidelinesDocument,
  filters: { section?: string; validatorCheck?: string } = {},
): GuidelinesDocument {
  const section = filters.section?.trim().toLowerCase();
  const check = filters.validatorCheck?.trim();
  const sections = doc.sections
    .filter((s) => !section || s.id === section || s.name.toLowerCase() === section)
    .map((s) => (check ? { ...s, blocks: s.blocks.filter((b) => b.validatorChecks.includes(check)) } : s))
    .filter((s) => s.blocks.length > 0);
  return { ...doc, sections };
}

function ruleTags(block: GuidelineBlock): string {
  const tags = [block.requirementLevel, ...block.validatorChecks.map((c) => `Validator: ${c}`)].filter(Boolean);
  return ` [${block.id}${tags.length ? `; ${tags.join('; ')}` : ''}]`;
}

/**
 * Markdown for agent context. Each section's own Heading 2 is folded into the
 * section header, and every rule ends with its stable id so feedback can cite it.
 */
export function formatGuidelinesMarkdown(doc: GuidelinesDocument): string {
  const lines = [`# Template submission guidelines (version ${doc.version})`, ''];
  for (const section of doc.sections) {
    lines.push(`## ${section.name}`, '');
    for (const block of section.blocks) {
      const [first = '', ...rest] = block.text.split('\n');
      switch (block.kind) {
        case 'heading-2':
          if (first.replace(/[^\p{L}\p{N} ]/gu, '').trim() !== section.name) lines.push(`### ${first}`, '');
          break;
        case 'heading-3':
          lines.push(`### ${first}`, '');
          break;
        case 'heading-4':
          lines.push(`#### ${first}`, '');
          break;
        case 'quote':
          lines.push(...block.text.split('\n').map((line) => `> ${line}`), '');
          break;
        case 'bullet':
        case 'numbered':
          lines.push(`${block.kind === 'bullet' ? '-' : '1.'} ${first}${ruleTags(block)}`, ...rest.map((line) => `  ${line}`));
          break;
        default:
          lines.push(`${block.text}${ruleTags(block)}`, '');
      }
    }
    if (lines[lines.length - 1] !== '') lines.push('');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
