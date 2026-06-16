import { sanitizeCanonContextId, type CanonWorkflowContext } from '$lib/canon/workflow-context';
import { ABUNDANCE_CONTEXT_ID, abundanceWorkflowContext } from './abundance-context';
import { SHIVWORKS_CONTEXT_ID, shivworksWorkflowContext } from './shivworks-context';

/**
 * Deploy-time fallbacks for delivery engagement contexts, keyed by context ID.
 * The D1 row wins once seeded; these keep engagement pages and the canon API
 * coherent before seeding and during D1 outages. Register new engagements
 * here instead of adding bespoke /api/delivery/{client}/* endpoints
 * (docs/DELIVERY_SURFACE_SPEC.md).
 */
const deliveryFallbacks: Record<string, CanonWorkflowContext> = {
	[ABUNDANCE_CONTEXT_ID]: abundanceWorkflowContext,
	[SHIVWORKS_CONTEXT_ID]: shivworksWorkflowContext
};

export function resolveDeliveryFallback(rawContextId: unknown): CanonWorkflowContext | undefined {
	return deliveryFallbacks[sanitizeCanonContextId(rawContextId)];
}
