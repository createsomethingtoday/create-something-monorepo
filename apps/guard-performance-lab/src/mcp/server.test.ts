import { describe, expect, it } from 'vitest';
import { parseTrustedLauncherScope } from './server.js';

describe('Guard Lab stdio launcher scope', () => {
  it('has no implicit operator default', () => {
    expect(() => parseTrustedLauncherScope({})).toThrow(/trusted launcher/i);
  });

  it('accepts an explicit player scope from a trusted launcher', () => {
    expect(parseTrustedLauncherScope({
      GUARD_LAB_MCP_LAUNCHER: 'trusted',
      GUARD_LAB_MCP_SCOPE: 'player:developing-guard'
    })).toEqual({ role: 'player', playerId: 'developing-guard' });
  });
});
