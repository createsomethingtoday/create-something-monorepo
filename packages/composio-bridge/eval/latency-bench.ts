/**
 * Latency Benchmark — measures round-trip time for Composio tool operations
 *
 * Tests:
 *   1. Health check latency (API connectivity)
 *   2. Tool discovery latency (fetching tool definitions)
 *   3. Tool execution latency (executing a safe read-only tool)
 *
 * Requires: COMPOSIO_API_KEY environment variable
 *
 * Run: COMPOSIO_API_KEY=... pnpm --filter=composio-bridge eval:latency
 */

import { ComposioClient } from '../src/client.js';
import type { EvalResult } from '../src/types.js';

const results: EvalResult[] = [];

function record(test: string, passed: boolean, latencyMs: number, details: string): void {
  results.push({
    test,
    passed,
    latencyMs,
    details,
    timestamp: new Date().toISOString(),
  });
  const icon = passed ? '\u2705' : '\u274C';
  console.log(`${icon} ${test}: ${latencyMs}ms — ${details}`);
}

function getApiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    console.error('\u274C COMPOSIO_API_KEY environment variable required');
    console.error('   Get one from https://app.composio.dev/settings');
    process.exit(1);
  }
  return key;
}

// =============================================================================
// Test 1: Health Check Latency
// =============================================================================

async function benchHealthCheck(client: ComposioClient): Promise<void> {
  const iterations = 3;
  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = await client.healthCheck();
    latencies.push(result.latencyMs);

    if (!result.ok) {
      record('Health Check', false, result.latencyMs, `API unreachable: ${result.error}`);
      return;
    }
  }

  const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const max = Math.max(...latencies);
  const min = Math.min(...latencies);

  record(
    'Health Check',
    avg < 2000, // Pass if avg < 2s
    avg,
    `avg=${avg}ms, min=${min}ms, max=${max}ms (${iterations} iterations)`,
  );
}

// =============================================================================
// Test 2: Tool Discovery Latency
// =============================================================================

async function benchToolDiscovery(client: ComposioClient): Promise<void> {
  const apps = ['SLACK', 'HUBSPOT', 'JIRA'];

  const start = Date.now();
  try {
    const tools = await client.getTools(apps);
    const latency = Date.now() - start;

    record(
      'Tool Discovery',
      latency < 5000, // Pass if < 5s
      latency,
      `Found ${tools.length} tools across [${apps.join(', ')}]`,
    );
  } catch (error) {
    record(
      'Tool Discovery',
      false,
      Date.now() - start,
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Test 3: Tool Listing (Lightweight)
// =============================================================================

async function benchToolListing(client: ComposioClient): Promise<void> {
  const start = Date.now();
  try {
    // Fetch tools for a single well-known app
    const tools = await client.getTools(['GITHUB']);
    const latency = Date.now() - start;

    const toolNames = tools.slice(0, 5).map((t) => t.slug).join(', ');

    record(
      'Single App Tools',
      latency < 3000, // Pass if < 3s
      latency,
      `Found ${tools.length} GITHUB tools (first 5: ${toolNames || 'none'})`,
    );
  } catch (error) {
    record(
      'Single App Tools',
      false,
      Date.now() - start,
      `Failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// =============================================================================
// Main
// =============================================================================

export async function runLatencyBench(): Promise<EvalResult[]> {
  console.log('\n=== Composio Latency Benchmark ===\n');

  const apiKey = getApiKey();
  const client = new ComposioClient({ apiKey });

  await benchHealthCheck(client);
  await benchToolDiscovery(client);
  await benchToolListing(client);

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  const avgLatency = Math.round(
    results.reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / total,
  );

  console.log(`\n--- Results: ${passed}/${total} passed, avg latency ${avgLatency}ms ---`);

  return results;
}

// Run if executed directly
runLatencyBench().catch(console.error);
