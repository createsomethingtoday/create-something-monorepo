#!/usr/bin/env node

const REQUIRED_ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';

function envPresent(name) {
  return Boolean(process.env[name]?.trim());
}

function groupPresent(names) {
  return names.some(envPresent);
}

function formatNames(names) {
  return names.join(' or ');
}

const checks = [
  {
    name: 'browser provider',
    ok:
      (process.env.BROWSER_RUN_ENABLED !== 'false'
        && envPresent('CLOUDFLARE_BROWSER_RUN_API_TOKEN'))
      || groupPresent(['STEEL_API_KEY', 'BROWSERLESS_TOKEN', 'BROWSERLESS_API_KEY']),
    required: 'CLOUDFLARE_BROWSER_RUN_API_TOKEN or an incumbent rollback provider token',
  },
  {
    name: 'MCP auth token',
    ok: groupPresent(['WEBFLOW_SITE_ANALYZER_MCP_API_KEY', 'MCP_API_KEY']),
    required: 'WEBFLOW_SITE_ANALYZER_MCP_API_KEY or MCP_API_KEY',
  },
  {
    name: 'Cloudflare API token',
    ok: groupPresent(['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_WORKERS_API_TOKEN']),
    required: 'CLOUDFLARE_API_TOKEN or CLOUDFLARE_WORKERS_API_TOKEN',
  },
];

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (accountId) {
  checks.push({
    name: 'Cloudflare account',
    ok: accountId === REQUIRED_ACCOUNT_ID,
    required: `CLOUDFLARE_ACCOUNT_ID=${REQUIRED_ACCOUNT_ID}`,
  });
}

const failures = checks.filter((check) => !check.ok);

for (const check of checks) {
  const status = check.ok ? 'ok' : 'missing';
  console.log(`${status}: ${check.name} (${check.required})`);
}

const aliases = [
  ['BROWSERLESS_TOKEN', 'BROWSERLESS_API_KEY'],
  ['WEBFLOW_LOCAL_MCP_API_KEY', 'WEBFLOW_SITE_ANALYZER_MCP_API_KEY', 'MCP_API_KEY'],
];

for (const names of aliases) {
  const available = names.filter(envPresent);
  if (available.length > 0) {
    console.log(`available alias group: ${formatNames(available)}`);
  }
}

if (failures.length > 0) {
  console.error(
    `remote deploy preflight failed: missing ${failures.map((failure) => failure.required).join('; ')}`,
  );
  process.exit(1);
}

console.log('remote deploy preflight complete');
