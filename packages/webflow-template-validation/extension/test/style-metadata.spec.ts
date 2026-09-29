import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BREAKPOINT_PROPERTY_WHITELIST,
  isTagStyle,
  readBreakpointProperties,
  readMediaQueries,
  readStyleMetadata,
  readStyleName,
  readStyleProperties,
  shouldIncludeStyle,
  shouldReadBreakpoints,
  summarizeBreakpointReadFailures,
  toPayloadStyleType,
} from '../src/style-metadata';

const MEDIA_QUERIES = [
  { id: 'main', name: 'Desktop', minWidth: null, maxWidth: null, isBase: true },
  { id: 'large', name: '1280px and up', minWidth: 1280, maxWidth: null, isBase: false },
  { id: 'medium', name: 'Tablet', minWidth: null, maxWidth: 991, isBase: false },
  { id: 'small', name: 'Mobile landscape', minWidth: null, maxWidth: 767, isBase: false },
  { id: 'tiny', name: 'Mobile portrait', minWidth: null, maxWidth: 479, isBase: false },
];

describe('readStyleMetadata', () => {
  it('prefers the synchronous type/source properties', () => {
    const style = {
      type: 'combo',
      source: 'library',
      getType: vi.fn(() => 'global'),
      isFromLibrary: vi.fn(() => false),
    };
    expect(readStyleMetadata(style)).toEqual({ type: 'combo', source: 'library' });
    expect(style.getType).not.toHaveBeenCalled();
    expect(style.isFromLibrary).not.toHaveBeenCalled();
  });

  it('falls back to getType()/isFromLibrary() when properties are absent', () => {
    expect(readStyleMetadata({ getType: () => 'tag', isFromLibrary: () => true }))
      .toEqual({ type: 'tag', source: 'library' });
    expect(readStyleMetadata({ getType: () => 'element', isFromLibrary: () => false }))
      .toEqual({ type: 'element', source: 'site' });
  });

  it('returns nulls on older Designer runtimes', () => {
    expect(readStyleMetadata({ id: 'abc', getName: async () => 'x' }))
      .toEqual({ type: null, source: null });
    expect(readStyleMetadata(null)).toEqual({ type: null, source: null });
    expect(readStyleMetadata(undefined)).toEqual({ type: null, source: null });
  });

  it('ignores unknown values and never throws', () => {
    expect(readStyleMetadata({ type: 'weird', source: 'elsewhere' }))
      .toEqual({ type: null, source: null });
    const throwing = {
      getType: () => { throw new Error('resourceMissing'); },
      isFromLibrary: () => { throw new Error('resourceMissing'); },
    };
    expect(readStyleMetadata(throwing)).toEqual({ type: null, source: null });
    const throwingGetter = Object.defineProperty({}, 'type', {
      get() { throw new Error('boom'); },
    });
    expect(() => readStyleMetadata(throwingGetter)).not.toThrow();
  });
});

// F1: element-scoped styles must reach the payload even without a usable name.
describe('readStyleName', () => {
  it('prefers the synchronous name and skips the getName() round trip', async () => {
    const style = { name: 'hero', getName: vi.fn(async () => 'stale') };
    expect(await readStyleName(style)).toBe('hero');
    expect(style.getName).not.toHaveBeenCalled();
  });

  it('falls back to getName() on runtimes without the sync property', async () => {
    expect(await readStyleName({ getName: async () => 'legacy' })).toBe('legacy');
  });

  it('returns null when getName() rejects (element styles reject with resourceMissing)', async () => {
    const style = { getName: async () => { throw new Error('resourceMissing'); } };
    await expect(readStyleName(style)).resolves.toBeNull();
  });

  it('returns null for empty names, missing getName, and non-objects', async () => {
    expect(await readStyleName({ name: '', getName: async () => '' })).toBeNull();
    expect(await readStyleName({ id: 'x' })).toBeNull();
    expect(await readStyleName(null)).toBeNull();
    expect(await readStyleName(undefined)).toBeNull();
  });
});

describe('shouldIncludeStyle', () => {
  const element = { type: 'element', source: 'site' } as const;
  const global = { type: 'global', source: 'site' } as const;
  const unknown = { type: null, source: null } as const;

  it('always includes element-scoped styles, even nameless or underscore-prefixed', () => {
    expect(shouldIncludeStyle(element, null)).toBe(true);
    expect(shouldIncludeStyle(element, '')).toBe(true);
    expect(shouldIncludeStyle(element, '_wf-element')).toBe(true);
    expect(shouldIncludeStyle(element, 'named-element')).toBe(true);
  });

  it('keeps the underscore/nameless filter for every other type', () => {
    expect(shouldIncludeStyle(global, 'hero')).toBe(true);
    expect(shouldIncludeStyle(global, '_internal')).toBe(false);
    expect(shouldIncludeStyle(global, null)).toBe(false);
    expect(shouldIncludeStyle(global, '')).toBe(false);
    expect(shouldIncludeStyle(unknown, 'hero')).toBe(true);
    expect(shouldIncludeStyle(unknown, '_internal')).toBe(false);
    expect(shouldIncludeStyle(unknown, null)).toBe(false);
  });
});

