/**
 * wf-template-validate: creator CLI for the Webflow Way template validator.
 *
 *   login     OAuth 2.1 PKCE login to Webflow's remote MCP server; stores a token.
 *   logout    Deletes the stored token file.
 *   sites     Lists the sites the token can read (id and name) to find --site.
 *   validate  Runs the production validation worker's published-site checks and
 *             the GSAP crawl against a *.webflow.io site. With a stored token and
 *             --site, it also collects Designer data through the MCP server, runs
 *             the worker's Designer checks, and records the result with the worker
 *             (POST /app-validator/submit, oauth_site_access evidence) unless
 *             --no-record is set. Without Designer data nothing is recorded.
 */

import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { collectDesignerData, type CollectResult } from '../../spike/headless-collector/collect.ts';
import { applyDesignerEnhancements } from '../../spike/headless-collector/enhance.ts';
import type { EnhanceableResults } from '../../shared/designer-enhancements.ts';
import { McpClient, findArray } from './mcp/client.ts';
import { TOKEN_PATH, hasToken, loadToken, login, logout } from './mcp/login.ts';
import { runGsapCrawl, type GsapOutcome } from './gsap-client.ts';
import {
	DEFAULT_WORKER_BASE,
	PUBLISHED_SITE_CHECKS,
	WorkerError,
	buildSubmitPayload,
	discoverPageSlugs,
	normalizePublishedUrl,
	recordValidationResult,
	runValidation,
	type CategoryResult,
	type RecordOutcome,
	type ValidationIssue
} from './worker-client.ts';

const GATE_NOTE =
	'This run was not recorded, so the Marketplace submission form cannot use it. Run `wf-template-validate login`, then validate with --site <siteId> to record the result, or run the Template Validator app in the Designer.';
const RECORDED_NOTE =
	'This run was recorded with the worker. The Marketplace submission form decides whether it satisfies the submission gate.';
const NO_RECORD_NOTE =
	'This run was not recorded because --no-record was set, so the Marketplace submission form cannot use it.';
const GSAP_CATEGORY = 'Published-site crawl (GSAP worker)';

const USAGE = `Usage: wf-template-validate <command> [options]

Commands:
  login                        Sign in to Webflow through the MCP server (opens a browser consent page).
                               In the site picker, select only the template site you will submit.
  logout                       Delete the stored token file (${TOKEN_PATH}).
  sites [--json]               List the sites the stored token can read (id and name) to find --site.
  validate <https://<site>.webflow.io> [options]
                               Run the published-site checks and the GSAP crawl. With --site and a stored
                               token, also run the Designer checks through MCP and record the result.

Validate options:
  --site <siteId>              Site to read Designer data from. Turns on --designer-source mcp when a token exists.
  --page <pageId>              Page id for the style, variable, and component tools (default: first page).
  --designer-source mcp        Explicit form of the default above. Needs --site and a stored token.
  --no-record                  Collect Designer data and run the checks, but do not record the result.
  --checks <list>              Published-site checks to run: ${PUBLISHED_SITE_CHECKS.join(',')} (default: all).
  --worker <base-url>          Validation worker (default ${DEFAULT_WORKER_BASE}).
  --timeout <seconds>          Worker job timeout (default 480).
  --json                       Print machine-readable JSON.

Exit codes: 0 no blockers, 1 blockers found, 2 network, worker, login, or argument failure.`;

type Bucket = 'blocker' | 'warning' | 'info';
type Row = { category: string; issue: ValidationIssue; bucket: Bucket };

function bucketOf(issue: ValidationIssue): Bucket {
	if (issue.severity === 'error' || typeof issue.details?.policy === 'string') return 'blocker';
	return issue.severity === 'warning' ? 'warning' : 'info';
}

