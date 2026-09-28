import assert from 'node:assert/strict';
import test from 'node:test';
import { marketingPagePortfolio } from '../src/lib/data/marketingPages';
import { usesAgencyOperatorPalette } from '../src/lib/data/publicSurfacePolicy';

test('every current portfolio page owns the operator palette, including workflow details', () => {
  for (const entry of marketingPagePortfolio) {
    assert.equal(usesAgencyOperatorPalette(entry.path), entry.decision !== 'archive', entry.path);
  }
});

test('utility, private, archive and unknown paths fail closed', () => {
  for (const path of ['/account', '/admin/security', '/dashboard', '/login', '/logout', '/auth/callback', '/mcp-access/tools', '/delivery/abundance', '/prospects', '/prospects/secret', '/map/workspace/123', '/map/workspace/123/handoff/456', '/map/share/123', '/map/subscribe', '/dify', '/dify/unknown', '/workflows/unknown', '/products/unknown', '/unknown']) {
    assert.equal(usesAgencyOperatorPalette(path), false, path);
  }
});

test('approved Map entry and public supporting pages retain explicit ownership', () => {
  for (const path of ['/map/workspace', '/privacy', '/terms', '/ai-workflow-control', '/ai-workflow-recovery', '/marketplace-review-automation', '/stack/?source=test', '/practice#practice-workbench', '/arcs', '/arc/example', '/arc/app-review-governance', '/experiments', '/experiments/example']) {
    assert.equal(usesAgencyOperatorPalette(path), true, path);
  }
});
