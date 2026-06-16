import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	CANON_MAX_MESSAGE_LENGTH,
	asksForRestrictedCanonMaterial,
	canonCorsHeaders,
	classifyCanonQuestion,
	sanitizeHistory,
	type CanonAgentBody
} from '$lib/canon/control';
import { loadCanonWorkflowContext, type CanonWorkflowContext } from '$lib/canon/workflow-context';
import { resolveDeliveryFallback } from '$lib/delivery/contexts';

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: canonCorsHeaders });
};

export const POST: RequestHandler = async ({ request, platform }) => {
	let body: CanonAgentBody;

	try {
		body = (await request.json()) as CanonAgentBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400, headers: canonCorsHeaders });
	}

	const message = typeof body.message === 'string' ? body.message.trim() : '';

	if (!message) {
		return json({ error: 'Missing message.' }, { status: 400, headers: canonCorsHeaders });
	}

	if (message.length > CANON_MAX_MESSAGE_LENGTH) {
		return json(
			{ error: `Message must be ${CANON_MAX_MESSAGE_LENGTH} characters or fewer.` },
			{ status: 400, headers: canonCorsHeaders }
		);
	}

	const history = sanitizeHistory(body.history);
	const intent = classifyCanonQuestion(message);
	const context = await loadCanonWorkflowContext(
		platform?.env?.DB,
		body.contextId,
		resolveDeliveryFallback(body.contextId)
	);
	const response = buildAgentResponse(message, intent, history.length, context);

	return json(response, { headers: canonCorsHeaders });
};

function buildAgentResponse(
	message: string,
	intent: ReturnType<typeof classifyCanonQuestion>,
	historyCount: number,
	context: CanonWorkflowContext
) {
	if (intent === 'restricted' || asksForRestrictedCanonMaterial(message)) {
		return {
			answer:
				'I cannot expose secrets, token-bearing URLs, raw source records, private workspace links, credentials, or contact-level data. I can describe what those private materials support and which public-safe decision they inform.',
			grounding: ['Private boundary', 'Governance rule'],
			followUps: ['Should this move into a private review?', 'What client-safe summary should be used instead?'],
			restricted: true,
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		};
	}

	if (intent === 'database') {
		const databaseLayer = context.layers.find((layer) => layer.tier === 'Database');
		return {
			answer:
				databaseLayer?.description ??
				'The Database layer is the source-of-truth boundary. It holds operational memory, review state, evidence IDs, and data freshness signals separately from the public Webflow surface.',
			grounding: databaseLayer?.evidence ?? ['Operational Memory', 'Evidence trail'],
			followUps: ['Which record is authoritative?', 'Which stale or missing fields should block an action?'],
			restricted: false,
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		};
	}

	if (intent === 'automation') {
		const automationLayer = context.layers.find((layer) => layer.tier === 'Automation');
		return {
			answer:
				automationLayer?.description ??
				'The Automation layer is the callable runtime. Webflow displays the interface, while Cloudflare routes handle bounded previews, status checks, and MCP-ready action contracts.',
			grounding: automationLayer?.evidence ?? ['Callable Runtime', 'Cloudflare route', 'Action contract'],
			followUps: ['Which endpoint should be smoke tested first?', 'Which action needs an MCP contract before execution?'],
			restricted: false,
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		};
	}

	if (intent === 'judgment') {
		const judgmentLayer = context.layers.find((layer) => layer.tier === 'Judgment');
		return {
			answer:
				judgmentLayer?.description ??
				'The Judgment layer is the policy and approval boundary. The system can recommend, draft, and preview, but a named operator must approve high-impact or external actions before execution.',
			grounding: judgmentLayer?.evidence ?? ['Approval Boundary', 'Policy checks', 'Decision queue'],
			followUps: ['Who is the approval owner?', 'Which action should remain human-approved?'],
			restricted: false,
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		};
	}

	if (intent === 'action') {
		const actionLabels = context.actions.map((action) => action.label).join(', ');
		return {
			answer:
				`The current action model includes ${actionLabels}. Drafting and review actions can be previewed safely; external or connector execution remains blocked until a production connector contract, named approval owner, and rollback path exist.`,
			grounding: context.actions.map((action) => action.label),
			followUps: ['Preview the approval request?', 'What approval owner should be recorded?'],
			restricted: false,
			actions: context.actions.map((action) => action.id),
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		};
	}

	if (intent === 'evidence') {
		return {
			answer:
				'Evidence should show what changed, what supports the claim, and what remains private. The public surface can reference review packets, workflow maps, policy rules, and runtime contracts while keeping source data and credentials outside the page.',
			grounding: context.evidence.map((item) => item.label),
			followUps: ['Which artifact is safe to show publicly?', 'Which artifact belongs in the private handoff?'],
			restricted: false,
			contextId: context.contextId,
			contextSource: context.source,
			guardrails: context.guardrails
		};
	}

	return {
		answer:
			historyCount > 0
				? 'Continuing from the current control context: Webflow owns the polished interface, Cloudflare owns the runtime behavior, and the approval boundary keeps recommendations from becoming actions without operator review.'
				: `${context.summary} The useful way to read the system is Database for memory, Automation for callable previews, and Judgment for policy-backed approval.`,
		grounding: context.layers.map((layer) => layer.title),
		followUps: ['What needs approval next?', 'What evidence is safe to publish?', 'Which runtime action should be previewed?'],
		restricted: false,
		contextId: context.contextId,
		contextSource: context.source,
		guardrails: context.guardrails
	};
}
