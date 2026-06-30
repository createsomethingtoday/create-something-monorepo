export const DEFAULT_GITHUB_REPO = 'createsomethingtoday/create-something-monorepo';
export const DEFAULT_CLOUDFLARE_PROJECT_NAME = 'create-something-agency';
export const DEFAULT_CLOUDFLARE_ACCOUNT_ID = '9645bd52e640b8a4f40a3a55ff1dd75a';

export const REQUIRED_SOURCE_SECRET_NAMES = [
	'AGENCY_INTERNAL_API_KEY',
	'SLACK_BOT_TOKEN',
	'GOVERNANCE_SLACK_CHANNELS'
];

export const OPTIONAL_SOURCE_SECRET_NAMES = ['GOVERNANCE_SLACK_WORKSPACE_URL'];

export const GITHUB_ACTIONS_SECRET_NAMES = ['AGENCY_INTERNAL_API_KEY'];

export const CLOUDFLARE_PAGES_SECRET_NAMES = [
	'AGENCY_INTERNAL_API_KEY',
	'SLACK_BOT_TOKEN',
	'GOVERNANCE_SLACK_CHANNELS',
	'GOVERNANCE_SLACK_WORKSPACE_URL'
];

const PLACEHOLDER_PATTERNS = [
	/^\*?not found\*?$/i,
	/^undefined$/i,
	/^null$/i,
	/^none$/i,
	/^n\/a$/i,
	/^na$/i,
	/^todo$/i,
	/^tbd$/i,
	/^placeholder$/i,
	/^dummy$/i,
	/^example$/i,
	/^test$/i,
	/^xoxb-test$/i,
	/^replace[-_\s]?me$/i,
	/^change[-_\s]?me$/i,
	/^your[-_\s].*$/i,
	/^<.*>$/,
	/^\.\.\.$/
];

export function isPlaceholderSecretValue(value) {
	const normalized = normalizeSecretValue(value);
	if (!normalized) return false;
	return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function normalizeSecretValue(value) {
	return typeof value === 'string' ? value.trim() : '';
}

export function readSecretRecordsFromEnv(env = process.env, names = allSourceSecretNames()) {
	return Object.fromEntries(names.map((name) => [name, normalizeSecretValue(env[name])]));
}

export function parseInfisicalExportJson(value) {
	const parsed = JSON.parse(value);

	if (Array.isArray(parsed)) {
		return Object.fromEntries(
			parsed
				.map((item) => [
					String(item.key ?? item.secretKey ?? item.name ?? ''),
					normalizeSecretValue(item.value ?? item.secretValue ?? item.secretValueHidden)
				])
				.filter(([name]) => Boolean(name))
		);
	}

	if (parsed && typeof parsed === 'object') {
		if (parsed.secrets && Array.isArray(parsed.secrets)) {
			return parseInfisicalExportJson(JSON.stringify(parsed.secrets));
		}

		return Object.fromEntries(
			Object.entries(parsed).map(([name, secretValue]) => [name, normalizeSecretValue(secretValue)])
		);
	}

	return {};
}

export function summarizeSecretRecords(records, names = allSourceSecretNames()) {
	return names.map((name) => summarizeSecretValue(name, records[name]));
}

export function summarizeSecretValue(name, value) {
	const normalized = normalizeSecretValue(value);
	const placeholder = isPlaceholderSecretValue(normalized);
	return {
		name,
		status: !normalized ? 'missing' : placeholder ? 'placeholder' : 'present',
		configured: Boolean(normalized) && !placeholder,
		placeholder,
		length: normalized.length
	};
}

export function validateRequiredSecrets(summaries, requiredNames = REQUIRED_SOURCE_SECRET_NAMES) {
	const byName = new Map(summaries.map((summary) => [summary.name, summary]));
	const missing = [];
	const placeholder = [];

	for (const name of requiredNames) {
		const summary = byName.get(name);
		if (!summary || summary.status === 'missing') {
			missing.push(name);
		} else if (summary.status === 'placeholder') {
			placeholder.push(name);
		}
	}

	return {
		ok: missing.length === 0 && placeholder.length === 0,
		missing,
		placeholder
	};
}

export function buildSyncPlan(records, options = {}) {
	const githubRepo = options.githubRepo ?? DEFAULT_GITHUB_REPO;
	const cloudflareProjectName = options.cloudflareProjectName ?? DEFAULT_CLOUDFLARE_PROJECT_NAME;
	const cloudflareAccountId = options.cloudflareAccountId ?? DEFAULT_CLOUDFLARE_ACCOUNT_ID;
	const summaries = summarizeSecretRecords(records);
	const required = validateRequiredSecrets(summaries);

	const steps = [];
	for (const name of GITHUB_ACTIONS_SECRET_NAMES) {
		if (isConfigured(records[name])) {
			steps.push({
				target: 'github_actions',
				name,
				command: 'gh',
				args: ['secret', 'set', name, '--repo', githubRepo],
				stdinSecretName: name
			});
		}
	}

	for (const name of CLOUDFLARE_PAGES_SECRET_NAMES) {
		if (isConfigured(records[name])) {
			steps.push({
				target: 'cloudflare_pages',
				name,
				command: 'pnpm',
				args: [
					'exec',
					'wrangler',
					'pages',
					'secret',
					'put',
					name,
					'--project-name',
					cloudflareProjectName
				],
				env: { CLOUDFLARE_ACCOUNT_ID: cloudflareAccountId },
				stdinSecretName: name
			});
		}
	}

	return {
		ok: required.ok,
		required,
		summaries,
		steps
	};
}

export function redactSyncPlan(plan) {
	return {
		ok: plan.ok,
		required: plan.required,
		summaries: plan.summaries,
		steps: plan.steps.map(({ target, name, command, args, stdinSecretName }) => ({
			target,
			name,
			command,
			args,
			stdin: stdinSecretName ? 'secret-value-from-stdin' : undefined
		}))
	};
}

export function allSourceSecretNames() {
	return [...REQUIRED_SOURCE_SECRET_NAMES, ...OPTIONAL_SOURCE_SECRET_NAMES];
}

function isConfigured(value) {
	const normalized = normalizeSecretValue(value);
	return Boolean(normalized) && !isPlaceholderSecretValue(normalized);
}
