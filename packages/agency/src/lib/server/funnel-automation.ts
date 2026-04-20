import {
	generateId,
	type FunnelAutomationDestination,
	type FunnelAutomationEvent,
	type FunnelAutomationStatus,
	type FunnelAutomationTrigger,
	type FunnelStage,
	type Lead
} from '$lib/funnel';
import { getComposioClient, type PlatformEnv } from './partner-auth';

interface FunnelAutomationEventRow
	extends Omit<FunnelAutomationEvent, 'request_payload' | 'response_payload'> {
	request_payload: string | null;
	response_payload: string | null;
}

interface ToolkitToolDef {
	slug: string;
	name: string;
	description: string;
	parameters: {
		type: 'object';
		properties: Record<string, unknown>;
		required?: string[];
	};
}

interface ResolvedToolkitRoute {
	slug: string;
	name: string;
	parameters: ToolkitToolDef['parameters'];
}

interface FunnelAutomationConfig {
	enabled: boolean;
	composioUserId: string | null;
	slack: {
		channel: string | null;
		connectedAccountId: string | null;
		toolSlug: string | null;
	};
	notion: {
		databaseId: string | null;
		connectedAccountId: string | null;
		getDatabaseToolSlug: string | null;
		createPageToolSlug: string | null;
		updatePageToolSlug: string | null;
	};
	gmail: {
		enabled: boolean;
		connectedAccountId: string | null;
		draftToolSlug: string | null;
	};
}

interface FunnelAutomationRunInput {
	db: D1Database;
	env: PlatformEnv;
	lead: Lead;
	previousLead?: Lead | null;
	trigger: FunnelAutomationTrigger;
	force?: boolean;
}

interface FunnelAutomationRunResult {
	enabled: boolean;
	configuredDestinations: FunnelAutomationDestination[];
	events: FunnelAutomationEvent[];
}

interface DispatchSuccess {
	status: Exclude<FunnelAutomationStatus, 'pending' | 'failed'>;
	summary: string;
	externalRef?: string | null;
	requestPayload?: Record<string, unknown> | null;
	responsePayload?: Record<string, unknown> | null;
}

interface NotionPropertySchema {
	id: string;
	name: string;
	type: string;
}

interface NotionDataSourceSchema {
	dataSourceId: string;
	title: string;
	properties: Record<string, NotionPropertySchema>;
}

type SupportedNotionFieldType =
	| 'title'
	| 'rich_text'
	| 'number'
	| 'select'
	| 'multi_select'
	| 'date'
	| 'checkbox'
	| 'url'
	| 'email'
	| 'phone_number'
	| 'status';

type ComparableNotionValue =
	| string
	| number
	| boolean
	| string[]
	| {
			start: string;
			end?: string | null;
			time_zone?: string | null;
	  }
	| null;

const SLACK_TOOLKIT = 'slack';
const NOTION_TOOLKIT = 'notion';
const GMAIL_TOOLKIT = 'gmail';
const NOTION_RICH_TEXT_LIMIT = 2_000;
const FUNNEL_AUTOMATION_BASE_URL = 'https://createsomething.agency';
const FUNNEL_AUTOMATION_BOOKING_URL = `${FUNNEL_AUTOMATION_BASE_URL}/book`;
const SUPPORTED_NOTION_FIELD_TYPES: readonly SupportedNotionFieldType[] = [
	'title',
	'rich_text',
	'number',
	'select',
	'multi_select',
	'date',
	'checkbox',
	'url',
	'email',
	'phone_number',
	'status'
];
const toolkitToolCache = new Map<string, Promise<ToolkitToolDef[]>>();

export function getFunnelAutomationConfig(env: PlatformEnv): FunnelAutomationConfig {
	return {
		enabled: parseBooleanFlag(env.FUNNEL_AUTOMATION_ENABLED),
		composioUserId: normalizeNullableString(env.FUNNEL_AUTOMATION_COMPOSIO_USER_ID),
		slack: {
			channel: normalizeNullableString(env.FUNNEL_AUTOMATION_SLACK_CHANNEL),
			connectedAccountId: normalizeNullableString(env.FUNNEL_AUTOMATION_SLACK_CONNECTED_ACCOUNT_ID),
			toolSlug: normalizeNullableString(env.FUNNEL_AUTOMATION_SLACK_TOOL_SLUG)
		},
		notion: {
			databaseId: normalizeNullableString(env.FUNNEL_AUTOMATION_NOTION_DATABASE_ID),
			connectedAccountId: normalizeNullableString(env.FUNNEL_AUTOMATION_NOTION_CONNECTED_ACCOUNT_ID),
			getDatabaseToolSlug: normalizeNullableString(env.FUNNEL_AUTOMATION_NOTION_GET_DATABASE_TOOL_SLUG),
			createPageToolSlug: normalizeNullableString(env.FUNNEL_AUTOMATION_NOTION_CREATE_PAGE_TOOL_SLUG),
			updatePageToolSlug: normalizeNullableString(env.FUNNEL_AUTOMATION_NOTION_UPDATE_PAGE_TOOL_SLUG)
		},
		gmail: {
			enabled: parseBooleanFlag(env.FUNNEL_AUTOMATION_GMAIL_ENABLED),
			connectedAccountId: normalizeNullableString(env.FUNNEL_AUTOMATION_GMAIL_CONNECTED_ACCOUNT_ID),
			draftToolSlug: normalizeNullableString(env.FUNNEL_AUTOMATION_GMAIL_DRAFT_TOOL_SLUG)
		}
	};
}

