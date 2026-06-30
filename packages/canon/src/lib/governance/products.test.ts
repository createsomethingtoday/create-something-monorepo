import { describe, expect, it } from 'vitest';

import {
  SIGNAL_DECISION_PROOF_COMPOSITION,
  canAttachGovernanceProducts,
  createGovernanceProductAttachment,
  getGovernanceProduct,
  listGovernanceProducts,
  summarizeGovernanceProducts
} from './products.js';

describe('governance product contract', () => {
  it('defines Atlas, Signal, Decision, and Proof as production products', () => {
    expect(listGovernanceProducts().map((product) => product.id)).toEqual([
      'atlas',
      'signal',
      'decision',
      'proof'
    ]);

    for (const product of listGovernanceProducts()) {
      expect(product.requiredForProduction).toBe(true);
      expect(product.headline.length).toBeGreaterThan(12);
      expect(product.owns.length).toBeGreaterThan(0);
    }
  });

  it('makes Atlas the hub while preserving the Signal to Decision to Proof chain', () => {
    expect(SIGNAL_DECISION_PROOF_COMPOSITION.atlasHub).toBe('atlas');
    expect(canAttachGovernanceProducts('atlas', 'signal')).toBe(true);
    expect(canAttachGovernanceProducts('atlas', 'decision')).toBe(true);
    expect(canAttachGovernanceProducts('atlas', 'proof')).toBe(true);
    expect(canAttachGovernanceProducts('signal', 'decision')).toBe(true);
    expect(canAttachGovernanceProducts('decision', 'proof')).toBe(true);
    expect(canAttachGovernanceProducts('proof', 'atlas')).toBe(true);
  });

  it('creates inspectable product attachments for Atlas nodes and surfaces', () => {
    const signal = createGovernanceProductAttachment('signal', { source: 'Slack API channel' });
    expect(signal).toEqual({
      productId: 'signal',
      mode: 'produces',
      surface: 'inbox',
      required: true,
      source: 'Slack API channel'
    });

    expect(getGovernanceProduct('proof').surface).toBe('proof-graph');
    expect(summarizeGovernanceProducts(['signal', 'decision', 'proof'])).toBe(
      'Signal -> Decision -> Proof'
    );
  });
});
