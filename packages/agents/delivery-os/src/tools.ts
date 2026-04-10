import { tool } from '@openai/agents';
import { z } from 'zod';

import type { DeliveryOsStore } from './types.js';

const filterSchema = z.object({
  clientId: z.string().optional(),
  clientSlug: z.string().optional(),
  engagementId: z.string().optional(),
  componentId: z.string().optional(),
  kind: z.enum(['site', 'platform', 'product']).optional(),
  status: z.string().optional()
});

export function createDeliveryOsTools(store: DeliveryOsStore) {
  return [
    tool({
      name: 'list_engagements',
      description: 'List engagements by client or status.',
      parameters: filterSchema,
      execute: async (input) => store.listEngagements(input)
    }),
    tool({
      name: 'get_engagement_brief',
      description: 'Get the main engagement record by engagement ID or client slug.',
      parameters: z.object({
        engagementId: z.string().optional(),
        clientSlug: z.string().optional()
      }),
      execute: async (input) => store.getEngagement(input)
    }),
    tool({
      name: 'list_components',
      description: 'List delivery components inside an engagement, optionally filtered by kind or status.',
      parameters: filterSchema,
      execute: async (input) => store.listComponents(input)
    }),
    tool({
      name: 'list_artifacts',
      description: 'List delivery artifacts such as PRDs, onboarding docs, contracts, invoices, walkthroughs, and runbooks.',
      parameters: filterSchema.extend({
        visibility: z.enum(['internal', 'client', 'operator']).optional()
      }),
      execute: async (input) => store.listArtifacts(input)
    }),
    tool({
      name: 'list_milestones',
      description: 'List delivery milestones for an engagement or component.',
      parameters: filterSchema,
      execute: async (input) => store.listMilestones(input)
    }),
    tool({
      name: 'list_integrations',
      description: 'List integration records and their current status.',
      parameters: filterSchema,
      execute: async (input) => store.listIntegrations(input)
    }),
    tool({
      name: 'list_open_risks',
      description: 'List open or mitigating risks for an engagement or component.',
      parameters: filterSchema,
      execute: async (input) =>
        store
          .listRisks(input)
          .then((items) => items.filter((item) => item.status !== 'closed'))
    }),
    tool({
      name: 'get_commercial_snapshot',
      description: 'Get contract and invoice status plus recurring management terms for an engagement.',
      parameters: z.object({
        engagementId: z.string()
      }),
      execute: async (input) => store.getCommercialSnapshot(input)
    }),
    tool({
      name: 'list_access_checklist',
      description: 'List access and credential checklist items for a component.',
      parameters: filterSchema,
      execute: async (input) => store.listAccessItems(input)
    })
  ];
}
