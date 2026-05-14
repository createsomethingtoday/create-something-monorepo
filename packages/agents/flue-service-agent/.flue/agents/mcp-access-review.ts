import type { FlueContext } from '@flue/runtime';
import {
  createMcpAccessPrompt,
  mcpAccessReportSchema,
  parseMcpAccessPayload,
} from '../../src/mcp-access.js';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const input = parseMcpAccessPayload(payload);
  const harness = await init({ model: 'anthropic/claude-sonnet-4-6' });
  const session = await harness.session();

  const { data } = await session.prompt(createMcpAccessPrompt(input), {
    role: 'mcp-access-reviewer',
    result: mcpAccessReportSchema,
  });

  return data;
}
