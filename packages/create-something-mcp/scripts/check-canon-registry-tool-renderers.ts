#!/usr/bin/env tsx
import assert from 'node:assert/strict';

import {
  getCanonRegistryItem,
  renderCanonExtensionRoutingDecision,
  renderCanonProjectOverlayReview,
  renderCanonPublicExportClassification,
  renderCanonRegistryItem,
  reviewCanonProjectOverlay,
  routeCanonExtensionIntake,
  searchCanonPublicExportClassifications,
  searchCanonRegistry
} from '@create-something/canon/registry';
import type {
  CanonExtensionIntakePacket,
  CanonProjectOverlayManifest
} from '@create-something/canon/registry';

const registryItem = getCanonRegistryItem('component.clear-decision-panel');
assert.ok(registryItem, 'Expected Canon registry item lookup to resolve');

const renderedRegistryItem = renderCanonRegistryItem(registryItem);
assert.match(renderedRegistryItem, /## ClearDecisionPanel/);
assert.match(renderedRegistryItem, /- ID: `component\.clear-decision-panel`/);
assert.match(renderedRegistryItem, /### Contract/);

const searchResults = searchCanonRegistry('decision evidence', {
  kind: 'component',
  maturity: 'stable',
  limit: 5
});
assert.ok(
  searchResults.some((item) => item.id === 'component.clear-decision-panel'),
  'Expected Canon registry search to find ClearDecisionPanel'
);

const publicExportRules = searchCanonPublicExportClassifications({
  query: 'Footer',
  registryPolicy: 'candidate-review',
  limit: 5
});
assert.ok(
  publicExportRules.some(
    (rule) => rule.exportPath === './components' && rule.exportName === 'Footer'
  ),
  'Expected Canon public export policy search to find ./components#Footer'
);

const renderedPublicExportRule = renderCanonPublicExportClassification(publicExportRules[0]!);
assert.match(renderedPublicExportRule, /Registry policy: `candidate-review`/);

const packet: CanonExtensionIntakePacket = {
  id: 'overlay.mcp-smoke.operator-brief',
  title: 'MCP Smoke Operator Brief',
  summary: 'A compact state, owner, receipt, and next-action brief.',
  requestedKind: 'template',
  requestedModalities: ['chat', 'voice'],
  owner: 'mcp-smoke',
  sourcePackage: '@create-something/mcp',
  tags: ['handoff', 'brief'],
  surfaces: [
    { surfaceId: 'mcp-smoke-chat', name: 'MCP smoke chat', modality: 'chat' },
    { surfaceId: 'mcp-smoke-voice', name: 'MCP smoke voice', modality: 'voice' }
  ]
};
const decision = routeCanonExtensionIntake(packet);
assert.equal(decision.stage, 'candidate');

const renderedDecision = renderCanonExtensionRoutingDecision(packet, decision);
assert.match(renderedDecision, /## Canon Extension Routing/);
assert.match(renderedDecision, /Stage: `candidate`/);
assert.match(renderedDecision, /Stop Before Stable/);

const manifest: CanonProjectOverlayManifest = {
  id: 'overlay.mcp-smoke',
  name: 'MCP Smoke Overlay',
  owner: 'mcp-smoke',
  sourcePackage: '@create-something/mcp',
  targetModalities: ['web', 'chat', 'voice'],
  artifacts: [
    { kind: 'theme', path: 'theme.css' },
    { kind: 'tokens', path: 'tokens.json' },
    { kind: 'templates', path: 'templates/' },
    { kind: 'copy-rules', path: 'copy-rules.md' },
    { kind: 'surface-policy', path: 'surface-policy.md' },
    { kind: 'registry', path: 'registry.json' }
  ],
  extensionIntakes: [packet]
};
const review = reviewCanonProjectOverlay(manifest);
assert.equal(review.status, 'ready');

const renderedReview = renderCanonProjectOverlayReview(manifest, review);
assert.match(renderedReview, /## Canon Project Overlay Review/);
assert.match(renderedReview, /Status: `ready`/);
assert.match(renderedReview, /Extension Intake Decisions/);

console.log('Canon registry MCP tool renderer smoke passed.');
