import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	CANON_MAX_MESSAGE_LENGTH,
	asksForRestrictedCanonMaterial,
	canonActionDefinitions,
	canonControlContext,
	canonCorsHeaders,
	classifyCanonQuestion,
	sanitizeHistory,
	type CanonAgentBody
} from '$lib/canon/control';

export const OPTIONS: RequestHandler = async () => {
	return new Response(null, { status: 204, headers: canonCorsHeaders });
};

export const POST: RequestHandler = async ({ request }) => {
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
	const response = buildAgentResponse(message, intent, history.length);

	return json(response, { headers: canonCorsHeaders });
};

function buildAgentResponse(message: string, intent: ReturnType<typeof classifyCanonQuestion>, historyCount: number) {
	if (intent === 'restricted' || asksForRestrictedCanonMaterial(message)) {
		return {
			answer:
				'I cannot expose secrets, token-bearing URLs, raw source records, private workspace links, credentials, or contact-level data. I can describe what those private materials support and which public-safe decision they inform.',
			grounding: ['Private boundary', 'Governance rule'],
			followUps: ['Should this move into a private review?', 'What client-safe summary should be used instead?'],
			restricted: true,
			guardrails: canonControlContext.guardrails
		};
	}

	if (intent === 'database') {
		return {
			answer:
				'The Database layer is the source-of-truth boundary. It holds operational memory, review state, evidence IDs, and data freshness signals separately from the public Webflow surface. That separation lets the interface explain decisions without exposing private source material.',
			grounding: ['Operational Memory', 'Evidence trail'],
			followUps: ['Which record is authoritative?', 'Which stale or missing fields should block an action?'],
			restricted: false,
			guardrails: canonControlContext.guardrails
		};
	}

	if (intent === 'automation') {
		return {
			answer:
				'The Automation layer is the callable runtime. Webflow displays the interface, while Cloudflare routes handle bounded previews, status checks, and MCP-ready action contracts. In this v1 route, actions are previewed only and no external mutation is executed.',
			grounding: ['Callable Runtime', 'Cloudflare route', 'Action contract'],
			followUps: ['Which endpoint should be smoke tested first?', 'Which action needs an MCP contract before execution?'],
			restricted: false,
			guardrails: canonControlContext.guardrails
		};
	}

	if (intent === 'judgment') {
		return {
			answer:
				'The Judgment layer is the policy and approval boundary. The system can recommend, draft, and preview, but a named operator must approve high-impact or external actions before execution. That boundary is the government layer: policy is an artifact, not just prompt text.',
			grounding: ['Approval Boundary', 'Policy checks', 'Decision queue'],
			followUps: ['Who is the approval owner?', 'Which action should remain human-approved?'],
			restricted: false,
			guardrails: canonControlContext.guardrails
		};
	}

	if (intent === 'action') {
		return {
			answer:
				'The current action model supports drafting an operator brief, preparing an approval request, and demonstrating a blocked external execution. The first two can be previewed safely; external execution is intentionally blocked until a production connector contract and approval path exist.',
			grounding: canonActionDefinitions.map((action) => action.label),
			followUps: ['Preview the approval request?', 'What approval owner should be recorded?'],
			restricted: false,
			actions: canonActionDefinitions.map((action) => action.id),
			guardrails: canonControlContext.guardrails
		};
	}

	if (intent === 'evidence') {
		return {
			answer:
				'Evidence should show what changed, what supports the claim, and what remains private. The public surface can reference review packets, workflow maps, policy rules, and runtime contracts while keeping source data and credentials outside the page.',
			grounding: ['Workflow map', 'Review packet', 'Runtime contract', 'Private boundary'],
			followUps: ['Which artifact is safe to show publicly?', 'Which artifact belongs in the private handoff?'],
			restricted: false,
			guardrails: canonControlContext.guardrails
		};
	}

	return {
		answer:
			historyCount > 0
				? 'Continuing from the current control context: Webflow owns the polished interface, Cloudflare owns the runtime behavior, and the approval boundary keeps recommendations from becoming actions without operator review.'
				: `${canonControlContext.summary} The useful way to read the system is Database for memory, Automation for callable previews, and Judgment for policy-backed approval.`,
		grounding: canonControlContext.layers.map((layer) => layer.label),
		followUps: ['What needs approval next?', 'What evidence is safe to publish?', 'Which runtime action should be previewed?'],
		restricted: false,
		guardrails: canonControlContext.guardrails
	};
}