describe('isTagStyle', () => {
  it('trusts the real type when known', () => {
    expect(isTagStyle({ type: 'tag', source: 'site' }, 'my-thing')).toBe(true);
    // A global class literally named "body" is a class, not a tag style.
    expect(isTagStyle({ type: 'global', source: 'site' }, 'body')).toBe(false);
  });

  it('falls back to the name heuristic when type is unknown', () => {
    expect(isTagStyle({ type: null, source: null }, 'All H1 Headings')).toBe(true);
    expect(isTagStyle({ type: null, source: null }, 'hero-heading')).toBe(false);
  });
});

describe('toPayloadStyleType', () => {
  it("keeps 'class' as the legacy fallback when type is unknown", () => {
    expect(toPayloadStyleType({ type: null, source: null })).toBe('class');
    expect(toPayloadStyleType({ type: 'combo', source: 'site' })).toBe('combo');
  });
});

describe('shouldReadBreakpoints', () => {
  it('reads class styles and unknown types only', () => {
    expect(shouldReadBreakpoints({ type: 'global', source: 'site' })).toBe(true);
    expect(shouldReadBreakpoints({ type: 'combo', source: 'library' })).toBe(true);
    expect(shouldReadBreakpoints({ type: null, source: null })).toBe(true);
    expect(shouldReadBreakpoints({ type: 'tag', source: 'site' })).toBe(false);
    expect(shouldReadBreakpoints({ type: 'element', source: 'site' })).toBe(false);
    expect(shouldReadBreakpoints({ type: 'descendant', source: 'site' })).toBe(false);
  });
});

// F2: API absent stays quiet; a rejection must surface.
describe('readMediaQueries', () => {
  it('stays quiet (no error) when getAllMediaQueries is unavailable', async () => {
    expect(await readMediaQueries({})).toEqual({ mediaQueries: [] });
    expect(await readMediaQueries(undefined)).toEqual({ mediaQueries: [] });
  });

  it('surfaces the rejection instead of swallowing it', async () => {
    const result = await readMediaQueries({
      getAllMediaQueries: async () => { throw new Error('nope'); },
    });
    expect(result.mediaQueries).toEqual([]);
    expect(result.error).toBe('nope');
  });

  it('keeps only the documented fields', async () => {
    const result = await readMediaQueries({
      getAllMediaQueries: async () => [{ ...MEDIA_QUERIES[2], extra: 'drop-me' }],
    });
    expect(result).toEqual({ mediaQueries: [MEDIA_QUERIES[2]] });
  });
});

describe('readBreakpointProperties', () => {
  // F5: max-width joins (worker models clamping); font-size leaves (never consumed).
  it('whitelist is width, min-width, max-width', () => {
    expect([...BREAKPOINT_PROPERTY_WHITELIST]).toEqual(['width', 'min-width', 'max-width']);
  });

  it('reads only bounded non-base breakpoints and keeps whitelisted string values', async () => {
    const getProperties = vi.fn(async (options?: { breakpoint?: string }) => {
      switch (options?.breakpoint) {
        case 'medium':
          return { width: '1200px', color: 'red', 'min-width': '50%' };
        case 'small':
          return { 'max-width': '100%', 'font-size': '14px', 'grid-template-columns': '1fr 1fr' };
        case 'tiny':
          return {};
        default:
          throw new Error(`unexpected breakpoint ${options?.breakpoint}`);
      }
    });

    const result = await readBreakpointProperties({ getProperties }, MEDIA_QUERIES as any);

    expect(result).toEqual({
      properties: {
        medium: { width: '1200px', 'min-width': '50%' },
        small: { 'max-width': '100%' },
      },
      errors: [],
    });
    const requested = getProperties.mock.calls.map((call) => call[0]?.breakpoint).sort();
    // Base (main) and unbounded-above (large) breakpoints are never queried.
    expect(requested).toEqual(['medium', 'small', 'tiny']);
  });

  // F2: per-breakpoint failures are reported, not swallowed.
  it('drops variable references and reports per-breakpoint failures', async () => {
    const getProperties = vi.fn(async (options?: { breakpoint?: string }) => {
      if (options?.breakpoint === 'medium') return { width: { id: 'var-1', type: 'variable' } };
      if (options?.breakpoint === 'small') throw new Error('resourceMissing');
      return { width: 600 };
    });
    const result = await readBreakpointProperties({ getProperties }, MEDIA_QUERIES as any);
    expect(result).toEqual({ properties: { tiny: { width: '600' } }, errors: ['resourceMissing'] });
  });

  it('returns undefined when there is nothing to read', async () => {
    expect(await readBreakpointProperties({ getProperties: async () => ({}) }, MEDIA_QUERIES as any))
      .toEqual({ properties: undefined, errors: [] });
    expect(await readBreakpointProperties({ getProperties: async () => ({ width: '9px' }) }, []))
      .toBeUndefined();
    expect(await readBreakpointProperties({}, MEDIA_QUERIES as any)).toBeUndefined();
  });
});

