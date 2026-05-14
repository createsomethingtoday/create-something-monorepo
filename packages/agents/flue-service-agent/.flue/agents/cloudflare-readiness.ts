import type { FlueContext } from '@flue/runtime';
import {
  cloudflareReadinessReportSchema,
  createCloudflareReadinessPrompt,
  parseCloudflareReadinessPayload,
} from '../../src/cloudflare-readiness.js';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const input = parseCloudflareReadinessPayload(payload);
  const harness = await init({ model: 'anthropic/claude-sonnet-4-6' });
  const session = await harness.session();

  const { data } = await session.prompt(createCloudflareReadinessPrompt(input), {
    role: 'cloudflare-readiness-agent',
    result: cloudflareReadinessReportSchema,
  });

  return data;
}
