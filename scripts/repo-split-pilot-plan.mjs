#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REGISTRY = 'config/repo-ownership-registry.generated.json';
const DEFAULT_JSON = 'config/repo-split-pilot-plan.generated.json';
const DEFAULT_MARKDOWN = 'docs/REPO_SPLIT_PILOT_PLAN.generated.md';

function parseArgs(argv) {
  const args = {
    root: ROOT,
    registry: null,
    outJson: null,
    outMarkdown: null,
    check: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      args.root = resolve(argv[i + 1]);
      i += 1;
    } else if (arg === '--registry' && argv[i + 1]) {
      args.registry = argv[i + 1];
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

  args.registry ??= join(args.root, DEFAULT_REGISTRY);
  args.outJson ??= join(args.root, DEFAULT_JSON);
  args.outMarkdown ??= join(args.root, DEFAULT_MARKDOWN);
  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/repo-split-pilot-plan.mjs [--check]

Builds a non-mutating pilot split/reconciliation plan from
${DEFAULT_REGISTRY}. The plan ranks candidates and records approval gates; it
does not create repos, push code, change deploy ownership, or publish packages.`);
}

function rel(root, path) {
  return relative(root, path).replaceAll('\\', '/');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true });
}

function relationshipSummary(surface) {
  const repos = surface.referencedRepositories ?? [];
  if (repos.length === 0) return 'none';
  return repos.join(', ');
}

function hasWorkspaceDeps(surface) {
  return (surface.workspaceDependencies ?? []).length > 0;
}

function hasDeployOrMarketplaceSignal(surface) {
  return (surface.externalReferences ?? []).some((reference) =>
    ['deploy-source', 'marketplace-config'].includes(reference.relationship),
  );
}

function hasSubtreeSignal(surface) {
  return surface.syncMode === 'subtree'
    || (surface.externalReferences ?? []).some((reference) => reference.relationship === 'subtree-sync');
}

function candidateKind(surface) {
  if (surface.ownership === 'mirrored' && hasSubtreeSignal(surface)) return 'sync-contract-hardening';
  if (surface.ownership === 'mirrored') return 'mirror-reconciliation';
  if (surface.ownership === 'standalone-reference') return 'authority-readback';
  if (surface.ownership === 'mixed') return 'ownership-disambiguation';
  if (surface.ownership === 'unclear') return 'metadata-hygiene';
  return 'defer';
}

function recommendation(surface) {
  if (surface.path === 'apps/marketplace-template-submission-cloud') {
    return {
      rank: 1,
      action: 'Pilot repo reconciliation',
      reason: 'Existing redundancy repo and app boundary make this the strongest first pilot, but deployment and Airtable/Webflow authority must remain gated.',
    };
  }

  if (surface.path === 'packages/agency/clients/outerfields') {
    return {
      rank: 2,
      action: 'Harden existing subtree sync contract',
      reason: 'Existing subtree workflow is proven prior art; improve registry/docs before changing sync direction.',
    };
  }

  if (surface.ownership === 'unclear') {
    return {
      rank: 50,
      action: 'Fix metadata before split planning',
      reason: 'Stale or incomplete repository metadata should be corrected before treating this as a split candidate.',
    };
  }

  if (surface.ownership === 'mixed') {
    return {
      rank: 30,
      action: 'Disambiguate ownership evidence',
      reason: 'Multiple repo signals exist; read back source authority before migration or cleanup.',
    };
  }

  if (surface.ownership === 'standalone-reference') {
    return {
      rank: 20,
      action: 'Read back standalone authority',
      reason: 'Standalone-looking evidence exists, but confidence is low until the referenced repository and deploy path are verified.',
    };
  }

  return {
    rank: 90,
    action: 'Defer',
    reason: 'No split-relevant ownership signal is currently strong enough.',
  };
}

function approvalGates(surface) {
  const gates = ['No repository creation, push, deletion, or transfer without explicit approval.'];
  if (hasDeployOrMarketplaceSignal(surface)) {
    gates.push('No deploy ownership, Webflow Cloud, Airtable, marketplace, or route changes without explicit approval and rollback notes.');
  }
  if (hasWorkspaceDeps(surface)) {
    gates.push('Resolve workspace dependencies through publish, vendor, or monorepo-retained contract before standalone extraction.');
  }
  if (surface.ownership === 'unclear' || surface.ownership === 'mixed') {
    gates.push('Verify authority from cited evidence before treating the surface as a split candidate.');
  }
  return gates;
}

function nextSteps(surface, kind) {
  if (surface.path === 'apps/marketplace-template-submission-cloud') {
    return [
      'Read back current standalone repo contents and default branch.',
      'Compare app path against standalone repo without modifying either side.',
      'Decide authority direction: monorepo authoritative, standalone authoritative, or mirror-only redundancy.',
      'Only after approval, create a scoped migration issue and branch.',
    ];
  }

  if (kind === 'sync-contract-hardening') {
    return [
      'Document source repo, target prefix, sync command, and PR review gate.',
      'Add freshness/check evidence if the current sync has no deterministic verifier.',
      'Keep subtree direction unchanged until an explicit authority decision exists.',
    ];
  }

  if (kind === 'metadata-hygiene') {
    return [
      'Confirm whether the referenced repository namespace is stale.',
      'Patch package metadata only after verifying current intended source repo.',
    ];
  }

  return [
    'Read the cited evidence paths.',
    'Verify whether referenced repos are authority, mirror, marketplace contract, historical report, or placeholder.',
    'Update the registry evidence before any split action.',
  ];
}

function candidateFromSurface(surface) {
  const kind = candidateKind(surface);
  const rec = recommendation(surface);
  return {
    surfacePath: surface.path,
    packageName: surface.name,
    ownership: surface.ownership,
    authorityConfidence: surface.authorityConfidence,
    relationshipType: kind,
    syncMode: surface.syncMode,
    referencedRepositories: surface.referencedRepositories ?? [],
    relationshipSummary: relationshipSummary(surface),
    workspaceDependencyCount: (surface.workspaceDependencies ?? []).length,
    action: rec.action,
    rank: rec.rank,
    reason: rec.reason,
    approvalGates: approvalGates(surface),
    nextSteps: nextSteps(surface, kind),
    cautions: surface.cautions ?? [],
  };
}

export function buildPilotPlan(registry) {
  const candidateOwnership = new Set(['mirrored', 'mixed', 'standalone-reference', 'unclear']);
  const candidates = registry.surfaces
    .filter((surface) => candidateOwnership.has(surface.ownership))
    .map(candidateFromSurface)
    .sort((a, b) => a.rank - b.rank || a.surfacePath.localeCompare(b.surfacePath));

  return {
    version: 1,
    generatedBy: 'scripts/repo-split-pilot-plan.mjs',
    sourceRegistry: DEFAULT_REGISTRY,
    summary: {
      registrySurfaceCount: registry.summary.totalSurfaces,
      candidateCount: candidates.length,
      recommendedPilot: candidates[0]?.surfacePath ?? null,
      approvalRequiredForMutation: true,
    },
    recommendedOrder: candidates.map((candidate) => candidate.surfacePath),
    candidates,
  };
}

export function renderMarkdown(plan) {
  const lines = [
    '# Repo Split Pilot Plan',
    '',
    '> Generated by `node scripts/repo-split-pilot-plan.mjs` from `config/repo-ownership-registry.generated.json`.',
    '> This is an advisory plan. It does not authorize repo creation, pushes, deploy ownership changes, package publication, or cleanup.',
    '',
    '## Summary',
    '',
    `- Registry surfaces: ${plan.summary.registrySurfaceCount}`,
    `- Split/reconciliation candidates: ${plan.summary.candidateCount}`,
    `- Recommended first pilot: ${plan.summary.recommendedPilot ? `\`${plan.summary.recommendedPilot}\`` : 'none'}`,
    '- Mutation approval required: yes',
    '',
    '## Recommended Order',
    '',
    '| Rank | Surface | Action | Evidence Relationship | Gates |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const candidate of plan.candidates) {
    lines.push(
      `| ${candidate.rank} | \`${candidate.surfacePath}\` | ${candidate.action} | ${candidate.relationshipType}; ${candidate.relationshipSummary} | ${candidate.approvalGates.join('<br>')} |`,
    );
  }

  lines.push('', '## Candidate Details', '');
  for (const candidate of plan.candidates) {
    lines.push(
      `### ${candidate.surfacePath}`,
      '',
      `- Ownership: \`${candidate.ownership}\` (${candidate.authorityConfidence} confidence)`,
      `- Sync mode: \`${candidate.syncMode}\``,
      `- Referenced repos: ${candidate.referencedRepositories.map((repo) => `\`${repo}\``).join(', ') || 'none'}`,
      `- Recommendation: ${candidate.action}`,
      `- Reason: ${candidate.reason}`,
      '',
      'Next steps:',
      ...candidate.nextSteps.map((step) => `- ${step}`),
      '',
    );
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

function compareFile(path, expected) {
  if (!existsSync(path)) return `${path} is missing`;
  if (readFileSync(path, 'utf8') !== expected) return `${path} is stale`;
  return null;
}

function main() {
  const args = parseArgs(process.argv);
  const registry = readJson(args.registry);
  const plan = buildPilotPlan(registry);
  const json = stableJson(plan);
  const markdown = renderMarkdown(plan);

  if (args.check) {
    const failures = [compareFile(args.outJson, json), compareFile(args.outMarkdown, markdown)].filter(Boolean);
    if (failures.length > 0) {
      console.error('Repo split pilot plan is stale.');
      for (const failure of failures) console.error(`- ${failure}`);
      console.error('Regenerate with: node scripts/repo-split-pilot-plan.mjs');
      process.exitCode = 1;
      return;
    }
    console.log(`Repo split pilot plan is current (${plan.summary.candidateCount} candidates).`);
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