describe('summarizeBreakpointReadFailures', () => {
  it('returns null when nothing failed', () => {
    expect(summarizeBreakpointReadFailures([])).toBeNull();
  });

  it('aggregates all failures into ONE collection warning', () => {
    expect(summarizeBreakpointReadFailures(['resourceMissing', 'timeout', 'resourceMissing'])).toEqual({
      source: 'Style Breakpoints',
      message: 'Failed to read breakpoint properties for 3 styles',
      error: 'resourceMissing',
    });
    expect(summarizeBreakpointReadFailures(['boom'])?.message)
      .toBe('Failed to read breakpoint properties for 1 style');
  });
});

// F7: base properties and breakpoint reads are independent; run them together.
describe('readStyleProperties', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the breakpoint reads before the base getProperties() resolves', async () => {
    let resolveBase!: (value: Record<string, unknown>) => void;
    const order: string[] = [];
    const getProperties = vi.fn((options?: { breakpoint?: string }) => {
      if (!options?.breakpoint) {
        order.push('base');
        return new Promise<Record<string, unknown>>((resolve) => { resolveBase = resolve; });
      }
      order.push(options.breakpoint);
      return Promise.resolve({ width: '100%' });
    });

    const pending = readStyleProperties({ getProperties }, { type: 'global', source: 'site' }, MEDIA_QUERIES as any);
    // All three breakpoint reads were issued while the base read is still pending.
    expect(order).toEqual(['base', 'medium', 'small', 'tiny']);
    resolveBase({ color: 'red' });

    const result = await pending;
    expect(result.properties).toEqual({ color: 'red' });
    expect(result.breakpoints?.properties).toEqual({
      medium: { width: '100%' },
      small: { width: '100%' },
      tiny: { width: '100%' },
    });
  });

  it('a base-properties failure warns and continues with {} (breakpoints still read)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const getProperties = vi.fn(async (options?: { breakpoint?: string }) => {
      if (!options?.breakpoint) throw new Error('base failed');
      return { width: '50%' };
    });
    const result = await readStyleProperties({ getProperties }, { type: 'combo', source: 'site' }, MEDIA_QUERIES as any);
    expect(result.properties).toEqual({});
    expect(result.breakpoints?.properties).toEqual({
      medium: { width: '50%' }, small: { width: '50%' }, tiny: { width: '50%' },
    });
    expect(warn).toHaveBeenCalledWith('Error getting style properties:', expect.any(Error));
  });

  it('issues no Style operations for element-scoped styles', async () => {
    const getProperties = vi.fn(async () => ({ color: 'red' }));
    const result = await readStyleProperties({ getProperties }, { type: 'element', source: 'site' }, MEDIA_QUERIES as any);
    expect(getProperties).not.toHaveBeenCalled();
    expect(result).toEqual({ properties: {}, breakpoints: undefined });
  });

  it('skips breakpoint reads for tag styles and when there are no media queries', async () => {
    const getProperties = vi.fn(async (options?: { breakpoint?: string }) => (options?.breakpoint ? { width: '1px' } : { color: 'blue' }));
    const tag = await readStyleProperties({ getProperties }, { type: 'tag', source: 'site' }, MEDIA_QUERIES as any);
    expect(tag).toEqual({ properties: { color: 'blue' }, breakpoints: undefined });
    const noMq = await readStyleProperties({ getProperties }, { type: 'global', source: 'site' }, []);
    expect(noMq).toEqual({ properties: { color: 'blue' }, breakpoints: undefined });
    expect(getProperties.mock.calls.every((call) => call[0]?.breakpoint === undefined)).toBe(true);
  });
});
