#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const REQUIRED_FIELDS = [
  'Entry point',
  'Boot command',
  'Smoke command',
  'Validation surfaces',
  'UI validation path',
  'Escalation rule',
];
const DIRECTIVE_TIERS = new Set(['database', 'automation', 'judgment']);
const DIRECTIVE_SURFACES = new Set(['app', 'mcp', 'worker', 'library', 'harness', 'control-plane']);
const REQUIRED_DIRECTIVE_FIELDS = [
  'tier',
  'surface',
  'entrypoints',
  'boot',
  'smoke',
];
const PACKAGE_AGENT_GUIDANCE_FILE = 'AGENTS.md';
const UNDERSTANDING_PLACEHOLDERS = [
  '# Understanding: [Package Name]',
  '> **[One-sentence purpose statement]**',
  '**Mode of Being**: [.ltd / .io / .space / .agency / foundation]',
  '[2-3 sentences on how this package relates to the hermeneutic workflow]',
  '| `[package]` | [What understanding this enables] |',
  '| `[package/property]` | [How this aids their understanding] |',
  '├── [dir]/     → [What this contains and why]',
  '└── [file]     → [Critical file purpose]',
  '1. **[file path]** — [Why this is the entry point]',
  '| [Term] | [Brief explanation] | `[file]` |',
  '- [Broader concept or pattern this exemplifies]',
  '| [Common operation] | `[file or command]` |',
  '*Last validated: [YYYY-MM-DD]*',
  'Replace this paragraph with the package\'s actual role',
  '| `[domain dependency]` | `[what live system or dataset this MCP makes legible]` |',
  '| `[downstream package or property]` | `[how this MCP makes that domain legible]` |',
];

const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