function howToFix(issue: ValidationIssue): string | undefined {
	const value = issue.details?.howToFix ?? issue.howToFix;
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function parseChecks(value: string | undefined): string[] {
	if (!value) return [...PUBLISHED_SITE_CHECKS];
	const requested = value.split(',').map((c) => c.trim().toLowerCase()).filter(Boolean);
	const allowed = new Set<string>(PUBLISHED_SITE_CHECKS);
	const bad = requested.filter((c) => !allowed.has(c));
	if (bad.length > 0 || requested.length === 0) {
		const extra = bad.includes('designer')
			? ' The designer check needs Designer data; run `wf-template-validate login`, then pass --site <siteId>, or run the Template Validator app.'
			: '';
		throw new Error(`Unknown or unsupported check(s): ${bad.join(', ') || '(none)'}. Allowed: ${PUBLISHED_SITE_CHECKS.join(', ')}.${extra}`);
	}
	return [...new Set(requested)];
}

const OPTIONS = {
	json: { type: 'boolean', default: false },
	checks: { type: 'string' },
	worker: { type: 'string', default: DEFAULT_WORKER_BASE },
	timeout: { type: 'string', default: '480' },
	'designer-source': { type: 'string' },
	site: { type: 'string' },
	page: { type: 'string' },
	'no-record': { type: 'boolean', default: false },
	help: { type: 'boolean', short: 'h', default: false }
} as const;

type Values = ReturnType<typeof parseArgs<{ args: string[]; allowPositionals: true; options: typeof OPTIONS }>>['values'];

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function main(argv: string[]): Promise<number> {
	let parsed;
	try {
		parsed = parseArgs({ args: argv, allowPositionals: true, options: OPTIONS });
	} catch (error) {
		console.error(`${errorText(error)}\n\n${USAGE}`);
		return 2;
	}
	const { values, positionals } = parsed;
	const [command, ...rest] = positionals;
	if (values.help || !command) {
		if (values.help) console.log(USAGE);
		else console.error(USAGE);
		return values.help ? 0 : 2;
	}
	switch (command) {
		case 'login':
			return runLogin();
		case 'logout':
			return runLogout();
		case 'sites':
			return runSites(values.json);
		case 'validate':
			if (!rest[0]) {
				console.error(`validate needs a published URL.\n\n${USAGE}`);
				return 2;
			}
			return runValidate(values, rest[0]);
		default:
			console.error(`Unknown command '${command}'.\n\n${USAGE}`);
			return 2;
	}
}

async function runLogin(): Promise<number> {
	try {
		await login();
		return 0;
	} catch (error) {
		console.error(`Login failed: ${errorText(error)}`);
		return 2;
	}
}

async function runLogout(): Promise<number> {
	const removed = await logout();
	console.log(removed ? `Deleted ${TOKEN_PATH}.` : `No token at ${TOKEN_PATH}; nothing to delete.`);
	return 0;
}

const MISSING_LOGIN = `No Webflow login found at ${TOKEN_PATH}. Run \`wf-template-validate login\` first.`;

async function connect(): Promise<McpClient> {
	const token = await loadToken();
	const client = new McpClient(token.server, token.access_token);
	await client.initialize();
	return client;
}

const newAgentId = () => `cli|webflow-template-validate|${randomBytes(3).toString('hex')}`;

async function runSites(json: boolean): Promise<number> {
	if (!(await hasToken())) {
		console.error(MISSING_LOGIN);
		return 2;
	}
	try {
		const client = await connect();
		const result = await client.callTool(
			'data_sites_tool',
			{ actions: [{ label: 'sites', list_sites: { detail: 'summary' } }] },
			{
				agentId: newAgentId(),
				context: 'A template validation command line client lists the authorized workspace sites so the creator can choose a template site to validate.'
			}
		);
		const sites = (findArray(result, 'id') ?? []).map((site) => ({
			id: String(site.id),
			name: String(site.displayName ?? site.name ?? ''),
			shortName: typeof site.shortName === 'string' ? site.shortName : undefined
		}));
		if (json) {
			console.log(JSON.stringify(sites, null, 2));
			return 0;
		}
		if (sites.length === 0) {
			console.log('No sites are authorized for this token. Run `wf-template-validate logout`, then `login`, and select your template site.');
			return 0;
		}
		console.log(`${sites.length} authorized site(s):`);
		for (const site of sites) console.log(`  ${site.id}  ${site.name}${site.shortName ? `  (${site.shortName}.webflow.io)` : ''}`);
		console.log('\nUse the id with: wf-template-validate validate https://<site>.webflow.io --site <id>');
		return 0;
	} catch (error) {
		console.error(`Listing sites failed: ${errorText(error)}`);
		return 2;
	}
}

async function runValidate(values: Values, rawUrl: string): Promise<number> {
	let siteUrl: string;
	let checks: string[];
	const timeoutSeconds = Number(values.timeout);
	let designerSource = values['designer-source'];
	try {
		siteUrl = normalizePublishedUrl(rawUrl);
		checks = parseChecks(values.checks);
		if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) throw new Error('--timeout must be a positive number of seconds.');
		if (designerSource !== undefined && designerSource !== 'mcp') throw new Error(`--designer-source must be 'mcp' (got '${designerSource}').`);
		if (designerSource === 'mcp' && !values.site) throw new Error('--designer-source mcp needs --site <siteId>. Run `wf-template-validate sites` to find it.');
		if (values.site && !(await hasToken())) {
			throw new Error(`${MISSING_LOGIN} --site needs a login to read Designer data. Omit --site to run the published-site checks only (not recorded).`);
		}
		// Default on: a stored token plus --site means Designer data through MCP.
		if (values.site) designerSource = 'mcp';
		if (designerSource !== 'mcp' && values.page) throw new Error('--page needs --site.');
		if (designerSource !== 'mcp' && values['no-record']) throw new Error('--no-record needs --site (nothing is recorded without it).');
	} catch (error) {
		console.error(`Error: ${errorText(error)}`);
		return 2;
	}
	const workerBase = values.worker!.replace(/\/+$/, '');
	const timeoutMs = timeoutSeconds * 1000;
	const log = (message: string) => console.error(`  ... ${message}`);

	let collected: CollectResult | undefined;
	if (designerSource === 'mcp') {
		try {
			collected = await collectFromMcp(values.site!, values.page, log);
		} catch (error) {
			const message = `MCP Designer data collection failed: ${error instanceof Error ? error.message : String(error)}`;
			if (values.json) console.log(JSON.stringify({ error: message, siteUrl }, null, 2));
			else console.error(`\n${message}`);
			return 2;
		}
		// Mirrors the extension's getSelectedChecks: 'designer' first, then the published-site checks.
		checks = ['designer', ...checks];
	}

	log(`Discovering pages on ${siteUrl}`);
	const discovery = await discoverPageSlugs(siteUrl);
	log(`Found ${discovery.slugs.length} page(s) via ${discovery.source}${discovery.truncated ? ' (truncated)' : ''}`);

	const gsapPromise = runGsapCrawl(siteUrl, timeoutMs);
	let outcome;
	try {
		outcome = await runValidation({
			siteUrl,
			pageSlugs: discovery.slugs,
			checks,
			workerBase,
			timeoutMs,
			designerData: collected?.designerData,
			onProgress: log
		});
	} catch (error) {
		const message = error instanceof WorkerError || error instanceof Error ? error.message : String(error);
		if (values.json) {
			console.log(JSON.stringify({ error: message, siteUrl }, null, 2));
		} else {
			console.error(`\nValidation worker failed: ${message}`);
		}
		return 2;
	}
	log('Waiting for GSAP crawl');
	const gsap = await gsapPromise;
	// Same client-side enhancements the extension applies (Style System, Page Structure, Variable Modes, summary totals).
	if (collected) applyDesignerEnhancements(outcome.result as unknown as EnhanceableResults, collected.designerData);

	const categories = outcome.result.categories ?? [];
	const rows: Row[] = categories.flatMap((cat) =>
		(cat.issues ?? []).map((issue) => ({ category: cat.category, issue, bucket: bucketOf(issue) }))
	);
	if (gsap.status === 'complete') {
		rows.push(...gsap.issues.map((issue) => ({ category: GSAP_CATEGORY, issue, bucket: bucketOf(issue) })));
	}
	const passed = categories.filter((c) => c.passed).length;
	const score = categories.length ? Math.round((passed / categories.length) * 100) : 0;
	const count = (bucket: Bucket) => rows.filter((r) => r.bucket === bucket).length;
	const summary = {
		siteUrl,
		mode: outcome.mode,
		jobId: outcome.jobId,
		correlationId: outcome.correlationId,
		asyncError: outcome.asyncError,
		pageDiscovery: discovery,
		checksRequested: checks,
		checksNotRun: checks.includes('designer') ? [] : ['designer'],
		designerSource: collected
			? { source: 'mcp', siteId: values.site, pageId: collected.pageId, siteInfo: collected.designerData.siteInfo, counts: collected.counts, notes: collected.notes }
			: null,
		score,
		passedCategories: passed,
		failedCategories: categories.length - passed,
		blockers: count('blocker'),
		warnings: count('warning'),
		info: count('info'),
		gsapCrawl:
			gsap.status === 'complete'
				? {
						status: 'complete',
						instanceId: gsap.instanceId,
						passed: gsap.passed,
						gsapDetected: gsap.gsapDetected,
						legacyIx2Detected: gsap.legacyIx2Detected,
						unicornStudioDetected: gsap.unicornStudioDetected,
						pageCount: gsap.pageCount,
						analyzedCount: gsap.analyzedCount
					}
				: gsap,
	};
	const exitCode = summary.blockers > 0 ? 1 : 0;

	let record: RecordOutcome | { skipped: string } | null = null;
	if (collected && !values['no-record']) {
		if (outcome.mode !== 'async') {
			record = { skipped: 'the /validate fallback does not run the Designer checks, so this result was not recorded' };
		} else {
			log('Recording the result with the worker (oauth_site_access evidence)');
			try {
				const token = await loadToken();
				record = await recordValidationResult({
					workerBase,
					siteId: values.site!,
					siteName: collected.designerData.siteInfo?.name,
					siteUrl,
					validationResults: buildSubmitPayload({ result: outcome.result, siteUrl, checks, pageSlugsCount: discovery.slugs.length }),
					accessToken: token.access_token
				});
			} catch (error) {
				record = { ok: false, evidenceVerified: false, error: `could not load the MCP token: ${error instanceof Error ? error.message : String(error)}` };
			}
		}
	}
	const recorded = Boolean(record && 'ok' in record && record.ok);
	const fullSummary = { ...summary, record, note: recorded ? RECORDED_NOTE : collected && values['no-record'] ? NO_RECORD_NOTE : GATE_NOTE };

	if (values.json) {
		console.log(JSON.stringify({ result: outcome.raw, gsapCrawl: gsap.status === 'complete' ? gsap.raw : null, summary: fullSummary }, null, 2));
		return exitCode;
	}

	printHuman({ siteUrl, outcome, discovery, checks, categories, gsap, rows, score, collected, note: fullSummary.note });
	if (record) console.log(formatRecordLine(record));
	return exitCode;
}

