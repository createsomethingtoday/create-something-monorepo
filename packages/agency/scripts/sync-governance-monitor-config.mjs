#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	DEFAULT_CLOUDFLARE_ACCOUNT_ID,
	DEFAULT_CLOUDFLARE_PROJECT_NAME,
	DEFAULT_GITHUB_REPO,
	allSourceSecretNames,
	buildSyncPlan,
	parseInfisicalExportJson,
	readSecretRecordsFromEnv,
	redactSyncPlan
} from './lib/governance-monitor-config-sync.mjs';

const args = parseArgs(process.argv.slice(2));

if (args.help) {
	printHelp();
	process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const packageDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageDir, '..', '..');

const source = args.source ?? 'env';
const records = source === 'infisical' ? await readInfisicalSecrets(args) : readSecretRecordsFromEnv();
const plan = buildSyncPlan(records, {
	githubRepo: args.repo ?? DEFAULT_GITHUB_REPO,
	cloudflareProjectName: args.projectName ?? DEFAULT_CLOUDFLARE_PROJECT_NAME,
	cloudflareAccountId:
		args.cloudflareAccountId ?? process.env.CLOUDFLARE_ACCOUNT_ID ?? DEFAULT_CLOUDFLARE_ACCOUNT_ID
});
const redacted = redactSyncPlan(plan);
const dryRun = !args.apply;

if (args.json) {
	console.log(JSON.stringify({ mode: dryRun ? 'dry_run' : 'apply', source, ...redacted }, null, 2));
} else {
	printHuman({ source, dryRun, plan: redacted });
}

if (!plan.ok) {
	process.exit(1);
}

if (dryRun) {
	process.exit(0);
}

for (const step of plan.steps) {
	const value = records[step.stdinSecretName];
	await runSecretWrite(step, value);
	if (!args.json) {
		console.log(`Synced ${step.name} to ${step.target}.`);
	}
}

if (args.json) {
	console.log(JSON.stringify({ applied: true, synced: plan.steps.length }, null, 2));
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
		} else if (arg === '--apply') {
			parsed.apply = true;
		} else if (arg === '--dry-run') {
			parsed.apply = false;
		} else if (arg === '--source') {
			parsed.source = requireChoice(argv, (index += 1), arg, ['env', 'infisical']);
		} else if (arg === '--repo') {
			parsed.repo = requireValue(argv, (index += 1), arg);
		} else if (arg === '--project-name') {
			parsed.projectName = requireValue(argv, (index += 1), arg);
		} else if (arg === '--cloudflare-account-id') {
			parsed.cloudflareAccountId = requireValue(argv, (index += 1), arg);
		} else if (arg === '--infisical-env') {
			parsed.infisicalEnv = requireValue(argv, (index += 1), arg);
		} else if (arg === '--infisical-path') {
			parsed.infisicalPath = requireValue(argv, (index += 1), arg);
		} else if (arg === '--infisical-project-id') {
			parsed.infisicalProjectId = requireValue(argv, (index += 1), arg);
		} else if (arg === '--infisical-include-imports') {
			parsed.infisicalIncludeImports = requireValue(argv, (index += 1), arg);
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

function requireChoice(argv, index, flag, choices) {
	const value = requireValue(argv, index, flag);
	if (!choices.includes(value)) {
		throw new Error(`${flag} must be one of: ${choices.join(', ')}`);
	}
	return value;
}

async function readInfisicalSecrets(options) {
	const commandArgs = [
		'export',
		'--format=json',
		`--env=${options.infisicalEnv ?? process.env.INFISICAL_ENV ?? 'prod'}`,
		`--path=${options.infisicalPath ?? process.env.INFISICAL_PATH ?? '/'}`,
		`--include-imports=${options.infisicalIncludeImports ?? 'true'}`
	];
	if (options.infisicalProjectId ?? process.env.INFISICAL_PROJECT_ID) {
		commandArgs.push(`--projectId=${options.infisicalProjectId ?? process.env.INFISICAL_PROJECT_ID}`);
	}

	const result = await runCommand('infisical', commandArgs, { cwd: repoRoot });
	if (!result.ok) {
		throw new Error(`Unable to read Infisical secrets: ${result.stderr || result.error}`);
	}

	const exported = parseInfisicalExportJson(result.stdout);
	return Object.fromEntries(allSourceSecretNames().map((name) => [name, exported[name] ?? '']));
}

async function runSecretWrite(step, value) {
	const result = await runCommand(step.command, step.args, {
		cwd: repoRoot,
		env: { ...process.env, ...(step.env ?? {}) },
		input: `${value}\n`
	});
	if (!result.ok) {
		throw new Error(`Failed to sync ${step.name} to ${step.target}: ${result.stderr || result.error}`);
	}
}

function runCommand(command, commandArgs, options = {}) {
	return new Promise((resolve) => {
		const child = spawn(command, commandArgs, {
			cwd: options.cwd ?? repoRoot,
			env: options.env ?? process.env,
			stdio: ['pipe', 'pipe', 'pipe']
		});
		let stdout = '';
		let stderr = '';

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString();
		});
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString();
		});
		child.on('error', (error) => {
			resolve({ ok: false, stdout, stderr, error: error.message });
		});
		child.on('close', (code) => {
			resolve({ ok: code === 0, stdout, stderr, code });
		});

		if (options.input) {
			child.stdin.end(options.input);
		} else {
			child.stdin.end();
		}
	});
}

function printHuman({ source, dryRun, plan }) {
	console.log(`Governance monitor config sync: ${plan.ok ? 'ready' : 'not ready'}`);
	console.log(`Mode: ${dryRun ? 'dry run' : 'apply'}`);
	console.log(`Source: ${source}`);
	console.log('');
	for (const summary of plan.summaries) {
		console.log(`${summary.status.toUpperCase()} ${summary.name} (${summary.length} chars)`);
	}
	console.log('');
	if (!plan.ok) {
		console.log(
			`Missing required values: ${plan.required.missing.length ? plan.required.missing.join(', ') : 'none'}`
		);
		console.log(
			`Placeholder required values: ${
				plan.required.placeholder.length ? plan.required.placeholder.join(', ') : 'none'
			}`
		);
		return;
	}

	console.log(`Planned secret writes: ${plan.steps.length}`);
	for (const step of plan.steps) {
		console.log(`${step.target}: ${step.name} via ${step.command} ${step.args.join(' ')}`);
	}
}

function printHelp() {
	console.log(`Sync .agency governance monitor secrets without printing secret values.

The command defaults to dry-run mode. Pass --apply to write secrets. Secret values are
read from environment variables or Infisical and passed to gh/wrangler through stdin.

Usage:
  pnpm --filter @create-something/agency governance:sync-monitor-config -- [options]

Options:
  --source <env|infisical>             Secret source. Defaults to env.
  --apply                             Write secrets. Omit for dry-run validation.
  --dry-run                           Validate and print a redacted plan only.
  --json                              Print machine-readable redacted output.
  --repo <owner/name>                 GitHub repository. Defaults to ${DEFAULT_GITHUB_REPO}.
  --project-name <name>               Cloudflare Pages project. Defaults to ${DEFAULT_CLOUDFLARE_PROJECT_NAME}.
  --cloudflare-account-id <id>        Cloudflare account id. Defaults to Create Something.
  --infisical-env <name>              Infisical environment. Defaults to INFISICAL_ENV or prod.
  --infisical-path <path>             Infisical path. Defaults to INFISICAL_PATH or /.
  --infisical-project-id <id>         Infisical project id.
  --infisical-include-imports <bool>  Defaults to true.
  --help                              Show this help text.
`);
}
