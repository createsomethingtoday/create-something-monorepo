#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_DISTRIBUTION_GOOSE_EXPORT_BASE_DIR,
  getDistributionArtifact,
  getDistributionGooseExportCommand,
  getDistributionGooseExportOutputDir,
  getDistributionGooseInstallActions,
  getDistributionGooseQuickstart,
  getRelatedDistributionArtifacts,
  summarizeDistributionArtifact,
  type DistributionCatalogEntry,
  type DistributionInstallAction,
  type DistributionGooseQuickstartStep,
} from './distribution.js';

type GooseBundleExportAsset = {
  source: string;
  destination: string;
  kind: 'file' | 'directory';
};

export type GooseBundleExportResult = {
  artifact: ReturnType<typeof summarizeDistributionArtifact>;
  outputDir: string;
  includeRelated: boolean;
  gooseQuickstart: DistributionGooseQuickstartStep[];
  bundleArtifacts: Array<{
    artifact: ReturnType<typeof summarizeDistributionArtifact>;
    gooseInstallActions: DistributionInstallAction[];
  }>;
  gooseInstallActions: DistributionInstallAction[];
  copiedAssets: GooseBundleExportAsset[];
  manifestPath: string;
  readmePath: string;
  rerunCommand: string;
};

type ParsedArgs = {
  artifactId: string | null;
  outputDir: string | null;
  includeRelated: boolean;
  json: boolean;
  help: boolean;
};

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, '../../..');

export async function exportGooseBundle(options: {
  artifactId: string;
  outputDir?: string;
  includeRelated?: boolean;
  repoRoot?: string;
}): Promise<GooseBundleExportResult> {
  const {
    artifactId,
    outputDir,
    includeRelated = true,
    repoRoot = DEFAULT_REPO_ROOT,
  } = options;

  const artifact = getDistributionArtifact(artifactId);

  if (!artifact) {
    throw new Error(`Unknown distribution artifact: ${artifactId}`);
  }

  const resolvedOutputDir = path.resolve(
    outputDir ?? path.resolve(repoRoot, getDistributionGooseExportOutputDir(artifact)),
  );
  const bundleArtifacts = includeRelated
    ? getRelatedDistributionArtifacts(artifact)
    : [];
  const gooseQuickstart = getDistributionGooseQuickstart(
    artifact,
    normalizePath(path.relative(repoRoot, path.dirname(resolvedOutputDir)) || '.'),
  );
  const entries = [artifact, ...bundleArtifacts];
  const copiedAssets = await copyLocalAssets(entries, repoRoot, resolvedOutputDir);
  const manifestPath = path.join(resolvedOutputDir, 'bundle-manifest.json');
  const readmePath = path.join(resolvedOutputDir, 'README.md');
  const rerunCommand = buildRerunCommand(artifact, resolvedOutputDir, repoRoot);

  await mkdir(resolvedOutputDir, { recursive: true });
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        outputDir: resolvedOutputDir,
        includeRelated,
        rerunCommand,
        artifact: summarizeDistributionArtifact(artifact),
        gooseInstallActions: getDistributionGooseInstallActions(artifact),
        gooseQuickstart,
        bundleArtifacts: bundleArtifacts.map((entry) => ({
          artifact: summarizeDistributionArtifact(entry),
          gooseInstallActions: getDistributionGooseInstallActions(entry),
        })),
        copiedAssets,
        verification: artifact.verification,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    readmePath,
    `${buildBundleReadme({
      artifact,
      outputDir: resolvedOutputDir,
      includeRelated,
      bundleArtifacts,
      copiedAssets,
      rerunCommand,
    })}\n`,
  );

  return {
    artifact: summarizeDistributionArtifact(artifact),
    outputDir: resolvedOutputDir,
    includeRelated,
    gooseQuickstart,
    gooseInstallActions: getDistributionGooseInstallActions(artifact),
    bundleArtifacts: bundleArtifacts.map((entry) => ({
      artifact: summarizeDistributionArtifact(entry),
      gooseInstallActions: getDistributionGooseInstallActions(entry),
    })),
    copiedAssets,
    manifestPath,
    readmePath,
    rerunCommand,
  };
}

