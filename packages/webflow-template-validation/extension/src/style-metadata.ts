// Style taxonomy + responsive metadata from Designer API 2.2.
//
// Every reader here feature-detects and never throws: older Designer runtimes
// do not expose Style.type/source or webflow.getAllMediaQueries(), and the
// validator must keep collecting on those runtimes exactly as before.

import { isHtmlTagStyleName } from './utils';

export type StyleTypeValue = 'global' | 'combo' | 'tag' | 'element' | 'descendant';
export type StyleSourceValue = 'site' | 'library';

export interface StyleMetadata {
  type: StyleTypeValue | null;
  source: StyleSourceValue | null;
}

export interface MediaQueryInfo {
  id: string;
  name: string;
  minWidth: number | null;
  maxWidth: number | null;
  isBase: boolean;
}

/** Per-breakpoint subset of style properties, keyed by breakpoint id. */
export type BreakpointProperties = Record<string, Record<string, string>>;

/** Mirrors `data.collectionWarnings[]` entries in index.ts. */
export interface CollectionWarning {
  source: string;
  message: string;
  error: string;
}

export interface MediaQueryReadResult {
  mediaQueries: MediaQueryInfo[];
  /** Set only when getAllMediaQueries() exists and rejected. Absent API is not an error. */
  error?: string;
}

export interface BreakpointReadResult {
  properties: BreakpointProperties | undefined;
  /** One message per bounded breakpoint whose getProperties() rejected. */
  errors: string[];
}

const STYLE_TYPES: ReadonlySet<string> = new Set(['global', 'combo', 'tag', 'element', 'descendant']);

/**
 * Only these properties are read per breakpoint. They are what the worker's
 * responsive checks need (width/min-width for overflow, max-width so the
 * worker can model clamping); reading full property maps for every
 * breakpoint would multiply payload size by the breakpoint count.
 */
export const BREAKPOINT_PROPERTY_WHITELIST = ['width', 'min-width', 'max-width'] as const;

function safeRead<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function readStyleMetadata(style: unknown): StyleMetadata {
  if (!style || typeof style !== 'object') return { type: null, source: null };
  const target = style as {
    type?: unknown;
    source?: unknown;
    getType?: () => unknown;
    isFromLibrary?: () => unknown;
  };

  let type: unknown = safeRead(() => target.type);
  if (typeof type !== 'string' && typeof target.getType === 'function') {
    type = safeRead(() => target.getType!());
  }

  let source: unknown = safeRead(() => target.source);
  if (typeof source !== 'string' && typeof target.isFromLibrary === 'function') {
    const fromLibrary = safeRead(() => target.isFromLibrary!());
    if (typeof fromLibrary === 'boolean') source = fromLibrary ? 'library' : 'site';
  }

  return {
    type: typeof type === 'string' && STYLE_TYPES.has(type) ? (type as StyleTypeValue) : null,
    source: source === 'site' || source === 'library' ? source : null,
  };
}

/**
 * Read the style name without an async round trip when the runtime allows.
 *
 * Designer API 2.2 hydrates `Style.name` synchronously; older runtimes only
 * expose `getName()`. Element-scoped styles reject most operations with
 * `resourceMissing`, so a rejected `getName()` yields null rather than
 * throwing — the caller decides (via shouldIncludeStyle) whether a nameless
 * style still belongs in the payload.
 */
export async function readStyleName(style: unknown): Promise<string | null> {
  if (!style || typeof style !== 'object') return null;
  const target = style as { name?: unknown; getName?: () => Promise<unknown> };

  const syncName = safeRead(() => target.name);
  if (typeof syncName === 'string') return syncName || null;

  if (typeof target.getName !== 'function') return null;
  try {
    const name = await target.getName();
    return typeof name === 'string' && name ? name : null;
  } catch {
    return null;
  }
}

/**
 * Element-scoped styles are always sent (the worker's `styles.element-scoped`
 * check needs to see them, and they typically have no usable name). Every
 * other type keeps the historical filter: skip nameless and `_`-prefixed
 * internal styles.
 */
export function shouldIncludeStyle(meta: StyleMetadata, name: string | null): boolean {
  if (meta.type === 'element') return true;
  return !!name && !name.startsWith('_');
}

export function isTagStyle(meta: StyleMetadata, name: string): boolean {
  if (meta.type !== null) return meta.type === 'tag';
  return isHtmlTagStyleName(name);
}

/** Payload `type`. 'class' stays the fallback so pre-2.2 consumers see the old value. */
export function toPayloadStyleType(meta: StyleMetadata): string {
  return meta.type ?? 'class';
}

/** Breakpoint reads only matter for reusable classes (or when the type is unknown). */
export function shouldReadBreakpoints(meta: StyleMetadata): boolean {
  return meta.type === null || meta.type === 'global' || meta.type === 'combo';
}

/**
 * Read the site's breakpoints. An absent API (pre-2.2 runtime) is silent; a
 * rejection is returned in `error` so the caller can surface it as a
 * collection warning — the two cases must stay distinguishable.
 */
