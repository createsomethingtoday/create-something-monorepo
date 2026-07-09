#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_JSON = 'config/repo-ownership-registry.generated.json';
const DEFAULT_MARKDOWN = 'docs/REPO_OWNERSHIP_REGISTRY.generated.md';
const MONOREPO_REPO = 'createsomethingtoday/create-something-monorepo';
const TEXT_EXTENSIONS = new Set(['.json', '.md', '.ts', '.yml', '.yaml']);
const SKIP_DIRS = new Set([
  '.git',
  '.next',
  '.open-next',
  '.svelte-kit',
  '.turbo',
  '.wrangler',
  'dist',
  'node_modules',
  'output',
]);

function parseArgs(argv) {
  const args = {
    root: SCRIPT_ROOT,
    outJson: null,
    outMarkdown: null,
    check: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      args.root = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--out-json' && argv[i + 1]) {
      args.outJson = argv[i + 1];
      i += 1;
    } else if (arg === '--out-md' && argv[i + 1]) {
      args.outMarkdown = argv[i + 1];
      i += 1;
    } else if (arg === '--check') {
      args.check = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  args.outJson ??= join(args.root, DEFAULT_JSON);
  args.outMarkdown ??= join(args.root, DEFAULT_MARKDOWN);
  if (!resolve(args.outJson).startsWith(args.root)) {
    args.outJson = resolve(args.outJson);
  }
  if (!resolve(args.outMarkdown).startsWith(args.root)) {
    args.outMarkdown = resolve(args.outMarkdown);
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/repo-ownership-registry.mjs [--check]

Generates a read-only ownership registry from package metadata, workspace lanes,
workflow syncs, docs references, git remotes, and agent/wiki context.

Options:
  --root <path>      Workspace root to inspect. Defaults to this repository.
  --out-json <path>  JSON output path. Defaults to ${DEFAULT_JSON}.
  --out-md <path>    Markdown output path. Defaults to ${DEFAULT_MARKDOWN}.
  --check            Fail if generated outputs differ from files on disk.`);
}

function rel(root, path) {
  return relative(root, path).replaceAll('\\', '/');
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile();
}

function pathExists(root, pathname) {
  return existsSync(join(root, pathname));
}

function walk(root, start, predicate) {
  const startPath = join(root, start);
  if (!existsSync(startPath)) return [];

  const results = [];
  const visit = (path) => {
    const stats = statSync(path);
    if (stats.isDirectory()) {
      const name = path.split('/').pop();
      if (SKIP_DIRS.has(name)) return;
      for (const entry of readdirSync(path).sort((a, b) => a.localeCompare(b))) {
        visit(join(path, entry));
      }
      return;
    }

    if (predicate(path, stats)) {
      results.push(path);
    }
  };

  visit(startPath);
  return results;
}

function findPackageManifests(root) {
  const starts = ['apps', 'packages'];
  return starts.flatMap((start) =>
    walk(root, start, (path) => path.endsWith('/package.json')),
  );
}

function normalizeRepo(value) {
  if (!value) return null;
  const text = typeof value === 'string' ? value : value.url;
  if (!text) return null;

  const normalized = text
    .replace(/^git\+/, '')
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '');

  const match = normalized.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
  return match ? match[1] : null;
}

function repositoryInfo(manifest) {
  const repository = manifest.repository ?? null;
  if (!repository) return null;
  return {
    raw: repository,
    repo: normalizeRepo(repository),
    directory: typeof repository === 'object' ? repository.directory ?? null : null,
  };
}

function dependencyEntries(manifest) {
  const groups = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const entries = [];
  for (const group of groups) {
    const deps = manifest[group];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, spec] of Object.entries(deps)) {
      entries.push({ group, name, spec });
    }
  }
  return entries.sort((a, b) => `${a.group}:${a.name}`.localeCompare(`${b.group}:${b.name}`));
}

function workspaceDependencies(manifest) {
  return dependencyEntries(manifest)
    .filter((entry) => typeof entry.spec === 'string' && entry.spec.startsWith('workspace:'))
    .map((entry) => ({
      group: entry.group,
      name: entry.name,
      spec: entry.spec,
    }));
}

function globToRegex(pattern) {
  const escaped = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[^/]+');
  return new RegExp(`^${escaped}$`);
}

function loadWorkspaceLanes(root) {
  const config = readJson(join(root, 'config', 'workspace-lanes.json'), { lanes: {} });
  const patterns = [];
  for (const [lane, entries] of Object.entries(config.lanes ?? {})) {
    for (const pattern of entries) {
      patterns.push({ lane, pattern, regex: globToRegex(pattern) });
    }
  }
  return patterns;
}

function laneFor(pathname, lanePatterns) {
  const exact = lanePatterns.find((entry) => entry.pattern === pathname);
  if (exact) return exact.lane;
  const match = lanePatterns.find((entry) => entry.regex.test(pathname));
  return match?.lane ?? null;
}

function nearestKnownSurface(pathname, surfacePaths) {
  const sorted = [...surfacePaths].sort((a, b) => b.length - a.length);
  return sorted.find((surfacePath) => pathname === surfacePath || pathname.startsWith(`${surfacePath}/`)) ?? null;
}

function fileExtension(pathname) {
  const index = pathname.lastIndexOf('.');
  return index === -1 ? '' : pathname.slice(index);
}

function scanTextFiles(root) {
  const starts = ['.github', 'apps', 'config', 'docs', 'packages'];
  const maxBytes = 750_000;
  return starts.flatMap((start) =>
    walk(root, start, (path, stats) => {
      if (stats.size > maxBytes) return false;
      const relativePath = rel(root, path);
      if (
        relativePath === DEFAULT_JSON ||
        relativePath === DEFAULT_MARKDOWN ||
        relativePath.endsWith('.generated.json') ||
        relativePath.endsWith('.generated.md') ||
        relativePath.endsWith('/repo-ownership-registry.generated.json') ||
        relativePath.endsWith('/REPO_OWNERSHIP_REGISTRY.generated.md')
      ) {
        return false;
      }
      return TEXT_EXTENSIONS.has(fileExtension(path));
    }),
  );
}

function collectRepoLineReferences(root, surfacePaths) {
  const repoRegex = /(?:https:\/\/github\.com\/|git@github\.com:)?(?<!@)\b((?:createsomethingtoday|Half-Dozen|create-something)\/[A-Za-z0-9_.-]+)(?:\.git)?/g;
  const references = [];

  for (const path of scanTextFiles(root)) {
    const relativePath = rel(root, path);
    const text = readFileSync(path, 'utf8');
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const match of line.matchAll(repoRegex)) {
        const repo = normalizeRepo(match[1]);
        if (!repo.includes('/')) continue;
        references.push({
          repo,
          path: relativePath,
          line: index + 1,
          text: line.trim().slice(0, 280),
          surface: nearestKnownSurface(`${relativePath}`, surfacePaths) ?? inferSurfaceFromText(line, surfacePaths),
          relationship: inferRelationship(relativePath, line),
        });
      }
    });
  }

  return uniqueReferences(references);
}

function inferSurfaceFromText(line, surfacePaths) {
  return surfacePaths.find((surfacePath) => line.includes(surfacePath)) ?? null;
}

function inferRelationship(pathname, line) {
  const lower = `${pathname}\n${line}`.toLowerCase();
  if (lower.includes('git subtree') || lower.includes('subtree')) return 'subtree-sync';
  if (lower.includes('standalone redundancy') || lower.includes('redundancy repo')) return 'mirror-redundancy';
  if (lower.includes('self-contained application repo') || lower.includes('standalone application repository')) return 'standalone';
  if (lower.includes('marketplace') || lower.includes('registered in')) return 'marketplace-config';
  if (lower.includes('deployment mapping') || lower.includes('vercel project')) return 'deploy-source';
  if (lower.includes('repository')) return 'repository-metadata';
  return 'reference';
}

function collectSubtreeReferences(root, surfacePaths = []) {
  const workflowDir = join(root, '.github', 'workflows');
  if (!existsSync(workflowDir)) return [];
  const files = walk(root, '.github/workflows', (path) =>
    ['.yml', '.yaml'].includes(fileExtension(path)),
  );

  const references = [];
  for (const file of files) {
    const relativePath = rel(root, file);
    const text = readFileSync(file, 'utf8');
    const subtreeRegex = /git subtree pull\s+[\s\S]*?--prefix\s+["']([^"']+)["'][\s\S]*?["']https:\/\/github\.com\/([^"']+?)(?:\.git)?["']/g;
    for (const match of text.matchAll(subtreeRegex)) {
      references.push({
        repo: match[2],
        path: relativePath,
        line: lineNumberForIndex(text, match.index ?? 0),
        text: `git subtree pull --prefix ${match[1]} https://github.com/${match[2]}.git`,
        surface: nearestKnownSurface(match[1], surfacePaths) ?? match[1],
        relationship: 'subtree-sync',
      });
    }
  }
  return references;
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function uniqueReferences(references) {
  const seen = new Set();
  return references.filter((reference) => {
    const key = `${reference.repo}|${reference.path}|${reference.line}|${reference.surface ?? ''}|${reference.relationship}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectGitRemotes(root) {
  try {
    const output = execFileSync('git', ['remote', '-v'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const remotes = [];
    for (const line of output.split('\n').filter(Boolean)) {
      const [name, url, kindRaw] = line.split(/\s+/);
      remotes.push({
        name,
        url,
        repo: normalizeRepo(url),
        kind: kindRaw?.replace(/[()]/g, '') ?? null,
      });
    }
    return remotes.sort((a, b) => `${a.name}:${a.kind}`.localeCompare(`${b.name}:${b.kind}`));
  } catch {
    return [];
  }
}

function classifyOwnership({ repository, externalRefs, workspaceDeps, hasManifest }) {
  const relationships = new Set(externalRefs.map((entry) => entry.relationship));
  const externalRepos = new Set(
    externalRefs
      .map((entry) => entry.repo)
      .filter((repo) => repo && repo !== MONOREPO_REPO),
  );
  const repo = repository?.repo ?? null;

  if (relationships.has('subtree-sync')) {
    return 'mirrored';
  }

  if (repo && repo !== MONOREPO_REPO && repo.endsWith('/create-something-monorepo')) {
    return 'unclear';
  }

  if (repo && repo !== MONOREPO_REPO) {
    return externalRepos.size > 0 && !externalRepos.has(repo) ? 'mixed' : 'standalone';
  }

  if (externalRepos.size > 0 && relationships.has('mirror-redundancy')) {
    return 'mirrored';
  }

  if (externalRepos.size > 0) {
    return repo === MONOREPO_REPO || workspaceDeps.length > 0 ? 'mixed' : 'standalone-reference';
  }

  if (repo === MONOREPO_REPO || hasManifest) {
    return 'monorepo';
  }

  return 'unclear';
}

function collectSurfaces(root) {
  const lanePatterns = loadWorkspaceLanes(root);
  const packageManifestPaths = findPackageManifests(root);
  const packageSurfaces = packageManifestPaths.map((manifestPath) => {
    const path = dirname(rel(root, manifestPath));
    const manifest = readJson(manifestPath);
    return {
      path,
      kind: path.startsWith('apps/') ? 'app' : 'package',
      name: manifest.name ?? null,
      private: manifest.private ?? false,
      lane: laneFor(path, lanePatterns),
      manifest,
    };
  });

  return packageSurfaces.sort((a, b) => a.path.localeCompare(b.path));
}

function evidenceSummary(root, surfacePath) {
  return {
    agents: pathExists(root, `${surfacePath}/AGENTS.md`),
    understanding: pathExists(root, `${surfacePath}/UNDERSTANDING.md`),
    readme: pathExists(root, `${surfacePath}/README.md`),
    agentWiki: pathExists(root, `${surfacePath}/docs/agent-wiki/README.md`),
  };
}

function surfaceRecord(root, surface, references) {
  const repository = repositoryInfo(surface.manifest);
  const workspaceDeps = workspaceDependencies(surface.manifest);
  const externalRefs = references
    .filter(
      (reference) =>
        reference.repo !== MONOREPO_REPO &&
        reference.surface === surface.path,
    )
    .sort((a, b) => `${a.path}:${a.line}:${a.repo}`.localeCompare(`${b.path}:${b.line}:${b.repo}`));
  const context = evidenceSummary(root, surface.path);
  const ownership = classifyOwnership({
    repository,
    externalRefs,
    workspaceDeps,
    hasManifest: true,
  });

  return {
    path: surface.path,
    name: surface.name,
    kind: surface.kind,
    lane: surface.lane,
    private: surface.private,
    ownership,
    authorityConfidence: authorityConfidence(ownership),
    syncMode: syncModeFor(externalRefs),
    repository,
    workspaceDependencies: workspaceDeps,
    context,
    externalReferences: externalRefs.map(({ repo, path, line, relationship, text }) => ({
      repo,
      path,
      line,
      relationship,
      text,
    })),
    referencedRepositories: [...new Set(externalRefs.map((entry) => entry.repo).filter(Boolean))].sort(),
    cautions: cautionsFor({ ownership, repository, workspaceDeps, context, externalRefs }),
  };
}

function authorityConfidence(ownership) {
  if (ownership === 'monorepo' || ownership === 'standalone') return 'high';
  if (ownership === 'mirrored') return 'medium';
  return 'low';
}

function syncModeFor(externalRefs) {
  const relationships = new Set(externalRefs.map((entry) => entry.relationship));
  if (relationships.has('subtree-sync')) return 'subtree';
  if (relationships.has('mirror-redundancy')) return 'mirror-redundancy';
  if (relationships.has('marketplace-config')) return 'marketplace-config';
  return 'none';
}

function cautionsFor({ ownership, repository, workspaceDeps, context, externalRefs }) {
  const cautions = [];
  if (ownership === 'mixed') {
    cautions.push('Multiple ownership signals exist; verify authority before migrating or cleaning.');
  }
  if (ownership === 'unclear') {
    cautions.push('Ownership evidence is incomplete or stale; treat this as a drill-down prompt.');
  }
  if (ownership === 'mirrored') {
    cautions.push('Treat this as a sync or mirror relationship until the authority direction is explicit.');
  }
  if (repository?.repo && repository.repo !== MONOREPO_REPO && repository.repo.endsWith('/create-something-monorepo')) {
    cautions.push(`Repository metadata points at ${repository.repo}; verify whether this is a stale namespace.`);
  }
  if (workspaceDeps.length > 0) {
    cautions.push('Workspace dependencies must be published, vendored, or otherwise resolved before standalone extraction.');
  }
  if (context.agentWiki) {
    cautions.push('Generated agent wiki is orientation only; verify against source artifacts before claims.');
  }
  if (externalRefs.some((reference) => reference.relationship === 'marketplace-config')) {
    cautions.push('Marketplace/config references may be registration dependencies rather than code ownership.');
  }
  return cautions;
}

function externalRepositoryRecords(references, surfaces) {
  const byRepo = new Map();
  for (const reference of references.filter((entry) => entry.repo !== MONOREPO_REPO)) {
    const current = byRepo.get(reference.repo) ?? {
      repo: reference.repo,
      relationships: new Set(),
      surfaces: new Set(),
      evidence: [],
    };
    current.relationships.add(reference.relationship);
    if (reference.surface) current.surfaces.add(reference.surface);
    current.evidence.push({
      path: reference.path,
      line: reference.line,
      relationship: reference.relationship,
      surface: reference.surface,
      text: reference.text,
    });
    byRepo.set(reference.repo, current);
  }

  const knownSurfacePaths = new Set(surfaces.map((surface) => surface.path));
  return [...byRepo.values()]
    .map((record) => ({
      repo: record.repo,
      relationships: [...record.relationships].sort(),
      surfaces: [...record.surfaces].filter((surface) => knownSurfacePaths.has(surface) || surface).sort(),
      evidence: record.evidence
        .sort((a, b) => `${a.path}:${a.line}`.localeCompare(`${b.path}:${b.line}`))
        .slice(0, 12),
    }))
    .sort((a, b) => a.repo.localeCompare(b.repo));
}

function summarize(surfaces) {
  const ownership = {};
  for (const surface of surfaces) {
    ownership[surface.ownership] = (ownership[surface.ownership] ?? 0) + 1;
  }
  return {
    totalSurfaces: surfaces.length,
    ownership: Object.fromEntries(Object.entries(ownership).sort(([a], [b]) => a.localeCompare(b))),
  };
}

export function buildRegistry(root = SCRIPT_ROOT) {
  const normalizedRoot = resolve(root);
  const surfacesRaw = collectSurfaces(normalizedRoot);
  const surfacePaths = surfacesRaw.map((surface) => surface.path);
  const references = uniqueReferences([
    ...collectRepoLineReferences(normalizedRoot, surfacePaths),
    ...collectSubtreeReferences(normalizedRoot, surfacePaths),
  ]);
  const surfaces = surfacesRaw.map((surface) => surfaceRecord(normalizedRoot, surface, references));

  return {
    version: 1,
    generatedBy: 'scripts/repo-ownership-registry.mjs',
    sourceRoot: normalizedRoot,
    summary: summarize(surfaces),
    gitRemotes: collectGitRemotes(normalizedRoot),
    externalRepositories: externalRepositoryRecords(references, surfaces),
    surfaces,
  };
}

export function renderMarkdown(registry) {
  const lines = [
    '# Repo Ownership Registry',
    '',
    '> Generated by `node scripts/repo-ownership-registry.mjs`.',
    '> This registry records evidence. It does not by itself authorize repo splits, deploy ownership changes, publication, or cleanup.',
    '',
    '## Summary',
    '',
    `- Total surfaces: ${registry.summary.totalSurfaces}`,
    ...Object.entries(registry.summary.ownership).map(([ownership, count]) => `- ${ownership}: ${count}`),
    '',
    '## How Agents Should Use This',
    '',
    '- Use `ownership` as a starting classification, not as permission to mutate.',
    '- Treat `mixed`, `mirrored`, and `standalone-reference` entries as requiring readback against the cited evidence before action.',
    '- For wiki-agent orientation, prefer the registry to choose the right repo or surface first, then verify claims against the source artifacts named by that surface.',
    '- Generated agent wiki pages are orientation projections; source JSON, package manifests, workflows, and deployment configs remain authority.',
    '',
    '## External Repositories',
    '',
  ];

  if (registry.externalRepositories.length === 0) {
    lines.push('- None found.', '');
  } else {
    lines.push('| Repository | Relationship Signals | Local Surfaces | Evidence |');
    lines.push('| --- | --- | --- | --- |');
    for (const record of registry.externalRepositories) {
      const evidence = record.evidence
        .slice(0, 3)
        .map((entry) => `${entry.path}:${entry.line}`)
        .join('<br>');
      lines.push(
        `| \`${record.repo}\` | ${record.relationships.map((entry) => `\`${entry}\``).join(', ')} | ${record.surfaces.map((entry) => `\`${entry}\``).join('<br>') || 'none'} | ${evidence} |`,
      );
    }
    lines.push('');
  }

  lines.push('## Surfaces');
  lines.push('');
  lines.push('| Surface | Name | Lane | Ownership | Key Cautions |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const surface of registry.surfaces) {
    lines.push(
      `| \`${surface.path}\` | ${surface.name ? `\`${surface.name}\`` : ''} | ${surface.lane ?? ''} | \`${surface.ownership}\` | ${surface.cautions.join('<br>') || ''} |`,
    );
  }
  lines.push('');

  return `${lines.join('\n').trimEnd()}\n`;
}

function compareFile(path, expected) {
  if (!existsSync(path)) {
    return `${path} is missing`;
  }
  const actual = readFileSync(path, 'utf8');
  if (actual !== expected) {
    return `${path} is stale`;
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv);
  const registry = buildRegistry(args.root);
  const json = stableJson(registry);
  const markdown = renderMarkdown(registry);

  if (args.check) {
    const failures = [
      compareFile(args.outJson, json),
      compareFile(args.outMarkdown, markdown),
    ].filter(Boolean);

    if (failures.length > 0) {
      console.error('Repo ownership registry is stale.');
      for (const failure of failures) console.error(`- ${failure}`);
      console.error('Regenerate with: node scripts/repo-ownership-registry.mjs');
      process.exitCode = 1;
      return;
    }

    console.log(`Repo ownership registry is current (${registry.summary.totalSurfaces} surfaces).`);
    return;
  }

  ensureParent(args.outJson);
  ensureParent(args.outMarkdown);
  writeFileSync(args.outJson, json, 'utf8');
  writeFileSync(args.outMarkdown, markdown, 'utf8');
  console.log(`Wrote ${rel(args.root, args.outJson)}`);
  console.log(`Wrote ${rel(args.root, args.outMarkdown)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  }
}
