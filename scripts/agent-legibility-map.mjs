#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const TIER_ORDER = ['database', 'automation', 'judgment'];
const SURFACE_ORDER = ['app', 'mcp', 'worker', 'library', 'harness', 'control-plane'];

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const args = {
    format: 'markdown',
    tier: null,
    surface: null,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i].trim().toLowerCase();
      continue;
    }

    if (arg === '--tier' && argv[i + 1]) {
      args.tier = argv[++i].trim().toLowerCase();
      continue;
    }

    if (arg === '--surface' && argv[i + 1]) {
      args.surface = argv[++i].trim().toLowerCase();
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (args.format === 'md') {
    args.format = 'markdown';
  }

  if (!['markdown', 'json'].includes(args.format)) {
    throw new Error(`Unsupported format: ${args.format}`);
  }

  if (args.tier && !TIER_ORDER.includes(args.tier)) {
    throw new Error(`Unsupported tier: ${args.tier}`);
  }

  if (args.surface && !SURFACE_ORDER.includes(args.surface)) {
    throw new Error(`Unsupported surface: ${args.surface}`);
  }

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/agent-legibility-map.mjs [--format markdown|json] [--tier database|automation|judgment] [--surface app|mcp|worker|library|harness|control-plane]`);
}

function getPackageJsonAt(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }

  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function listPackageDirs() {
  if (!existsSync(PACKAGES_DIR)) {
    return [];
  }

  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function resolveEntrypoint(packagePath, entrypoint) {
  if (entrypoint.startsWith('packages/')) {
    return entrypoint;
  }

  return normalizePath(path.join(packagePath, entrypoint));
}

function discoverPackages(filters) {
  return listPackageDirs()
    .map((dirName) => {
      const packageDir = path.join(PACKAGES_DIR, dirName);
      const packagePath = normalizePath(path.join('packages', dirName));
      const packageJson = getPackageJsonAt(packageDir);
      const directive = packageJson?.createSomething;

      if (!directive?.agentLegibilityContract) {
        return null;
      }

      const entrypoints = Array.isArray(directive.entrypoints)
        ? directive.entrypoints.map((entrypoint) => resolveEntrypoint(packagePath, entrypoint))
        : [];

      return {
        name: packageJson.name ?? dirName,
        path: packagePath,
        description: packageJson.description ?? '',
        tier: directive.tier ?? 'unknown',
        surface: directive.surface ?? 'unknown',
        entrypoints,
        boot: directive.boot ?? '',
        smoke: directive.smoke ?? '',
        docs: {
          agents: existsSync(path.join(packageDir, 'AGENTS.md')) ? `${packagePath}/AGENTS.md` : null,
          agent: existsSync(path.join(packageDir, 'AGENT.md')) ? `${packagePath}/AGENT.md` : null,
          readme: existsSync(path.join(packageDir, 'README.md')) ? `${packagePath}/README.md` : null,
          understanding: existsSync(path.join(packageDir, 'UNDERSTANDING.md')) ? `${packagePath}/UNDERSTANDING.md` : null,
        },
      };
    })
    .filter(Boolean)
    .filter((item) => !filters.tier || item.tier === filters.tier)
    .filter((item) => !filters.surface || item.surface === filters.surface)
    .sort((a, b) => {
      const tierDelta = orderIndex(TIER_ORDER, a.tier) - orderIndex(TIER_ORDER, b.tier);
      if (tierDelta !== 0) {
        return tierDelta;
      }

      const surfaceDelta = orderIndex(SURFACE_ORDER, a.surface) - orderIndex(SURFACE_ORDER, b.surface);
      if (surfaceDelta !== 0) {
        return surfaceDelta;
      }

      return a.name.localeCompare(b.name);
    });
}

function orderIndex(order, value) {
  const index = order.indexOf(value);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function buildMap(filters) {
  const packages = discoverPackages(filters);

  return {
    source: 'package.json createSomething directives',
    package_count: packages.length,
    filters: {
      tier: filters.tier,
      surface: filters.surface,
    },
    summary: {
      by_tier: countBy(packages, 'tier'),
      by_surface: countBy(packages, 'surface'),
    },
    packages,
  };
}

function escapeMarkdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
}

function formatCodeList(values) {
  if (!values?.length) {
    return '';
  }

  return values.map((value) => `<code>${escapeMarkdownCell(value)}</code>`).join('<br>');
}

function formatDocs(docs) {
  return formatCodeList([docs.agents, docs.agent, docs.readme, docs.understanding].filter(Boolean));
}

function formatSummary(counts, order) {
  return order
    .filter((key) => counts[key])
    .map((key) => `\`${key}\`: ${counts[key]}`)
    .join(', ') || 'none';
}

function renderMarkdown(map) {
  const lines = [
    '# CREATE SOMETHING Agent Map',
    '',
    'Source: package `createSomething` directives. Generated on demand; do not commit this output as a source of truth.',
    '',
    '## Summary',
    '',
    `- Packages: ${map.package_count}`,
    `- Tiers: ${formatSummary(map.summary.by_tier, TIER_ORDER)}`,
    `- Surfaces: ${formatSummary(map.summary.by_surface, SURFACE_ORDER)}`,
    '',
  ];

  for (const tier of TIER_ORDER) {
    const packages = map.packages.filter((item) => item.tier === tier);
    if (packages.length === 0) {
      continue;
    }

    lines.push(`## ${tier[0].toUpperCase()}${tier.slice(1)}`, '');
    lines.push('| Package | Surface | Entry points | Docs | Boot | Smoke |');
    lines.push('|---|---|---|---|---|---|');

    for (const item of packages) {
      const packageLabel = `<code>${escapeMarkdownCell(item.name)}</code><br><code>${escapeMarkdownCell(item.path)}</code>`;
      lines.push([
        packageLabel,
        `<code>${escapeMarkdownCell(item.surface)}</code>`,
        formatCodeList(item.entrypoints),
        formatDocs(item.docs),
        `<code>${escapeMarkdownCell(item.boot)}</code>`,
        `<code>${escapeMarkdownCell(item.smoke)}</code>`,
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
    }

    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function main() {
  const args = parseArgs(process.argv);
  const map = buildMap(args);

  if (args.format === 'json') {
    process.stdout.write(`${JSON.stringify(map, null, 2)}\n`);
    return;
  }

  process.stdout.write(renderMarkdown(map));
}

main();
