import { receptionistInstructions } from '../receptionist/knowledge';

export const REALTIME_MODEL = 'gpt-realtime-2.1';
export const OPENAI_REALTIME_CLIENT_SECRET_URL =
	'https://api.openai.com/v1/realtime/client_secrets';

interface CreateReceptionistSessionOptions {
	apiKey?: string;
	fetchImpl?: typeof fetch;
}

interface OpenAIClientSecretResponse {
	value?: unknown;
	expires_at?: unknown;
	session?: {
		model?: unknown;
	};
}

const noStoreHeaders = {
	'Cache-Control': 'no-store, private',
	Pragma: 'no-cache'
};

function json(body: unknown, status: number): Response {
	return Response.json(body, {
		status,
		headers: noStoreHeaders
	});
}

function sessionStartFailed(): Response {
	return json(
		{
			error: 'session_start_failed',
			message: 'We could not start the voice demo. Please try again.'
		},
		502
	);
}

export async function createReceptionistSessionResponse({
	apiKey,
	fetchImpl = fetch
}: CreateReceptionistSessionOptions): Promise<Response> {
	const standardKey = apiKey?.trim();
	if (!standardKey) {
		return json(
			{
				error: 'receptionist_unavailable',
				message: 'The voice demo is not configured right now.'
			},
			503
		);
	}

	let upstream: Response;
	try {
		upstream = await fetchImpl(OPENAI_REALTIME_CLIENT_SECRET_URL, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${standardKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				session: {
					type: 'realtime',
					model: REALTIME_MODEL,
					instructions: receptionistInstructions,
					audio: {
						output: {
							voice: 'marin'
						}
					}
				}
			})
		});
	} catch {
		return sessionStartFailed();
	}

	if (!upstream.ok) return sessionStartFailed();

	let payload: OpenAIClientSecretResponse;
	try {
		payload = (await upstream.json()) as OpenAIClientSecretResponse;
	} catch {
		return sessionStartFailed();
	}

	if (typeof payload.value !== 'string' || typeof payload.expires_at !== 'number') {
		return sessionStartFailed();
	}

	return json(
		{
			value: payload.value,
			expiresAt: payload.expires_at,
			model: REALTIME_MODEL
		},
		200
	);
}