export async function listFunnelAutomationEventsByLead(
	db: D1Database,
	leadId: string,
	limit: number = 20
): Promise<FunnelAutomationEvent[]> {
	const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(limit, 100)) : 20;
	const rows = await db
		.prepare(
			`
				SELECT *
				FROM funnel_automation_events
				WHERE lead_id = ?
				ORDER BY created_at DESC
				LIMIT ?
			`
		)
		.bind(leadId, safeLimit)
		.all<FunnelAutomationEventRow>();

	return (rows.results ?? []).map(mapFunnelAutomationEvent);
}

export async function runFunnelLeadAutomation(
	input: FunnelAutomationRunInput
): Promise<FunnelAutomationRunResult> {
	const config = getFunnelAutomationConfig(input.env);
	const configuredDestinations = resolveConfiguredDestinations(config);

	if (!config.enabled || configuredDestinations.length === 0) {
		return {
			enabled: config.enabled,
			configuredDestinations,
			events: []
		};
	}

	if (
		input.trigger === 'stage_changed' &&
		!input.force &&
		input.previousLead &&
		input.previousLead.stage === input.lead.stage
	) {
		return {
			enabled: true,
			configuredDestinations,
			events: []
		};
	}

	const events: FunnelAutomationEvent[] = [];

	for (const destination of configuredDestinations) {
		events.push(
			await dispatchFunnelAutomationDestination({
				db: input.db,
				env: input.env,
				config,
				destination,
				lead: input.lead,
				previousLead: input.previousLead ?? null,
				trigger: input.trigger
			})
		);
	}

	return {
		enabled: true,
		configuredDestinations,
		events
	};
}

export async function getLatestSuccessfulFunnelAutomationExternalRef(
	db: D1Database,
	leadId: string,
	destination: FunnelAutomationDestination
): Promise<string | null> {
	const row = await db
		.prepare(
			`
				SELECT external_ref
				FROM funnel_automation_events
				WHERE lead_id = ?
				  AND destination = ?
				  AND status = 'succeeded'
				  AND external_ref IS NOT NULL
				ORDER BY created_at DESC
				LIMIT 1
			`
		)
		.bind(leadId, destination)
		.first<{ external_ref: string | null }>();

	return normalizeNullableString(row?.external_ref);
}

async function dispatchFunnelAutomationDestination(input: {
	db: D1Database;
	env: PlatformEnv;
	config: FunnelAutomationConfig;
	destination: FunnelAutomationDestination;
	lead: Lead;
	previousLead: Lead | null;
	trigger: FunnelAutomationTrigger;
}): Promise<FunnelAutomationEvent> {
	const pending = await createPendingAutomationEvent(input.db, {
		leadId: input.lead.id,
		trigger: input.trigger,
		destination: input.destination,
		stage: input.lead.stage
	});

	try {
		const composioUserId = input.config.composioUserId;
		if (!composioUserId) {
			return await finalizeAutomationEvent(input.db, pending.id, {
				status: 'skipped',
				summary: 'Automation skipped: FUNNEL_AUTOMATION_COMPOSIO_USER_ID is not configured.',
				errorMessage: 'FUNNEL_AUTOMATION_COMPOSIO_USER_ID is required for Composio-backed automation.'
			});
		}

		const result =
			input.destination === 'slack'
				? await sendSlackLeadAutomation({
						env: input.env,
						config: input.config,
						composioUserId,
						lead: input.lead,
						previousLead: input.previousLead,
						trigger: input.trigger
					})
				: input.destination === 'notion'
					? await syncNotionLeadAutomation({
							db: input.db,
							env: input.env,
							config: input.config,
							composioUserId,
							lead: input.lead,
							previousLead: input.previousLead,
							trigger: input.trigger
						})
					: await createGmailLeadDraftAutomation({
							env: input.env,
							config: input.config,
							composioUserId,
							lead: input.lead,
							previousLead: input.previousLead,
							trigger: input.trigger
						});

		return await finalizeAutomationEvent(input.db, pending.id, {
			status: result.status,
			summary: result.summary,
			externalRef: result.externalRef ?? null,
			requestPayload: result.requestPayload ?? null,
			responsePayload: result.responsePayload ?? null
		});
	} catch (error) {
		console.error('Funnel automation failed:', {
			leadId: input.lead.id,
			destination: input.destination,
			trigger: input.trigger,
			error
		});

		return await finalizeAutomationEvent(input.db, pending.id, {
			status: 'failed',
			summary: `${titleize(input.destination)} automation failed.`,
			errorMessage: error instanceof Error ? error.message : String(error)
		});
	}
}

async function sendSlackLeadAutomation(input: {
	env: PlatformEnv;
	config: FunnelAutomationConfig;
	composioUserId: string;
	lead: Lead;
	previousLead: Lead | null;
	trigger: FunnelAutomationTrigger;
}): Promise<DispatchSuccess> {
	const channel = input.config.slack.channel;
	if (!channel) {
		return {
			status: 'skipped',
			summary: 'Slack automation skipped: FUNNEL_AUTOMATION_SLACK_CHANNEL is not configured.'
		};
	}

	const route = await resolveSlackSendRoute(input.env, input.config);
	const text = buildSlackLeadMessage(input.lead, input.trigger, input.previousLead);
	const requestPayload = adaptSlackArgsForRoute(route, {
		channel,
		text
	});
	const responsePayload = await executeComposioTool(
		input.env,
		route.slug,
		requestPayload,
		input.composioUserId,
		input.config.slack.connectedAccountId ?? undefined
	);

	return {
		status: 'succeeded',
		summary: `Slack notification sent to ${channel}.`,
		externalRef: extractSlackExternalRef(responsePayload) ?? channel,
		requestPayload,
		responsePayload
	};
}

