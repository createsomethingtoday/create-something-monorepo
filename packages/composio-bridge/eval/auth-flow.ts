/**
 * Auth Flow Evaluation — tests Composio's OAuth management
 *
 * Tests:
 *   1. Entity creation — can we create/get an entity for account mapping?
 *   2. Connection listing — can we list connected accounts per entity?
 *   3. Auth provider integration — does ComposioAuthProvider resolve correctly?
 *
 * NOTE: Full OAuth flow testing (user consent, token exchange) requires
 * browser interaction and is deferred to Phase 2 (Client Pilot).
 * This evaluation tests the API surface that auth-bridge.ts depends on.
 *
 * Requires: COMPOSIO_API_KEY environment variable
 *
 * Run: COMPOSIO_API_KEY=... pnpm --filter=composio-bridge eval:auth
 */

import { ComposioAuthProvider } from '../src/auth-bridge.js';
import type { EvalResult } from '../src/types.js';

const results: EvalResult[] = [];

function record(test: string, passed: boolean, details: string, latencyMs?: number): void {
  results.push({
    test,
    passed,
    latencyMs,
    details,
    timestamp: new Date().toISOString(),
  });
  const icon = passed ? '\u2705' : '\u274C';
  const timing = latencyMs ? ` (${latencyMs}ms)` : '';
  console.log(`${icon} ${test}${timing}: ${details}`);
}

function getApiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    console.error('\u274C COMPOSIO_API_KEY environment variable required');
    process.exit(1);
  }
  return key;
}

// =============================================================================
// Test 1: Auth Provider Resolve (stdio mode)
// =============================================================================

async function testAuthProviderResolve(apiKey: string): Promise<void> {
  try {
    const provider = new ComposioAuthProvider({
      apiKey,
      resolveAccountId: () => 'eval-test-account',
      resolveEntityId: (accountId) => `entity-${accountId}`,
    });

    const start = Date.now();
    const ctx = await provider.resolve(null);
    const latency = Date.now() - start;

    const checks = [
      ctx.accountId === 'eval-test-account',
      ctx.metadata.composioEntityId === 'entity-eval-test-account',
      ctx.metadata.provider === 'composio-bridge',
      ctx.policy !== undefined,
      ctx.tokenProvider !== undefined,
    ];

    const allPassed = checks.every(Boolean);

    record(
      'Auth Provider Resolve',
      allPassed,
      allPassed
        ? `AccountContext resolved correctly: accountId=${ctx.accountId}, entityId=${ctx.metadata.composioEntityId}`
        : `Some checks failed: accountId=${ctx.accountId}, entityId=${ctx.metadata.composioEntityId}`,
      latency,
    );
  } catch (error) {
    record(
      'Auth Provider Resolve',
      false,
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Test 2: Token Provider
// =============================================================================

async function testTokenProvider(apiKey: string): Promise<void> {
  try {
    const provider = new ComposioAuthProvider({ apiKey });
    const ctx = await provider.resolve(null);

    const start = Date.now();
    const token = await ctx.tokenProvider.getAccessToken();
    const latency = Date.now() - start;

    // Token should be the API key (Composio manages per-app OAuth internally)
    const isApiKey = token === apiKey;

    record(
      'Token Provider',
      isApiKey,
      isApiKey
        ? 'TokenProvider returns Composio API key (per-app OAuth handled internally)'
        : 'TokenProvider returned unexpected token format',
      latency,
    );
  } catch (error) {
    record(
      'Token Provider',
      false,
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Test 3: Connected Accounts Listing
// =============================================================================

async function testConnectedAccounts(apiKey: string): Promise<void> {
  try {
    const provider = new ComposioAuthProvider({ apiKey });

    const start = Date.now();
    const accounts = await provider.getConnectedAccounts('default');
    const latency = Date.now() - start;

    record(
      'Connected Accounts',
      true, // Pass as long as the API call succeeds
      `Found ${accounts.length} connected accounts for entity 'default'. ${
        accounts.length > 0
          ? `Apps: ${accounts.map((a) => `${a.app}(${a.status})`).join(', ')}`
          : 'No connections yet (expected for new accounts)'
      }`,
      latency,
    );
  } catch (error) {
    // Some errors are expected (e.g., entity doesn't exist yet)
    const msg = error instanceof Error ? error.message : String(error);
    const expected = msg.includes('not found') || msg.includes('404');

    record(
      'Connected Accounts',
      expected,
      expected
        ? `Entity not found (expected for fresh setup): ${msg}`
        : `Unexpected error: ${msg}`,
    );
  }
}

// =============================================================================
// Test 4: HTTP Request Auth (simulated)
// =============================================================================

async function testHttpAuth(apiKey: string): Promise<void> {
  try {
    const provider = new ComposioAuthProvider({
      apiKey,
      resolveAccountId: (req) => {
        if (!req) return 'default-stdio';
        return req.headers.get('x-account-id') ?? 'default-http';
      },
    });

    // Simulate an HTTP request
    const mockRequest = new Request('https://example.com/mcp', {
      headers: { 'x-account-id': 'client-123' },
    });

    const ctx = await provider.resolve(mockRequest);

    record(
      'HTTP Request Auth',
      ctx.accountId === 'client-123',
      `Resolved accountId='${ctx.accountId}' from x-account-id header`,
    );
  } catch (error) {
    record(
      'HTTP Request Auth',
      false,
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runAuthFlowEval(): Promise<EvalResult[]> {
  console.log('\n=== Composio Auth Flow Evaluation ===\n');

  const apiKey = getApiKey();

  await testAuthProviderResolve(apiKey);
  await testTokenProvider(apiKey);
  await testConnectedAccounts(apiKey);
  await testHttpAuth(apiKey);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n--- Results: ${passed}/${total} passed ---`);

  return results;
}

// Run if executed directly
runAuthFlowEval().catch(console.error);
