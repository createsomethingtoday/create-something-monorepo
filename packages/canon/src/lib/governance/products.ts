export type GovernanceProductId = 'atlas' | 'signal' | 'decision' | 'proof';

export type GovernanceProductRole = 'map' | 'intake' | 'judgment' | 'evidence';

export type GovernanceProductSurface = 'map' | 'inbox' | 'queue' | 'proof-graph';

export type GovernanceProductPrimitive = 'resource' | 'tool' | 'prompt' | 'ledger';

export type GovernanceProductAttachmentMode = 'connects' | 'consumes' | 'produces' | 'records';

export type GovernanceProduct = {
  id: GovernanceProductId;
  name: string;
  role: GovernanceProductRole;
  surface: GovernanceProductSurface;
  primitive: GovernanceProductPrimitive;
  headline: string;
  description: string;
  owns: string[];
  inputs: GovernanceProductId[];
  outputs: GovernanceProductId[];
  attachesTo: GovernanceProductId[];
  requiredForProduction: boolean;
};

export type GovernanceProductAttachment = {
  productId: GovernanceProductId;
  mode: GovernanceProductAttachmentMode;
  surface: GovernanceProductSurface;
  required?: boolean;
  source?: string;
};

export type GovernanceProductLink = {
  source: GovernanceProductId;
  target: GovernanceProductId;
  mode: GovernanceProductAttachmentMode;
  label: string;
  required: boolean;
};

export type GovernanceProductComposition = {
  id: 'signal-decision-proof';
  products: GovernanceProductId[];
  requiredLinks: GovernanceProductLink[];
  atlasHub: GovernanceProductId;
};

export const GOVERNANCE_PRODUCTS: Record<GovernanceProductId, GovernanceProduct> = {
  atlas: {
    id: 'atlas',
    name: 'Atlas',
    role: 'map',
    surface: 'map',
    primitive: 'resource',
    headline: 'The map that connects governance products.',
    description:
      'Atlas shows where signals enter, where decisions pause, and where proof records the outcome.',
    owns: ['workflow map', 'system relationships', 'ownership boundary', 'attachment graph'],
    inputs: ['signal', 'decision', 'proof'],
    outputs: ['signal', 'decision', 'proof'],
    attachesTo: ['signal', 'decision', 'proof'],
    requiredForProduction: true
  },
  signal: {
    id: 'signal',
    name: 'Signal',
    role: 'intake',
    surface: 'inbox',
    primitive: 'resource',
    headline: 'The inbox for changes, exceptions, and work that needs attention.',
    description:
      'Signal captures the incoming change, source, owner, affected system, and reason it matters.',
    owns: ['source event', 'account owner', 'affected system', 'urgency and authority context'],
    inputs: [],
    outputs: ['decision', 'proof'],
    attachesTo: ['atlas', 'decision', 'proof'],
    requiredForProduction: true
  },
  decision: {
    id: 'decision',
    name: 'Decision',
    role: 'judgment',
    surface: 'queue',
    primitive: 'prompt',
    headline: 'The judgment path for human, agent, and policy action.',
    description:
      'Decision routes whether the next step can run, must wait, or should stop with a named owner.',
    owns: ['review owner', 'run-wait-stop state', 'allowed action', 'escalation and policy reason'],
    inputs: ['signal'],
    outputs: ['proof'],
    attachesTo: ['atlas', 'signal', 'proof'],
    requiredForProduction: true
  },
  proof: {
    id: 'proof',
    name: 'Proof',
    role: 'evidence',
    surface: 'proof-graph',
    primitive: 'ledger',
    headline: 'The durable record of what happened and why.',
    description:
      'Proof preserves the evidence, decision, outcome, receipt, rollback note, and next owner.',
    owns: ['evidence', 'outcome', 'receipt', 'rollback note', 'audit trail'],
    inputs: ['signal', 'decision'],
    outputs: [],
    attachesTo: ['atlas', 'signal', 'decision'],
    requiredForProduction: true
  }
};

export const SIGNAL_DECISION_PROOF_COMPOSITION: GovernanceProductComposition = {
  id: 'signal-decision-proof',
  atlasHub: 'atlas',
  products: ['atlas', 'signal', 'decision', 'proof'],
  requiredLinks: [
    {
      source: 'atlas',
      target: 'signal',
      mode: 'connects',
      label: 'Atlas maps where the signal enters.',
      required: true
    },
    {
      source: 'signal',
      target: 'decision',
      mode: 'produces',
      label: 'Signal produces a decision requirement.',
      required: true
    },
    {
      source: 'decision',
      target: 'proof',
      mode: 'produces',
      label: 'Decision produces proof of the action or pause.',
      required: true
    },
    {
      source: 'proof',
      target: 'atlas',
      mode: 'records',
      label: 'Proof records back onto the Atlas map.',
      required: true
    }
  ]
};

export function getGovernanceProduct(productId: GovernanceProductId): GovernanceProduct {
  return GOVERNANCE_PRODUCTS[productId];
}

export function listGovernanceProducts(): GovernanceProduct[] {
  return SIGNAL_DECISION_PROOF_COMPOSITION.products.map((productId) =>
    getGovernanceProduct(productId)
  );
}

export function canAttachGovernanceProducts(
  source: GovernanceProductId,
  target: GovernanceProductId
): boolean {
  return GOVERNANCE_PRODUCTS[source].attachesTo.includes(target);
}

export function createGovernanceProductAttachment(
  productId: GovernanceProductId,
  input: Partial<GovernanceProductAttachment> = {}
): GovernanceProductAttachment {
  const product = getGovernanceProduct(productId);
  return {
    productId,
    mode:
      input.mode ??
      (productId === 'proof' ? 'records' : productId === 'atlas' ? 'connects' : 'produces'),
    surface: input.surface ?? product.surface,
    required: input.required ?? product.requiredForProduction,
    source: input.source
  };
}

export function createGovernanceProductAttachments(
  productIds: GovernanceProductId[],
  source?: string
): GovernanceProductAttachment[] {
  return [...new Set(productIds)].map((productId) =>
    createGovernanceProductAttachment(productId, { source })
  );
}

export function summarizeGovernanceProducts(productIds: GovernanceProductId[]): string {
  const names = [...new Set(productIds)].map((productId) => getGovernanceProduct(productId).name);
  return names.length ? names.join(' -> ') : 'No governance products attached';
}
