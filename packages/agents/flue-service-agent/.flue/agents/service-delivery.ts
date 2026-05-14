import type { FlueContext } from '@flue/runtime';
import {
  createServiceDeliveryPrompt,
  parseDeliveryTaskPayload,
  serviceDeliveryResultSchema,
} from '../../src/contract.js';

export const triggers = { webhook: true };

export default async function ({ init, payload }: FlueContext) {
  const input = parseDeliveryTaskPayload(payload);
  const harness = await init({ model: 'anthropic/claude-sonnet-4-6' });
  const session = await harness.session();

  const { data } = await session.prompt(createServiceDeliveryPrompt(input), {
    role: 'service-delivery-agent',
    result: serviceDeliveryResultSchema,
  });

  return data;
}
