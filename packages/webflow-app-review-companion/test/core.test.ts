import { describe, expect, test } from 'vitest';
import { coverageStatus, MISSIONS, normalizeEvent, sanitizeUrl } from '../src/core';

describe('App Review Companion capture policy', () => {
  test('redacts query values and secret-shaped metadata', () => {
    expect(sanitizeUrl('https://example.com/runtime.js?site=123&token=secret#debug')).toBe(
      'https://example.com/runtime.js?site=%5Bredacted%5D&token=%5Bredacted%5D'
    );
    expect(
      normalizeEvent({
        kind: 'network',
        at: '2026-07-14T20:00:00.000Z',
        url: 'https://example.com/api?email=person@example.com',
        detail: { cookie: 'session=abc', nodeCount: 42, label: 'ready' }
      })
    ).toEqual({
      kind: 'network',
      at: '2026-07-14T20:00:00.000Z',
      url: 'https://example.com/api?email=%5Bredacted%5D',
      detail: { nodeCount: 42, label: 'ready' }
    });
  });

  test('never treats incomplete mission coverage as validated', () => {
    expect(MISSIONS).toEqual([
      'configure',
      'publish',
      'production_runtime',
      'uninstall_cleanup'
    ]);
    expect(
      coverageStatus(MISSIONS.slice(0, -1).map((id) => ({ id, status: 'passed' })))
    ).toBe('blocked');
    expect(coverageStatus(MISSIONS.map((id) => ({ id, status: 'passed' })))).toBe(
      'validated'
    );
  });
});