async function createGmailLeadDraftAutomation(input: {
	env: PlatformEnv;
	config: FunnelAutomationConfig;
	composioUserId: string;
	lead: Lead;
	previousLead: Lead | null;
	trigger: FunnelAutomationTrigger;
}): Promise<DispatchSuccess> {
	if (!input.config.gmail.enabled) {
		return {
			status: 'skipped',
			summary: 'Gmail automation skipped: FUNNEL_AUTOMATION_GMAIL_ENABLED is not configured.'
		};
	}

	const recipient = normalizeNullableString(input.lead.email);
	if (!recipient) {
		return {
			status: 'skipped',
			summary: 'Gmail automation skipped: lead email is not available.'
		};
	}

	if (!shouldCreateGmailDraft(input.lead, input.trigger)) {
		return {
			status: 'skipped',
			summary: `Gmail draft skipped until the lead reaches decision stage. Current stage: ${input.lead.stage}.`
		};
	}

	const route = await resolveGmailDraftRoute(input.env, input.config);
	const draft = buildGmailLeadDraft(input.lead, input.trigger, input.previousLead);
	const requestPayload = adaptGmailArgsForRoute(route, {
		to: recipient,
		subject: draft.subject,
		body: draft.body
	});
	const responsePayload = await executeComposioTool(
		input.env,
		route.slug,
		requestPayload,
		input.composioUserId,
		input.config.gmail.connectedAccountId ?? undefined
	);

	return {
		status: 'succeeded',
		summary: `Gmail draft prepared for ${recipient}.`,
		externalRef: extractGmailDraftId(responsePayload) ?? recipient,
		requestPayload,
		responsePayload
	};
}

async function syncNotionLeadAutomation(input: {
	db: D1Database;
	env: PlatformEnv;
	config: FunnelAutomationConfig;
	composioUserId: string;
	lead: Lead;
	previousLead: Lead | null;
	trigger: FunnelAutomationTrigger;
}): Promise<DispatchSuccess> {
	const databaseId = input.config.notion.databaseId;
	if (!databaseId) {
		return {
			status: 'skipped',
			summary: 'Notion automation skipped: FUNNEL_AUTOMATION_NOTION_DATABASE_ID is not configured.'
		};
	}

	const existingPageId = await getLatestSuccessfulFunnelAutomationExternalRef(
		input.db,
		input.lead.id,
		'notion'
	);
	const schema = await getNotionDataSourceSchema(
		input.env,
		input.config,
		databaseId,
		input.composioUserId
	);
	const properties = buildNotionLeadProperties(schema, input.lead);

	if (Object.keys(properties).length === 0) {
		throw new Error('Unable to map the target Notion database schema to funnel lead properties.');
	}

	if (existingPageId) {
		const route = await resolveNotionRoute(input.env, input.config, 'update_page');
		const requestPayload = adaptNotionArgsForRoute('update_page', route, {
			page_id: existingPageId,
			properties
		});
		const responsePayload = await executeComposioTool(
			input.env,
			route.slug,
			requestPayload,
			input.composioUserId,
			input.config.notion.connectedAccountId ?? undefined
		);
		const pageId = extractNotionPageId(responsePayload) ?? existingPageId;
		return {
			status: 'succeeded',
			summary: `Updated Notion page ${pageId}.`,
			externalRef: pageId,
			requestPayload,
			responsePayload
		};
	}

	const route = await resolveNotionRoute(input.env, input.config, 'create_page');
	const requestPayload = adaptNotionArgsForRoute('create_page', route, {
		data_source_id: databaseId,
		properties
	});
	const responsePayload = await executeComposioTool(
		input.env,
		route.slug,
		requestPayload,
		input.composioUserId,
		input.config.notion.connectedAccountId ?? undefined
	);
	const pageId = extractNotionPageId(responsePayload);

	if (!pageId) {
		throw new Error('Notion create_page response did not include a page id.');
	}

	return {
		status: 'succeeded',
		summary: `Created Notion page ${pageId}.`,
		externalRef: pageId,
		requestPayload,
		responsePayload
	};
}

async function getNotionDataSourceSchema(
	env: PlatformEnv,
	config: FunnelAutomationConfig,
	databaseId: string,
	userId: string
): Promise<NotionDataSourceSchema> {
	const route = await resolveNotionRoute(env, config, 'get_database');
	const requestPayload = adaptNotionArgsForRoute('get_database', route, {
		data_source_id: databaseId
	});
	const responsePayload = await executeComposioTool(
		env,
		route.slug,
		requestPayload,
		userId,
		config.notion.connectedAccountId ?? undefined
	);

	return normalizeNotionDataSourceSchema(responsePayload, databaseId);
}

