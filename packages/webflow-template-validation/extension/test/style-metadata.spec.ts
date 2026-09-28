import { describe, it, expect, vi } from 'vitest';
import {
  BREAKPOINT_PROPERTY_WHITELIST,
  isTagStyle,
  readBreakpointProperties,
  readMediaQueries,
  readStyleMetadata,
  shouldReadBreakpoints,
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

describe('readMediaQueries', () => {
  it('returns [] when getAllMediaQueries is unavailable', async () => {
    expect(await readMediaQueries({})).toEqual([]);
    expect(await readMediaQueries(undefined)).toEqual([]);
  });

  it('returns [] when getAllMediaQueries rejects', async () => {
    expect(await readMediaQueries({ getAllMediaQueries: async () => { throw new Error('nope'); } }))
      .toEqual([]);
  });

  it('keeps only the documented fields', async () => {
    const result = await readMediaQueries({
      getAllMediaQueries: async () => [{ ...MEDIA_QUERIES[2], extra: 'drop-me' }],
    });
    expect(result).toEqual([MEDIA_QUERIES[2]]);
  });
});

describe('readBreakpointProperties', () => {
  it('whitelist is width, min-width, font-size', () => {
    expect([...BREAKPOINT_PROPERTY_WHITELIST]).toEqual(['width', 'min-width', 'font-size']);
  });

  it('reads only bounded non-base breakpoints and keeps whitelisted string values', async () => {
    const getProperties = vi.fn(async (options?: { breakpoint?: string }) => {
      switch (options?.breakpoint) {
        case 'medium':
          return { width: '1200px', color: 'red', 'min-width': '50%' };
        case 'small':
          return { 'font-size': '14px', 'grid-template-columns': '1fr 1fr' };
        case 'tiny':
          return {};
        default:
          throw new Error(`unexpected breakpoint ${options?.breakpoint}`);
      }
    });

    const result = await readBreakpointProperties({ getProperties }, MEDIA_QUERIES as any);

    expect(result).toEqual({
      medium: { width: '1200px', 'min-width': '50%' },
      small: { 'font-size': '14px' },
    });
    const requested = getProperties.mock.calls.map((call) => call[0]?.breakpoint).sort();
    // Base (main) and unbounded-above (large) breakpoints are never queried.
    expect(requested).toEqual(['medium', 'small', 'tiny']);
  });

  it('drops variable references and tolerates per-breakpoint failures', async () => {
    const getProperties = vi.fn(async (options?: { breakpoint?: string }) => {
      if (options?.breakpoint === 'medium') return { width: { id: 'var-1', type: 'variable' } };
      if (options?.breakpoint === 'small') throw new Error('resourceMissing');
      return { width: 600 };
    });
    const result = await readBreakpointProperties({ getProperties }, MEDIA_QUERIES as any);
    expect(result).toEqual({ tiny: { width: '600' } });
  });

  it('returns undefined when there is nothing to read', async () => {
    expect(await readBreakpointProperties({ getProperties: async () => ({}) }, MEDIA_QUERIES as any))
      .toBeUndefined();
    expect(await readBreakpointProperties({ getProperties: async () => ({ width: '9px' }) }, []))
      .toBeUndefined();
    expect(await readBreakpointProperties({}, MEDIA_QUERIES as any)).toBeUndefined();
  });
});
