// Data helpers for the SubmissionGuidelines code component. The guidelines live
// in the Template Marketplace CMS and are served by the template-search Worker
// at /api/templates/guidelines (through the templates-api proxy on webflow.com).

export const DEFAULT_GUIDELINES_API_BASE = 'https://templates.webflow.com/templates-api';
const WORKER_ORIGIN = 'https://webflow-template-search.webflow-inc.workers.dev';

export type GuidelineKind = 'heading-2' | 'heading-3' | 'heading-4' | 'paragraph' | 'bullet' | 'numbered' | 'quote';

export interface GuidelineBlock {
  id: string;
  kind: GuidelineKind;
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
  sections: GuidelineSection[];
}

export type GuidelineRenderGroup =
  | { type: 'heading'; level: 2 | 3 | 4; block: GuidelineBlock }
  | { type: 'html'; tag: 'p' | 'blockquote'; block: GuidelineBlock }
  | { type: 'list'; ordered: boolean; blocks: GuidelineBlock[] };

/** webflow.com's CSP only allows *.webflow.com, so a direct Worker base is rewritten to the proxy. */
export function resolveGuidelinesApiBase(apiBase?: string): string {
  const base = (apiBase || DEFAULT_GUIDELINES_API_BASE).trim().replace(/\/+$/, '');
  return base.startsWith(WORKER_ORIGIN) ? DEFAULT_GUIDELINES_API_BASE : base;
}

export async function fetchGuidelines(apiBase: string, fetchImpl: typeof fetch = fetch): Promise<GuidelinesDocument> {
  const response = await fetchImpl(`${resolveGuidelinesApiBase(apiBase)}/api/templates/guidelines`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Guidelines request failed (${response.status})`);
  const data = (await response.json()) as Partial<GuidelinesDocument>;
  if (!Array.isArray(data.sections)) throw new Error('Guidelines response has no sections');
  return { version: String(data.version ?? ''), sections: data.sections };
}

const ALLOWED_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'span']);

/**
 * Keeps the rich-text subset the guidelines use and drops every attribute
 * except safe link targets. CMS content is internal, but the page renders it
 * as HTML, so nothing executable passes through.
 */
export function sanitizeGuidelineHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|template)\b[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (tag, rawName: string, attrs: string) => {
      const name = rawName.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return '';
      if (tag.startsWith('</')) return `</${name}>`;
      if (name !== 'a') return `<${name}>`;
      const hrefMatch = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
      const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? '').trim();
      if (!/^(https?:|mailto:|#|\/)/i.test(href)) return '<a>';
      const newTab = /\btarget\s*=\s*["']?_blank/i.test(attrs);
      return `<a href="${href.replace(/"/g, '&quot;')}"${newTab ? ' target="_blank" rel="noopener noreferrer"' : ''}>`;
    });
}

/** Content of the single <li> in a Bullet or Numbered block's one-item list. */
export function listItemInnerHtml(block: GuidelineBlock): string {
  return block.html
    .trim()
    .replace(/^<(ul|ol)\b[^>]*>\s*<li\b[^>]*>/i, '')
    .replace(/<\/li>\s*<\/(ul|ol)>$/i, '');
}

/** Adjacent Bullet (or Numbered) blocks render as one list. */
export function groupGuidelineBlocks(blocks: GuidelineBlock[]): GuidelineRenderGroup[] {
  const groups: GuidelineRenderGroup[] = [];
  for (const block of blocks) {
    if (block.kind === 'bullet' || block.kind === 'numbered') {
      const ordered = block.kind === 'numbered';
      const last = groups[groups.length - 1];
      if (last?.type === 'list' && last.ordered === ordered) last.blocks.push(block);
      else groups.push({ type: 'list', ordered, blocks: [block] });
    } else if (block.kind === 'paragraph' || block.kind === 'quote') {
      groups.push({ type: 'html', tag: block.kind === 'quote' ? 'blockquote' : 'p', block });
    } else {
      groups.push({ type: 'heading', level: Number(block.kind.slice(-1)) as 2 | 3 | 4, block });
    }
  }
  return groups;
}

/** Inner HTML of a paragraph or quote block, without its outer wrapper. */
export function blockInnerHtml(block: GuidelineBlock): string {
  return block.html
    .trim()
    .replace(/^<(p|blockquote)\b[^>]*>/i, '')
    .replace(/<\/(p|blockquote)>$/i, '');
}

/** The URL fragment as an id; a malformed escape (e.g. "#100%") reads as no id. */
export function hashId(hash: string): string {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return '';
  }
}

/** Section to open for a URL hash: a section id, or the section holding a block id. */
export function sectionForHash(doc: GuidelinesDocument, hash: string): string | null {
  const id = hashId(hash);
  if (!id) return null;
  const direct = doc.sections.find((s) => s.id === id);
  if (direct) return direct.id;
  return doc.sections.find((s) => s.blocks.some((b) => b.id === id))?.id ?? null;
}

/** Room left for webflow.com's sticky nav when returning to the top of the guidelines. */
export const SECTION_SCROLL_OFFSET = 96;

/**
 * Where to scroll after a section change: back to the top of the guidelines when
 * that top has scrolled above the nav, so a newly opened section starts at its
 * beginning. Null when the top is already in view.
 */
export function sectionScrollTarget(guidelinesTop: number, scrollY: number, offset = SECTION_SCROLL_OFFSET): number | null {
  if (guidelinesTop >= offset) return null;
  return Math.max(0, Math.round(scrollY + guidelinesTop - offset));
}
