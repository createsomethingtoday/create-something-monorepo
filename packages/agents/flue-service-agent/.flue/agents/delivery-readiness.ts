import type { FlueContext } from '@flue/runtime';
import {
  createDeliveryReadinessPrompt,
  deliveryReadinessReportSchema,
  parseDeliveryReadinessPayload,
} from '../../src/readiness.js';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const input = parseDeliveryReadinessPayload(payload);
  const harness = await init({ model: 'anthropic/claude-sonnet-4-6' });
  const session = await harness.session();

  const { data } = await session.prompt(createDeliveryReadinessPrompt(input), {
    role: 'delivery-readiness-agent',
    result: deliveryReadinessReportSchema,
  });

  return data;
}
