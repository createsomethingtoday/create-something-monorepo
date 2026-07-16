export type PublicProductId = 'map' | 'build' | 'control';
export type PublicProductKind = 'subscription' | 'service';
export type SubscriptionCadence = 'monthly' | 'yearly';
export type ProductPricingState = 'configuration-required' | 'not-applicable';

export interface PublicProductDefinition {
  id: PublicProductId;
  name: string;
  shortName: string;
  kind: PublicProductKind;
  route: string;
  customerJob: string;
  outcome: string;
  purchasableStandalone: boolean;
  includes: PublicProductId[];
  subscriptionCadences: SubscriptionCadence[];
  pricingState: ProductPricingState;
  internalCompatibilityNames: string[];
  checkoutPlanIds: string[];
}

export const SUBSCRIPTION_CADENCES: SubscriptionCadence[] = ['monthly', 'yearly'];

export const PUBLIC_PRODUCT_SEQUENCE: PublicProductId[] = ['map', 'build', 'control'];

export const PUBLIC_PRODUCT_FAMILY: Record<PublicProductId, PublicProductDefinition> = {
  map: {
    id: 'map',
    name: 'CREATE SOMETHING Map',
    shortName: 'Map',
    kind: 'subscription',
    route: '/map',
    customerJob: 'Understand and design one human-agent workflow before implementation.',
    outcome: 'A living, typed workflow definition that is ready to share, version, and build.',
    purchasableStandalone: true,
    includes: [],
    subscriptionCadences: [...SUBSCRIPTION_CADENCES],
    pricingState: 'configuration-required',
    internalCompatibilityNames: ['Atlas'],
    checkoutPlanIds: ['map-monthly', 'map-yearly']
  },
  build: {
    id: 'build',
    name: 'CREATE SOMETHING Build',
    shortName: 'Build',
    kind: 'service',
    route: '/services',
    customerJob: 'Turn an approved workflow map into an owned, connected system.',
    outcome: 'A scoped implementation with operating boundaries, handoff, and verification.',
    purchasableStandalone: false,
    includes: [],
    subscriptionCadences: [],
    pricingState: 'not-applicable',
    internalCompatibilityNames: ['Workflow Pilot'],
    checkoutPlanIds: []
  },
  control: {
    id: 'control',
    name: 'CREATE SOMETHING Control',
    shortName: 'Control',
    kind: 'subscription',
    route: '/control',
    customerJob: 'Operate delegated work with explicit authority, approvals, evidence, and recovery.',
    outcome: 'A governed execution surface with Inbox, Map, Proof, runbooks, and recurring review.',
    purchasableStandalone: true,
    includes: ['map'],
    subscriptionCadences: [...SUBSCRIPTION_CADENCES],
    pricingState: 'configuration-required',
    internalCompatibilityNames: ['Policy OS', 'policy_os_trial', 'policy_os_core'],
    checkoutPlanIds: ['control-monthly', 'control-yearly']
  }
};

export function getPublicProduct(productId: PublicProductId): PublicProductDefinition {
  return PUBLIC_PRODUCT_FAMILY[productId];
}
