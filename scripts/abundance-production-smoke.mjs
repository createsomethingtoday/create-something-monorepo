#!/usr/bin/env node

const DEFAULT_DELIVERY_URL = 'https://createsomething.agency/delivery/abundance';
const DEFAULT_DELIVERY_ASK_URL = 'https://createsomething.agency/api/delivery/abundance/ask';
const DEFAULT_STAFF_MCP_URL = 'https://abundance-staff-mcp.createsomething.workers.dev/mcp';
const DEFAULT_JOBS_MCP_URL = 'https://abundance-jobs-mcp.createsomething.workers.dev/mcp';
const DEFAULT_HEALTHCARE_MCP_URL = 'https://abundance-healthcare-mcp.createsomething.workers.dev/mcp';
const DEFAULT_NPG_HUB_URL = 'https://abundance-thenpgroup.mcp.createsomething.agency/mcp';
const DEFAULT_NPG_HUB_HEALTH_URL = 'https://abundance-thenpgroup.mcp.createsomething.agency/health';
const DEFAULT_DIFY_BASE_URL = 'https://api.dify.ai/v1';
const MCP_PROTOCOL_VERSION = '2024-11-05';

const CORE_TIMEOUT_MS = 30_000;
const HUB_TIMEOUT_MS = 90_000;
const DIFY_TIMEOUT_MS = 90_000;

function parseArgs(argv) {
	const options = {
		allowSkips: false,
		includeSlowHubDiscovery: false,
		requireDify: false,
		verbose: false
	};

	for (const arg of argv) {
		if (arg === '--allow-skips') {
			options.allowSkips = true;
		} else if (arg === '--include-slow-hub-discovery') {
			options.includeSlowHubDiscovery = true;
		} else if (arg === '--require-dify') {
			options.requireDify = true;
		} else if (arg === '--verbose') {
			options.verbose = true;
		} else if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		} else {
			throw new Error(`Unknown flag: ${arg}`);
		}
	}

	return options;
}

function printHelp() {
	console.log(`Usage:
  pnpm abundance:smoke:prod [options]

Run with Infisical-injected production secrets, for example:
  infisical run --env=prod --path=/ --include-imports -- pnpm abundance:smoke:prod

Full smoke with split Abundance secrets:
  set -a
  source <(infisical export --format=dotenv --env=prod --path=/mcp-hub/hubs --include-imports=true)
  source <(infisical export --format=dotenv --env=prod --path=/dify/abundance-hub --include-imports=true)
  set +a
  infisical run --env=prod --path=/ --include-imports -- pnpm abundance:smoke:prod --require-dify

Options:
  --allow-skips                  Do not fail when optional credentials are missing
  --include-slow-hub-discovery   Include hub_search_proxy_tools checks that may take 70s+
  --require-dify                 Fail when DIFY_ABUNDANCE_HUB_API_KEY is missing
  --verbose                      Print sanitized response details
  --help                         Show this help
`);
}

function envFirst(names) {
	for (const name of names) {
		const value = process.env[name]?.trim();
		if (value) return { name, value };
	}
	return null;
}

function readUrl(name, fallback) {
	const value = process.env[name]?.trim();
	return value || fallback;
}

function makeResult(name, status, details, durationMs = 0) {
	return { name, status, details, durationMs };
}

function truncate(value, length = 500) {
	const text = typeof value === 'string' ? value : JSON.stringify(value);
	const safeText = text ?? String(value);
	return safeText.length > length ? `${safeText.slice(0, length)}...` : safeText;
}

async function runCheck(results, name, fn) {
	const start = Date.now();
	try {
		const details = await fn();
		results.push(makeResult(name, 'pass', details, Date.now() - start));
	} catch (error) {
		results.push(makeResult(name, 'fail', error instanceof Error ? error.message : String(error), Date.now() - start));
	}
}

function skip(results, name, details) {
	results.push(makeResult(name, 'skip', details));
}

async function fetchWithTimeout(url, init = {}, timeoutMs = CORE_TIMEOUT_MS) {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(timeoutMs)
	});
	return response;
}