async function createPendingAutomationEvent(
	db: D1Database,
	input: {
		leadId: string;
		trigger: FunnelAutomationTrigger;
		destination: FunnelAutomationDestination;
		stage: FunnelStage;
	}
): Promise<FunnelAutomationEvent> {
	const previous = await db
		.prepare(
			`
				SELECT attempt_count
				FROM funnel_automation_events
				WHERE lead_id = ?
				  AND destination = ?
				ORDER BY created_at DESC
				LIMIT 1
			`
		)
		.bind(input.leadId, input.destination)
		.first<{ attempt_count: number }>();

	const id = generateId('fae');
	const now = new Date().toISOString();
	const attemptCount = Number(previous?.attempt_count ?? 0) + 1;

	await db
		.prepare(
			`
				INSERT INTO funnel_automation_events (
					id, lead_id, trigger, destination, status, stage, attempt_count,
					started_at, created_at, updated_at
				) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
			`
		)
		.bind(id, input.leadId, input.trigger, input.destination, input.stage, attemptCount, now, now, now)
		.run();

	return {
		id,
		lead_id: input.leadId,
		trigger: input.trigger,
		destination: input.destination,
		status: 'pending',
		stage: input.stage,
		attempt_count: attemptCount,
		external_ref: null,
		summary: null,
		request_payload: null,
		response_payload: null,
		error_message: null,
		started_at: now,
		completed_at: null,
		created_at: now,
		updated_at: now
	};
}

async function finalizeAutomationEvent(
	db: D1Database,
	id: string,
	input: {
		status: Exclude<FunnelAutomationStatus, 'pending'>;
		summary: string;
		externalRef?: string | null;
		requestPayload?: Record<string, unknown> | null;
		responsePayload?: Record<string, unknown> | null;
		errorMessage?: string | null;
	}
): Promise<FunnelAutomationEvent> {
	const now = new Date().toISOString();

	await db
		.prepare(
			`
				UPDATE funnel_automation_events
				SET status = ?,
				    summary = ?,
				    external_ref = ?,
				    request_payload = ?,
				    response_payload = ?,
				    error_message = ?,
				    completed_at = ?,
				    updated_at = ?
				WHERE id = ?
			`
		)
		.bind(
			input.status,
			input.summary,
			input.externalRef ?? null,
			serializePayload(input.requestPayload),
			serializePayload(input.responsePayload),
			normalizeNullableString(input.errorMessage),
			now,
			now,
			id
		)
		.run();

	const row = await db
		.prepare('SELECT * FROM funnel_automation_events WHERE id = ?')
		.bind(id)
		.first<FunnelAutomationEventRow>();

	if (!row) {
		throw new Error(`Failed to reload funnel automation event ${id}`);
	}

	return mapFunnelAutomationEvent(row);
}

async function resolveSlackSendRoute(
	env: PlatformEnv,
	config: FunnelAutomationConfig
): Promise<ResolvedToolkitRoute> {
	if (config.slack.toolSlug) {
		return {
			slug: config.slack.toolSlug,
			name: config.slack.toolSlug,
			parameters: {
				type: 'object',
				properties: {}
			}
		};
	}

	return resolveToolkitRoute(env, SLACK_TOOLKIT, {
		preferredSlugs: ['SLACK_SEND_MESSAGE'],
		phrases: [
			['send', 'message'],
			['post', 'message']
		],
		requiredParams: ['channel', 'channel_id', 'conversation', 'conversation_id']
	});
}

async function resolveGmailDraftRoute(
	env: PlatformEnv,
	config: FunnelAutomationConfig
): Promise<ResolvedToolkitRoute> {
	if (config.gmail.draftToolSlug) {
		return {
			slug: config.gmail.draftToolSlug,
			name: config.gmail.draftToolSlug,
			parameters: {
				type: 'object',
				properties: {}
			}
		};
	}

	return resolveToolkitRoute(env, GMAIL_TOOLKIT, {
		preferredSlugs: ['GMAIL_CREATE_EMAIL_DRAFT', 'GMAIL_CREATE_DRAFT'],
		phrases: [
			['create', 'draft'],
			['draft', 'email']
		],
		requiredParams: ['to', 'recipient_email', 'recipient', 'subject', 'body', 'message']
	});
}

async function resolveNotionRoute(
	env: PlatformEnv,
	config: FunnelAutomationConfig,
	action: 'get_database' | 'create_page' | 'update_page'
): Promise<ResolvedToolkitRoute> {
	const explicit =
		action === 'get_database'
			? config.notion.getDatabaseToolSlug
			: action === 'create_page'
				? config.notion.createPageToolSlug
				: config.notion.updatePageToolSlug;

	if (explicit) {
		return {
			slug: explicit,
			name: explicit,
			parameters: {
				type: 'object',
				properties: {}
			}
		};
	}

	if (action === 'get_database') {
		return resolveToolkitRoute(env, NOTION_TOOLKIT, {
			preferredSlugs: ['NOTION_FETCH_DATABASE', 'NOTION_GET_DATABASE', 'NOTION_RETRIEVE_DATABASE'],
			phrases: [
				['retrieve', 'database'],
				['get', 'database'],
				['retrieve', 'data', 'source']
			],
			requiredParams: ['data_source_id', 'database_id', 'id']
		});
	}

	if (action === 'create_page') {
		return resolveToolkitRoute(env, NOTION_TOOLKIT, {
			preferredSlugs: ['NOTION_CREATE_NOTION_PAGE', 'NOTION_CREATE_PAGE'],
			phrases: [['create', 'page']],
			requiredParams: ['data_source_id', 'database_id', 'parent']
		});
	}

	return resolveToolkitRoute(env, NOTION_TOOLKIT, {
		preferredSlugs: ['NOTION_UPDATE_PAGE'],
		phrases: [['update', 'page']],
		requiredParams: ['page_id', 'id']
	});
}