function formatRecordLine(record: RecordOutcome | { skipped: string }): string {
	if ('skipped' in record) return `Record: skipped (${record.skipped})`;
	if (!record.ok) {
		return `Record: failed${record.httpStatus ? ` (HTTP ${record.httpStatus})` : ''}: ${record.error ?? 'unknown error'}; correlationId ${record.correlationId ?? '?'}`;
	}
	const evidence = record.evidenceVerified
		? 'evidence verified'
		: 'evidence NOT recorded (the worker may not support oauth_site_access yet)';
	const tail = record.error ? `; ${record.error}` : '';
	return `Record: status ${record.status ?? '?'}, passed ${record.passed ?? '?'}, ${evidence}; correlationId ${record.correlationId}${tail}`;
}

async function collectFromMcp(siteId: string, pageId: string | undefined, log: (message: string) => void): Promise<CollectResult> {
	const client = await connect();
	const agentId = newAgentId();
	log(`Collecting Designer data via MCP for site ${siteId}`);
	const collected = await collectDesignerData({ client, siteId, pageId, agentId, onProgress: log });
	const c = collected.counts;
	log(`Collected ${c.styles} style(s), ${c.pages} page(s), ${c.variables} variable(s) in ${c.collections} collection(s), ${c.components} component(s)`);
	for (const note of collected.notes) log(`MCP note: ${note}`);
	return collected;
}

