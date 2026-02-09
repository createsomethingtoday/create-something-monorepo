#!/usr/bin/env tsx
/**
 * create-mcp — scaffold a new MCP server with multi-account support
 *
 * Usage:
 *   pnpm create-mcp <name>
 *   pnpm create-mcp my-service-mcp
 *   pnpm create-mcp my-service-mcp --description "My service integration"
 *
 * Creates packages/<name>/ with:
 *   - Dual entry points (stdio + Cloudflare Worker)
 *   - All three MCP primitives (Tools, Resources, Prompts)
 *   - AccountContext scoping on every handler
 *   - Auth provider (StdioSingleUser default, OAuth/APIKey examples)
 *   - InsightEmitter wired up
 *   - Example tool, resource, and prompt
 *
 * The primitive is always relative.
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(__dirname, 'templates', 'mcp');
const PACKAGES_DIR = join(__dirname, '..', 'packages');

// =============================================================================
// CLI Argument Parsing
// =============================================================================

function parseArgs(): { name: string; description: string } {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
create-mcp — scaffold a new MCP server with multi-account support

Usage:
  pnpm create-mcp <name> [--description "..."]

Examples:
  pnpm create-mcp procore-mcp
  pnpm create-mcp hubspot-mcp --description "HubSpot CRM integration"

The generated MCP server includes:
  - ScopedMcpServer with AccountContext on every handler
  - Dual entry points (stdio + Cloudflare Worker)
  - All three tiers: Tools, Resources, Prompts
  - Auth provider, InsightEmitter, TokenStore
  - Example implementations you can customize

The primitive is always relative.
`);
    process.exit(0);
  }

  const name = args[0];

  // Validate name
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    console.error(`Error: Invalid package name "${name}". Use lowercase letters, numbers, and hyphens.`);
    process.exit(1);
  }

  // Parse --description
  let description = `${toHumanName(name)} MCP Server`;
  const descIdx = args.indexOf('--description');
  if (descIdx !== -1 && args[descIdx + 1]) {
    description = args[descIdx + 1];
  }

  return { name, description };
}

// =============================================================================
// Helpers
// =============================================================================

/** Convert kebab-case to human-readable: "my-service-mcp" → "My Service" */
function toHumanName(name: string): string {
  return name
    .replace(/-mcp$/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Recursively find all .tmpl files in a directory */
async function findTemplates(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.tmpl'))
    .map((e) => join(e.parentPath ?? e.path, e.name));
}

/** Apply template substitutions */
function applyTemplate(
  content: string,
  vars: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { name, description } = parseArgs();
  const humanName = toHumanName(name);
  const targetDir = join(PACKAGES_DIR, name);

  console.log(`\nCreating MCP server: ${name}`);
  console.log(`  Package: @create-something/${name}`);
  console.log(`  Location: packages/${name}/`);
  console.log(`  Description: ${description}`);
  console.log('');

  // Template variables
  const vars: Record<string, string> = {
    NAME: humanName,
    PACKAGE_NAME: name,
    VERSION: '0.1.0',
    DESCRIPTION: description,
  };

  // Find all template files
  const templates = await findTemplates(TEMPLATE_DIR);

  if (templates.length === 0) {
    console.error('Error: No template files found in scripts/templates/mcp/');
    process.exit(1);
  }

  // Process each template
  let created = 0;
  for (const templatePath of templates) {
    // Compute output path: strip .tmpl, adjust relative path
    const relPath = relative(TEMPLATE_DIR, templatePath).replace(/\.tmpl$/, '');
    const outputPath = join(targetDir, relPath);

    // Read and transform
    const content = await readFile(templatePath, 'utf-8');
    const transformed = applyTemplate(content, vars);

    // Ensure directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Write
    await writeFile(outputPath, transformed, 'utf-8');
    created++;
    console.log(`  Created: ${relative(PACKAGES_DIR, outputPath)}`);
  }

  console.log('');
  console.log(`Created ${created} files.`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. cd packages/${name}`);
  console.log('  2. pnpm install (from monorepo root)');
  console.log('  3. Customize src/auth.ts for your service');
  console.log('  4. Add tools in src/tools/index.ts');
  console.log('  5. Add resources in src/resources/index.ts');
  console.log('  6. Add prompts in src/prompts/index.ts');
  console.log('  7. pnpm build && pnpm start');
  console.log('');
  console.log('The primitive is always relative.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
