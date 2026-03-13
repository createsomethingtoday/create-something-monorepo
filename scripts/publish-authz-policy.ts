import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { getPolicyManifest, listPolicyManifests } from '../packages/mcp-authz/src/index.ts';

const require = createRequire(import.meta.url);

async function loadOsoClient() {
  const osoEntry = require.resolve('oso-cloud', {
    paths: [join(process.cwd(), 'packages/policy-os-engine')],
  });
  return import(pathToFileURL(osoEntry).href);
}

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

async function main(): Promise<void> {
  const policyId = readFlag('--policy-id');

  const osoUrl = process.env.OSO_URL;
  const osoApiKey = process.env.OSO_API_KEY;
  if (!osoUrl || !osoApiKey) {
    throw new Error('Missing OSO_URL or OSO_API_KEY.');
  }

  const dryRun = parseBoolean(process.env.DRY_RUN) || process.argv.includes('--dry-run');
  const manifests = policyId
    ? [getPolicyManifest(policyId)]
    : listPolicyManifests().filter((manifest) => manifest.status === 'active');

  if (manifests.length === 0) {
    throw new Error('No active policy manifests found to publish.');
  }

  if (dryRun) {
    for (const manifest of manifests) {
      console.log(`Dry run: would publish ${manifest.policyId} (${manifest.policyHash}) to ${osoUrl}`);
    }
    return;
  }

  const fetchTimeoutRaw = process.env.OSO_FETCH_TIMEOUT_MS;
  const fetchTimeoutMillis = fetchTimeoutRaw ? Number.parseInt(fetchTimeoutRaw, 10) : undefined;
  const { Oso } = await loadOsoClient();
  const client = new Oso(osoUrl, osoApiKey, {
    fetchTimeoutMillis: Number.isFinite(fetchTimeoutMillis ?? NaN) ? fetchTimeoutMillis : undefined,
  });

  for (const manifest of manifests) {
    await client.policy(manifest.polar);
    console.log(`Published ${manifest.policyId} (${manifest.policyHash}) to ${osoUrl}`);
  }
}

await main();
