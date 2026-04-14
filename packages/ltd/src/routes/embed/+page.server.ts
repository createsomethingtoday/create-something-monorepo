import type { PageServerLoad } from './$types';

import {
	buildDifyChatbotUrl,
	extractDifyChatbotToken,
	normalizeDifyChatbotUrl
} from '$lib/integrations/dify';

const DEFAULT_NAME = 'CREATE SOMETHING Agent';
const DEFAULT_DESCRIPTION =
	'CREATE SOMETHING framing around a Dify-published assistant. The shell carries the brand. The conversation stays native to Dify.';

function normalizeText(value: string | null, fallback: string, maxLength: number): string {
	const trimmed = value?.trim();

	if (!trimmed) {
		return fallback;
	}

	return trimmed.slice(0, maxLength);
}

export const load: PageServerLoad = async ({ url }) => {
	const src = url.searchParams.get('src');
	const token = url.searchParams.get('token');

	const iframeSrc = src ? normalizeDifyChatbotUrl(src) : buildDifyChatbotUrl(token);
	const invalidReason =
		src || token
			? iframeSrc
				? null
				: 'Only published Dify chatbot URLs in the https://udify.app/chatbot/<token> format are supported.'
			: 'Pass ?src=https://udify.app/chatbot/<token> or ?token=<token> to load a branded Dify host.';

	return {
		iframeSrc,
		token: iframeSrc ? extractDifyChatbotToken(iframeSrc) : null,
		name: normalizeText(url.searchParams.get('name'), DEFAULT_NAME, 80),
		description: normalizeText(url.searchParams.get('description'), DEFAULT_DESCRIPTION, 180),
		invalidReason,
		examples: [
			'/embed?token=zSHH89gR94W5jGgm&name=Divy%20Agent',
			'/embed?src=https%3A%2F%2Fudify.app%2Fchatbot%2FKqRs1GTWwH7ibVbt&name=Divy%20Concierge'
		]
	};
};