async function readJsonOrText(response) {
	const text = await response.text();
	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function parseSseJson(text) {
	const events = [];
	for (const line of text.split(/\r?\n/)) {
		if (!line.startsWith('data:')) continue;
		const data = line.slice('data:'.length).trim();
		if (!data || data === '[DONE]') continue;
		try {
			events.push(JSON.parse(data));
		} catch {
			events.push({ raw: data });
		}
	}
	return events;
}

async function readRpcResponse(response) {
	const contentType = response.headers.get('content-type') || '';
	const text = await response.text();

	if (contentType.includes('text/event-stream')) {
		const events = parseSseJson(text);
		const rpcEvent = events.find((event) => event && typeof event === 'object' && ('result' in event || 'error' in event));
		return rpcEvent || events[0] || null;
	}

	if (!text) return null;
	return JSON.parse(text);
}

function assertOk(condition, message) {
	if (!condition) throw new Error(message);
}

function extractToolText(result) {
	const content = result?.result?.content;
	if (!Array.isArray(content)) return '';
	return content
		.filter((part) => part?.type === 'text' && typeof part.text === 'string')
		.map((part) => part.text)
		.join('\n');
}

function extractToolPayload(result) {
	if (result?.result?.structuredContent) return result.result.structuredContent;
	const text = extractToolText(result);
	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function findNestedField(value, names, depth = 0) {
	if (!value || typeof value !== 'object' || depth > 5) return undefined;

	for (const [key, nested] of Object.entries(value)) {
		if (names.includes(key)) return nested;
	}

	for (const nested of Object.values(value)) {
		const match = findNestedField(nested, names, depth + 1);
		if (match !== undefined) return match;
	}

	return undefined;
}

function summarizeConnectionPayload(payload) {
	const connected = findNestedField(payload, ['connected', 'isConnected']);
	const active = findNestedField(payload, ['active', 'activeConnections', 'activeConnectionCount']);
	const pending = findNestedField(payload, ['pending', 'pendingConnections', 'pendingConnectionCount']);
	const connectionCount = findNestedField(payload, ['connectionCount', 'connectionsCount', 'totalConnections']);
	const statuses = findNestedField(payload, ['statuses', 'connectionStatuses']);
	const parts = [];

	if (connected !== undefined) parts.push(`connected=${connected}`);
	if (active !== undefined) parts.push(`active=${active}`);
	if (pending !== undefined) parts.push(`pending=${pending}`);
	if (connectionCount !== undefined) parts.push(`connections=${connectionCount}`);
	if (statuses !== undefined) parts.push(`statuses=${Array.isArray(statuses) ? statuses.join('|') : truncate(statuses, 80)}`);

	return parts.length > 0 ? parts.join('/') : 'status-returned';
}

async function mcpRequest({ url, token, sessionId, method, params, timeoutMs, id }) {
	const headers = {
		Accept: 'application/json, text/event-stream',
		'Content-Type': 'application/json',
		'MCP-Protocol-Version': MCP_PROTOCOL_VERSION
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	if (sessionId) {
		headers['mcp-session-id'] = sessionId;
	}

	const response = await fetchWithTimeout(
		url,
		{
			method: 'POST',
			headers,
			body: JSON.stringify({
				jsonrpc: '2.0',
				id,
				method,
				params
			})
		},
		timeoutMs
	);
	const body = await readRpcResponse(response);
	return {
		status: response.status,
		ok: response.ok,
		sessionId: response.headers.get('mcp-session-id') || response.headers.get('Mcp-Session-Id') || sessionId || null,
		body
	};
}

async function createMcpSession(url, token, timeoutMs) {
	const init = await mcpRequest({
		url,
		token,
		timeoutMs,
		id: `abundance-smoke-init-${Date.now()}`,
		method: 'initialize',
		params: {
			protocolVersion: MCP_PROTOCOL_VERSION,
			clientInfo: { name: 'abundance-production-smoke', version: '1.0.0' },
			capabilities: {}
		}
	});

	assertOk(init.ok, `initialize failed with HTTP ${init.status}`);
	assertOk(!init.body?.error, `initialize returned JSON-RPC error: ${truncate(init.body?.error)}`);

	return {
		url,
		token,
		sessionId: init.sessionId,
		timeoutMs
	};
}

async function callMcpTool(session, name, args = {}) {
	const call = await mcpRequest({
		url: session.url,
		token: session.token,
		sessionId: session.sessionId,
		timeoutMs: session.timeoutMs,
		id: `abundance-smoke-${name}-${Date.now()}`,
		method: 'tools/call',
		params: {
			name,
			arguments: args
		}
	});

	assertOk(call.ok, `${name} failed with HTTP ${call.status}`);
	assertOk(!call.body?.error, `${name} returned JSON-RPC error: ${truncate(call.body?.error)}`);
	return call.body;
}

async function listMcpTools(session) {
	const response = await mcpRequest({
		url: session.url,
		token: session.token,
		sessionId: session.sessionId,
		timeoutMs: session.timeoutMs,
		id: `abundance-smoke-tools-${Date.now()}`,
		method: 'tools/list',
		params: {}
	});
	assertOk(response.ok, `tools/list failed with HTTP ${response.status}`);
	assertOk(!response.body?.error, `tools/list returned JSON-RPC error: ${truncate(response.body?.error)}`);
	return response.body?.result?.tools ?? [];
}

async function smokeDeliveryPage() {
	const url = readUrl('ABUNDANCE_DELIVERY_URL', DEFAULT_DELIVERY_URL);
	const response = await fetchWithTimeout(url);
	const text = await response.text();
	assertOk(response.ok, `delivery page returned HTTP ${response.status}`);
	assertOk(/Abundance/i.test(text), 'delivery page did not include Abundance');
	assertOk(/NP Group|NPG/i.test(text), 'delivery page did not include NPG client context');
	return `HTTP ${response.status}; content includes Abundance and NPG`;
}

async function smokeDeliveryAsk() {
	const url = readUrl('ABUNDANCE_DELIVERY_ASK_URL', DEFAULT_DELIVERY_ASK_URL);
	const response = await fetchWithTimeout(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message: 'What is the current Abundance delivery status?' })
	});
	const body = await readJsonOrText(response);
	assertOk(response.ok, `delivery ask returned HTTP ${response.status}: ${truncate(body)}`);
	assertOk(typeof body?.answer === 'string' && /Abundance/i.test(body.answer), 'delivery ask did not return an Abundance-grounded answer');
	return `HTTP ${response.status}; intent=${body.intent?.id || 'unknown'}`;
}

