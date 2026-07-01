#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { validateGovernanceProductManifest } from './lib/governance-production-readiness.mjs';

const execFileAsync = promisify(execFile);

const DEFAULT_BASE_URL = 'https://createsomething.agency';
const DEFAULT_REPO = 'createsomethingtoday/create-something-monorepo';
const DEFAULT_PROJECT_NAME = 'create-something-agency';
const DEFAULT_DATABASE_NAME = 'create-something-db';
const DEFAULT_WORKFLOW_NAME = 'Agency Governance Slack Monitor';
const DEFAULT_ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';

const REQUIRED_ROUTES = [
	['/products/signal', 200],
	['/products/decision', 200],
	['/products/proof', 200],
	['/api/governance/products', 200],
	['/api/governance/signals', 200],
	['/api/governance/decisions', 200],
	['/api/governance/proofs', 200],
	['/admin/governance', 302]
];

const REQUIRED_TABLES = [
	'governance_connections',
	'governance_decisions',
	'governance_delivery_receipts',
	'governance_product_attachments',
	'governance_proofs',
	'governance_signals',
	'governance_source_cursors'
];

const args = parseArgs(process.argv.slice(2));

if (args.help) {
	printHelp();
	process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageDir, '..', '..');
const baseUrl = trimTrailingSlash(args.baseUrl ?? process.env.AGENCY_GOVERNANCE_BASE_URL ?? DEFAULT_BASE_URL);
const githubRepo = args.repo ?? DEFAULT_REPO;
const projectName = args.projectName ?? DEFAULT_PROJECT_NAME;
const databaseName = args.databaseName ?? DEFAULT_DATABASE_NAME;
const workflowName = args.workflowName ?? DEFAULT_WORKFLOW_NAME;
const cloudflareAccountId =
	args.cloudflareAccountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? DEFAULT_ACCOUNT_ID;

const checks = [];
let cloudflarePagesSecretNames = new Set();

await checkPublicRoutes();
await checkManifest();
await checkGraphApiAuthGate();
await checkConnectionApiAuthGate();
await checkReceiptApiAuthGate();
await checkMonitorAuthGate();
await checkMonitorReadinessAuthGate();
await checkGithubWorkflow();
await checkGithubSecrets();
await checkCloudflarePagesSecrets();
await checkCloudflarePagesVars();
await checkD1Migrations();
await checkD1Tables();

const summary = summarizeChecks(checks);
const result = {
	schema_version: 1,
	checked_at: new Date().toISOString(),
	base_url: baseUrl,
	github_repo: githubRepo,
	cloudflare_project: projectName,
	d1_database: databaseName,
	workflow_name: workflowName,
	ready: summary.fail === 0 && summary.unknown === 0,
	summary,
	checks
};

if (args.json) {
	console.log(JSON.stringify(result, null, 2));
} else {
	printHuman(result);
}

if (args.requireReady && !result.ready) {
	process.exit(1);
}

