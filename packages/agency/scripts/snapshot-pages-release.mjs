import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const account = '9645bd52e640b8a4f40a3a55ff1dd75a';
const project = 'create-something-agency';
const output = process.argv[2];
if (!output || !process.env.CLOUDFLARE_API_TOKEN) throw new Error('Provide an output path and an injected Cloudflare API token');
const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${project}`, { headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` } });
const body = await response.json();
if (!response.ok || !body.success) throw new Error(`Pages project read failed: ${response.status}`);
const current = body.result;
const config = structuredClone(current.deployment_configs.production);
delete config.wrangler_config_hash;
config.env_vars = Object.fromEntries(Object.entries(config.env_vars ?? {}).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => [name, { type: value.type, fingerprint: createHash('sha256').update(String(value.value ?? '')).digest('hex') }]));
const snapshot = {
  account, project, capturedAt: new Date().toISOString(),
  deployment: { id: current.canonical_deployment?.id, url: current.canonical_deployment?.url, stage: current.canonical_deployment?.latest_stage, trigger: current.canonical_deployment?.deployment_trigger },
  domains: current.domains, productionBranch: current.production_branch,
  runtimeConfiguration: config
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify({ output, deployment: snapshot.deployment.id, environmentKeys: Object.keys(config.env_vars).length }));