async function smokeStaffMcp(token) {
	const url = readUrl('ABUNDANCE_STAFF_MCP_URL', DEFAULT_STAFF_MCP_URL);
	const session = await createMcpSession(url, token, CORE_TIMEOUT_MS);
	const result = await callMcpTool(session, 'abundance_staff_summarize_headcount', {});
	const payload = extractToolPayload(result);
	const serialized = JSON.stringify(payload);
	assertOk(/total|headcount|active/i.test(serialized), 'staff summary did not include headcount/status fields');
	return `summary returned ${truncate(serialized, 240)}`;
}

async function smokeJobsMcp(token) {
	const url = readUrl('ABUNDANCE_JOBS_MCP_URL', DEFAULT_JOBS_MCP_URL);
	const session = await createMcpSession(url, token, CORE_TIMEOUT_MS);
	const result = await callMcpTool(session, 'list_public_jobs', { limit: 1 });
	const payload = extractToolPayload(result);
	const serialized = JSON.stringify(payload);
	assertOk(/job|result|title|position/i.test(serialized), 'jobs MCP did not return a recognizable job payload');
	return `list_public_jobs returned ${truncate(serialized, 240)}`;
}

async function smokeHealthcareMcp(token) {
	const url = readUrl('ABUNDANCE_HEALTHCARE_MCP_URL', DEFAULT_HEALTHCARE_MCP_URL);
	const session = await createMcpSession(url, token, CORE_TIMEOUT_MS);
	const tools = await listMcpTools(session);
	const names = tools.map((tool) => tool.name);
	for (const name of ['list_healthcare_markets', 'get_healthcare_coverage', 'search_coverage_candidates', 'get_healthcare_practitioner']) {
		assertOk(names.includes(name), `healthcare MCP tools/list did not include ${name}`);
	}
	const result = await callMcpTool(session, 'get_healthcare_coverage', { market_id: 'npg-family-np-nationwide' });
	const payload = extractToolPayload(result);
	assertOk(Number(payload?.total ?? payload?.report?.provider_count) > 0, 'nationwide healthcare coverage returned no providers');
	assertOk(payload?.report?.source?.coverage_limit_reached === false, 'nationwide healthcare snapshot reported a source cap');
	assertOk(payload?.report?.direct_outreach_status === 'blocked', 'healthcare coverage did not fail closed on outreach');
	return `nationwide providers=${payload?.total ?? payload?.report?.provider_count}; tools=${names.length}`;
}

