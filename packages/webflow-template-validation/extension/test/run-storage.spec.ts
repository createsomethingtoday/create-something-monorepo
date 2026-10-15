import { describe, expect, it } from 'vitest';
import {
  LEGACY_STORAGE_KEYS,
  describeRequestFailure,
  getFixListStorageKey,
  getLastRunStorageKey,
  parseStoredValidationRun,
  pruneLegacyRunStorage,
} from '../src/run-storage';

const ALVERO = '6500000000000000000000a1';
const ELVERA = '6500000000000000000000b2';

function storedRun(siteId: string, url: string): string {
  return JSON.stringify({
    siteId,
    data: { url, categories: [], summary: {} },
    correlationId: 'wfv_abc',
    generatedAt: '2026-10-15T15:00:00.000Z',
  });
}

describe('run storage keys', () => {
  it('scopes the last-run and fix-list keys by site', () => {
    expect(getLastRunStorageKey(ALVERO)).not.toBe(getLastRunStorageKey(ELVERA));
    expect(getFixListStorageKey(ALVERO)).not.toBe(getFixListStorageKey(ELVERA));
    expect(getLastRunStorageKey(ELVERA)).toContain(ELVERA);
    expect(getFixListStorageKey(ELVERA)).toContain(ELVERA);
  });

  it('never reuses the pre-1.3.8 global keys', () => {
    for (const legacy of LEGACY_STORAGE_KEYS) {
      expect(getLastRunStorageKey(ELVERA)).not.toBe(legacy);
      expect(getFixListStorageKey(ELVERA)).not.toBe(legacy);
    }
  });
});

describe('parseStoredValidationRun', () => {
  it('restores a run generated for the same site', () => {
    const run = parseStoredValidationRun(storedRun(ELVERA, 'https://elvera.webflow.io'), ELVERA);
    expect(run?.siteId).toBe(ELVERA);
    expect(run?.data).toMatchObject({ url: 'https://elvera.webflow.io' });
    expect(run?.correlationId).toBe('wfv_abc');
  });

  it('refuses a run generated for another site (the Alvero-in-Elvera report)', () => {
    expect(parseStoredValidationRun(storedRun(ALVERO, 'https://alverostudio.webflow.io'), ELVERA)).toBeNull();
  });

  it('refuses legacy payloads with no site id', () => {
    const legacy = JSON.stringify({
      data: { url: 'https://alverostudio.webflow.io', categories: [] },
      correlationId: null,
      generatedAt: '2026-10-01T00:00:00.000Z',
      restored: false,
    });
    expect(parseStoredValidationRun(legacy, ELVERA)).toBeNull();
  });

  it('treats missing, malformed, and shape-less values as absent', () => {
    expect(parseStoredValidationRun(null, ELVERA)).toBeNull();
    expect(parseStoredValidationRun('{not json', ELVERA)).toBeNull();
    expect(parseStoredValidationRun(JSON.stringify({ siteId: ELVERA, data: { url: 'x' }, generatedAt: 'now' }), ELVERA)).toBeNull();
    expect(parseStoredValidationRun(JSON.stringify({ siteId: ELVERA, data: { categories: [] } }), ELVERA)).toBeNull();
  });
});

describe('pruneLegacyRunStorage', () => {
  it('removes both global keys and survives storage errors', () => {
    const removed: string[] = [];
    pruneLegacyRunStorage({ removeItem: (key: string) => { removed.push(key); } });
    expect(removed).toEqual([...LEGACY_STORAGE_KEYS]);
    expect(() => pruneLegacyRunStorage({ removeItem: () => { throw new Error('blocked'); } })).not.toThrow();
  });
});

describe('describeRequestFailure', () => {
  it('names the HTTP status when the Worker answered', () => {
    const error = Object.assign(new Error('Internal'), { status: 500 });
    expect(describeRequestFailure(error)).toBe('server responded 500');
  });

  it('names a timeout', () => {
    expect(describeRequestFailure(new DOMException('aborted', 'AbortError'))).toBe('request timed out');
  });

  it('names a blocked network request', () => {
    expect(describeRequestFailure(new TypeError('Failed to fetch'))).toBe('network request blocked or offline');
  });

  it('falls back to the message or unknown', () => {
    expect(describeRequestFailure(new Error('boom'))).toBe('boom');
    expect(describeRequestFailure(undefined)).toBe('unknown error');
  });
});
