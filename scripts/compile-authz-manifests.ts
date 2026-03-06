import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getConstraintPolicy, listPolicyManifests } from '../packages/mcp-authz/src/index.ts';

function repoRoot(): string {
  return dirname(dirname(fileURLToPath(import.meta.url)));
}

function resolveCommitSha(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoRoot(),
      encoding: 'utf8',
    }).trim();
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  const root = repoRoot();
  const outputDir = join(root, 'docs', 'policies', 'generated');
  const polarDir = join(outputDir, 'polar');
  const fallbackDir = join(outputDir, 'fallback');
  await Promise.all([
    mkdir(outputDir, { recursive: true }),
    mkdir(polarDir, { recursive: true }),
    mkdir(fallbackDir, { recursive: true }),
  ]);

  const commitSha = resolveCommitSha();
  const generatedAt = new Date().toISOString();
  const manifests = listPolicyManifests().map((manifest) => ({
    ...manifest,
    commitSha,
  }));

  const bundle = {
    generatedAt,
    commitSha,
    policies: manifests.map((manifest) => ({
      manifest,
      policy: getConstraintPolicy(manifest.policyId),
    })),
  };

  await writeFile(
    join(outputDir, 'mcp-authz-manifests.v1.json'),
    `${JSON.stringify(bundle, null, 2)}\n`,
    'utf8',
  );

  await Promise.all(
    manifests.flatMap((manifest) => [
      writeFile(join(polarDir, `${manifest.policyId}.polar`), `${manifest.polar.trim()}\n`, 'utf8'),
      writeFile(
        join(fallbackDir, `${manifest.policyId}.json`),
        `${JSON.stringify(JSON.parse(manifest.fallbackIrJson), null, 2)}\n`,
        'utf8',
      ),
    ]),
  );

  console.log(`Compiled ${manifests.length} authz policy manifests to docs/policies/generated.`);
}

await main();
