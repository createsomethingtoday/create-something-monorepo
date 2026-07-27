import assert from 'node:assert/strict';
import test from 'node:test';

import { validateGroundBenchmarkReceipt } from './receipt.ts';

function validReceipt(): unknown {
  return {
    documentType: 'create-something.ground-native-benchmark-receipt',
    schemaVersion: '1.0.0',
    generatedAt: '2026-07-27T00:00:00.000Z',
    source: {
      gitSha: '0123456789abcdef0123456789abcdef01234567',
      gitDirty: true,
      platform: 'darwin',
      arch: 'arm64',
      nodeVersion: 'v22.21.1'
    },
    configuration: {
      workspace: '/workspace',
      targetDirectory: 'packages/ground/npm/pilot/fixtures/duplicate-analysis',
      checks: ['duplicates'],
      samples: 2,
      warmupSamples: 1,
      timeoutMs: 15000
    },
    nativeMcp: {
      server: { name: 'ground', version: '0.2.1' },
      tool: 'ground_analyze',
      protocolPassed: true,
      binary: {
        path: 'packages/ground/target/release/ground-mcp',
        bytes: 8810128,
        sha256: 'a'.repeat(64),
        standalone: true
      },
      samples: [
        {
          index: 1,
          status: 'passed',
          connectMs: 10,
          discoveryMs: 1,
          analysisMs: 5,
          totalMs: 16,
          peakRssBytes: 1000,
          semanticFingerprint: 'b'.repeat(64),
          error: null
        },
        {
          index: 2,
          status: 'passed',
          connectMs: 11,
          discoveryMs: 1,
          analysisMs: 5,
          totalMs: 17,
          peakRssBytes: 1100,
          semanticFingerprint: 'b'.repeat(64),
          error: null
        }
      ],
      summary: {
        attempted: 2,
        passed: 2,
        failed: 0,
        resultConsistent: true,
        fingerprints: ['b'.repeat(64)],
        latencyMs: { min: 16, median: 16.5, p95: 17, max: 17 },
        peakRssBytes: 1100
      }
    },
    typescriptBaseline: null,
    comparison: {
      scope: 'directional-only',
      claims: ['The MCP protocol completed without failure.'],
      adoptionDecision: 'adopt-native-kernel-behind-mcp',
      rationale: 'Use the native kernel only behind the stable protocol boundary.'
    }
  };
}

test('receipt validator accepts a complete, consistent native MCP receipt', () => {
  const result = validateGroundBenchmarkReceipt(validReceipt());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('receipt validator rejects omitted failures and inconsistent semantic results', () => {
  const receipt = validReceipt() as Record<string, any>;
  receipt.nativeMcp.samples[1].status = 'failed';
  receipt.nativeMcp.samples[1].semanticFingerprint = null;
  receipt.nativeMcp.samples[1].error = 'process exited';

  const result = validateGroundBenchmarkReceipt(receipt);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('summary.failed')));
  assert.ok(result.errors.some((error) => error.includes('resultConsistent')));
});
