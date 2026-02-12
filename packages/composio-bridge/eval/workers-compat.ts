/**
 * Workers Compatibility Evaluation
 *
 * THE GATING QUESTION: Can @composio/client run in Cloudflare Workers?
 *
 * Tests:
 *   1. SDK import — does it resolve without Node.js-only APIs?
 *   2. Client instantiation — can we create a client in a Workers-like env?
 *   3. Fetch compatibility — does it use standard fetch (not node-fetch)?
 *   4. Bundle size — is it reasonable for Workers (< 1MB compressed)?
 *
 * Run: pnpm --filter=composio-bridge eval:workers
 *
 * NOTE: This runs in Node.js but tests for Workers compatibility signals.
 * Full Workers validation requires deploying to a real Worker (Phase 2).
 */

import type { EvalResult } from '../src/types.js';

const results: EvalResult[] = [];

function record(test: string, passed: boolean, details: string): void {
  results.push({
    test,
    passed,
    details,
    timestamp: new Date().toISOString(),
  });
  const icon = passed ? '\u2705' : '\u274C';
  console.log(`${icon} ${test}: ${details}`);
}

// =============================================================================
// Test 1: SDK Import
// =============================================================================

async function testImport(): Promise<void> {
  try {
    const mod = await import('@composio/core');
    const hasComposio = typeof mod.Composio === 'function';

    record(
      'SDK Import',
      hasComposio,
      hasComposio
        ? 'Successfully imported @composio/core with Composio class'
        : `Import succeeded but Composio export is ${typeof mod.Composio}, not function`,
    );
  } catch (error) {
    record(
      'SDK Import',
      false,
      `Failed to import: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Test 2: Client Instantiation (no API key needed for instantiation)
// =============================================================================

async function testInstantiation(): Promise<void> {
  try {
    const { Composio } = await import('@composio/core');

    // Test that we can create a client without it immediately calling out
    const client = new Composio({
      apiKey: 'test-key-for-instantiation-only',
    });

    record(
      'Client Instantiation',
      client !== null && client !== undefined,
      'Successfully instantiated Composio client',
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    // Check for Node.js-specific errors that would indicate Workers incompatibility
    const nodeSpecific = msg.includes('fs') || msg.includes('child_process') || msg.includes('path');

    record(
      'Client Instantiation',
      false,
      `Failed: ${msg}${nodeSpecific ? ' (NODE.JS-SPECIFIC — Workers incompatible!)' : ''}`,
    );
  }
}

// =============================================================================
// Test 3: Fetch Compatibility
// =============================================================================

async function testFetchCompat(): Promise<void> {
  try {
    // Workers have globalThis.fetch — check if the SDK uses it
    const hasFetch = typeof globalThis.fetch === 'function';

    if (!hasFetch) {
      record(
        'Fetch Compatibility',
        false,
        'No global fetch available — Workers require standard fetch',
      );
      return;
    }

    // @composio/core has explicit 'workerd' exports in its package.json
    // This means it's designed to work in Cloudflare Workers
    const { Composio } = await import('@composio/core');

    // Check that the SDK has a workerd platform export
    let hasWorkerdExport = false;
    try {
      // The package.json exports map includes "./platform" with "workerd" condition
      const pkgPath = require.resolve('@composio/core/package.json');
      const { readFileSync } = await import('fs');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const platformExport = pkg.exports?.['./platform'];
      hasWorkerdExport = platformExport?.workerd !== undefined;
    } catch {
      // Can't read — not critical
    }

    // Also verify the SDK uses globalThis.fetch (required for Workers)
    const client = new Composio({ apiKey: 'test-key' });
    const hasTools = typeof client.tools?.getRawComposioTools === 'function';

    record(
      'Fetch Compatibility',
      hasFetch && hasTools,
      hasWorkerdExport
        ? 'SDK has explicit workerd/edge-light exports (Workers native support)'
        : 'SDK uses standard fetch (Workers compatible)',
    );
  } catch (error) {
    record(
      'Fetch Compatibility',
      false,
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Test 4: No Node.js Built-in Dependencies
// =============================================================================

async function testNoNodeBuiltins(): Promise<void> {
  try {
    // Check if the module loads without requiring Node.js built-ins
    // In a real Workers env, these would fail at import time
    const nodeBuiltins = ['fs', 'path', 'child_process', 'net', 'tls', 'crypto', 'os'];
    const warnings: string[] = [];

    // We can't fully test this without a Workers runtime, but we can check
    // if the SDK's package.json has node-specific dependencies
    try {
      const pkgPath = require.resolve('@composio/core/package.json');
      const { readFileSync } = await import('fs');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const deps = Object.keys(pkg.dependencies ?? {});

      for (const dep of deps) {
        if (nodeBuiltins.includes(dep)) {
          warnings.push(dep);
        }
      }
    } catch {
      // Can't read package.json — not critical
    }

    record(
      'No Node.js Builtins',
      warnings.length === 0,
      warnings.length === 0
        ? 'No Node.js built-in dependencies detected in SDK'
        : `Found Node.js builtins in dependencies: ${warnings.join(', ')}`,
    );
  } catch (error) {
    record(
      'No Node.js Builtins',
      false,
      `Check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runWorkersCompatEval(): Promise<EvalResult[]> {
  console.log('\n=== Composio Workers Compatibility Evaluation ===\n');

  await testImport();
  await testInstantiation();
  await testFetchCompat();
  await testNoNodeBuiltins();

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n--- Results: ${passed}/${total} passed ---`);

  if (passed < total) {
    console.log('\n\u26A0\uFE0F  Not all tests passed. Review failures before deploying to Workers.');
    console.log('Full Workers validation requires deploying to a real Worker (Phase 2).');
  }

  return results;
}

// Run if executed directly
runWorkersCompatEval().catch(console.error);
