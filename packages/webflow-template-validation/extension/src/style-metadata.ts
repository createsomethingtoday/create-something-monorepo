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

const STYLE_TYPES: ReadonlySet<string> = new Set(['global', 'combo', 'tag', 'element', 'descendant']);

/**
 * Only these properties are read per breakpoint. They are what the worker's
 * responsive checks need; reading full property maps for every breakpoint
 * would multiply payload size by the breakpoint count.
 */
export const BREAKPOINT_PROPERTY_WHITELIST = ['width', 'min-width', 'font-size'] as const;

function safeRead<T>(read: () => T): T | undefined {
  try {
    return read();
  } catch {
    return undefined;
  }
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

export async function readMediaQueries(webflow: unknown): Promise<MediaQueryInfo[]> {
  const api = webflow as { getAllMediaQueries?: () => Promise<unknown> } | null | undefined;
  if (!api || typeof api.getAllMediaQueries !== 'function') return [];
  try {
    const result = await api.getAllMediaQueries();
    if (!Array.isArray(result)) return [];
    return result
      .filter((mq): mq is Record<string, unknown> => !!mq && typeof mq === 'object' && typeof mq.id === 'string')
      .map((mq) => ({
        id: mq.id as string,
        name: typeof mq.name === 'string' ? mq.name : String(mq.id),
        minWidth: typeof mq.minWidth === 'number' ? mq.minWidth : null,
        maxWidth: typeof mq.maxWidth === 'number' ? mq.maxWidth : null,
        isBase: mq.isBase === true,
      }));
  } catch {
    return [];
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
 * lack width/font-size: an override can exist at a breakpoint even when the
 * base value is unset, and that is exactly the case the overflow check targets.
 */
export async function readBreakpointProperties(
  style: unknown,
  mediaQueries: MediaQueryInfo[]
): Promise<BreakpointProperties | undefined> {
  const target = style as { getProperties?: (options?: { breakpoint?: string }) => Promise<unknown> } | null;
  if (!target || typeof target.getProperties !== 'function') return undefined;

  const bounded = mediaQueries.filter((mq) => !mq.isBase && mq.maxWidth !== null);
  if (bounded.length === 0) return undefined;

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
      } catch {
        return null;
      }
    })
  );

  const result: BreakpointProperties = {};
  for (const entry of entries) {
    if (entry) result[entry[0]] = entry[1];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
