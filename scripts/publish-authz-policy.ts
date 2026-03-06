import { Oso } from 'oso-cloud';

import { getPolicyManifest } from '../packages/mcp-authz/src/index.ts';

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
  const policyId = readFlag('--policy-id') ?? process.env.OSO_POLICY_ID;
  if (!policyId) {
    throw new Error('Missing policy id. Pass --policy-id <policy-id> or set OSO_POLICY_ID.');
  }

  const osoUrl = process.env.OSO_URL;
  const osoApiKey = process.env.OSO_API_KEY;
  if (!osoUrl || !osoApiKey) {
    throw new Error('Missing OSO_URL or OSO_API_KEY.');
  }

  const dryRun = parseBoolean(process.env.DRY_RUN) || process.argv.includes('--dry-run');
  const manifest = getPolicyManifest(policyId);

  if (dryRun) {
    console.log(`Dry run: would publish ${manifest.policyId} (${manifest.policyHash}) to ${osoUrl}`);
    return;
  }

  const fetchTimeoutRaw = process.env.OSO_FETCH_TIMEOUT_MS;
  const fetchTimeoutMillis = fetchTimeoutRaw ? Number.parseInt(fetchTimeoutRaw, 10) : undefined;
  const client = new Oso(osoUrl, osoApiKey, {
    fetchTimeoutMillis: Number.isFinite(fetchTimeoutMillis ?? NaN) ? fetchTimeoutMillis : undefined,
  });

  await client.policy(manifest.polar);
  console.log(`Published ${manifest.policyId} (${manifest.policyHash}) to ${osoUrl}`);
}

await main();