export async function readMediaQueries(webflow: unknown): Promise<MediaQueryReadResult> {
  const api = webflow as { getAllMediaQueries?: () => Promise<unknown> } | null | undefined;
  if (!api || typeof api.getAllMediaQueries !== 'function') return { mediaQueries: [] };
  try {
    const result = await api.getAllMediaQueries();
    if (!Array.isArray(result)) return { mediaQueries: [] };
    const mediaQueries = result
      .filter((mq): mq is Record<string, unknown> => !!mq && typeof mq === 'object' && typeof mq.id === 'string')
      .map((mq) => ({
        id: mq.id as string,
        name: typeof mq.name === 'string' ? mq.name : String(mq.id),
        minWidth: typeof mq.minWidth === 'number' ? mq.minWidth : null,
        maxWidth: typeof mq.maxWidth === 'number' ? mq.maxWidth : null,
        isBase: mq.isBase === true,
      }));
    return { mediaQueries };
  } catch (error) {
    return { mediaQueries: [], error: errorMessage(error) };
  }
}

/**
 * Read whitelisted properties at each bounded, non-base breakpoint.
 *
 * Cost: one getProperties() round trip per style per bounded breakpoint
 * (3 on a default site: medium/small/tiny). Breakpoints without a maxWidth
 * (large/xl/xxl) are skipped because no current check can use them. The reads
 * for one style run in parallel, so latency grows with style count rather
 * than style count × breakpoints. We do NOT skip styles whose base properties
 * lack width/max-width: an override can exist at a breakpoint even when the
 * base value is unset, and that is exactly the case the overflow check targets.
 *
 * Returns undefined only when there is nothing to read (no getProperties, no
 * bounded breakpoints). Otherwise every rejected breakpoint read lands in
 * `errors` so the caller can aggregate them into one warning.
 */
export async function readBreakpointProperties(
  style: unknown,
  mediaQueries: MediaQueryInfo[]
): Promise<BreakpointReadResult | undefined> {
  const target = style as { getProperties?: (options?: { breakpoint?: string }) => Promise<unknown> } | null;
  if (!target || typeof target.getProperties !== 'function') return undefined;

  const bounded = mediaQueries.filter((mq) => !mq.isBase && mq.maxWidth !== null);
  if (bounded.length === 0) return undefined;

  const errors: string[] = [];
  const entries = await Promise.all(
    bounded.map(async (mq) => {
      try {
        const props = (await target.getProperties!({ breakpoint: mq.id })) as Record<string, unknown> | null;
        if (!props || typeof props !== 'object') return null;
        const kept: Record<string, string> = {};
        for (const key of BREAKPOINT_PROPERTY_WHITELIST) {
          const value = props[key];
          // Variable references are objects; the worker cannot resolve them, so drop them.
          if (typeof value === 'string' || typeof value === 'number') kept[key] = String(value);
        }
        return Object.keys(kept).length > 0 ? ([mq.id, kept] as const) : null;
      } catch (error) {
        errors.push(errorMessage(error));
        return null;
      }
    })
  );

  const result: BreakpointProperties = {};
  for (const entry of entries) {
    if (entry) result[entry[0]] = entry[1];
  }
  return { properties: Object.keys(result).length > 0 ? result : undefined, errors };
}

/**
 * Collapse per-style breakpoint read failures into ONE collection warning.
 * `failures` holds one representative message per affected style; the first
 * is kept as the warning's `error`. Null when nothing failed.
 */
export function summarizeBreakpointReadFailures(failures: string[]): CollectionWarning | null {
  if (failures.length === 0) return null;
  const count = failures.length;
  return {
    source: 'Style Breakpoints',
    message: `Failed to read breakpoint properties for ${count} ${count === 1 ? 'style' : 'styles'}`,
    error: failures[0],
  };
}

export interface StylePropertiesResult {
  properties: Record<string, unknown>;
  breakpoints: BreakpointReadResult | undefined;
}

/**
 * Read a style's base properties and its breakpoint overrides together.
 *
 * The two reads are independent, so they are issued concurrently rather than
 * awaited back to back — with ~3 bounded breakpoints this roughly halves the
 * per-style wall time. Element-scoped styles issue no Style operations at all
 * (they reject with `resourceMissing`). A base-properties failure is logged
 * and yields `{}`, matching the pre-existing behaviour; breakpoint failures
 * are reported through `breakpoints.errors`.
 */
export async function readStyleProperties(
  style: unknown,
  meta: StyleMetadata,
  mediaQueries: MediaQueryInfo[]
): Promise<StylePropertiesResult> {
  const target = style as { getProperties?: (options?: { breakpoint?: string }) => Promise<unknown> } | null;
  const canReadBase = !!target && typeof target.getProperties === 'function' && meta.type !== 'element';

  // Async IIFE so getProperties() is invoked synchronously (before the
  // breakpoint reads are issued) and both sync throws and rejections are caught.
  const basePromise: Promise<Record<string, unknown>> = (async () => {
    if (!canReadBase) return {};
    try {
      const props = await target!.getProperties!();
      return props && typeof props === 'object' ? (props as Record<string, unknown>) : {};
    } catch (propertyError) {
      console.warn('Error getting style properties:', propertyError);
      return {};
    }
  })();

  const breakpointPromise: Promise<BreakpointReadResult | undefined> =
    mediaQueries.length > 0 && shouldReadBreakpoints(meta)
      ? readBreakpointProperties(style, mediaQueries)
      : Promise.resolve(undefined);

  const [properties, breakpoints] = await Promise.all([basePromise, breakpointPromise]);
  return { properties, breakpoints };
}
