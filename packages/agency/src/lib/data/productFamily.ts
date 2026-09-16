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
  accessLabel: string;
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
    customerJob: 'Plan how people and AI will share a task before building it.',
    outcome: 'A workflow plan you can update, share, and use to guide the build.',
    purchasableStandalone: true,
    includes: [],
    subscriptionCadences: [...SUBSCRIPTION_CADENCES],
    pricingState: 'configuration-required',
    accessLabel: PUBLIC_PRICING.map.workspaceLabel,
    internalCompatibilityNames: ['Atlas'],
    checkoutPlanIds: ['map-monthly', 'map-yearly']
  },
  build: {
    id: 'build',
    name: 'CREATE SOMETHING Build',
    shortName: 'Build',
    kind: 'service',
    route: '/services',
    customerJob: 'Build the agreed workflow and connect the tools it needs.',
    outcome: 'A tested system with clear permissions and instructions your team keeps.',
    purchasableStandalone: false,
    includes: [],
    subscriptionCadences: [],
    pricingState: 'not-applicable',
    accessLabel: 'Scoped and quoted separately',
    internalCompatibilityNames: ['Workflow Pilot'],
    checkoutPlanIds: []
  },
  control: {
    id: 'control',
    name: 'CREATE SOMETHING Control',
    shortName: 'Control',
    kind: 'subscription',
    route: '/control',
    customerJob:
      'Keep live AI work monitored, reviewed, and supported when something fails.',
    outcome:
      'A managed system with a workflow plan, work history, recovery instructions, and regular reviews.',
    purchasableStandalone: true,
    includes: ['map'],
    subscriptionCadences: [...SUBSCRIPTION_CADENCES],
    pricingState: 'configuration-required',
    accessLabel: PUBLIC_PRICING.managedControl.longLabel,
    internalCompatibilityNames: ['Policy OS', 'policy_os_trial', 'policy_os_core'],
    checkoutPlanIds: ['control-monthly', 'control-yearly']
  }
};

export function getPublicProduct(productId: PublicProductId): PublicProductDefinition {
  return PUBLIC_PRODUCT_FAMILY[productId];
}
import { PUBLIC_PRICING } from './publicPricing';
