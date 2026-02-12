/**
 * Tool Quality Evaluation — assesses Composio's tool definition quality
 *
 * Evaluates:
 *   1. Schema completeness — do tool params have types and descriptions?
 *   2. Description quality — are descriptions useful for LLM function calling?
 *   3. Naming conventions — are slugs consistent and predictable?
 *   4. Coverage — do apps have the expected CRUD operations?
 *
 * Requires: COMPOSIO_API_KEY environment variable
 *
 * Run: COMPOSIO_API_KEY=... pnpm --filter=composio-bridge eval:quality
 */

import { ComposioClient, type ComposioToolDef } from '../src/client.js';
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

function getApiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) {
    console.error('\u274C COMPOSIO_API_KEY environment variable required');
    process.exit(1);
  }
  return key;
}

// =============================================================================
// Test 1: Schema Completeness
// =============================================================================

function assessSchemaCompleteness(tools: ComposioToolDef[]): void {
  if (tools.length === 0) {
    record('Schema Completeness', false, 'No tools to evaluate');
    return;
  }

  let totalParams = 0;
  let paramsWithType = 0;
  let paramsWithDescription = 0;
  let toolsWithSchema = 0;

  for (const tool of tools) {
    const props = tool.parameters?.properties ?? {};
    const paramCount = Object.keys(props).length;

    if (paramCount > 0) {
      toolsWithSchema++;
    }

    for (const [, value] of Object.entries(props)) {
      totalParams++;
      const prop = value as Record<string, unknown>;
      if (prop.type) paramsWithType++;
      if (prop.description) paramsWithDescription++;
    }
  }

  const typeRate = totalParams > 0 ? Math.round((paramsWithType / totalParams) * 100) : 0;
  const descRate = totalParams > 0 ? Math.round((paramsWithDescription / totalParams) * 100) : 0;
  const schemaRate = Math.round((toolsWithSchema / tools.length) * 100);

  record(
    'Schema Completeness',
    typeRate >= 80 && descRate >= 50,
    `${tools.length} tools, ${totalParams} params: ${typeRate}% typed, ${descRate}% described, ${schemaRate}% have schemas`,
  );
}

// =============================================================================
// Test 2: Description Quality
// =============================================================================

function assessDescriptionQuality(tools: ComposioToolDef[]): void {
  if (tools.length === 0) {
    record('Description Quality', false, 'No tools to evaluate');
    return;
  }

  let hasDescription = 0;
  let descriptionLong = 0; // > 20 chars
  let descriptionVeryLong = 0; // > 100 chars

  for (const tool of tools) {
    if (tool.description && tool.description.trim().length > 0) {
      hasDescription++;
      if (tool.description.length > 20) descriptionLong++;
      if (tool.description.length > 100) descriptionVeryLong++;
    }
  }

  const hasRate = Math.round((hasDescription / tools.length) * 100);
  const qualityRate = Math.round((descriptionLong / tools.length) * 100);

  record(
    'Description Quality',
    hasRate >= 90 && qualityRate >= 70,
    `${hasRate}% have descriptions, ${qualityRate}% are substantive (>20 chars), ${descriptionVeryLong} are detailed (>100 chars)`,
  );
}

// =============================================================================
// Test 3: Naming Conventions
// =============================================================================

function assessNamingConventions(tools: ComposioToolDef[]): void {
  if (tools.length === 0) {
    record('Naming Conventions', false, 'No tools to evaluate');
    return;
  }

  let upperSnake = 0;
  let hasAppPrefix = 0;

  for (const tool of tools) {
    if (/^[A-Z][A-Z0-9_]*$/.test(tool.slug)) upperSnake++;
    if (tool.app && tool.slug.toUpperCase().startsWith(tool.app.toUpperCase())) {
      hasAppPrefix++;
    }
  }

  const snakeRate = Math.round((upperSnake / tools.length) * 100);
  const prefixRate = Math.round((hasAppPrefix / tools.length) * 100);

  record(
    'Naming Conventions',
    snakeRate >= 80,
    `${snakeRate}% UPPER_SNAKE_CASE, ${prefixRate}% have app prefix`,
  );
}

// =============================================================================
// Test 4: CRUD Coverage for Key Apps
// =============================================================================

function assessCrudCoverage(tools: ComposioToolDef[]): void {
  const crudVerbs = ['create', 'get', 'list', 'update', 'delete', 'send', 'search'];

  const byApp = new Map<string, Set<string>>();
  for (const tool of tools) {
    const app = tool.app.toUpperCase();
    if (!byApp.has(app)) byApp.set(app, new Set());
    const slug = tool.slug.toLowerCase();
    for (const verb of crudVerbs) {
      if (slug.includes(verb)) {
        byApp.get(app)!.add(verb);
      }
    }
  }

  const appSummaries: string[] = [];
  for (const [app, verbs] of byApp) {
    appSummaries.push(`${app}: ${Array.from(verbs).join(', ') || 'no CRUD verbs detected'}`);
  }

  const appsWithCrud = Array.from(byApp.values()).filter((verbs) => verbs.size >= 2).length;
  const totalApps = byApp.size;

  record(
    'CRUD Coverage',
    totalApps > 0 && appsWithCrud / totalApps >= 0.5,
    `${appsWithCrud}/${totalApps} apps have 2+ CRUD operations. ${appSummaries.join('; ')}`,
  );
}

// =============================================================================
// Main
// =============================================================================

export async function runToolQualityEval(): Promise<EvalResult[]> {
  console.log('\n=== Composio Tool Quality Evaluation ===\n');

  const apiKey = getApiKey();
  const client = new ComposioClient({ apiKey });

  // Fetch tools for the commodity apps we'd typically delegate to Composio
  const targetApps = ['SLACK', 'HUBSPOT', 'JIRA', 'GITHUB'];
  console.log(`Fetching tools for: ${targetApps.join(', ')}...\n`);

  try {
    const tools = await client.getTools(targetApps);
    console.log(`Found ${tools.length} tools total.\n`);

    assessSchemaCompleteness(tools);
    assessDescriptionQuality(tools);
    assessNamingConventions(tools);
    assessCrudCoverage(tools);
  } catch (error) {
    record(
      'Tool Fetch',
      false,
      `Failed to fetch tools: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  console.log(`\n--- Results: ${passed}/${total} passed ---`);

  return results;
}

// Run if executed directly
runToolQualityEval().catch(console.error);
