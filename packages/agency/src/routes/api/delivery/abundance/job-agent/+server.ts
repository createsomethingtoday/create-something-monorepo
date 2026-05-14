import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

type JobAgentRequest = {
	message?: unknown;
	conversationId?: unknown;
};

type DifyStreamEvent = {
	event?: string;
	answer?: string;
	tool?: string;
	message_id?: string;
	conversation_id?: string;
	status?: number;
	code?: string;
	message?: string;
};

const DEFAULT_DIFY_BASE_URL = 'https://api.dify.ai/v1';
const MAX_MESSAGE_LENGTH = 700;
const DIFY_TIMEOUT_MS = 90_000;
const DELIVERY_PAGE_USER = 'abundance-delivery-page-job-agent';
const READ_ONLY_SUFFIX =
	'\n\nDelivery page guardrail: use read-only public job discovery tools only. Do not call send_job_to_funnel or perform write actions from this page. Reply in plain text with short bullets and no Markdown bold, code, or table formatting.';

export const POST: RequestHandler = async ({ request, platform, url }) => {
	const origin = request.headers.get('origin');

	if (origin && origin !== url.origin) {
		return json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
	}

	let body: JobAgentRequest;

	try {
		body = (await request.json()) as JobAgentRequest;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400 });
	}

	const message = typeof body.message === 'string' ? body.message.trim() : '';
	const conversationId =
		typeof body.conversationId === 'string' ? body.conversationId.trim().slice(0, 128) : '';

	if (!message) {
		return json({ error: 'Missing message.' }, { status: 400 });
	}

	if (message.length > MAX_MESSAGE_LENGTH) {
		return json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, { status: 400 });
	}

	const apiKey = platform?.env?.DIFY_ABUNDANCE_HUB_API_KEY ?? env.DIFY_ABUNDANCE_HUB_API_KEY;

	if (!apiKey) {
		return json(
			{
				error:
					'The Abundance Jobs Agent is not configured in this environment. DIFY_ABUNDANCE_HUB_API_KEY is required server-side.'
			},
			{ status: 503 }
		);
	}

	const baseUrl = (
		platform?.env?.DIFY_ABUNDANCE_HUB_BASE_URL ??
		env.DIFY_ABUNDANCE_HUB_BASE_URL ??
		DEFAULT_DIFY_BASE_URL
	).replace(/\/+$/, '');
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DIFY_TIMEOUT_MS);

	try {
		const response = await fetch(`${baseUrl}/chat-messages`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				inputs: {},
				query: `${message}${READ_ONLY_SUFFIX}`,
				response_mode: 'streaming',
				conversation_id: conversationId,
				user: DELIVERY_PAGE_USER
			}),
			signal: controller.signal
		});

		const text = await response.text();
		const events = parseSseEvents(text);
		const parsed = parseDifyEvents(events);

		if (!response.ok || parsed.error) {
			return json(
				{
					error:
						parsed.error ??
						`The Abundance Jobs Agent returned ${response.status}. Please try again shortly.`
				},
				{ status: response.ok ? 502 : response.status }
			);
		}

		if (!parsed.answer.trim()) {
			return json(
				{ error: 'The Abundance Jobs Agent returned an empty response. Please try again.' },
				{ status: 502 }
			);
		}

		return json({
			answer: parsed.answer.trim(),
			messageId: parsed.messageId,
			conversationId: parsed.conversationId ?? conversationId,
			tools: Array.from(parsed.tools),
			guardrails: [
				'This delivery-page chat uses the Dify Abundance Hub Service API from the server.',
				'The page appends a read-only instruction and does not expose Dify or MCP credentials.',
				'Funnel writes remain outside this public embedded panel and require explicit human confirmation.'
			]
		});
	} catch (error) {
		const aborted = error instanceof Error && error.name === 'AbortError';
		return json(
			{
				error: aborted
					? 'The Abundance Jobs Agent timed out. Please try a narrower job search.'
					: 'The Abundance Jobs Agent could not be reached.'
			},
			{ status: aborted ? 504 : 502 }
		);
	} finally {
		clearTimeout(timeout);
	}
};

function parseSseEvents(text: string): DifyStreamEvent[] {
	return text
		.split(/\n\n+/)
		.map((block) =>
			block
				.split('\n')
				.map((line) => line.trimEnd())
				.filter((line) => line.startsWith('data:'))
				.map((line) => line.replace(/^data:\s?/, ''))
				.join('\n')
				.trim()
		)
		.filter((data) => data && data !== '[DONE]')
		.map((data) => {
			try {
				return JSON.parse(data) as DifyStreamEvent;
			} catch {
				return { event: 'error', message: 'Dify returned a malformed streaming event.' };
			}
		});
}

function parseDifyEvents(events: DifyStreamEvent[]) {
	let answer = '';
	let messageId: string | undefined;
	let conversationId: string | undefined;
	let error: string | undefined;
	const tools = new Set<string>();

	for (const event of events) {
		if (event.event === 'message' || event.event === 'agent_message') {
			answer += typeof event.answer === 'string' ? event.answer : '';
		}

		if (event.event === 'agent_thought' && typeof event.tool === 'string') {
			for (const tool of event.tool.split(';')) {
				const name = tool.trim().split('.').at(-1)?.trim();
				if (name) tools.add(name);
			}
		}

		if (event.event === 'message_end') {
			if (typeof event.message_id === 'string') messageId = event.message_id;
			if (typeof event.conversation_id === 'string') conversationId = event.conversation_id;
		}

		if (event.event === 'error') {
			error = [event.code, event.message].filter(Boolean).join(': ') || 'Dify returned an error.';
		}
	}

	return { answer, messageId, conversationId, tools, error };
}