function normalizePath(relPath) {
  return relPath.split(path.sep).join('/').replace(/^\.\//, '');
}

function parseArgs(argv) {
  const args = {
    targets: [],
    format: 'text',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      continue;
    }

    if (arg === '--target' && argv[i + 1]) {
      args.targets = argv[++i]
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalizePath);
      continue;
    }

    if (arg === '--format' && argv[i + 1]) {
      args.format = argv[++i].trim().toLowerCase();
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

  return args;
}

function printUsage() {
  console.log(`Usage:
  node scripts/agent-legibility-check.mjs [--target path1,path2] [--format text|json]`);
}

function listOptedInPackageDirs() {
  if (!existsSync(PACKAGES_DIR)) {
    return [];
  }

  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .filter((dirName) => {
      const packageJsonPath = path.join(PACKAGES_DIR, dirName, 'package.json');
      if (!existsSync(packageJsonPath)) {
        return false;
      }
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return Boolean(packageJson.createSomething?.agentLegibilityContract);
    });
}

function discoverTargetsFromPackageMetadata() {
  return listOptedInPackageDirs().map((dirName) =>
    normalizePath(path.join('packages', dirName, 'README.md')));
}

function findMetadataDrift() {
  if (!existsSync(PACKAGES_DIR)) {
    return [];
  }

  const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const drift = [];

  for (const dirName of packageDirs) {
    const packageJsonPath = path.join(PACKAGES_DIR, dirName, 'package.json');
    const readmePath = path.join(PACKAGES_DIR, dirName, 'README.md');

    if (!existsSync(packageJsonPath) || !existsSync(readmePath)) {
      continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const readme = readFileSync(readmePath, 'utf8');
    const hasContractSection = readme.includes('## Agent Legibility Contract');
    const optedIn = Boolean(packageJson.createSomething?.agentLegibilityContract);

    if (hasContractSection && !optedIn) {
      drift.push({
        target: normalizePath(path.join('packages', dirName, 'package.json')),
        ok: false,
        details: [
          'Package README includes "## Agent Legibility Contract" but package.json is not opted into createSomething.agentLegibilityContract.',
        ],
      });
    }
  }

  return drift;
}

function findPackageDirectiveDrift() {
  const drift = [];

  for (const dirName of listOptedInPackageDirs()) {
    const packageDir = path.join(PACKAGES_DIR, dirName);
    const relPackageJsonPath = normalizePath(path.join('packages', dirName, 'package.json'));
    const packageJson = getPackageJsonAt(packageDir);
    const createSomething = packageJson?.createSomething;
    const details = [];

    if (!createSomething || typeof createSomething !== 'object') {
      drift.push({
        target: relPackageJsonPath,
        ok: false,
        details: ['Missing createSomething package directive metadata.'],
      });
      continue;
    }

    for (const field of REQUIRED_DIRECTIVE_FIELDS) {
      if (!(field in createSomething)) {
        details.push(`Missing createSomething.${field}.`);
      }
    }

    if (typeof createSomething.tier !== 'string' || !DIRECTIVE_TIERS.has(createSomething.tier)) {
      details.push(`createSomething.tier must be one of: ${Array.from(DIRECTIVE_TIERS).join(', ')}.`);
    }

    if (typeof createSomething.surface !== 'string' || !DIRECTIVE_SURFACES.has(createSomething.surface)) {
      details.push(`createSomething.surface must be one of: ${Array.from(DIRECTIVE_SURFACES).join(', ')}.`);
    }

    if (!Array.isArray(createSomething.entrypoints) || createSomething.entrypoints.length === 0) {
      details.push('createSomething.entrypoints must be a non-empty array.');
    } else {
      for (const entrypoint of createSomething.entrypoints) {
        if (typeof entrypoint !== 'string' || entrypoint.trim() === '') {
          details.push('createSomething.entrypoints must contain non-empty strings.');
          continue;
        }

        const fullPath = entrypoint.startsWith('packages/')
          ? path.join(REPO_ROOT, entrypoint)
          : path.join(packageDir, entrypoint);

        if (!existsSync(fullPath)) {
          details.push(`createSomething.entrypoints references a missing path: "${entrypoint}".`);
        }
      }
    }

    if (typeof createSomething.boot !== 'string' || createSomething.boot.trim() === '') {
      details.push('createSomething.boot must be a non-empty command string.');
    } else {
      details.push(...validateScriptCommand(createSomething.boot, packageDir, 'createSomething.boot'));
    }

    if (typeof createSomething.smoke !== 'string' || createSomething.smoke.trim() === '') {
      details.push('createSomething.smoke must be a non-empty command string.');
    } else {
      details.push(...validateScriptCommand(createSomething.smoke, packageDir, 'createSomething.smoke'));
    }

    if (details.length > 0) {
      drift.push({
        target: relPackageJsonPath,
        ok: false,
        details,
      });
    }
  }

  return drift;
}

function findPackageGuidanceDrift() {
  const drift = [];

  for (const dirName of listOptedInPackageDirs()) {
    const agentsPath = path.join(PACKAGES_DIR, dirName, PACKAGE_AGENT_GUIDANCE_FILE);
    const understandingPath = path.join(PACKAGES_DIR, dirName, 'UNDERSTANDING.md');
    const relAgentsPath = normalizePath(path.join('packages', dirName, PACKAGE_AGENT_GUIDANCE_FILE));
    const relUnderstandingPath = normalizePath(path.join('packages', dirName, 'UNDERSTANDING.md'));

    if (!existsSync(agentsPath)) {
      drift.push({
        target: relAgentsPath,
        ok: false,
        details: ['Opted-in package is missing package-local AGENTS.md.'],
      });
    } else {
      const agents = readFileSync(agentsPath, 'utf8');
      const details = [];

      if (!agents.includes('# Agents:')) {
        details.push('Missing top-level agents heading.');
      }

      if (!agents.includes('## Agent Entry')) {
        details.push('Missing "## Agent Entry" section.');
      }

      if (!agents.includes('## Validation')) {
        details.push('Missing "## Validation" section.');
      }

      if (details.length > 0) {
        drift.push({
          target: relAgentsPath,
          ok: false,
          details,
        });
      }
    }

    if (existsSync(understandingPath)) {
      const understanding = readFileSync(understandingPath, 'utf8');
      const details = [];

      if (!understanding.includes('# Understanding:')) {
        details.push('Missing top-level understanding heading.');
      }

      if (!understanding.includes('## To Understand This Package, Read')) {
        details.push('Missing "## To Understand This Package, Read" section.');
      }

      for (const placeholder of UNDERSTANDING_PLACEHOLDERS) {
        if (understanding.includes(placeholder)) {
          details.push(`Contains template placeholder text: "${placeholder}".`);
        }
      }

      if (details.length > 0) {
        drift.push({
          target: relUnderstandingPath,
          ok: false,
          details,
        });
      }
    }
  }

  return drift;
}

function getPackageJsonAt(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
}

function findPackageDirByPackageName(packageName) {
  for (const dirName of readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)) {
    const candidateDir = path.join(PACKAGES_DIR, dirName);
    const packageJson = getPackageJsonAt(candidateDir);
    if (packageJson?.name === packageName) {
      return candidateDir;
    }
  }

  return null;
}

function resolvePackageDirFromFilter(filterValue) {
  const normalized = filterValue.replace(/^["']|["']$/g, '');

  if (normalized.startsWith('@create-something/')) {
    return findPackageDirByPackageName(normalized) ?? path.join(PACKAGES_DIR, normalized.slice('@create-something/'.length));
  }

  if (normalized.startsWith('packages/')) {
    return path.join(REPO_ROOT, normalized);
  }

  return path.join(PACKAGES_DIR, normalized);
}

function extractContractRow(content, field) {
  const pattern = new RegExp(`\\|\\s*${field.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\s*\\|([^\\n]+)`);
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function extractInlineCode(value) {
  return Array.from(value.matchAll(/`([^`]+)`/g), (match) => match[1].trim());
}

function validateEntryPoints(relPath, content) {
  const details = [];
  const packageDir = path.dirname(path.join(REPO_ROOT, relPath));
  const entryPointValue = extractContractRow(content, 'Entry point');

  for (const codePath of extractInlineCode(entryPointValue)) {
    const fullPath = codePath.startsWith('packages/')
      ? path.join(REPO_ROOT, codePath)
      : path.join(packageDir, codePath);

    if (!existsSync(fullPath)) {
      details.push(`Documented entry point does not exist: "${codePath}".`);
    }
  }

  return details;
}

function validateScriptCommand(command, packageDir, packageLabel) {
  const details = [];
  const segments = command.split('&&').map((segment) => segment.trim()).filter(Boolean);
  let currentDir = packageDir;

  for (const segment of segments) {
    const cdMatch = segment.match(/^cd\s+(.+)$/);
    if (cdMatch) {
      const target = cdMatch[1].trim();
      currentDir = path.isAbsolute(target)
        ? target
        : path.resolve(REPO_ROOT, target);
      continue;
    }

    const runMatch = segment.match(/^(pnpm|npm)\s+(.+)$/);
    if (!runMatch) {
      continue;
    }

    const tool = runMatch[1];
    const tokens = runMatch[2].split(/\s+/).filter(Boolean);
    let scriptName = null;
    let targetDir = currentDir;

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];

      if (token === '--filter' && tokens[i + 1]) {
        targetDir = resolvePackageDirFromFilter(tokens[i + 1]);
        i += 1;
        continue;
      }

      if (token.startsWith('--filter=')) {
        targetDir = resolvePackageDirFromFilter(token.slice('--filter='.length));
        continue;
      }

      if (token === 'run' && tokens[i + 1]) {
        scriptName = tokens[i + 1];
        break;
      }

      if (!token.startsWith('-') && !['exec', 'dlx'].includes(token)) {
        scriptName = token;
        break;
      }
    }

    if (!scriptName || scriptName === 'node' || scriptName === 'echo' || scriptName === 'curl') {
      continue;
    }

    const packageJson = getPackageJsonAt(targetDir);
    if (!packageJson?.scripts || typeof packageJson.scripts[scriptName] !== 'string') {
      details.push(`Documented ${packageLabel} references missing script "${scriptName}" in ${normalizePath(path.relative(REPO_ROOT, targetDir)) || '.'}.`);
    }
  }

  return details;
}

function validateDocumentedCommands(relPath, content) {
  const details = [];
  const packageDir = path.dirname(path.join(REPO_ROOT, relPath));

  for (const field of ['Boot command', 'Smoke command']) {
    const value = extractContractRow(content, field);
    for (const command of extractInlineCode(value)) {
      details.push(...validateScriptCommand(command, packageDir, field.toLowerCase()));
    }
  }

  return details;
}

function routeExists(packageDir, routePath) {
  const routesDir = path.join(packageDir, 'src', 'routes');
  if (!existsSync(routesDir)) {
    return null;
  }

  const trimmed = routePath.replace(/\/+$/, '') || '/';
  const segments = trimmed === '/' ? [] : trimmed.slice(1).split('/').filter(Boolean);
  const routeDir = path.join(routesDir, ...segments);
  const routeFiles = [
    '+page.svelte',
    '+page.ts',
    '+page.server.ts',
    '+server.ts',
    '+layout.svelte',
    '+layout.ts',
  ];

  if (segments.length === 0) {
    return routeFiles.some((file) => existsSync(path.join(routesDir, file)));
  }

  if (!existsSync(routeDir)) {
    return false;
  }

  return routeFiles.some((file) => existsSync(path.join(routeDir, file)));
}

function validateUiValidationPaths(relPath, content) {
  const details = [];
  const packageDir = path.dirname(path.join(REPO_ROOT, relPath));
  const routesDir = path.join(packageDir, 'src', 'routes');

  if (!existsSync(routesDir)) {
    return details;
  }

  const value = extractContractRow(content, 'UI validation path');
  if (!value || value.toLowerCase().includes('none')) {
    return details;
  }

  const routePaths = extractInlineCode(value).filter((item) => item.startsWith('/'));
  for (const routePath of routePaths) {
    const exists = routeExists(packageDir, routePath);
    if (exists === false) {
      details.push(`Documented UI validation path does not map to a route in src/routes: "${routePath}".`);
    }
  }

  return details;
}

function validateTarget(relPath) {
  const fullPath = path.join(REPO_ROOT, relPath);
  const details = [];

  if (!existsSync(fullPath)) {
    details.push(`Missing target file: ${relPath}`);
    return { target: relPath, ok: false, details };
  }

  const content = readFileSync(fullPath, 'utf8');

  if (!content.includes('## Agent Legibility Contract')) {
    details.push('Missing "## Agent Legibility Contract" section.');
  }

  for (const field of REQUIRED_FIELDS) {
    if (!content.includes(`| ${field} |`)) {
      details.push(`Missing contract field row: "${field}".`);
    }
  }

  details.push(...validateEntryPoints(relPath, content));
  details.push(...validateDocumentedCommands(relPath, content));
  details.push(...validateUiValidationPaths(relPath, content));

  return {
    target: relPath,
    ok: details.length === 0,
    details,
  };
}

function printText(results) {
  const failed = results.filter((result) => !result.ok);

  if (failed.length === 0) {
    console.log(`Agent legibility check passed for ${results.length} target file(s).`);
    return;
  }

  console.error(`Agent legibility check failed for ${failed.length} of ${results.length} target file(s):`);
  for (const result of failed) {
    console.error(`- ${result.target}`);
    for (const detail of result.details) {
      console.error(`  - ${detail}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.targets.length === 0) {
    args.targets = discoverTargetsFromPackageMetadata();
  }
  const results = [
    ...args.targets.map(validateTarget),
    ...findMetadataDrift(),
    ...findPackageDirectiveDrift(),
    ...findPackageGuidanceDrift(),
  ];
  const passed = results.every((result) => result.ok);

  if (args.format === 'json') {
    console.log(JSON.stringify({
      audit: {
        command: 'agent:legibility:check',
        passed,
        target_count: results.length,
      },
      results,
    }, null, 2));
  } else {
    printText(results);
  }

  if (!passed) {
    process.exit(1);
  }
}

main();
