import { describe, expect, it } from 'vitest';

import { getGateCommand } from '../self-heal.js';

describe('getGateCommand', () => {
  it('runs lint from the workspace root when a package filter is provided', () => {
    expect(getGateCommand('lint', 'packages/harness')).toBe(
      'pnpm -w lint -- --package=packages/harness'
    );
  });

  it('appends --fix to the root lint command for auto-fix runs', () => {
    expect(getGateCommand('lint', 'packages/harness', true)).toBe(
      'pnpm -w lint -- --package=packages/harness --fix'
    );
    expect(getGateCommand('lint', undefined, true)).toBe('pnpm -w lint -- --fix');
  });
});