async function smokeNpgHub(token, includeSlowHubDiscovery) {
	const healthUrl = readUrl('ABUNDANCE_NPG_HUB_HEALTH_URL', DEFAULT_NPG_HUB_HEALTH_URL);
	const health = await fetchWithTimeout(healthUrl, { headers: { Authorization: `Bearer ${token}` } }, CORE_TIMEOUT_MS);
	assertOk(health.ok, `hub health returned HTTP ${health.status}`);

	const url = readUrl('ABUNDANCE_NPG_HUB_URL', DEFAULT_NPG_HUB_URL);
	const session = await createMcpSession(url, token, HUB_TIMEOUT_MS);
	const services = await callMcpTool(session, 'hub_list_services', {});
	const servicesText = JSON.stringify(extractToolPayload(services));
	for (const toolkit of ['jotform', 'mailchimp', 'whatsapp']) {
		assertOk(servicesText.toLowerCase().includes(toolkit), `hub_list_services did not include ${toolkit}`);
	}
	assertOk(servicesText.includes('abundance-healthcare-mcp'), 'hub_list_services did not include abundance-healthcare-mcp');

	const connectionStatuses = [];
	for (const toolkit of ['jotform', 'mailchimp', 'whatsapp']) {
		const proxyToolName = `composio-toolkit-${toolkit}__connection_status`;
		const status = await callMcpTool(session, 'hub_execute_proxy_tool', { proxyToolName, args: {} });
		connectionStatuses.push({ toolkit, payload: extractToolPayload(status) });
	}

	if (includeSlowHubDiscovery) {
		for (const toolkit of ['jotform', 'mailchimp', 'whatsapp']) {
			await callMcpTool(session, 'hub_search_proxy_tools', {
				serverName: `composio-toolkit-${toolkit}`,
				query: 'connection_status',
				limit: 5
			});
		}
	}

	const statusSummary = connectionStatuses
		.map(({ toolkit, payload }) => `${toolkit}:${summarizeConnectionPayload(payload)}`)
		.join(', ');
	return `health ok; services include Jotform/Mailchimp/WhatsApp/Healthcare; ${statusSummary}`;
}