async function resolveToolkitRoute(
	env: PlatformEnv,
	toolkit: string,
	input: {
		preferredSlugs: string[];
		phrases: string[][];
		requiredParams?: string[];
	}
): Promise<ResolvedToolkitRoute> {
	const tools = await listToolkitTools(env, toolkit);
	let bestMatch: { tool: ToolkitToolDef; score: number } | null = null;

	for (const tool of tools) {
		const haystack = `${tool.slug} ${tool.name} ${tool.description}`.toLowerCase();
		let score = 0;

		for (const phrase of input.phrases) {
			if (phrase.every((term) => haystack.includes(term))) {
				score = Math.max(score, phrase.length);
			}
		}

		if (input.requiredParams && !hasAnyParameter(tool.parameters, input.requiredParams)) {
			continue;
		}

		const preferenceIndex = input.preferredSlugs.indexOf(tool.slug);
		if (preferenceIndex >= 0) {
			score += (input.preferredSlugs.length - preferenceIndex) * 100;
		}

		if (score > 0 && (!bestMatch || score > bestMatch.score)) {
			bestMatch = { tool, score };
		}
	}

	if (!bestMatch) {
		throw new Error(`Unable to resolve a Composio route for toolkit "${toolkit}".`);
	}

	return {
		slug: bestMatch.tool.slug,
		name: bestMatch.tool.name,
		parameters: bestMatch.tool.parameters
	};
}

async function listToolkitTools(env: PlatformEnv, toolkit: string): Promise<ToolkitToolDef[]> {
	const cacheKey = `${env.COMPOSIO_API_KEY ?? ''}::${env.COMPOSIO_BASE_URL ?? ''}::${toolkit}`;
	const cached = toolkitToolCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const promise = loadToolkitTools(env, toolkit);
	toolkitToolCache.set(cacheKey, promise);

	try {
		return await promise;
	} catch (error) {
		toolkitToolCache.delete(cacheKey);
		throw error;
	}
}

async function loadToolkitTools(env: PlatformEnv, toolkit: string): Promise<ToolkitToolDef[]> {
	const composio = getComposioClient(env);
	const raw = await (
		composio.tools as unknown as {
			getRawComposioTools: (args: Record<string, unknown>) => Promise<unknown>;
		}
	).getRawComposioTools({
		toolkits: [toolkit],
		important: false,
		limit: 250
	});

	const items: unknown[] = Array.isArray(raw)
		? [...raw]
		: Array.isArray((raw as Record<string, unknown>)?.items)
			? [...((raw as Record<string, unknown>).items as unknown[])]
			: [];

	return items
		.filter((item): item is Record<string, unknown> => isPlainObject(item))
		.map((tool) => ({
			slug: String(tool.slug ?? tool.enum ?? ''),
			name: String(tool.name ?? tool.displayName ?? tool.slug ?? ''),
			description: String(tool.description ?? ''),
			parameters: normalizeToolkitParameters(tool.inputParameters ?? tool.parameters)
		}))
		.filter((tool) => tool.slug.length > 0);
}

async function executeComposioTool(
	env: PlatformEnv,
	toolSlug: string,
	args: Record<string, unknown>,
	userId: string,
	connectedAccountId?: string
): Promise<Record<string, unknown>> {
	const composio = getComposioClient(env);
	const result = await (
		composio.tools as unknown as {
			execute: (
				slug: string,
				input: {
					userId: string;
					arguments: Record<string, unknown>;
					dangerouslySkipVersionCheck: boolean;
					connectedAccountId?: string;
				}
			) => Promise<unknown>;
		}
	).execute(toolSlug, {
		userId,
		arguments: args,
		dangerouslySkipVersionCheck: true,
		...(connectedAccountId ? { connectedAccountId } : {})
	});

	if (isPlainObject(result)) {
		return result;
	}

	return {
		result
	};
}

function normalizeToolkitParameters(raw: unknown): ToolkitToolDef['parameters'] {
	if (!isPlainObject(raw)) {
		return {
			type: 'object',
			properties: {}
		};
	}

	const properties = isPlainObject(raw.properties) ? raw.properties : {};
	const required = Array.isArray(raw.required)
		? raw.required.filter((value): value is string => typeof value === 'string')
		: undefined;

	return {
		type: 'object',
		properties,
		...(required && required.length > 0 ? { required } : {})
	};
}

function adaptSlackArgsForRoute(
	route: ResolvedToolkitRoute,
	input: {
		channel: string;
		text: string;
	}
): Record<string, unknown> {
	const args: Record<string, unknown> = {};
	const properties = route.parameters.properties ?? {};

	if ('channel_id' in properties) {
		args.channel_id = input.channel;
	} else if ('conversation_id' in properties) {
		args.conversation_id = input.channel;
	} else if ('conversation' in properties) {
		args.conversation = input.channel;
	} else {
		args.channel = input.channel;
	}

	if ('message' in properties) {
		args.message = input.text;
	} else if ('content' in properties) {
		args.content = input.text;
	} else {
		args.text = input.text;
	}

	if ('mrkdwn' in properties) {
		args.mrkdwn = true;
	}

	return args;
}

function adaptGmailArgsForRoute(
	route: ResolvedToolkitRoute,
	input: {
		to: string;
		subject: string;
		body: string;
	}
): Record<string, unknown> {
	const args: Record<string, unknown> = {};
	const properties = route.parameters.properties ?? {};

	if ('recipient_email' in properties) {
		args.recipient_email = input.to;
	} else if ('recipient' in properties) {
		args.recipient = input.to;
	} else if ('to' in properties) {
		args.to = input.to;
	} else if ('email' in properties) {
		args.email = input.to;
	} else {
		args.to = input.to;
	}

	if ('subject' in properties) {
		args.subject = input.subject;
	} else if (Object.keys(properties).length === 0) {
		args.subject = input.subject;
	}

	if ('body' in properties) {
		args.body = input.body;
	} else if ('message' in properties) {
		args.message = input.body;
	} else if ('content' in properties) {
		args.content = input.body;
	} else if ('text' in properties) {
		args.text = input.body;
	} else {
		args.body = input.body;
	}

	return args;
}

