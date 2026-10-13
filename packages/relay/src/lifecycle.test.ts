import { describe, it, expect, vi } from 'vitest';
import { buildSandboxOptions, scheduled } from './lifecycle';

describe('finite sandbox lifecycle', () => {
  it('uses the SDK finite default and clears any previous keepalive', () => {
    expect(buildSandboxOptions({})).toEqual({ keepAlive: false, sleepAfter: '10m' });
  });
  it.each(['never', '', '0s', '-1m', 'Infinity', '1e100h', 'NaN', 'garbage', '0.5h', '99999999999999999h'])('rejects invalid duration %s', value => {
    expect(() => buildSandboxOptions({ SANDBOX_SLEEP_AFTER: value })).toThrow();
  });
  it.each(['30s', '10m', '1h'])('preserves finite override %s', value => {
    expect(buildSandboxOptions({ SANDBOX_SLEEP_AFTER: value })).toEqual({ keepAlive: false, sleepAfter: value });
  });
  it('a residual scheduled event cannot acquire or wake a sandbox', async () => {
    const get = vi.fn(() => { throw new Error('must not acquire sandbox'); });
    await scheduled({}, { Sandbox: { get, idFromName: get } }, {});
    expect(get).not.toHaveBeenCalled();
  });
});
