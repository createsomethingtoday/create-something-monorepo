import { describe, expect, it } from 'vitest';

import {
  createPublicAtlasCanvas,
  createPublicAtlasGraphArtifact,
  createPublicAtlasNode,
  normalizePublicAtlasCanvas
} from './headless.js';

describe('public Atlas governance product attachments', () => {
  it('connects the default Atlas canvas to the Signal Decision Proof contract', () => {
    const artifact = createPublicAtlasGraphArtifact(createPublicAtlasCanvas());

    expect(artifact.productContract.compositionId).toBe('signal-decision-proof');
    expect(artifact.productContract.atlasHub).toBe('atlas');
    expect(artifact.productContract.requiredProducts).toEqual([
      'atlas',
      'signal',
      'decision',
      'proof'
    ]);
    expect(artifact.productContract.connectedProducts).toEqual([
      'atlas',
      'signal',
      'decision',
      'proof'
    ]);

    const productIds = artifact.nodes.flatMap((node) =>
      node.products.map((product) => product.productId)
    );
    expect(productIds).toContain('atlas');
    expect(productIds).toContain('signal');
    expect(productIds).toContain('decision');
  });

  it('preserves explicit product attachments while normalizing public canvas input', () => {
    const node = createPublicAtlasNode('touchpoint', {
      id: 'touchpoint_reviewer_inbox',
      label: 'Reviewer inbox',
      products: [
        {
          productId: 'proof',
          mode: 'records',
          surface: 'proof-graph',
          required: true,
          source: 'Reviewer inbox'
        }
      ]
    });

    const canvas = normalizePublicAtlasCanvas({
      version: 1,
      id: 'custom',
      nodes: [node],
      edges: [],
      createdAt: '2026-06-30T00:00:00.000Z',
      updatedAt: '2026-06-30T00:00:00.000Z'
    });

    expect(canvas.nodes[0].products).toEqual([
      {
        productId: 'proof',
        mode: 'records',
        surface: 'proof-graph',
        required: true,
        source: 'Reviewer inbox'
      }
    ]);
  });
});