function adaptNotionArgsForRoute(
	action: 'get_database' | 'create_page' | 'update_page',
	route: ResolvedToolkitRoute,
	rawArgs: Record<string, unknown>
): Record<string, unknown> {
	const args = { ...rawArgs };
	const properties = route.parameters.properties ?? {};

	if ('database_id' in properties && 'data_source_id' in args && !('database_id' in args)) {
		args.database_id = args.data_source_id;
	}
	if ('data_source_id' in properties && 'database_id' in args && !('data_source_id' in args)) {
		args.data_source_id = args.database_id;
	}
	if ('id' in properties && action === 'update_page' && 'page_id' in args && !('id' in args)) {
		args.id = args.page_id;
	}
	if ('id' in properties && action === 'get_database' && 'data_source_id' in args && !('id' in args)) {
		args.id = args.data_source_id;
	}

	return args;
}

function buildSlackLeadMessage(
	lead: Lead,
	trigger: FunnelAutomationTrigger,
	previousLead: Lead | null
): string {
	const header =
		trigger === 'lead_created'
			? ':inbox_tray: New funnel lead created'
			: trigger === 'manual'
				? ':arrows_counterclockwise: Funnel automation rerun'
				: ':twisted_rightwards_arrows: Funnel stage updated';

	const stageLine =
		trigger === 'stage_changed' && previousLead && previousLead.stage !== lead.stage
			? `*Stage:* ${previousLead.stage} -> ${lead.stage}`
			: `*Stage:* ${lead.stage}`;

	const lines = [
		header,
		`*Lead:* ${lead.name}`,
		`*Company:* ${lead.company ?? 'Not set'}`,
		stageLine,
		`*Source:* ${lead.source}`,
		lead.service_interest ? `*Service:* ${lead.service_interest}` : null,
		lead.estimated_value ? `*Estimated Value:* $${lead.estimated_value.toLocaleString('en-US')}` : null,
		lead.notes ? `*Notes:* ${truncateText(lead.notes, 350)}` : null,
		`*Review:* ${FUNNEL_AUTOMATION_BASE_URL}/admin/funnel/leads/${lead.id}`
	];

	return lines.filter(Boolean).join('\n');
}

export function buildGmailLeadDraft(
	lead: Lead,
	trigger: FunnelAutomationTrigger,
	previousLead: Lead | null
): { subject: string; body: string } {
	const subject = buildGmailLeadSubject(lead);
	const opening =
		lead.source === 'abundance'
			? buildAbundanceLeadEmailOpening(lead)
			: buildStandardLeadEmailOpening(lead, trigger, previousLead);
	const body = [
		'Hi,',
		'',
		opening,
		'',
		'We help teams operationalize high-friction workflows with governed AI systems, and I thought it might be useful to compare notes on what you are trying to move forward.',
		'',
		'Would a 20-minute workflow mapping session be useful? No pitch, just a concrete conversation about the bottlenecks and what a safe automation path would look like.',
		'',
		`${FUNNEL_AUTOMATION_BOOKING_URL}`,
		'',
		'Best,',
		'Micah'
	].join('\n');

	return { subject, body };
}

function buildNotionLeadProperties(
	schema: NotionDataSourceSchema,
	lead: Lead
): Record<string, unknown> {
	const entries: Array<{ field: string; type: SupportedNotionFieldType; value: ComparableNotionValue }> = [];

	const titleProperty = Object.values(schema.properties).find((property) => property.type === 'title');
	if (!titleProperty) {
		throw new Error('The configured Notion database does not expose a title property.');
	}

	entries.push({
		field: titleProperty.name,
		type: 'title',
		value: lead.name
	});

	pushMatchedNotionEntry(entries, schema, {
		candidates: ['company', 'employer', 'organization', 'client'],
		types: ['rich_text', 'title'],
		value: lead.company ?? null
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['stage', 'status', 'pipeline stage', 'lead stage'],
		types: ['status', 'select', 'rich_text'],
		value: lead.stage
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['source', 'lead source'],
		types: ['select', 'multi_select', 'rich_text'],
		value: lead.source
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['service interest', 'service', 'offering', 'workflow'],
		types: ['rich_text', 'select', 'multi_select'],
		value: lead.service_interest ?? null
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['estimated value', 'value', 'pipeline value', 'amount'],
		types: ['number'],
		value: lead.estimated_value ?? null
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['actual value', 'closed value', 'revenue'],
		types: ['number'],
		value: lead.actual_value ?? null
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['lead url', 'url', 'link'],
		types: ['url'],
		value: `${FUNNEL_AUTOMATION_BASE_URL}/admin/funnel/leads/${lead.id}`
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['last touch', 'updated at', 'updated', 'last activity'],
		types: ['date'],
		value: {
			start: lead.updated_at
		}
	});
	pushMatchedNotionEntry(entries, schema, {
		candidates: ['notes', 'details', 'summary', 'description'],
		types: ['rich_text'],
		value: buildNotionLeadNotes(lead)
	});

	return buildWritablePropertiesPayload(entries);
}

