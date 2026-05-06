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
};

const MAX_MESSAGE_LENGTH = 900;

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

	const cards = selectCards(message);
	const answer = buildAnswer(message, cards);
	const insightDraft = draftInsight(message);

	return json({
		answer,
		grounding: cards.map((card) => card.label),
		followUpQuestions: unique(cards.flatMap((card) => card.followUpQuestions)).slice(0, 4),
		insightDraft,
		guardrails: [
			'Answers are grounded in the sanitized Abundance delivery context.',
			'This endpoint does not expose raw Paylocity rows, token-bearing MCP URLs, contact data, or private Notion content.',
			'Use the follow-up questions to turn client replies into decisions, preferences, access ownership, or open questions.'
		]
	});
};

function selectCards(message: string) {
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

function buildAnswer(message: string, cards: typeof abundanceKnowledgeCards) {
	const sections = [
		`${abundanceDeliverySummary.client} delivery context: ${abundanceDeliverySummary.description}`,
		...cards.map((card) => card.answer)
	];

	if (asksForRestrictedArtifact(message)) {
		sections.unshift(
			'I cannot show token-bearing MCP URLs, raw Paylocity rows, private Notion content, contact data, or local file paths. The safe delivery surface can explain that those artifacts exist and what decisions they support, but not expose the underlying private material.'
		);
	}

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

	sections.push(`Next useful decisions: ${abundanceNextReview.join(' ')}`);

	return unique(sections).join('\n\n');
}

function draftInsight(message: string) {
	const normalized = normalize(message);

	if (asksForRestrictedArtifact(message)) {
		return null;
	}

	if (/(we prefer|prefer|should say|call it|language|wording)/i.test(message)) {
		return {
			type: 'preference',
			label: 'Client vocabulary or presentation preference',
			value: message
		};
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

	if (normalized.includes('yes') || normalized.includes('no') || normalized.includes('approved')) {
		return {
			type: 'decision',
			label: 'Potential decision to confirm',
			value: message
		};
	}

	return null;
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
