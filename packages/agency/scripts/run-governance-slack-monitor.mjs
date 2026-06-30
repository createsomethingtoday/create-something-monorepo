#!/usr/bin/env node

const DEFAULT_BASE_URL = 'https://createsomething.agency';
const MONITOR_PATH = '/api/governance/monitors/slack';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
	printHelp();
	process.exit(0);
}

const keyEnv = args.keyEnv ?? 'AGENCY_INTERNAL_API_KEY';
const key = args.key ?? process.env[keyEnv];
const targetUrl = resolveTargetUrl(args);

if (args.dryRun) {
	console.log(
		JSON.stringify(
			{
				target_url: targetUrl,
				key_env: keyEnv,
				key_configured: Boolean(key?.trim()),
				require_configured: Boolean(args.requireConfigured),
				mode: 'dry_run'
			},
			null,
			2
		)
	);
	process.exit(key?.trim() ? 0 : 1);
}

if (!key?.trim()) {
	console.error(`Missing governance write credential. Set ${keyEnv} or pass --key.`);
	process.exit(1);
}

const response = await fetch(targetUrl, {
	method: 'POST',
	headers: {
		authorization: `Bearer ${key.trim()}`,
		accept: 'application/json'
	}
});

const bodyText = await response.text();
const body = parseJson(bodyText);

if (args.json) {
	console.log(JSON.stringify({ ok: response.ok, status: response.status, body }, null, 2));
} else {
	console.log(`Governance Slack monitor ${response.ok ? 'completed' : 'failed'} (${response.status})`);
	if (typeof body === 'string') {
		console.log(body);
	} else {
		console.log(JSON.stringify(body, null, 2));
	}
}

if (!response.ok) {
	process.exit(1);
}

if (args.requireConfigured && isNotConfigured(body)) {
	const message =
		'Governance Slack monitor is deployed but not configured. Set SLACK_BOT_TOKEN and GOVERNANCE_SLACK_CHANNELS before scheduled production runs.';
	if (args.json) {
		console.error(message);
	} else {
		console.error(message);
	}
	process.exit(1);
}

function parseArgs(argv) {
	const parsed = {};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--help' || arg === '-h') {
			parsed.help = true;
		} else if (arg === '--') {
			continue;
		} else if (arg === '--dry-run') {
			parsed.dryRun = true;
		} else if (arg === '--json') {
			parsed.json = true;
		} else if (arg === '--require-configured') {
			parsed.requireConfigured = true;
		} else if (arg === '--url') {
			parsed.url = requireValue(argv, (index += 1), arg);
		} else if (arg === '--base-url') {
			parsed.baseUrl = requireValue(argv, (index += 1), arg);
		} else if (arg === '--key') {
			parsed.key = requireValue(argv, (index += 1), arg);
		} else if (arg === '--key-env') {
			parsed.keyEnv = requireValue(argv, (index += 1), arg);
		} else {
			throw new Error(`Unknown argument: ${arg}`);
		}
	}
	return parsed;
}

function requireValue(argv, index, flag) {
	const value = argv[index];
	if (!value || value.startsWith('--')) {
		throw new Error(`${flag} requires a value.`);
	}
	return value;
}

function resolveTargetUrl(args) {
	if (args.url) return args.url;
	const baseUrl = args.baseUrl ?? process.env.AGENCY_GOVERNANCE_BASE_URL ?? DEFAULT_BASE_URL;
	return new URL(MONITOR_PATH, withTrailingSlash(baseUrl)).toString();
}

function withTrailingSlash(value) {
	return value.endsWith('/') ? value : `${value}/`;
}

function parseJson(value) {
	if (!value.trim()) return null;
	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function isNotConfigured(body) {
	return Boolean(body && typeof body === 'object' && body.status === 'not_configured');
}

function printHelp() {
	console.log(`Run the .agency governance Slack monitor.

Usage:
  pnpm --filter @create-something/agency governance:slack-monitor -- [options]

Options:
  --url <url>        Full monitor endpoint URL.
  --base-url <url>   Base URL; defaults to AGENCY_GOVERNANCE_BASE_URL or ${DEFAULT_BASE_URL}.
  --key <value>      Governance write credential. Prefer environment variables.
  --key-env <name>   Environment variable containing the credential. Defaults to AGENCY_INTERNAL_API_KEY.
  --dry-run          Print target and credential presence without making a request.
  --json             Print a machine-readable response wrapper.
  --require-configured
                     Exit nonzero when the deployed monitor reports status: "not_configured".
  --help             Show this help text.
`);
}
