import type { IndeedEnv } from './types.js';

export function getConfiguredMcpKey(env: IndeedEnv): string | null {
  return env.INDEED_MCP_API_KEY?.trim() || env.MCP_API_KEY?.trim() || null;
}

export function getMcpMisconfiguredPayload() {
  return {
    ok: false,
    error: {
      code: 'MISCONFIGURED',
      message: 'INDEED_MCP_API_KEY is not configured for this deployment.',
    },
  };
}
