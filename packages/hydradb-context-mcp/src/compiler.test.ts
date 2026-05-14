import assert from 'node:assert/strict';
import test from 'node:test';

import { compileRecallContext } from './compiler.js';
import type { ContextRecallResult } from './types.js';

const BASE_RESULT: ContextRecallResult = {
  chunks: [
    {
      excerpt: `Bearer ${'abcdefghijklmnopqrstuvwxyz'} should not be visible. The credential delivery policy requires rotation before production use.`,
      score: 0.91,
      sourceId: 'cs-docs-policy-mcp-credential-delivery',
      sourceTitle: 'MCP Credential Delivery Policy',
      metadata: {
        source_path: 'docs/policies/v1/policy.mcp-credential-delivery.v1.md'
      }
    },
    {
      excerpt: 'Tenant exposure is governed by explicit allowlists.',
      score: 0.42,
      sourceId: 'cs-docs-policy-tenant-tool-exposure'
    }
  ],
  query: 'Which policy governs bearer token rotation?',
  resultCount: 2,
  server: 'hydradb-context-mcp',
  subTenantId: 'cs-internal-context',
  tenantId: 'create_something'
};

test('compileRecallContext returns agent-ready context with source labels', () => {
  const compiled = compileRecallContext(BASE_RESULT, { maxExcerptChars: 120 });

  assert.equal(compiled.resultCount, 2);
  assert.equal(compiled.sources[0]?.label, 'MCP Credential Delivery Policy');
  assert.match(compiled.compiledContext, /# Hydra DB Policy Context/);
  assert.match(compiled.compiledContext, /\[S1\] MCP Credential Delivery Policy/);
  assert.match(compiled.compiledContext, /source_id=cs-docs-policy-mcp-credential-delivery/);
  assert.doesNotMatch(compiled.compiledContext, /abcdefghijklmnopqrstuvwxyz/);
});

test('compileRecallContext filters by minimum score', () => {
  const compiled = compileRecallContext(BASE_RESULT, { minScore: 0.8 });

  assert.equal(compiled.resultCount, 1);
  assert.equal(compiled.sources.length, 1);
  assert.doesNotMatch(compiled.compiledContext, /tenant exposure/i);
});

test('compileRecallContext derives labels from source path headers and dedupes sources', () => {
  const compiled = compileRecallContext({
    ...BASE_RESULT,
    chunks: [
      {
        excerpt:
          'Artifact type: policy_or_architecture_doc Source path: docs/MCP_SCAFFOLD.md Source sha256 prefix: abc # MCP Scaffold',
        score: 0.9,
        sourceId: 'cs-docs-docs-mcp-scaffold-md'
      },
      {
        excerpt:
          'Artifact type: policy_or_architecture_doc Source path: docs/MCP_SCAFFOLD.md Source sha256 prefix: abc ## Commands',
        score: 0.8,
        sourceId: 'cs-docs-docs-mcp-scaffold-md'
      }
    ],
    resultCount: 2
  });

  assert.equal(compiled.resultCount, 1);
  assert.equal(compiled.sources[0]?.label, 'docs/MCP_SCAFFOLD.md');
});

test('compileRecallContext falls back to readable labels from CREATE SOMETHING source IDs', () => {
  const compiled = compileRecallContext({
    ...BASE_RESULT,
    chunks: [
      {
        excerpt: 'Policy details without the stored source header.',
        score: 0.9,
        sourceId: 'cs-docs-docs-policies-v1-policy-client-hub-user-experience-v1-md'
      }
    ],
    resultCount: 1
  });

  assert.equal(
    compiled.sources[0]?.label,
    'docs/policies/v1/policy.client-hub-user-experience.v1.md'
  );
});

test('compileRecallContext labels Linear evidence source IDs', () => {
  const compiled = compileRecallContext({
    ...BASE_RESULT,
    chunks: [
      {
        excerpt: 'Linear issue evidence for a completed implementation.',
        score: 0.9,
        sourceId: 'cs-linear-evidence-cre-335'
      }
    ],
    resultCount: 1
  });

  assert.equal(compiled.sources[0]?.label, 'Linear CRE-335');
});

test('compileRecallContext labels MCP catalog source IDs', () => {
  const compiled = compileRecallContext({
    ...BASE_RESULT,
    chunks: [
      {
        excerpt: 'MCP catalog entry for Webflow template review.',
        score: 0.9,
        sourceId: 'cs-mcp-catalog-webflow-template-review-mcp'
      }
    ],
    resultCount: 1
  });

  assert.equal(compiled.sources[0]?.label, 'MCP webflow-template-review-mcp');
});
