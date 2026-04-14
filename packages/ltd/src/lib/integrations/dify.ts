const DIFY_ORIGIN = 'https://udify.app';
const DIFY_HOSTNAME = 'udify.app';
const DIFY_PATH_PATTERN = /^\/chatbot\/([A-Za-z0-9]+)$/;
const DIFY_TOKEN_PATTERN = /^[A-Za-z0-9]+$/;

function normalizeToken(value: string | null | undefined): string | null {
	const trimmed = value?.trim();

	if (!trimmed || !DIFY_TOKEN_PATTERN.test(trimmed)) {
		return null;
	}

	return trimmed;
}

export function buildDifyChatbotUrl(token: string | null | undefined): string | null {
	const normalizedToken = normalizeToken(token);

	if (!normalizedToken) {
		return null;
	}

	return `${DIFY_ORIGIN}/chatbot/${normalizedToken}`;
}

export function extractDifyChatbotToken(urlOrPath: string | null | undefined): string | null {
	const trimmed = urlOrPath?.trim();

	if (!trimmed) {
		return null;
	}

	const pathMatch = trimmed.match(DIFY_PATH_PATTERN);
	if (pathMatch) {
		return pathMatch[1] ?? null;
	}

	try {
		const parsedUrl = new URL(trimmed);
		if (parsedUrl.hostname !== DIFY_HOSTNAME || parsedUrl.protocol !== 'https:') {
			return null;
		}

		return parsedUrl.pathname.match(DIFY_PATH_PATTERN)?.[1] ?? null;
	} catch {
		return normalizeToken(trimmed);
	}
}

export function normalizeDifyChatbotUrl(value: string | null | undefined): string | null {
	const trimmed = value?.trim();

	if (!trimmed) {
		return null;
	}

	try {
		const parsedUrl = new URL(trimmed);
		if (parsedUrl.hostname !== DIFY_HOSTNAME || parsedUrl.protocol !== 'https:') {
			return null;
		}

		if (!extractDifyChatbotToken(parsedUrl.pathname)) {
			return null;
		}

		return parsedUrl.toString();
	} catch {
		return buildDifyChatbotUrl(trimmed);
	}
}