function buildNotionLeadNotes(lead: Lead): string {
	const parts = [
		`Lead ID: ${lead.id}`,
		`Source: ${lead.source}`,
		lead.company ? `Company: ${lead.company}` : null,
		lead.role ? `Role: ${lead.role}` : null,
		lead.service_interest ? `Service Interest: ${lead.service_interest}` : null,
		lead.notes ? `Notes: ${lead.notes}` : null,
		`Review URL: ${FUNNEL_AUTOMATION_BASE_URL}/admin/funnel/leads/${lead.id}`
	];

	return parts.filter(Boolean).join('\n');
}

function buildGmailLeadSubject(lead: Lead): string {
	if (lead.source === 'abundance') {
		if (lead.company) {
			return `Quick note on the ${lead.name} role at ${lead.company}`;
		}

		return `Quick note on the ${lead.name} role`;
	}

	if (lead.company) {
		return `Workflow mapping session for ${lead.company}`;
	}

	return `Quick follow-up on ${lead.name}`;
}

function buildAbundanceLeadEmailOpening(lead: Lead): string {
	const roleReference = lead.company ? `the ${lead.name} role at ${lead.company}` : `the ${lead.name} role`;

	return `I came across ${roleReference} and wanted to reach out directly. It looked like there might be a good fit between the workflow you are hiring around and the systems we build for governed AI execution.`;
}

function buildStandardLeadEmailOpening(
	lead: Lead,
	trigger: FunnelAutomationTrigger,
	previousLead: Lead | null
): string {
	if (trigger === 'stage_changed' && previousLead && previousLead.stage !== lead.stage) {
		return `Following up because this lead moved from ${previousLead.stage} to ${lead.stage}, and it felt like the right moment to suggest a direct conversation.`;
	}

	if (lead.company) {
		return `Reaching out because I think there may be a useful workflow conversation to have with ${lead.company}.`;
	}

	return `Reaching out because I think there may be a useful workflow conversation to have.`;
}

function pushMatchedNotionEntry(
	entries: Array<{ field: string; type: SupportedNotionFieldType; value: ComparableNotionValue }>,
	schema: NotionDataSourceSchema,
	input: {
		candidates: string[];
		types: SupportedNotionFieldType[];
		value: ComparableNotionValue;
	}
): void {
	if (
		input.value === null ||
		input.value === undefined ||
		(typeof input.value === 'string' && input.value.trim().length === 0) ||
		(Array.isArray(input.value) && input.value.length === 0)
	) {
		return;
	}

	const property = findMatchingNotionProperty(schema, input.candidates, input.types);
	if (!property) {
		return;
	}

	entries.push({
		field: property.name,
		type: property.type as SupportedNotionFieldType,
		value: property.type === 'multi_select' && typeof input.value === 'string' ? [input.value] : input.value
	});
}

function findMatchingNotionProperty(
	schema: NotionDataSourceSchema,
	candidates: string[],
	types: SupportedNotionFieldType[]
): NotionPropertySchema | null {
	const properties = Object.values(schema.properties).filter(
		(property): property is NotionPropertySchema & { type: SupportedNotionFieldType } =>
			isSupportedNotionFieldType(property.type) && types.includes(property.type as SupportedNotionFieldType)
	);

	for (const candidate of candidates) {
		const normalizedCandidate = normalizePropertyName(candidate);
		const exact = properties.find((property) => normalizePropertyName(property.name) === normalizedCandidate);
		if (exact) {
			return exact;
		}
	}

	for (const candidate of candidates) {
		const normalizedCandidate = normalizePropertyName(candidate);
		const partial = properties.find((property) =>
			normalizePropertyName(property.name).includes(normalizedCandidate)
		);
		if (partial) {
			return partial;
		}
	}

	return null;
}

function normalizeNotionDataSourceSchema(
	payload: Record<string, unknown>,
	requestedId: string
): NotionDataSourceSchema {
	const normalized = unwrapPayload(payload);
	const properties = isPlainObject(normalized.properties) ? normalized.properties : null;
	const schemaRecord: Record<string, NotionPropertySchema> = {};

	if (properties) {
		for (const [name, definition] of Object.entries(properties)) {
			if (!isPlainObject(definition)) {
				continue;
			}

			schemaRecord[name] = {
				id: readString(definition, ['id']) ?? name,
				name,
				type: inferNotionPropertyType(definition)
			};
		}
	}

	return {
		dataSourceId: readString(normalized, ['data_source_id', 'database_id', 'id']) ?? requestedId,
		title: normalizeNotionTitle(normalized.title),
		properties: schemaRecord
	};
}

function buildWritablePropertiesPayload(
	entries: Array<{ field: string; type: SupportedNotionFieldType; value: ComparableNotionValue }>
): Record<string, unknown> {
	const output: Record<string, unknown> = {};

	for (const entry of entries) {
		output[entry.field] = buildWritablePropertyValue(entry.type, entry.value);
	}

	return output;
}

