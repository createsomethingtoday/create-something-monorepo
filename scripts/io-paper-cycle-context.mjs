#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CYCLE_LABELS = [
  'paper-cycle',
  'experiment-cycle',
  'policy-cycle',
  'ready-review-1',
  'ready-review-2',
  'publish-approved',
  'deployed',
];

const PAPER_ROUTE_PREFIX = 'packages/io/src/routes/papers/';
const EXPERIMENT_ROUTE_PREFIX = 'packages/io/src/routes/experiments/';
const MCP_TRUST_ROUTE_PREFIX = 'packages/io/src/routes/mcp/';
const AGENT_TRUST_ROUTE_PREFIX = 'packages/io/src/routes/agents/';
const API_MANIFEST_ROUTE_PREFIX = 'packages/io/src/routes/api/manifest/';
const SITEMAP_ROUTE_PREFIX = 'packages/io/src/routes/sitemap.xml/';
const PAPER_CONTENT_PREFIX = 'packages/io/content/papers/';
const EXPERIMENT_CONTENT_PREFIX = 'packages/io/content/experiments/';
const PUBLIC_TRUST_DATA_PREFIX = 'config/public-trust/';
const PUBLIC_TRUST_CONFIG_FILE = 'packages/io/src/lib/config/publicTrustCatalog.ts';
const PUBLIC_TRUST_GENERATED_CONFIG_FILE = 'packages/io/src/lib/config/publicTrustCatalog.generated.ts';
const PUBLIC_TRUST_FALLBACK_MCP_ROUTES = [
  '/mcp',
  '/mcp/create-something',
  '/mcp/three-tier-framework',
  '/mcp/playbook',
];
const PUBLIC_TRUST_FALLBACK_AGENT_ROUTES = [
  '/agents',
  '/agents/create-something-guide-agent',
];

function parseArgs(argv) {
  const args = {
    base: '',
    head: '',
    files: [],
    filesFromStdin: false,
    format: 'text',
    rangeMode: 'direct',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--base' && argv[i + 1]) {
      args.base = argv[++i];
      continue;
    }
    if (arg === '--head' && argv[i + 1]) {
      args.head = argv[++i];
      continue;
    }
    if (arg === '--file' && argv[i + 1]) {
      args.files.push(argv[++i]);
      continue;
    }
    if (arg === '--files' && argv[i + 1]) {
      args.files.push(...argv[++i].split(',').map((value) => value.trim()).filter(Boolean));
      continue;
    }
    if (arg === '--files-from-stdin') {
      args.filesFromStdin = true;
      continue;
    }
    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i];
      continue;
    }
    if (arg === '--range-mode' && argv[i + 1]) {
      args.rangeMode = argv[++i];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!['text', 'json'].includes(args.format)) {
    throw new Error(`Unsupported format: ${args.format}`);
  }
  if (!['direct', 'merge-base'].includes(args.rangeMode)) {
    throw new Error(`Unsupported range mode: ${args.rangeMode}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/io-paper-cycle-context.mjs --base <sha> --head <sha> [--range-mode direct|merge-base] [--format text|json]
  node scripts/io-paper-cycle-context.mjs --files path1,path2 [--format text|json]
  git diff --name-only origin/main...HEAD | node scripts/io-paper-cycle-context.mjs --files-from-stdin --format json`);
}