async function smokeDify(apiKey) {
	const baseUrl = readUrl('DIFY_ABUNDANCE_HUB_BASE_URL', DEFAULT_DIFY_BASE_URL).replace(/\/$/, '');
	const response = await fetchWithTimeout(
		`${baseUrl}/chat-messages`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				inputs: {},
				query: 'Show one current public Abundance job and explain which tool you used.',
				response_mode: 'streaming',
				user: 'abundance-production-smoke'
			})
		},
		DIFY_TIMEOUT_MS
	);
	const text = await response.text();
	assertOk(response.ok, `Dify returned HTTP ${response.status}: ${truncate(text)}`);
	const events = parseSseJson(text);
	const eventNames = events.map((event) => event.event).filter(Boolean);
	assertOk(eventNames.includes('message_end'), `Dify stream did not include message_end; events=${eventNames.join(',')}`);
	assertOk(/list_public_jobs|search_public_jobs|get_job/i.test(text), 'Dify stream did not show Abundance jobs tool usage');
	return `events=${[...new Set(eventNames)].join(',')}`;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	const results = [];

	await runCheck(results, 'delivery page', smokeDeliveryPage);
	await runCheck(results, 'delivery ask endpoint', smokeDeliveryAsk);

	const staffToken = envFirst(['ABUNDANCE_STAFF_MCP_API_KEY', 'ABUNDANCE_STAFF_MCP_BEARER_TOKEN', 'ABUNDANCE_MCP_BEARER_TOKEN']);
	if (staffToken) {
		await runCheck(results, 'staff MCP headcount', () => smokeStaffMcp(staffToken.value));
	} else if (options.allowSkips) {
		skip(results, 'staff MCP headcount', 'missing ABUNDANCE_STAFF_MCP_API_KEY/ABUNDANCE_STAFF_MCP_BEARER_TOKEN/ABUNDANCE_MCP_BEARER_TOKEN');
	} else {
		results.push(makeResult('staff MCP headcount', 'fail', 'missing Staff MCP bearer token env'));
	}

	const jobsToken = envFirst(['ABUNDANCE_JOBS_MCP_API_KEY', 'ABUNDANCE_JOBS_MCP_BEARER_TOKEN', 'ABUNDANCE_MCP_BEARER_TOKEN']);
	if (jobsToken) {
		await runCheck(results, 'jobs MCP public listing', () => smokeJobsMcp(jobsToken.value));
	} else if (options.allowSkips) {
		skip(results, 'jobs MCP public listing', 'missing ABUNDANCE_JOBS_MCP_API_KEY/ABUNDANCE_JOBS_MCP_BEARER_TOKEN/ABUNDANCE_MCP_BEARER_TOKEN');
	} else {
		results.push(makeResult('jobs MCP public listing', 'fail', 'missing Jobs MCP bearer token env'));
	}

	const healthcareToken = envFirst(['ABUNDANCE_HEALTHCARE_MCP_API_KEY', 'ABUNDANCE_MCP_BEARER_TOKEN']);
	if (healthcareToken) {
		await runCheck(results, 'healthcare MCP nationwide coverage', () => smokeHealthcareMcp(healthcareToken.value));
	} else if (options.allowSkips) {
		skip(results, 'healthcare MCP nationwide coverage', 'missing ABUNDANCE_HEALTHCARE_MCP_API_KEY/ABUNDANCE_MCP_BEARER_TOKEN');
	} else {
		results.push(makeResult('healthcare MCP nationwide coverage', 'fail', 'missing Healthcare MCP bearer token env'));
	}

	const hubToken = envFirst(['CS_HUB_ABUNDANCE_THENPGROUP_API_TOKEN', 'CS_HUB_ABUNDANCE_NPG_API_TOKEN', 'HUB_API_TOKEN']);
	if (hubToken) {
		await runCheck(results, 'NPG scoped hub', () => smokeNpgHub(hubToken.value, options.includeSlowHubDiscovery));
	} else if (options.allowSkips) {
		skip(results, 'NPG scoped hub', 'missing CS_HUB_ABUNDANCE_THENPGROUP_API_TOKEN/CS_HUB_ABUNDANCE_NPG_API_TOKEN/HUB_API_TOKEN');
	} else {
		results.push(makeResult('NPG scoped hub', 'fail', 'missing NPG hub bearer token env'));
	}

	const difyKey = envFirst(['DIFY_ABUNDANCE_HUB_API_KEY']);
	if (difyKey) {
		await runCheck(results, 'Dify Abundance hub', () => smokeDify(difyKey.value));
	} else if (options.requireDify) {
		results.push(makeResult('Dify Abundance hub', 'fail', 'missing DIFY_ABUNDANCE_HUB_API_KEY'));
	} else {
		skip(results, 'Dify Abundance hub', 'DIFY_ABUNDANCE_HUB_API_KEY not provided; use --require-dify to make this mandatory');
	}

	for (const result of results) {
		const marker = result.status === 'pass' ? 'PASS' : result.status === 'skip' ? 'SKIP' : 'FAIL';
		const elapsed = result.durationMs ? ` (${result.durationMs}ms)` : '';
		console.log(`${marker} ${result.name}${elapsed}: ${result.details}`);
	}

	if (options.verbose) {
		console.log(JSON.stringify({ results }, null, 2));
	}

	const failures = results.filter((result) => result.status === 'fail');
	if (failures.length > 0) {
		process.exitCode = 1;
	}
}

main().catch((error) => {
	console.error(`FAIL abundance production smoke: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
});
