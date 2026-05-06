import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	abundanceArtifactLinks,
	abundanceDeliverySummary,
	abundanceKnowledgeCards,
	abundanceNextReview,
	abundanceOperatingLayers,
	abundancePrivateArtifacts
} from '$lib/delivery/abundance';

type AskDeliveryBody = {
	message?: unknown;
	history?: unknown;
};

type ChatHistoryMessage = {
	role: 'agent' | 'client';
	body: string;
};

type DeliveryIntent = {
	id:
		| 'restricted'
		| 'decision_priority'
		| 'approval_owner'
		| 'draft_actions'
		| 'shareable'
		| 'architecture'
		| 'status'
		| 'artifacts'
		| 'database'
		| 'mcp'
		| 'agent_boundary'
		| 'insight_capture'
		| 'general';
	label: string;
	cardIds: string[];
	reasoningNote: string;
	answer?: string;
	followUpQuestions?: string[];
};

const MAX_MESSAGE_LENGTH = 900;
const MAX_HISTORY_MESSAGES = 8;

export const POST: RequestHandler = async ({ request }) => {
	let body: AskDeliveryBody;

	try {
		body = (await request.json()) as AskDeliveryBody;
	} catch {
		return json({ error: 'Request body must be JSON.' }, { status: 400 });
	}

	const message = typeof body.message === 'string' ? body.message.trim() : '';

	if (!message) {
		return json({ error: 'Missing message.' }, { status: 400 });
	}

	if (message.length > MAX_MESSAGE_LENGTH) {
		return json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` }, { status: 400 });
	}

	const history = sanitizeHistory(body.history);
	const context = buildConversationContext(history);
	const intent = classifyIntent(message, context);
	const cards = selectCards(message, intent);
	const answer = buildAnswer(message, cards, intent, context);
	const insightDraft = draftInsight(message, context, intent);
	const followUpQuestions = selectFollowUps(message, cards, intent, context);

	return json({
		answer,
		intent: {
			id: intent.id,
			label: intent.label
		},
		reasoningNote: intent.reasoningNote,
		grounding: cards.map((card) => card.label),
		followUpQuestions,
		insightDraft,
		guardrails: [
			'Answers are grounded in the sanitized Abundance delivery context.',
			'This endpoint does not expose raw Paylocity rows, token-bearing MCP URLs, contact data, or private Notion content.',
			'Use the follow-up questions to turn client replies into decisions, preferences, access ownership, or open questions.'
		]
	});
};

function sanitizeHistory(value: unknown): ChatHistoryMessage[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.slice(-MAX_HISTORY_MESSAGES)
		.map((entry): ChatHistoryMessage | null => {
			if (!entry || typeof entry !== 'object') {
				return null;
			}

			const role = 'role' in entry ? entry.role : undefined;
			const body = 'body' in entry ? entry.body : undefined;

			if ((role !== 'agent' && role !== 'client') || typeof body !== 'string') {
				return null;
			}

			return {
				role,
				body: body.slice(0, MAX_MESSAGE_LENGTH)
			};
		})
		.filter((entry): entry is ChatHistoryMessage => Boolean(entry));
}

function buildConversationContext(history: ChatHistoryMessage[]) {
	const previousClientMessages = history.filter((entry) => entry.role === 'client').map((entry) => entry.body);
	const previousAgentMessages = history.filter((entry) => entry.role === 'agent').map((entry) => entry.body);
	const lastAgentMessage = [...history].reverse().find((entry) => entry.role === 'agent')?.body ?? '';
	const lastClientMessage = [...history].reverse().find((entry) => entry.role === 'client')?.body ?? '';

	return {
		history,
		previousClientMessages,
		previousAgentMessages,
		lastAgentMessage,
		lastClientMessage,
		isFollowUp: previousClientMessages.length > 0
	};
}

function classifyIntent(message: string, context: ReturnType<typeof buildConversationContext>): DeliveryIntent {
	const normalized = normalize(message);
	const lastClient = normalize(context.lastClientMessage);

	if (asksForRestrictedArtifact(message)) {
		return {
			id: 'restricted',
			label: 'Restricted artifact request',
			cardIds: ['privacy'],
			reasoningNote:
				'I treated this as a private-material request because it asks for source data, credentials, token-bearing URLs, local files, or private workspace content.',
			answer:
				'I cannot show token-bearing MCP URLs, raw Paylocity rows, private Notion content, contact data, or local file paths. The safe delivery surface can explain that those artifacts exist and what decisions they support, but it will not expose the underlying private material.',
			followUpQuestions: [
				'What is safe to forward to our team?',
				'Should this detail move into a private review instead of the delivery page?'
			]
		};
	}

	if (
		!/(next|build|pass|first|before|blocking)/i.test(message) &&
		(/(what|which).*(decision|decisions).*(need|needed|from us)|what.*need.*from us/i.test(message) ||
			/(decision|decisions).*(need|needed|review|approve)/i.test(message))
	) {
		return {
			id: 'decision_priority',
			label: 'Decisions needed',
			cardIds: ['decisions', 'database', 'mcp', 'agent'],
			reasoningNote:
				'I treated this as a decision-list question because it asks what NPG needs to decide next.',
			answer:
				'The current decisions are:\n\n1. Confirm how Paylocity fields map into staff/operator records.\n2. Verify Staff MCP and Jobs MCP credentials from secret storage before live smoke tests.\n3. Review the live app, generated delivery package, and MCP boundaries with NPG.\n4. Decide which operator roster receives MCP/database access.\n\nThe first decision is the build blocker. The field mapping shapes the staff/operator database records, and those records determine what the agent can safely recommend.',
			followUpQuestions: [
				'Which decision needs to be made before the next build pass?',
				'Who will own the Paylocity field mapping review?',
				'Who is the approval owner for operator access?'
			]
		};
	}

	if (!isQuestion(message) && /(owner is|approval owner is|approver is|access owner is|approved by)/i.test(message)) {
		return {
			id: 'insight_capture',
			label: 'Access ownership insight',
			cardIds: ['decisions', 'privacy'],
			reasoningNote:
				'I treated this as a client insight rather than a question because it appears to provide ownership information.',
			answer:
				'Got it. I would capture that as a private access ownership note, not as public delivery-page content.\n\nThe delivery implication is that MCP/database access should wait for that owner to confirm the operator roster, access level, and whether access starts read-only or includes write-capable tools.',
			followUpQuestions: [
				'Should operator access start read-only?',
				'Which roles should this owner approve first?',
				'Should this ownership note be added to the private handoff record?'
			]
		};
	}

	if (!isQuestion(message) && /(we prefer|prefer|should say|call it|language|wording)/i.test(message)) {
		return {
			id: 'insight_capture',
			label: 'Client vocabulary insight',
			cardIds: ['status', 'privacy'],
			reasoningNote:
				'I treated this as a client preference because it gives vocabulary or presentation guidance.',
			answer:
				'Got it. I would capture that as a presentation preference for future delivery updates.\n\nThe safe next step is to keep the underlying system vocabulary stable in code and contracts, while using the client-preferred language in recaps, walkthroughs, and public-facing delivery copy.',
			followUpQuestions: [
				'Should this wording apply only to client-facing copy?',
				'Should the internal DB/MCP labels stay unchanged?',
				'Which page section should use this language first?'
			]
		};
	}

	if (
		/(which|what).*(decision|choice).*(next|build|pass|first|before)/i.test(message) ||
		/(next|first|blocking).*(decision|choice)/i.test(message)
	) {
		return {
			id: 'decision_priority',
			label: 'Build-blocking decision',
			cardIds: ['decisions', 'database', 'mcp'],
			reasoningNote:
				'I treated this as a prioritization question because it asks which decision should happen before the next build pass.',
			answer:
				'The build-blocking decision is the Paylocity field mapping. NPG needs to confirm which Paylocity fields become staff/operator records, which system is authoritative for staff status and availability, and which fields should block a match recommendation when missing or stale.\n\nThe access-owner decision can happen in parallel, but the next build pass depends most on the field mapping because the database and agent recommendations need a trustworthy staff/operator record shape before MCP smoke tests become meaningful.',
			followUpQuestions: [
				'Who will own the Paylocity field mapping review?',
				'Which staff statuses should block match recommendations?',
				'Should MCP access wait until field mapping is approved?'
			]
		};
	}

	if (/(approval owner|access owner|who approves|who should approve|approver|operator access owner)/i.test(message)) {
		return {
			id: 'approval_owner',
			label: 'Approval owner',
			cardIds: ['decisions', 'privacy'],
			reasoningNote:
				'I treated this as an ownership question because it asks who should approve operator or MCP/database access.',
			answer:
				'The sanitized delivery context does not name the approval owner yet. That is an open NPG decision.\n\nThe clean operating rule is: one NPG owner should approve the operator roster before any MCP/database access is granted. Until that owner and roster are confirmed, the delivery should stay in review mode with credentials held in secret storage and private staff artifacts kept out of the public page.',
			followUpQuestions: [
				'Can NPG name one approval owner for operator access?',
				'Should operator access be read-only until the roster is confirmed?',
				'Which roles need access: recruiter, owner, admin, or technical operator?'
			]
		};
	}

	if (/(draft|prepare).*(not send|without sending|approval|review)|what actions.*(draft|send)|agent.*(draft|send)/i.test(message)) {
		return {
			id: 'draft_actions',
			label: 'Agent action boundary',
			cardIds: ['agent', 'decisions'],
			reasoningNote:
				'I treated this as an agent-boundary question because it separates draftable work from actions that require human approval.',
			answer:
				'The agent can draft recruiter-review work: intake summaries, candidate shortlists, missing-information flags, recommended next steps, and outreach copy for a recruiter to review.\n\nIt should not send outreach, submit a candidate, update a final staffing status, reject a candidate, place a nurse, or make any final employment/staffing decision on its own. Those actions need a recruiter/operator approval step before anything reaches a candidate or client.',
			followUpQuestions: [
				'Can the agent draft outreach copy for recruiter approval?',
				'Which action must always stay human-approved?',
				'Which recruiter or operator approves matches before anything reaches a candidate or client?'
			]
		};
	}

	if (/(safe|share|forward|private|public|send to.*team|team).*|what.*safe/i.test(message)) {
		return {
			id: 'shareable',
			label: 'Shareable versus private',
			cardIds: ['privacy', 'artifacts'],
			reasoningNote:
				'I treated this as a delivery-boundary question because it asks what can be shared and what should stay private.',
			answer:
				'Safe to forward: the live Abundance Concierge app, the two walkthrough links, the generated delivery page, and a plain-English summary of the DB/MCP/agent architecture.\n\nKeep private: token-bearing MCP URLs, raw Paylocity rows, local file paths, private Notion details, contact data, credential values, and any operational secret. If a token was shared outside secret storage, rotate it before depending on it in production.',
			followUpQuestions: [
				'Should this delivery stay public-link accessible or require login later?',
				'Who needs the non-technical recap?',
				'Which private artifact should be reviewed live instead of published?'
			]
		};
	}

	if (/(fit together|how.*db|database.*mcp|mcp.*agent|db.*agent|architecture|pieces|layers)/i.test(message)) {
		return {
			id: 'architecture',
			label: 'DB / MCP / agent architecture',
			cardIds: ['database', 'mcp', 'agent'],
			reasoningNote:
				'I treated this as an architecture question because it asks how the database, MCP surface, and agent boundary connect.',
			answer:
				'The database is the memory layer: it stores intake context, staff/operator records, matching state, and source-artifact context.\n\nThe MCP layer is the controlled action/data-access layer: Staff and Jobs MCP expose specific capabilities without publishing credentials or raw private data.\n\nThe agent is the judgment-support layer: it reads the structured context, drafts recommendations, flags missing information, and prepares recruiter review. The recruiter/operator remains the approval boundary for staffing decisions.',
			followUpQuestions: [
				'Which database field should the agent rely on first?',
				'Should Staff MCP and Jobs MCP stay separate during review?',
				'What should count as a blocked state for agent recommendations?'
			]
		};
	}

	if (/(what changed|changed|plain english|summary|status|shipped|ready|update)/i.test(message)) {
		return {
			id: 'status',
			label: 'Plain-English status',
			cardIds: ['status', 'artifacts'],
			reasoningNote:
				'I treated this as a status question because it asks for the simplest explanation of what changed.',
			followUpQuestions: [
				'Who should receive the client-safe walkthrough?',
				'What should the next update focus on?',
				'Should the recap use nurse staffing language or internal Seeker/Talent/Match language?'
			]
		};
	}

	if (/(artifact|walkthrough|demo|link|links|url|review)/i.test(message)) {
		return {
			id: 'artifacts',
			label: 'Review artifacts',
			cardIds: ['artifacts', 'privacy'],
			reasoningNote:
				'I treated this as an artifact question because it asks about the materials available for review.',
			followUpQuestions: [
				'Who should be included in the review loop?',
				'Which artifact should be the primary client-facing link?'
			]
		};
	}

	if (/(paylocity|field|fields|source of truth|authoritative|database|db|records)/i.test(message)) {
		return {
			id: 'database',
			label: 'Database and source mapping',
			cardIds: ['database', 'decisions'],
			reasoningNote:
				'I treated this as a source-mapping question because it asks about Paylocity, fields, records, or authoritative data.',
			followUpQuestions: [
				'Which Paylocity fields should become staff/operator records?',
				'Which system is authoritative for staff status and availability?'
			]
		};
	}

	if (/(mcp|credential|credentials|endpoint|api|tool|tools|automation)/i.test(message)) {
		return {
			id: 'mcp',
			label: 'MCP and automation',
			cardIds: ['mcp', 'privacy'],
			reasoningNote:
				'I treated this as an MCP question because it asks about endpoints, credentials, tools, or automation.',
			followUpQuestions: [
				'Who should have MCP/database access?',
				'Should Staff MCP and Jobs MCP stay separate during review?'
			]
		};
	}

	if (/(agent|dify|chat|recommend|recommendation|judgment|autonomous)/i.test(message)) {
		return {
			id: 'agent_boundary',
			label: 'Agent boundary',
			cardIds: ['agent', 'decisions'],
			reasoningNote:
				'I treated this as an agent-boundary question because it asks what the agent can recommend versus decide.',
			followUpQuestions: [
				'What actions can the agent draft but not send?',
				'Which recruiter or operator approves matches before anything reaches a candidate or client?'
			]
		};
	}

	return {
		id: 'general',
		label: 'General delivery question',
		cardIds: lastClient ? selectCardIdsFromText(`${lastClient} ${normalized}`) : [],
		reasoningNote:
			context.isFollowUp ?
				'I treated this as a follow-up and used the current question plus the recent chat context to select the safest delivery facts.' :
				'I treated this as a general delivery question and selected the closest sanitized delivery facts.'
	};
}

function selectCards(message: string, intent: DeliveryIntent) {
	if (intent.cardIds.length > 0) {
		const cards = intent.cardIds
			.map((id) => abundanceKnowledgeCards.find((card) => card.id === id))
			.filter((card): card is (typeof abundanceKnowledgeCards)[number] => Boolean(card));

		if (cards.length > 0) {
			return cards;
		}
	}

	const normalized = normalize(message);
	const scored = abundanceKnowledgeCards
		.map((card) => {
			const score = card.keywords.reduce((total, keyword) => {
				return total + (normalized.includes(normalize(keyword)) ? 1 : 0);
			}, 0);
			return { card, score };
		})
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.map(({ card }) => card);

	if (scored.length > 0) {
		return scored.slice(0, 3);
	}

	return [
		abundanceKnowledgeCards.find((card) => card.id === 'status') ?? abundanceKnowledgeCards[0],
		abundanceKnowledgeCards.find((card) => card.id === 'decisions') ?? abundanceKnowledgeCards[0]
	].filter(Boolean);
}

function selectCardIdsFromText(value: string) {
	return abundanceKnowledgeCards
		.map((card) => {
			const score = card.keywords.reduce((total, keyword) => {
				return total + (value.includes(normalize(keyword)) ? 1 : 0);
			}, 0);
			return { id: card.id, score };
		})
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, 3)
		.map(({ id }) => id);
}

function buildAnswer(
	message: string,
	cards: typeof abundanceKnowledgeCards,
	intent: DeliveryIntent,
	context: ReturnType<typeof buildConversationContext>
) {
	if (intent.answer) {
		return intent.answer;
	}

	const sections = context.isFollowUp && !asksForAll(message) ?
		cards.map((card) => card.answer) :
		[
			`${abundanceDeliverySummary.client} delivery context: ${abundanceDeliverySummary.description}`,
			...cards.map((card) => card.answer)
		];

	if (asksForAll(message)) {
		sections.push(
			`Current review artifacts: ${abundanceArtifactLinks
				.map((artifact) => artifact.label)
				.join(', ')}.`,
			`Operating model: ${abundanceOperatingLayers
				.map((layer) => `${layer.tier} - ${layer.title}`)
				.join('; ')}.`,
			`Private boundary: ${abundancePrivateArtifacts.join(' ')}`
		);
	}

	if (['decisions', 'general', 'status'].includes(intent.id) || asksForAll(message)) {
		sections.push(`Next useful decisions: ${abundanceNextReview.join(' ')}`);
	}

	return unique(sections).join('\n\n');
}

function selectFollowUps(
	message: string,
	cards: typeof abundanceKnowledgeCards,
	intent: DeliveryIntent,
	context: ReturnType<typeof buildConversationContext>
) {
	const fallbackQuestions = [
		'What should be captured as a decision note?',
		'Who should own the next review step?',
		'What should stay private in the next update?'
	];

	const questions = unique([
		...(intent.followUpQuestions ?? []),
		...cards.flatMap((card) => card.followUpQuestions),
		...fallbackQuestions
	]);

	const alreadyAsked = new Set(
		[message, ...context.previousClientMessages, context.lastAgentMessage]
			.flatMap((value) => splitPotentialQuestions(value))
			.map((value) => normalize(value))
			.filter(Boolean)
	);

	return questions.filter((question) => !alreadyAsked.has(normalize(question))).slice(0, 4);
}

function draftInsight(
	message: string,
	context: ReturnType<typeof buildConversationContext>,
	intent: DeliveryIntent
) {
	const normalized = normalize(message);

	if (intent.id === 'restricted') {
		return null;
	}

	if (/(we prefer|prefer|should say|call it|language|wording)/i.test(message)) {
		return {
			type: 'preference',
			label: 'Client vocabulary or presentation preference',
			value: message
		};
	}

	if (isQuestion(message)) {
		return null;
	}

	if (/(owner is|approval owner|approver|approved by|access owner|who approves)/i.test(message)) {
		return {
			type: 'access_owner',
			label: 'Approval or access ownership note',
			value: message
		};
	}

	if (/(paylocity|field|fields|source of truth|authoritative)/i.test(message)) {
		return {
			type: 'source_mapping',
			label: 'Source data mapping note',
			value: message
		};
	}

	if (
		(normalized.includes('yes') || normalized.includes('no') || normalized.includes('approved')) &&
		context.lastAgentMessage
	) {
		return {
			type: 'decision',
			label: 'Potential decision to confirm',
			value: message
		};
	}

	return null;
}

function splitPotentialQuestions(value: string) {
	return value
		.split(/\n|(?<=\?)/g)
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function isQuestion(value: string) {
	const normalized = normalize(value);
	return (
		value.trim().endsWith('?') ||
		/^(who|what|which|when|where|why|how|can|could|should|would|do|does|did|is|are)\b/.test(normalized)
	);
}

function asksForAll(message: string) {
	const normalized = normalize(message);
	return ['everything', 'all', 'full', 'complete', 'comprehensive', 'overview'].some((term) =>
		normalized.includes(term)
	);
}

function asksForRestrictedArtifact(message: string) {
	const normalized = normalize(message);
	const asksToReveal = ['show', 'send', 'give', 'reveal', 'display', 'list', 'export'].some((term) =>
		normalized.includes(term)
	);
	const restrictedMaterial = ['token', 'secret', 'credential', 'paylocity rows', 'raw rows', 'employee rows', 'local file', 'notion'].some(
		(term) => normalized.includes(term)
	);

	return asksToReveal && restrictedMaterial;
}

function normalize(value: string) {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function unique<T>(items: T[]) {
	return [...new Set(items)];
}