function uniqueSorted(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function readFilesFromStdin() {
  if (process.stdin.isTTY) {
    return [];
  }
  return uniqueSorted(readFileSync(0, 'utf8').split(/\r?\n/u));
}

function gitDiffFiles(base, head, rangeMode) {
  if (!base || !head) {
    throw new Error('Both --base and --head are required when deriving files from git.');
  }
  const range = rangeMode === 'merge-base' ? `${base}...${head}` : `${base} ${head}`;
  const args = rangeMode === 'merge-base'
    ? ['diff', '--name-only', `${base}...${head}`]
    : ['diff', '--name-only', base, head];
  const output = execFileSync('git', args, { encoding: 'utf8' });
  return uniqueSorted(output.split(/\r?\n/u));
}

function isPolicyFile(file) {
  return file === 'STANDARDS.md' || file.startsWith('docs/policies/');
}

function isPublishableIoFile(file) {
  return (
    file.startsWith(PAPER_ROUTE_PREFIX) ||
    file.startsWith(EXPERIMENT_ROUTE_PREFIX) ||
    file.startsWith(MCP_TRUST_ROUTE_PREFIX) ||
    file.startsWith(AGENT_TRUST_ROUTE_PREFIX) ||
    file.startsWith(API_MANIFEST_ROUTE_PREFIX) ||
    file.startsWith(SITEMAP_ROUTE_PREFIX) ||
    file.startsWith(PAPER_CONTENT_PREFIX) ||
    file.startsWith(EXPERIMENT_CONTENT_PREFIX) ||
    file.startsWith(PUBLIC_TRUST_DATA_PREFIX) ||
    file === PUBLIC_TRUST_CONFIG_FILE ||
    file === PUBLIC_TRUST_GENERATED_CONFIG_FILE ||
    file === 'packages/io/src/lib/config/paperContent.ts'
  );
}

function isLifecycleSupportFile(file) {
  return (
    file.startsWith('.github/workflows/io-paper-cycle-') ||
    file.startsWith('scripts/io-paper-cycle-') ||
    file === 'scripts/policy-artifact-check.mjs' ||
    file === 'packages/agent-sdk/agents/paper_agent.py' ||
    file === 'packages/agent-sdk/scripts/run-paper.sh'
  );
}

function publicTrustRoutes(kind = 'all') {
  try {
    const source = readFileSync(PUBLIC_TRUST_GENERATED_CONFIG_FILE, 'utf8');
    const match = source.match(/export const PUBLIC_TRUST_CATALOG = ([\s\S]*?) as const;/u);
    if (!match) {
      throw new Error('Generated public trust catalog export not found.');
    }

    const catalog = JSON.parse(match[1]);
    const mcpRoutes = uniqueSorted([
      '/mcp',
      ...((catalog.mcp ?? [])
        .map((card) => typeof card.slug === 'string' ? `/mcp/${card.slug}` : '')
        .filter(Boolean)),
    ]);
    const agentRoutes = uniqueSorted([
      '/agents',
      ...((catalog.agents ?? [])
        .map((card) => typeof card.slug === 'string' ? `/agents/${card.slug}` : '')
        .filter(Boolean)),
    ]);

    return uniqueSorted([
      ...(kind === 'agents' ? [] : mcpRoutes),
      ...(kind === 'mcp' ? [] : agentRoutes),
      '/api/manifest',
      '/sitemap.xml',
    ]);
  } catch {
    return uniqueSorted([
      ...(kind === 'agents' ? [] : PUBLIC_TRUST_FALLBACK_MCP_ROUTES),
      ...(kind === 'mcp' ? [] : PUBLIC_TRUST_FALLBACK_AGENT_ROUTES),
      '/api/manifest',
      '/sitemap.xml',
    ]);
  }
}

function routesFromIoRouteFile(file) {
  if (file.startsWith(PAPER_ROUTE_PREFIX)) {
    if (!existsSync(file)) return ['/papers'];

    const remainder = file.slice(PAPER_ROUTE_PREFIX.length);
    const [slug = ''] = remainder.split('/');
    if (!slug || slug.startsWith('+') || slug === '[slug]' || slug.endsWith('.ts')) {
      return ['/papers'];
    }
    return [`/papers/${slug}`];
  }

  if (file.startsWith(EXPERIMENT_ROUTE_PREFIX)) {
    if (!existsSync(file)) return ['/experiments'];

    const remainder = file.slice(EXPERIMENT_ROUTE_PREFIX.length);
    const [slug = ''] = remainder.split('/');
    if (!slug || slug.startsWith('+') || slug === '[slug]') {
      return ['/experiments'];
    }
    return [`/experiments/${slug}`];
  }

  if (file.startsWith(PAPER_CONTENT_PREFIX)) {
    if (!existsSync(file)) return ['/papers'];

    const remainder = file.slice(PAPER_CONTENT_PREFIX.length);
    if (remainder === 'README.md') return ['/papers'];
    if (!remainder.endsWith('.md')) return ['/papers'];
    return [`/papers/${remainder.replace(/\.md$/u, '')}`];
  }

  if (file.startsWith(EXPERIMENT_CONTENT_PREFIX)) {
    if (!existsSync(file)) return ['/experiments'];

    const remainder = file.slice(EXPERIMENT_CONTENT_PREFIX.length);
    if (remainder === 'README.md') return ['/experiments'];
    if (!remainder.endsWith('.md')) return ['/experiments'];
    return [`/experiments/${remainder.replace(/\.md$/u, '')}`];
  }

  if (file.startsWith(MCP_TRUST_ROUTE_PREFIX)) {
    return publicTrustRoutes('mcp');
  }

  if (file.startsWith(AGENT_TRUST_ROUTE_PREFIX)) {
    return publicTrustRoutes('agents');
  }

  if (
    file.startsWith(PUBLIC_TRUST_DATA_PREFIX) ||
    file === PUBLIC_TRUST_CONFIG_FILE ||
    file === PUBLIC_TRUST_GENERATED_CONFIG_FILE
  ) {
    return publicTrustRoutes('all');
  }

  if (file.startsWith(API_MANIFEST_ROUTE_PREFIX)) {
    return ['/api/manifest'];
  }

  if (file.startsWith(SITEMAP_ROUTE_PREFIX)) {
    return ['/sitemap.xml'];
  }

  if (file === 'packages/io/src/lib/config/paperContent.ts') {
    return ['/papers'];
  }

  return [];
}

function collectPolicyIds(files) {
  return uniqueSorted(
    files
      .filter((file) => file.startsWith('docs/policies/v1/policy.'))
      .map((file) => file.split('/').pop()?.replace(/\.json$|\.md$/u, '') ?? ''),
  );
}

export function collectIoPaperCycleContext(files) {
  const changedFiles = uniqueSorted(files);
  const publishableFiles = changedFiles.filter(isPublishableIoFile);
  const policyFiles = changedFiles.filter(isPolicyFile);
  const supportFiles = changedFiles.filter(isLifecycleSupportFile);
  const changedRoutes = uniqueSorted(publishableFiles.flatMap(routesFromIoRouteFile).filter(Boolean));
  const artifactKinds = uniqueSorted([
    ...(publishableFiles.some((file) => file.startsWith(PAPER_ROUTE_PREFIX) || file.startsWith(PAPER_CONTENT_PREFIX)) ? ['paper'] : []),
    ...(publishableFiles.some((file) => file.startsWith(EXPERIMENT_ROUTE_PREFIX) || file.startsWith(EXPERIMENT_CONTENT_PREFIX)) ? ['experiment'] : []),
    ...(publishableFiles.some((file) => (
      file.startsWith(MCP_TRUST_ROUTE_PREFIX) ||
      file.startsWith(AGENT_TRUST_ROUTE_PREFIX) ||
      file.startsWith(PUBLIC_TRUST_DATA_PREFIX) ||
      file === PUBLIC_TRUST_CONFIG_FILE ||
      file === PUBLIC_TRUST_GENERATED_CONFIG_FILE
    )) ? ['trust-catalog'] : []),
    ...(policyFiles.length > 0 ? ['policy'] : []),
  ]);

  const verificationRoutes = changedRoutes.length > 0
    ? changedRoutes
    : publishableFiles.length > 0
      ? uniqueSorted([
          ...(artifactKinds.includes('paper') ? ['/papers'] : []),
          ...(artifactKinds.includes('experiment') ? ['/experiments'] : []),
          '/',
        ])
      : [];

  const hasPolicyChanges = policyFiles.length > 0;
  const hasPublishableIoChanges = publishableFiles.length > 0;
  const hasLifecycleChanges = hasPolicyChanges || hasPublishableIoChanges || supportFiles.length > 0;

  return {
    changed_files: changedFiles,
    publishable_io_files: publishableFiles,
    policy_files: policyFiles,
    lifecycle_support_files: supportFiles,
    changed_routes: changedRoutes,
    verification_routes: verificationRoutes,
    artifact_kinds: artifactKinds,
    policy_ids: collectPolicyIds(changedFiles),
    has_policy_changes: hasPolicyChanges,
    has_publishable_io_changes: hasPublishableIoChanges,
    has_lifecycle_changes: hasLifecycleChanges,
    recommended_checks: [
      'pnpm check',
      'pnpm lint',
      'pnpm test',
      'pnpm --filter @create-something/io build',
      ...(hasPolicyChanges ? ['pnpm policy:artifacts:check'] : []),
    ],
    cycle_labels: CYCLE_LABELS,
  };
}

function printText(context) {
  console.log(`Changed files: ${context.changed_files.length}`);
  console.log(`Publishable .io changes: ${context.has_publishable_io_changes ? 'yes' : 'no'}`);
  console.log(`Policy changes: ${context.has_policy_changes ? 'yes' : 'no'}`);
  console.log(`Lifecycle support changes: ${context.lifecycle_support_files.length > 0 ? 'yes' : 'no'}`);
  console.log(`Artifact kinds: ${context.artifact_kinds.join(', ') || '(none)'}`);
  console.log(`Verification routes: ${context.verification_routes.join(', ') || '(none)'}`);
}

function main() {
  const args = parseArgs(process.argv);
  const stdinFiles = args.filesFromStdin ? readFilesFromStdin() : [];
  const gitFiles = args.base && args.head ? gitDiffFiles(args.base, args.head, args.rangeMode) : [];
  const changedFiles = uniqueSorted([...args.files, ...stdinFiles, ...gitFiles]);

  if (changedFiles.length === 0) {
    throw new Error('No changed files found. Pass --files/--files-from-stdin or --base/--head.');
  }

  const context = collectIoPaperCycleContext(changedFiles);

  if (args.format === 'json') {
    console.log(JSON.stringify(context, null, 2));
    return;
  }

  printText(context);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
