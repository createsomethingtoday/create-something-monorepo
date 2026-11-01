import { describe, expect, it } from 'vitest';
import { safeLoginReturnPath, safeReturnPath } from '../src/lib/return-path';

describe('existing-account learning return destinations', () => {
  it.each([
    '/lessons/lesson-1',
    '/paths',
    '/paths/path-1',
    '/n/test-network/lessons/lesson-1',
    '/n/test-network/paths',
    '/n/test-network/paths/path-1'
  ])('preserves %s without changing enrollment destinations', (path) => {
    expect(safeLoginReturnPath(path)).toBe(path);
    expect(safeReturnPath(path)).toBe('/start');
  });
  it('retains sequence and library filter context', () => {
    expect(
      safeLoginReturnPath(
        '/n/test-network/lessons/lesson-1?path=path-1&q=agent+tools&series=Workshop'
      )
    ).toBe('/n/test-network/lessons/lesson-1?path=path-1&q=agent+tools&series=Workshop');
    expect(safeLoginReturnPath('/dashboard')).toBe('/dashboard');
  });
  it.each([
    'https://evil.test/lessons/a',
    '//evil.test/lessons/a',
    '/lessons/../admin',
    '/lessons/%2e%2e/admin',
    '/lessons/a#token=secret',
    '/lessons/a?next=https://evil.test',
    '/lessons/a?path=a&path=b',
    '/lessons/a?path=//evil.test',
    '/lessons/a?q=%0a',
    '/n/x/lessons/a',
    '/lessons/a?unknown=1',
    null
  ])('rejects unsafe or unsupported destination %s', (value) => {
    expect(safeLoginReturnPath(value)).toBe('/start');
  });
});