function buildWritablePropertyValue(
	type: SupportedNotionFieldType,
	value: ComparableNotionValue
): Record<string, unknown> {
	switch (type) {
		case 'title':
			return { title: chunkRichText(typeof value === 'string' ? value : '') };
		case 'rich_text':
			return { rich_text: chunkRichText(typeof value === 'string' ? value : '') };
		case 'number':
			return { number: typeof value === 'number' ? value : null };
		case 'select':
			return {
				select: typeof value === 'string' && value ? { name: value } : null
			};
		case 'status':
			return {
				status: typeof value === 'string' && value ? { name: value } : null
			};
		case 'multi_select': {
			const values = Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
			return {
				multi_select: [...new Set(values)].map((name) => ({ name }))
			};
		}
		case 'date':
			return {
				date:
					value && typeof value === 'object' && 'start' in value && typeof value.start === 'string'
						? {
								start: value.start,
								...(value.end ? { end: value.end } : {}),
								...(value.time_zone ? { time_zone: value.time_zone } : {})
							}
						: null
			};
		case 'checkbox':
			return { checkbox: value === true };
		case 'url':
			return { url: typeof value === 'string' ? value : null };
		case 'email':
			return { email: typeof value === 'string' ? value : null };
		case 'phone_number':
			return { phone_number: typeof value === 'string' ? value : null };
		default:
			return {};
	}
}

function extractNotionPageId(payload: Record<string, unknown>): string | null {
	const normalized = unwrapPayload(payload);
	return readString(normalized, ['id', 'page_id']);
}

function extractSlackExternalRef(payload: Record<string, unknown>): string | null {
	const normalized = unwrapPayload(payload);
	return readString(normalized, ['permalink', 'message_ts', 'ts', 'id']);
}

function extractGmailDraftId(payload: Record<string, unknown>): string | null {
	const normalized = unwrapPayload(payload);
	return readString(normalized, ['draft_id', 'id', 'message_id', 'thread_id']);
}

function mapFunnelAutomationEvent(row: FunnelAutomationEventRow): FunnelAutomationEvent {
	return {
		...row,
		request_payload: safeJsonParseRecord(row.request_payload),
		response_payload: safeJsonParseRecord(row.response_payload)
	};
}

function safeJsonParseRecord(raw: string | null): Record<string, unknown> | null {
	if (!raw) {
		return null;
	}

	try {
		const parsed = JSON.parse(raw) as unknown;
		return isPlainObject(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function serializePayload(value: Record<string, unknown> | null | undefined): string | null {
	if (!value || Object.keys(value).length === 0) {
		return null;
	}

	return JSON.stringify(value);
}

function resolveConfiguredDestinations(config: FunnelAutomationConfig): FunnelAutomationDestination[] {
	const destinations: FunnelAutomationDestination[] = [];

	if (config.slack.channel) {
		destinations.push('slack');
	}
	if (config.notion.databaseId) {
		destinations.push('notion');
	}
	if (config.gmail.enabled) {
		destinations.push('gmail');
	}

	return destinations;
}

function shouldCreateGmailDraft(lead: Lead, trigger: FunnelAutomationTrigger): boolean {
	if (trigger === 'manual') {
		return lead.stage !== 'lost';
	}

	return lead.stage === 'decision';
}

function parseBooleanFlag(value: string | undefined): boolean {
	if (!value) {
		return false;
	}

	return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function normalizeNullableString(value: string | null | undefined): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const normalized = value.trim();
	return normalized ? normalized : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasAnyParameter(
	parameters: ToolkitToolDef['parameters'],
	keys: string[]
): boolean {
	return keys.some((key) => Object.prototype.hasOwnProperty.call(parameters.properties ?? {}, key));
}

function titleize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function truncateText(value: string, limit: number): string {
	if (value.length <= limit) {
		return value;
	}

	return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

function normalizePropertyName(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function isSupportedNotionFieldType(value: string): value is SupportedNotionFieldType {
	return (SUPPORTED_NOTION_FIELD_TYPES as readonly string[]).includes(value);
}

function normalizeNotionTitle(value: unknown): string {
	if (typeof value === 'string') {
		return value;
	}

	if (!Array.isArray(value)) {
		return '';
	}

	return value
		.map((entry) => {
			if (!isPlainObject(entry)) {
				return '';
			}

			if (typeof entry.plain_text === 'string') {
				return entry.plain_text;
			}

			const text = entry.text;
			return isPlainObject(text) && typeof text.content === 'string' ? text.content : '';
		})
		.join('');
}

function readString(object: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = object[key];
		if (typeof value === 'string' && value.length > 0) {
			return value;
		}
	}

	return null;
}

function unwrapPayload(value: Record<string, unknown>): Record<string, unknown> {
	let current = value;

	for (let index = 0; index < 4; index += 1) {
		const nested =
			(isPlainObject(current.data) && current.data) ||
			(isPlainObject(current.result) && current.result) ||
			(isPlainObject(current.response) && current.response) ||
			(isPlainObject(current.output) && current.output) ||
			null;

		if (!nested) {
			break;
		}

		current = nested;
	}

	if (isPlainObject(current.page)) {
		return current.page;
	}
	if (isPlainObject(current.item)) {
		return current.item;
	}

	return current;
}

function inferNotionPropertyType(definition: Record<string, unknown>): string {
	if (typeof definition.type === 'string') {
		return definition.type;
	}

	for (const type of SUPPORTED_NOTION_FIELD_TYPES) {
		if (type in definition) {
			return type;
		}
	}

	return 'unknown';
}

function chunkRichText(value: string): Array<{ type: 'text'; text: { content: string } }> {
	if (!value) {
		return [];
	}

	const chunks: Array<{ type: 'text'; text: { content: string } }> = [];

	for (let cursor = 0; cursor < value.length; cursor += NOTION_RICH_TEXT_LIMIT) {
		chunks.push({
			type: 'text',
			text: {
				content: value.slice(cursor, cursor + NOTION_RICH_TEXT_LIMIT)
			}
		});
	}

	return chunks;
}