function parseArgs(argv) {
	const parsed = {};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === '--') {
			continue;
		} else if (arg === '--help' || arg === '-h') {
			parsed.help = true;
		} else if (arg === '--json') {
			parsed.json = true;
		} else if (arg === '--require-ready') {
			parsed.requireReady = true;
		} else if (arg === '--base-url') {
			parsed.baseUrl = requireValue(argv, (index += 1), arg);
		} else if (arg === '--repo') {
			parsed.repo = requireValue(argv, (index += 1), arg);
		} else if (arg === '--project-name') {
			parsed.projectName = requireValue(argv, (index += 1), arg);
		} else if (arg === '--database-name') {
			parsed.databaseName = requireValue(argv, (index += 1), arg);
		} else if (arg === '--workflow-name') {
			parsed.workflowName = requireValue(argv, (index += 1), arg);
		} else if (arg === '--cloudflare-account-id') {
			parsed.cloudflareAccountId = requireValue(argv, (index += 1), arg);
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

async function checkPublicRoutes() {
	const details = [];
	for (const [route, expectedStatus] of REQUIRED_ROUTES) {
		try {
			const response = await fetch(`${baseUrl}${route}`, { redirect: 'manual' });
			details.push({
				route,
				expected_status: expectedStatus,
				observed_status: response.status,
				location: response.headers.get('location') ?? undefined,
				ok: response.status === expectedStatus
			});
		} catch (error) {
			details.push({ route, expected_status: expectedStatus, error: errorMessage(error), ok: false });
		}
	}

	addCheck({
		id: 'public_routes',
		label: 'Public governance routes',
		status: details.every((detail) => detail.ok) ? 'pass' : 'fail',
		details
	});
}

async function checkManifest() {
	try {
		const response = await fetch(`${baseUrl}/api/governance/products`);
		const body = await response.json();
		const validation = validateGovernanceProductManifest(body);

		addCheck({
			id: 'composition_manifest',
			label: 'Governance composition manifest',
			status: response.ok && validation.ready ? 'pass' : 'fail',
			details: {
				http_status: response.status,
				...validation.details
			}
		});
	} catch (error) {
		addCheck({
			id: 'composition_manifest',
			label: 'Governance composition manifest',
			status: 'fail',
			details: { error: errorMessage(error) }
		});
	}
}

async function checkGraphApiAuthGate() {
	try {
		const response = await fetch(`${baseUrl}/api/governance/graph`, { redirect: 'manual' });
		const body = await safeText(response);
		addCheck({
			id: 'graph_api_auth_gate',
			label: 'Governance graph API auth gate',
			status: response.status === 401 ? 'pass' : 'fail',
			details: {
				expected_status: 401,
				observed_status: response.status,
				response_excerpt: body.slice(0, 160)
			}
		});
	} catch (error) {
		addCheck({
			id: 'graph_api_auth_gate',
			label: 'Governance graph API auth gate',
			status: 'fail',
			details: { error: errorMessage(error) }
		});
	}
}

async function checkConnectionApiAuthGate() {
	await checkCredentialedGetAuthGate({
		id: 'connections_api_auth_gate',
		label: 'Governance connections API auth gate',
		path: '/api/governance/connections'
	});
}

async function checkReceiptApiAuthGate() {
	await checkCredentialedGetAuthGate({
		id: 'receipts_api_auth_gate',
		label: 'Governance receipts API auth gate',
		path: '/api/governance/receipts'
	});
}

async function checkCredentialedGetAuthGate({ id, label, path: routePath }) {
	try {
		const response = await fetch(`${baseUrl}${routePath}`, { redirect: 'manual' });
		const body = await safeText(response);
		addCheck({
			id,
			label,
			status: response.status === 401 ? 'pass' : 'fail',
			details: {
				expected_status: 401,
				observed_status: response.status,
				response_excerpt: body.slice(0, 160)
			}
		});
	} catch (error) {
		addCheck({
			id,
			label,
			status: 'fail',
			details: { error: errorMessage(error) }
		});
	}
}

async function checkMonitorAuthGate() {
	try {
		const response = await fetch(`${baseUrl}/api/governance/monitors/slack`, {
			method: 'POST',
			redirect: 'manual'
		});
		const body = await safeText(response);
		addCheck({
			id: 'monitor_auth_gate',
			label: 'Slack monitor write auth gate',
			status: response.status === 401 ? 'pass' : 'fail',
			details: {
				expected_status: 401,
				observed_status: response.status,
				response_excerpt: body.slice(0, 160)
			}
		});
	} catch (error) {
		addCheck({
			id: 'monitor_auth_gate',
			label: 'Slack monitor write auth gate',
			status: 'fail',
			details: { error: errorMessage(error) }
		});
	}
}

async function checkMonitorReadinessAuthGate() {
	try {
		const response = await fetch(`${baseUrl}/api/governance/monitors/slack/readiness`, {
			redirect: 'manual'
		});
		const body = await safeText(response);
		addCheck({
			id: 'monitor_readiness_auth_gate',
			label: 'Slack monitor readiness auth gate',
			status: response.status === 401 ? 'pass' : 'fail',
			details: {
				expected_status: 401,
				observed_status: response.status,
				response_excerpt: body.slice(0, 160)
			}
		});
	} catch (error) {
		addCheck({
			id: 'monitor_readiness_auth_gate',
			label: 'Slack monitor readiness auth gate',
			status: 'fail',
			details: { error: errorMessage(error) }
		});
	}
}

async function checkGithubWorkflow() {
	const workflow = await runCommand('gh', ['workflow', 'list', '--repo', githubRepo], {
		label: 'GitHub workflow list'
	});
	if (!workflow.ok) {
		addCheck({
			id: 'github_workflow',
			label: 'Scheduled GitHub workflow',
			status: 'unknown',
			details: workflowDetails(workflow)
		});
		return;
	}

	const workflowLine = workflow.stdout
		.split('\n')
		.find((line) => line.toLowerCase().includes(workflowName.toLowerCase()));
	const active = Boolean(workflowLine && /\bactive\b/i.test(workflowLine));
	const runs = await runCommand(
		'gh',
		[
			'run',
			'list',
			'--repo',
			githubRepo,
			'--workflow',
			workflowName,
			'--limit',
			'5',
			'--json',
			'databaseId,status,conclusion,createdAt,event,headSha'
		],
		{ label: 'GitHub workflow runs' }
	);
	const recentRuns = parseJsonArray(runs.stdout);

	addCheck({
		id: 'github_workflow',
		label: 'Scheduled GitHub workflow',
		status: active ? 'pass' : 'fail',
		details: {
			active,
			workflow_line: workflowLine ?? null,
			recent_run_count: recentRuns.length,
			recent_runs: recentRuns.map((run) => ({
				id: run.databaseId,
				status: run.status,
				conclusion: run.conclusion,
				event: run.event,
				created_at: run.createdAt,
				head_sha: run.headSha
			})),
			recent_run_warning: recentRuns.length === 0 ? 'No scheduled/manual monitor runs recorded yet.' : null
		}
	});
}

async function checkGithubSecrets() {
	const command = await runCommand('gh', ['secret', 'list', '--repo', githubRepo], {
		label: 'GitHub secret list'
	});
	if (!command.ok) {
		addCheck({
			id: 'github_actions_secret',
			label: 'GitHub Actions monitor credential',
			status: 'unknown',
			details: workflowDetails(command)
		});
		return;
	}

	const names = parseListedNames(command.stdout);
	addCheck({
		id: 'github_actions_secret',
		label: 'GitHub Actions monitor credential',
		status: names.has('AGENCY_INTERNAL_API_KEY') ? 'pass' : 'fail',
		details: {
			required_secret: 'AGENCY_INTERNAL_API_KEY',
			configured: names.has('AGENCY_INTERNAL_API_KEY')
		}
	});
}

async function checkCloudflarePagesSecrets() {
	const command = await runWrangler(['pages', 'secret', 'list', '--project-name', projectName], {
		label: 'Cloudflare Pages secret list'
	});
	if (!command.ok) {
		addCheck({
			id: 'cloudflare_pages_secrets',
			label: 'Cloudflare Pages monitor secrets',
			status: 'unknown',
			details: workflowDetails(command)
		});
		return;
	}

	const names = parseCloudflareSecretNames(command.stdout);
	cloudflarePagesSecretNames = names;
	const requiredSecrets = ['AGENCY_INTERNAL_API_KEY', 'SLACK_BOT_TOKEN'];
	const missing = requiredSecrets.filter((name) => !names.has(name));
	addCheck({
		id: 'cloudflare_pages_secrets',
		label: 'Cloudflare Pages monitor secrets',
		status: missing.length === 0 ? 'pass' : 'fail',
		details: {
			required_secrets: requiredSecrets,
			configured: Object.fromEntries(requiredSecrets.map((name) => [name, names.has(name)])),
			missing
		}
	});
}

async function checkCloudflarePagesVars() {
	const tempDir = await mkdtemp(path.join(tmpdir(), 'agency-governance-readiness-'));
	try {
		const command = await runWrangler(
			['--cwd', tempDir, 'pages', 'download', 'config', projectName],
			{ label: 'Cloudflare Pages config download' }
		);
		if (!command.ok) {
			addCheck({
				id: 'cloudflare_pages_vars',
				label: 'Cloudflare Pages monitor vars',
				status: 'unknown',
				details: workflowDetails(command)
			});
			return;
		}

		const config = await readFile(path.join(tempDir, 'wrangler.toml'), 'utf8');
		const vars = parseTomlVarNames(config);
		const requiredBindings = ['GOVERNANCE_SLACK_CHANNELS'];
		const optionalVars = ['GOVERNANCE_SLACK_WORKSPACE_URL'];
		const missing = requiredBindings.filter(
			(name) => !vars.has(name) && !cloudflarePagesSecretNames.has(name)
		);

		addCheck({
			id: 'cloudflare_pages_vars',
			label: 'Cloudflare Pages monitor source config',
			status: missing.length === 0 ? 'pass' : 'fail',
			details: {
				required_bindings: requiredBindings,
				optional_vars: optionalVars,
				configured_as: Object.fromEntries(
					[...requiredBindings, ...optionalVars].map((name) => [
						name,
						{
							var: vars.has(name),
							secret: cloudflarePagesSecretNames.has(name)
						}
					])
				),
				missing
			}
		});
	} finally {
		await rm(tempDir, { recursive: true, force: true });
	}
}

async function checkD1Migrations() {
	const command = await runWrangler(
		[
			'd1',
			'migrations',
			'list',
			databaseName,
			'--remote',
			'--config',
			path.join(packageDir, 'wrangler.jsonc')
		],
		{ label: 'D1 migration list' }
	);
	if (!command.ok) {
		addCheck({
			id: 'd1_migrations',
			label: 'Remote D1 migrations',
			status: 'unknown',
			details: workflowDetails(command)
		});
		return;
	}

	addCheck({
		id: 'd1_migrations',
		label: 'Remote D1 migrations',
		status: /No migrations to apply/i.test(command.stdout) ? 'pass' : 'fail',
		details: {
			no_pending_migrations: /No migrations to apply/i.test(command.stdout),
			output_excerpt: compactText(command.stdout)
		}
	});
}

async function checkD1Tables() {
	const tableList = REQUIRED_TABLES.map((table) => `'${table}'`).join(', ');
	const command = await runWrangler(
		[
			'd1',
			'execute',
			databaseName,
			'--remote',
			'--command',
			`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (${tableList}) ORDER BY name;`
		],
		{ label: 'D1 table check' }
	);
	if (!command.ok) {
		addCheck({
			id: 'd1_tables',
			label: 'Remote D1 governance tables',
			status: 'unknown',
			details: workflowDetails(command)
		});
		return;
	}

	const payload = parseWranglerJson(command.stdout);
	const observed = new Set(
		(payload?.[0]?.results ?? []).map((row) => row.name).filter((name) => typeof name === 'string')
	);
	const missing = REQUIRED_TABLES.filter((table) => !observed.has(table));
	addCheck({
		id: 'd1_tables',
		label: 'Remote D1 governance tables',
		status: missing.length === 0 ? 'pass' : 'fail',
		details: {
			required_tables: REQUIRED_TABLES,
			observed_tables: [...observed],
			missing
		}
	});
}

async function runWrangler(args, options) {
	return runCommand('pnpm', ['exec', 'wrangler', ...args], {
		...options,
		cwd: repoRoot,
		env: {
			...process.env,
			CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId
		}
	});
}

async function runCommand(command, commandArgs, options = {}) {
	try {
		const { stdout, stderr } = await execFileAsync(command, commandArgs, {
			cwd: options.cwd ?? repoRoot,
			env: options.env ?? process.env,
			timeout: options.timeout ?? 30_000,
			maxBuffer: 1024 * 1024 * 5
		});
		return { ok: true, command, args: commandArgs, stdout, stderr };
	} catch (error) {
		return {
			ok: false,
			command,
			args: commandArgs,
			stdout: error?.stdout ?? '',
			stderr: error?.stderr ?? '',
			error: errorMessage(error),
			label: options.label
		};
	}
}

function addCheck(check) {
	checks.push(check);
}

function summarizeChecks(items) {
	return items.reduce(
		(summary, item) => {
			summary[item.status] += 1;
			return summary;
		},
		{ pass: 0, fail: 0, warn: 0, unknown: 0 }
	);
}

function parseListedNames(value) {
	return new Set(
		value
			.split('\n')
			.map((line) => line.trim().split(/\s+/)[0])
			.filter(Boolean)
	);
}

function parseCloudflareSecretNames(value) {
	const names = new Set();
	for (const line of value.split('\n')) {
		const match = line.match(/-\s+([A-Z0-9_]+):\s+Value Encrypted/);
		if (match) names.add(match[1]);
	}
	return names;
}

function parseTomlVarNames(value) {
	const names = new Set();
	let inVarsBlock = false;
	for (const rawLine of value.split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		if (line.startsWith('[')) {
			inVarsBlock = line === '[vars]' || line === '[env.production.vars]';
			continue;
		}
		if (!inVarsBlock) continue;
		const match = line.match(/^([A-Z0-9_]+)\s*=/);
		if (match) names.add(match[1]);
	}
	return names;
}

function parseJsonArray(value) {
	try {
		const parsed = JSON.parse(value || '[]');
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function parseWranglerJson(value) {
	const start = value.indexOf('[');
	const end = value.lastIndexOf(']');
	if (start === -1 || end === -1 || end < start) return null;
	try {
		return JSON.parse(value.slice(start, end + 1));
	} catch {
		return null;
	}
}

function workflowDetails(command) {
	return {
		command: [command.command, ...(command.args ?? [])].join(' '),
		error: command.error ?? null,
		stdout_excerpt: compactText(command.stdout ?? ''),
		stderr_excerpt: compactText(command.stderr ?? '')
	};
}

async function safeText(response) {
	try {
		return await response.text();
	} catch {
		return '';
	}
}

function compactText(value) {
	return value.replace(/\s+/g, ' ').trim().slice(0, 500);
}

function trimTrailingSlash(value) {
	return value.endsWith('/') ? value.slice(0, -1) : value;
}

function errorMessage(error) {
	return error instanceof Error ? error.message : String(error);
}

function printHuman(result) {
	console.log(`Governance production readiness: ${result.ready ? 'ready' : 'not ready'}`);
	console.log(
		`Checks: ${result.summary.pass} pass, ${result.summary.fail} fail, ${result.summary.warn} warn, ${result.summary.unknown} unknown`
	);
	console.log('');
	for (const check of result.checks) {
		console.log(`${check.status.toUpperCase()} ${check.label}`);
		if (check.status !== 'pass') {
			console.log(JSON.stringify(check.details, null, 2));
		}
	}
}

function printHelp() {
	console.log(`Check .agency governance production readiness without printing secret values.

Usage:
  pnpm --filter @create-something/agency governance:readiness -- [options]

Options:
  --base-url <url>                Production base URL. Defaults to ${DEFAULT_BASE_URL}.
  --repo <owner/name>             GitHub repository. Defaults to ${DEFAULT_REPO}.
  --project-name <name>           Cloudflare Pages project. Defaults to ${DEFAULT_PROJECT_NAME}.
  --database-name <name>          D1 database name. Defaults to ${DEFAULT_DATABASE_NAME}.
  --workflow-name <name>          GitHub workflow name. Defaults to ${DEFAULT_WORKFLOW_NAME}.
  --cloudflare-account-id <id>    Cloudflare account id. Defaults to Create Something.
  --json                          Print machine-readable JSON.
  --require-ready                 Exit nonzero if any required readiness check fails.
  --help                          Show this help text.
`);
}