async function copyLocalAssets(
  entries: readonly DistributionCatalogEntry[],
  repoRoot: string,
  outputDir: string,
): Promise<GooseBundleExportAsset[]> {
  const copiedAssets: GooseBundleExportAsset[] = [];
  const seen = new Set<string>();

  for (const assetPath of collectLocalAssetPaths(entries, repoRoot)) {
    if (seen.has(assetPath)) {
      continue;
    }

    seen.add(assetPath);

    const sourcePath = resolveRepoPath(repoRoot, assetPath);
    const sourceStat = await stat(sourcePath);
    const destinationPath = path.join(outputDir, assetPath);

    await mkdir(path.dirname(destinationPath), { recursive: true });
    await cp(sourcePath, destinationPath, {
      force: true,
      recursive: sourceStat.isDirectory(),
    });

    copiedAssets.push({
      source: assetPath,
      destination: normalizePath(path.relative(outputDir, destinationPath) || '.'),
      kind: sourceStat.isDirectory() ? 'directory' : 'file',
    });
  }

  return copiedAssets;
}

function collectLocalAssetPaths(
  entries: readonly DistributionCatalogEntry[],
  repoRoot: string,
): string[] {
  const localPaths = new Set<string>();

  for (const entry of entries) {
    for (const action of getDistributionGooseInstallActions(entry)) {
      const candidates = new Set<string>();

      if (isLocalActionPayload(action) && isLocalAssetCandidate(action.payload)) {
        candidates.add(action.payload);
      }

      for (const arg of action.args ?? []) {
        if (isLocalAssetCandidate(arg)) {
          candidates.add(arg);
        }
      }

      for (const candidate of candidates) {
        try {
          const resolvedPath = resolveRepoPath(repoRoot, candidate);
          if (!resolvedPath.startsWith(repoRoot) || !existsSync(resolvedPath)) {
            continue;
          }
          localPaths.add(normalizePath(path.relative(repoRoot, resolvedPath)));
        } catch {
          continue;
        }
      }
    }
  }

  return [...localPaths].sort((left, right) => left.localeCompare(right));
}

function buildBundleReadme(options: {
  artifact: DistributionCatalogEntry;
  outputDir: string;
  includeRelated: boolean;
  bundleArtifacts: readonly DistributionCatalogEntry[];
  copiedAssets: readonly GooseBundleExportAsset[];
  rerunCommand: string;
}): string {
  const {
    artifact,
    outputDir,
    includeRelated,
    bundleArtifacts,
    copiedAssets,
    rerunCommand,
  } = options;
  const artifactActions = getDistributionGooseInstallActions(artifact);
  const quickstart = getDistributionGooseQuickstart(
    artifact,
    normalizePath(path.relative(DEFAULT_REPO_ROOT, path.dirname(outputDir)) || '.'),
  );
  const actionPayloadMap = new Map(
    artifactActions.map((action) => [action.payload, formatActionPayload(action, outputDir)]),
  );
  const outputDirLabel = normalizePath(path.relative(DEFAULT_REPO_ROOT, outputDir) || '.');
  const lines = [
    `# ${artifact.title} Goose Test Bundle`,
    '',
    artifact.description,
    '',
    'This directory materializes the Goose-first packaging assets for local desktop testing.',
    '',
    '## Export',
    '',
    `- Output directory: \`${outputDirLabel}\``,
    `- Related artifacts included: ${includeRelated ? 'yes' : 'no'}`,
    `- Rebuild command: \`${rerunCommand}\``,
    '',
    '## Goose Quickstart',
    '',
    ...formatQuickstart(quickstart, actionPayloadMap),
    '',
    '## Primary Goose Actions',
    '',
    ...formatActionList(artifact.title, artifactActions, outputDir),
  ];

  if (bundleArtifacts.length > 0) {
    lines.push('', '## Included Related Artifacts', '');
    for (const entry of bundleArtifacts) {
      lines.push(`- **${entry.title}** (\`${entry.kind}\`)`);
    }
  }

  if (copiedAssets.length > 0) {
    lines.push('', '## Materialized Local Assets', '');
    for (const asset of copiedAssets) {
      lines.push(`- \`${asset.destination}\` (${asset.kind})`);
    }
  }

  lines.push(
    '',
    '## Verification',
    '',
    artifact.verification.summary,
    '',
  );

  for (const step of artifact.verification.steps) {
    const action = 'command' in step ? step.command : step.prompt;
    lines.push(`1. ${step.label}: ${action}`, `   Expected: ${step.expected}`);
  }

  if (bundleArtifacts.length > 0) {
    lines.push('', '## Related Artifact Actions', '');
    for (const entry of bundleArtifacts) {
      lines.push(
        ...formatActionList(entry.title, getDistributionGooseInstallActions(entry), outputDir),
        '',
      );
    }
  }

  return lines.join('\n');
}

function formatQuickstart(
  steps: readonly DistributionGooseQuickstartStep[],
  actionPayloadMap: ReadonlyMap<string, string>,
): string[] {
  const lines: string[] = [];

  for (const [index, step] of steps.entries()) {
    lines.push(
      `${index + 1}. **${step.title}**`,
      `   ${step.instruction}`,
      `   \`${actionPayloadMap.get(step.payload) ?? step.payload}\``,
    );
  }

  return lines;
}

