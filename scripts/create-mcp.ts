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

type Profile = 'generic' | 'content' | 'operational';

const CONTENT_PROFILE_KEYWORDS = [
  'content',
  'playbook',
  'atlas',
  'framework',
  'docs',
  'knowledge',
];

const OPERATIONAL_PROFILE_KEYWORDS = [
  'substrate',
  'sync',
  'schedule',
  'social',
  'preview',
  'review',
  'community',
  'notion',
  'gmail',
  'quickbooks',
  'webflow',
  'operator',
];

function parseArgs(): {
  name: string;
  description: string;
  profile: Profile;
  profileSource: 'flag' | 'inferred';
  dryRun: boolean;
} {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
create-mcp — scaffold a new MCP server with multi-account support

Usage:
  pnpm create-mcp <name> [--description "..."] [--profile generic|content|operational] [--dry-run]

Examples:
  pnpm create-mcp procore-mcp
  pnpm create-mcp hubspot-mcp --description "HubSpot CRM integration"
  pnpm create-mcp create-something-mcp --profile content
  pnpm create-mcp substrate-mcp --profile operational
  pnpm create-mcp playbook-mcp --dry-run

The generated MCP server includes:
  - ScopedMcpServer with AccountContext on every handler
  - Dual entry points (stdio + Cloudflare Worker)
  - All three tiers: Tools, Resources, Prompts
  - Auth provider, InsightEmitter, TokenStore
  - Profile-aware README.md and UNDERSTANDING.md templates
  - Conservative profile inference from package name when --profile is omitted
  - Dry-run preview mode that prints planned files without writing them

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

  let profile = inferProfile(name);
  let profileSource: 'flag' | 'inferred' = 'inferred';
  const dryRun = args.includes('--dry-run');
  const profileIdx = args.indexOf('--profile');
  if (profileIdx !== -1 && args[profileIdx + 1]) {
    const value = args[profileIdx + 1] as Profile;
    if (!['generic', 'content', 'operational'].includes(value)) {
      console.error(`Error: Invalid profile "${value}". Use generic, content, or operational.`);
      process.exit(1);
    }
    profile = value;
    profileSource = 'flag';
  }

  return { name, description, profile, profileSource, dryRun };
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

function inferProfile(name: string): Profile {
  const normalized = name.toLowerCase();

  if (CONTENT_PROFILE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'content';
  }

  if (OPERATIONAL_PROFILE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'operational';
  }

  return 'generic';
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

function getProfileVars(profile: Profile): Record<string, string> {
  switch (profile) {
    case 'content':
      return {
        PROFILE: 'content',
        PROFILE_LABEL: 'Content MCP',
        PROFILE_SUMMARY:
          'Content-oriented MCP that indexes, curates, and serves repository-local knowledge, documents, or structured reference material to coding agents.',
        PROFILE_DATABASE_ROLE:
          'Knowledge artifacts, documents, schemas, or generated indexes exposed as MCP resources',
        PROFILE_AUTOMATION_ROLE:
          'Search, classification, traversal, or content transformation tools',
        PROFILE_JUDGMENT_ROLE:
          'Review, synthesis, or analysis prompts grounded in the indexed corpus',
        PROFILE_MODE_OF_BEING: 'Content-heavy MCP package',
        PROFILE_ONTOLOGY:
          'This package primarily makes a body of knowledge legible to agents. Its value is in discoverability, structured retrieval, and trustworthy indexing of material that would otherwise remain scattered across the repo or external systems.',
        PROFILE_DEPENDS_ON_EXTRA:
          '| repository-local content sources | Raw markdown, generated data, or reference artifacts that the MCP turns into resources and searchable context |',
        PROFILE_ENABLES_UNDERSTANDING:
          '| content consumers | Which documents, concepts, and relationships are available to agents through this MCP |',
        PROFILE_VALIDATION_SURFACES:
          'typecheck output, build output, generated content artifacts, stdio startup, Worker `/health`, Worker logs, representative resource reads, search/tool responses',
        PROFILE_ESCALATION:
          'Stop if generated content artifacts, resource payloads, or search results diverge between local stdio and Worker execution, or if the source corpus itself is stale or ambiguous.',
      };
    case 'operational':
      return {
        PROFILE: 'operational',
        PROFILE_LABEL: 'Operational MCP',
        PROFILE_SUMMARY:
          'Operational MCP that fronts a live system, data plane, or workflow service through account-scoped tools, resources, and verification surfaces.',
        PROFILE_DATABASE_ROLE:
          'Live state, records, metrics, or audit data exposed as MCP resources',
        PROFILE_AUTOMATION_ROLE:
          'Create, update, query, or workflow tools that mutate or inspect operational state',
        PROFILE_JUDGMENT_ROLE:
          'Prompts that guide audits, role-based interpretation, or operational decision-making',
        PROFILE_MODE_OF_BEING: 'Operational MCP package',
        PROFILE_ONTOLOGY:
          'This package makes a live system operable through MCP. Its main burden is not only exposing tools, but making state, side effects, and trust surfaces visible enough that agents can act without guessing.',
        PROFILE_DEPENDS_ON_EXTRA:
          '| external bindings and service state | D1, KV, R2, APIs, or other runtime dependencies that define the live operational surface |',
        PROFILE_ENABLES_UNDERSTANDING:
          '| operators and downstream clients | What live state exists, how it can be mutated safely, and which trust surfaces verify it |',
        PROFILE_VALIDATION_SURFACES:
          'typecheck output, build output, stdio startup, Worker `/health`, Worker logs, representative tool calls, audit/state resources, dashboard or trust view when present',
        PROFILE_ESCALATION:
          'Stop if live state visible through resources or dashboards disagrees with tool responses, or if required secrets, bindings, or remote dependencies are unavailable in the current environment.',
      };
    default:
      return {
        PROFILE: 'generic',
        PROFILE_LABEL: 'Generic MCP',
        PROFILE_SUMMARY:
          'General-purpose MCP that exposes a domain through account-scoped resources, tools, and prompts.',
        PROFILE_DATABASE_ROLE:
          'Account-scoped data exposed to clients as MCP resources',
        PROFILE_AUTOMATION_ROLE:
          'Account-scoped actions the model can invoke',
        PROFILE_JUDGMENT_ROLE:
          'Policy-bearing prompts selected by the user',
        PROFILE_MODE_OF_BEING: 'Automation-heavy MCP package',
        PROFILE_ONTOLOGY:
          'This package exposes a domain through MCP primitives. It should make the target system legible to coding agents and operators through account-scoped resources, tools, and prompts. Replace this paragraph with the package\'s actual role in the CREATE SOMETHING topology.',
        PROFILE_DEPENDS_ON_EXTRA: '| `[domain dependency]` | `[what live system or dataset this MCP makes legible]` |',
        PROFILE_ENABLES_UNDERSTANDING:
          '| `[downstream package or property]` | `[how this MCP makes that domain legible]` |',
        PROFILE_VALIDATION_SURFACES:
          'typecheck output, stdio startup, Worker `/health`, Worker logs, representative MCP tool/resource/prompt invocation',
        PROFILE_ESCALATION:
          'Stop if local stdio behavior and Worker behavior diverge, or if required account auth and bindings cannot be reproduced from checked-in configuration and available secrets.',
      };
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const { name, description, profile, profileSource, dryRun } = parseArgs();
  const humanName = toHumanName(name);
  const targetDir = join(PACKAGES_DIR, name);

  console.log(`\nCreating MCP server: ${name}`);
  console.log(`  Package: @create-something/${name}`);
  console.log(`  Location: packages/${name}/`);
  console.log(`  Description: ${description}`);
  console.log(`  Profile: ${profile} (${profileSource})`);
  console.log(`  Dry run: ${dryRun ? 'yes' : 'no'}`);
  console.log('');

  // Template variables
  const vars: Record<string, string> = {
    NAME: humanName,
    PACKAGE_NAME: name,
    VERSION: '0.1.0',
    DESCRIPTION: description,
    DATE: new Date().toISOString().slice(0, 10),
    ...getProfileVars(profile),
  };

  // Find all template files
  const templates = await findTemplates(TEMPLATE_DIR);

  if (templates.length === 0) {
    console.error('Error: No template files found in scripts/templates/mcp/');
    process.exit(1);
  }

  const plannedOutputs = templates.map((templatePath) => {
    const relPath = relative(TEMPLATE_DIR, templatePath).replace(/\.tmpl$/, '');
    return {
      templatePath,
      relPath,
      outputPath: join(targetDir, relPath),
    };
  });

  if (dryRun) {
    console.log('Dry run plan:');
    for (const output of plannedOutputs) {
      console.log(`  Would create: ${relative(PACKAGES_DIR, output.outputPath)}`);
    }
    console.log('');
    console.log(`Planned ${plannedOutputs.length} files. No files were written.`);
    console.log('');
    console.log('Use the same command without --dry-run to generate the package.');
    return;
  }

  // Process each template
  let created = 0;
  for (const plannedOutput of plannedOutputs) {
    // Read and transform
    const content = await readFile(plannedOutput.templatePath, 'utf-8');
    const transformed = applyTemplate(content, vars);

    // Ensure directory exists
    await mkdir(dirname(plannedOutput.outputPath), { recursive: true });

    // Write
    await writeFile(plannedOutput.outputPath, transformed, 'utf-8');
    created++;
    console.log(`  Created: ${relative(PACKAGES_DIR, plannedOutput.outputPath)}`);
  }

  console.log('');
  console.log(`Created ${created} files.`);
  console.log('');
  console.log('Next steps:');
  console.log(`  1. cd packages/${name}`);
  console.log('  2. pnpm install (from monorepo root)');
  console.log('  3. Replace the starter README and Agent Legibility Contract placeholders');
  console.log('  4. Replace the starter UNDERSTANDING.md placeholders');
  console.log('  5. Customize src/auth.ts for your service');
  console.log('  6. Add tools in src/tools/index.ts');
  console.log('  7. Add resources in src/resources/index.ts');
  console.log('  8. Add prompts in src/prompts/index.ts');
  console.log('  9. pnpm build && pnpm start');
  console.log('');
  console.log('The primitive is always relative.');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
