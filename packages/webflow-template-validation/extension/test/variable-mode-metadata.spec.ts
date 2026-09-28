import { describe, it, expect } from 'vitest';
import { readVariableModeBreakpoint } from '../src/variable-mode-metadata';

describe('readVariableModeBreakpoint', () => {
  it('returns the breakpoint id for an automatic mode', async () => {
    await expect(readVariableModeBreakpoint({ getBreakpoint: async () => 'medium' })).resolves.toEqual({
      available: true,
      breakpointId: 'medium'
    });
  });

  it('returns a null breakpoint for a manual mode', async () => {
    await expect(readVariableModeBreakpoint({ getBreakpoint: async () => null })).resolves.toEqual({
      available: true,
      breakpointId: null
    });
  });

  it('reports unavailable on older runtimes without getBreakpoint', async () => {
    await expect(readVariableModeBreakpoint({ id: 'm1' })).resolves.toEqual({ available: false, breakpointId: null });
  });

  it('reports unavailable instead of throwing when getBreakpoint rejects or returns junk', async () => {
    await expect(
      readVariableModeBreakpoint({ getBreakpoint: async () => { throw new Error('nope'); } })
    ).resolves.toEqual({ available: false, breakpointId: null });
    await expect(readVariableModeBreakpoint({ getBreakpoint: async () => 42 })).resolves.toEqual({
      available: false,
      breakpointId: null
    });
    await expect(readVariableModeBreakpoint(null)).resolves.toEqual({ available: false, breakpointId: null });
  });
});