function formatActionList(
  title: string,
  actions: readonly DistributionInstallAction[],
  outputDir: string,
): string[] {
  const lines = [`### ${title}`, ''];

  for (const action of actions) {
    lines.push(`- **${action.label}** (\`${action.type}\`)`);
    lines.push(`  \`${formatActionPayload(action, outputDir)}\``);
  }

  return lines;
}

function formatActionPayload(
  action: DistributionInstallAction,
  outputDir: string,
): string {
  if (action.command) {
    const args = (action.args ?? []).map((arg) => resolveBundleLocalArg(arg, outputDir));
    return [action.command, ...args].join(' ');
  }

  return resolveBundleLocalPayload(action, outputDir);
}

function resolveBundleLocalPayload(
  action: DistributionInstallAction,
  outputDir: string,
): string {
  if (isLocalActionPayload(action) && isLocalAssetCandidate(action.payload)) {
    const bundlePath = path.join(outputDir, action.payload);
    if (existsSync(bundlePath)) {
      return normalizePath(bundlePath);
    }
  }

  return action.payload;
}

function resolveBundleLocalArg(
  arg: string,
  outputDir: string,
): string {
  if (isLocalAssetCandidate(arg)) {
    const bundlePath = path.join(outputDir, arg);
    if (existsSync(bundlePath)) {
      return normalizePath(bundlePath);
    }
  }

  return arg;
}

function buildRerunCommand(
  artifact: DistributionCatalogEntry,
  outputDir: string,
  repoRoot: string,
): string {
  const relativeOutputDir = path.relative(repoRoot, outputDir);

  if (relativeOutputDir.length > 0 && !relativeOutputDir.startsWith('..')) {
    return getDistributionGooseExportCommand(artifact, path.dirname(relativeOutputDir));
  }

  return `pnpm distribution:goose:export -- --artifact ${artifact.id} --output ${normalizePath(outputDir)}`;
}

function resolveRepoPath(repoRoot: string, candidate: string): string {
  const resolvedPath = path.resolve(repoRoot, candidate);

  return resolvedPath;
}

function isLocalAssetCandidate(value: string): boolean {
  if (!value || value.startsWith('-') || value.startsWith('@')) {
    return false;
  }

  return !/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

function isLocalActionPayload(action: DistributionInstallAction): boolean {
  return (
    action.type === 'goose_bundle' ||
    action.type === 'goose_distro' ||
    action.type === 'persistent_instructions_file' ||
    action.type === 'prompt_template_file' ||
    action.type === 'adversary_rule_file'
  );
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    artifactId: null,
    outputDir: null,
    includeRelated: true,
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--':
        break;
      case '--artifact':
        parsed.artifactId = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--output':
        parsed.outputDir = argv[index + 1] ?? null;
        index += 1;
        break;
      case '--no-related':
        parsed.includeRelated = false;
        break;
      case '--json':
        parsed.json = true;
        break;
      case '--help':
      case '-h':
        parsed.help = true;
        break;
      default:
        if (!arg.startsWith('-') && !parsed.artifactId) {
          parsed.artifactId = arg;
          break;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  process.stdout.write(
    [
      'Usage: playbook-goose-export --artifact <artifact-id> [--output <dir>] [--no-related] [--json]',
      '',
      'Examples:',
      '  playbook-goose-export --artifact create-something-distro',
      '  playbook-goose-export --artifact ground-extension --output .goose-bundles/ground-extension',
      '  pnpm distribution:goose:export -- --artifact loom-extension --json',
      '',
    ].join('\n'),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.artifactId) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const artifact = getDistributionArtifact(args.artifactId);

  if (!artifact) {
    throw new Error(`Unknown distribution artifact: ${args.artifactId}`);
  }

  const outputDir = args.outputDir
    ? path.resolve(process.cwd(), args.outputDir)
    : path.resolve(DEFAULT_REPO_ROOT, getDistributionGooseExportOutputDir(artifact));
  const result = await exportGooseBundle({
    artifactId: args.artifactId,
    outputDir,
    includeRelated: args.includeRelated,
    repoRoot: DEFAULT_REPO_ROOT,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    [
      `Exported ${result.artifact.id} to ${result.outputDir}`,
      `Manifest: ${result.manifestPath}`,
      `README: ${result.readmePath}`,
      `Copied assets: ${result.copiedAssets.length}`,
      `Rerun: ${result.rerunCommand}`,
      '',
    ].join('\n'),
  );
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