function printHuman(ctx: {
	siteUrl: string;
	outcome: Awaited<ReturnType<typeof runValidation>>;
	discovery: Awaited<ReturnType<typeof discoverPageSlugs>>;
	checks: string[];
	categories: CategoryResult[];
	gsap: GsapOutcome;
	rows: Row[];
	score: number;
	collected?: CollectResult;
	note: string;
}) {
	const { siteUrl, outcome, discovery, checks, categories, gsap, rows, score, collected, note } = ctx;
	const runsDesigner = checks.includes('designer');
	const publishedChecks = checks.filter((c) => c !== 'designer');
	const out: string[] = [];
	out.push('');
	out.push(`Webflow template validation: ${siteUrl}`);
	out.push(`Job: ${outcome.jobId ?? '(none)'}  mode: ${outcome.mode}${outcome.asyncError ? ` (async failed: ${outcome.asyncError})` : ''}`);
	out.push(`Pages: homepage + ${discovery.slugs.length} from ${discovery.source}${discovery.truncated ? ' (truncated to 50)' : ''}`);
	if (collected) {
		const c = collected.counts;
		out.push(
			`Designer data: MCP, site "${collected.designerData.siteInfo?.name ?? '?'}" (${collected.designerData.siteInfo?.id ?? '?'}), page ${collected.pageId}; ${c.styles} styles, ${c.pages} pages, ${c.variables} variables, ${c.components} components`
		);
	}
	out.push(
		runsDesigner
			? `Checks: designer, ${publishedChecks.join(', ')}, interactions, custom code.${outcome.mode === 'legacy' ? ' Designer categories missing: the /validate fallback does not run them.' : ''}`
			: `Checks: ${checks.join(', ')}, interactions, custom code. Not run: designer (needs Designer data).`
	);
	out.push('');
	out.push('Categories');
	const skipped = new Map([
		['Assets & Images', 'assets'],
		['Content & Accessibility', 'content']
	]);
	for (const cat of categories) {
		const errors = (cat.issues ?? []).filter((i) => i.severity === 'error').length;
		const warnings = (cat.issues ?? []).filter((i) => i.severity === 'warning').length;
		const flag = skipped.has(cat.category) && !checks.includes(skipped.get(cat.category)!) ? 'SKIP' : cat.passed ? 'PASS' : 'FAIL';
		out.push(`  ${flag}  ${cat.category.padEnd(36)} ${errors} error(s), ${warnings} warning(s)`);
	}
	if (gsap.status === 'complete') {
		const errors = gsap.issues.length;
		out.push(
			`  ${gsap.passed ? 'PASS' : 'FAIL'}  ${GSAP_CATEGORY.padEnd(36)} ${errors} error(s), 0 warning(s)  [${gsap.analyzedCount}/${gsap.pageCount} pages, GSAP ${gsap.gsapDetected ? 'detected' : 'not detected'}, IX2 ${gsap.legacyIx2Detected ? 'DETECTED' : 'not detected'}]`
		);
	} else {
		out.push(`  ----  ${GSAP_CATEGORY.padEnd(36)} unavailable: ${gsap.reason}`);
	}

	const sections: Array<[Bucket, string]> = [
		['blocker', 'Blockers'],
		['warning', 'Warnings'],
		['info', 'Info']
	];
	for (const [bucket, title] of sections) {
		const items = rows.filter((r) => r.bucket === bucket);
		out.push('');
		out.push(`${title} (${items.length})`);
		if (items.length === 0) out.push('  none');
		for (const { category, issue } of items) {
			const policy = typeof issue.details?.policy === 'string' ? ` [policy: ${issue.details.policy}]` : '';
			out.push(`  [${category}] ${issue.id}: ${issue.message}${policy}`);
			const fix = howToFix(issue);
			if (fix) out.push(`      Fix: ${fix}`);
		}
	}

	out.push('');
	out.push(`Score: ${score}% of worker categories passed (GSAP crawl not included in the score)`);
	out.push(note);
	console.log(out.join('\n'));
}

main(process.argv.slice(2)).then(
	(code) => process.exit(code),
	(error) => {
		console.error(`Unexpected error: ${error instanceof Error ? error.stack : String(error)}`);
		process.exit(2);
	}
);
