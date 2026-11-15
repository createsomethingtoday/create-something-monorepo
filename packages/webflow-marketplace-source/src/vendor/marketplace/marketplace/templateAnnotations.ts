/**
 * Browser Annotation API support for Template Marketplace surfaces.
 *
 * ChatGPT's built-in browser lets people select part of a page in Annotation
 * mode and send it, with a comment, into the conversation. Markup attributes
 * let a site decide what a selection means: `oai-annotation-container` scopes
 * the rules, `oai-annotatable` makes a card one selectable object, and
 * `oai-annotation-metadata` attaches flat JSON context the page does not show
 * (slug, creator, price). Browsers without the API ignore the attributes.
 *
 * The metadata deliberately mirrors the WebMCP tool vocabulary in
 * `agentTools.ts` (template_slug pairs with get_template and
 * update_page_filters.highlight_slugs) so an annotation and a tool call
 * describe the same object.
 *
 * Reference: https://developers.openai.com/codex/annotations-extensibility
 */

export const ANNOTATION_CONTAINER_ATTR = 'oai-annotation-container';
export const ANNOTATION_TEXT_CONTAINER_ATTR = 'oai-annotation-container-text';
export const ANNOTATABLE_ATTR = 'oai-annotatable';
export const ANNOTATION_METADATA_ATTR = 'oai-annotation-metadata';

// Browser limits. Invalid metadata is silently dropped by the browser, so the
// builder enforces them instead of trusting callers.
export const ANNOTATION_METADATA_MAX_PROPERTIES = 6;
export const ANNOTATION_METADATA_MAX_KEY_LENGTH = 64;
export const ANNOTATION_METADATA_MAX_STRING_LENGTH = 256;
export const ANNOTATION_METADATA_MAX_BYTES = 2048;
export const ANNOTATABLE_NAME_MAX_LENGTH = 80;
// ASCII letter first, then letters/digits/_/-, single spaces between words.
const METADATA_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*(?: [A-Za-z0-9_-]+)*$/;

export type AnnotationMetadataValue = string | number | boolean | null;

function utf8Bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function normalizeValue(value: unknown): AnnotationMetadataValue | undefined {
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.length > ANNOTATION_METADATA_MAX_STRING_LENGTH
      ? trimmed.slice(0, ANNOTATION_METADATA_MAX_STRING_LENGTH)
      : trimmed;
  }
  return undefined;
}

/**
 * Serialize a flat object into the browser's metadata format, dropping entries
 * the browser would reject and trailing entries that exceed the byte budget.
 * Returns null when nothing valid remains.
 */
export function toAnnotationMetadata(input: Record<string, unknown>): string | null {
  const entries: Array<[string, AnnotationMetadataValue]> = [];
  for (const [key, raw] of Object.entries(input)) {
    if (entries.length >= ANNOTATION_METADATA_MAX_PROPERTIES) break;
    if (key.length > ANNOTATION_METADATA_MAX_KEY_LENGTH || !METADATA_KEY_PATTERN.test(key)) continue;
    const value = normalizeValue(raw);
    if (value === undefined) continue;
    entries.push([key, value]);
  }
  while (entries.length > 0) {
    const serialized = JSON.stringify(Object.fromEntries(entries));
    if (utf8Bytes(serialized) <= ANNOTATION_METADATA_MAX_BYTES) return serialized;
    entries.pop();
  }
  return null;
}

/** The subset of a template record an annotation describes. */
export interface TemplateAnnotationSource {
  name?: string | null;
  template_slug?: string | null;
  creator_name?: string | null;
  price?: number | string | null;
  is_free?: boolean | null;
  category?: string | null;
  url?: string | null;
}

export interface TemplateAnnotationProps {
  'oai-annotatable'?: string;
  'oai-annotation-metadata'?: string;
}

function annotatableName(name: string | null | undefined): string | undefined {
  const trimmed = (name ?? '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return undefined;
  return trimmed.length > ANNOTATABLE_NAME_MAX_LENGTH
    ? trimmed.slice(0, ANNOTATABLE_NAME_MAX_LENGTH)
    : trimmed;
}

/**
 * Attributes that make one template (card or detail hero) a single selectable
 * object with its hidden context. Spread onto the element that owns the
 * template, inside an element carrying `templateAnnotationContainerProps()`.
 */
export function templateAnnotationProps(source: TemplateAnnotationSource): TemplateAnnotationProps {
  const props: TemplateAnnotationProps = {};
  const name = annotatableName(source.name);
  if (name) props[ANNOTATABLE_ATTR] = name;
  // Nulls are valid metadata but add nothing here; only send known context.
  const known = Object.fromEntries(
    Object.entries({
      template_slug: source.template_slug,
      creator: source.creator_name,
      price: source.is_free ? 'Free' : source.price,
      category: source.category,
      url: source.url,
    }).filter(([, value]) => value != null),
  );
  const metadata = toAnnotationMetadata(known);
  if (metadata) props[ANNOTATION_METADATA_ATTR] = metadata;
  return props;
}

/** Marks the region whose descendants use `templateAnnotationProps`. */
export function templateAnnotationContainerProps(): { 'oai-annotation-container': '' } {
  return { [ANNOTATION_CONTAINER_ATTR]: '' };
}

/** Marks prose (descriptions, highlights) where people drag to select text. */
export function templateAnnotationTextContainerProps(): { 'oai-annotation-container-text': '' } {
  return { [ANNOTATION_TEXT_CONTAINER_ATTR]: '' };
}

// ── Runtime detection ────────────────────────────────────────────────────────

export interface AnnotationApiLike {
  request?: (...args: unknown[]) => unknown;
  registerControls?: (...args: unknown[]) => unknown;
  registerSurface?: (...args: unknown[]) => unknown;
  toggle?: (...args: unknown[]) => unknown;
  isActive?: () => boolean;
}

const ANNOTATION_API_METHODS = ['request', 'registerControls', 'registerSurface', 'toggle', 'isActive'] as const;

/** The page's `document.oai.annotation` namespace, or null outside the ChatGPT browser. */
export function findAnnotationApi(doc?: Document | null): AnnotationApiLike | null {
  const target = doc ?? (typeof document === 'undefined' ? null : document);
  if (!target) return null;
  try {
    const oai = (target as Document & { oai?: { annotation?: AnnotationApiLike } }).oai;
    const annotation = oai?.annotation;
    return annotation && typeof annotation === 'object' ? annotation : null;
  } catch {
    return null;
  }
}

export interface AnnotationApiStatus {
  available: boolean;
  methods: string[];
}

/** Capability snapshot for telemetry: which annotation methods the browser installed. */
export function annotationApiStatus(doc?: Document | null): AnnotationApiStatus {
  const api = findAnnotationApi(doc);
  if (!api) return { available: false, methods: [] };
  const methods = ANNOTATION_API_METHODS.filter((method) => typeof api[method] === 'function');
  return { available: true, methods: [...methods] };
}
