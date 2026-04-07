type ConciergeLogLevel = 'info' | 'warn' | 'error';

interface ConciergeLogEvent {
	event: string;
	level?: ConciergeLogLevel;
	route?: string;
	sessionId?: string | null;
	threadId?: string | null;
	request?: Request | null;
	data?: Record<string, unknown>;
}

type SerializableErrorShape = Record<string, unknown> & {
	name?: string;
	message?: string;
	status?: number;
};

function sanitizeData(
	data: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
	if (!data) {
		return undefined;
	}

	return Object.fromEntries(
		Object.entries(data).filter(([, value]) => value !== undefined)
	);
}

export function resolveRequestIp(request?: Request | null) {
	const cloudflareIp = request?.headers.get('cf-connecting-ip')?.trim();
	if (cloudflareIp) {
		return cloudflareIp;
	}

	const forwardedFor = request?.headers.get('x-forwarded-for');
	if (forwardedFor) {
		const firstForward = forwardedFor
			.split(',')
			.map((entry) => entry.trim())
			.find(Boolean);
		if (firstForward) {
			return firstForward;
		}
	}

	return 'local';
}

export function getEmailDomain(email: string | null | undefined) {
	if (!email) {
		return null;
	}

	const [, domain = ''] = email.trim().toLowerCase().split('@');
	return domain || null;
}

export function serializeError(error: unknown): SerializableErrorShape {
	if (!error || typeof error !== 'object') {
		return { message: String(error) };
	}

	const record = error as Record<string, unknown>;
	return {
		name: typeof record.name === 'string' ? record.name : undefined,
		message: typeof record.message === 'string' ? record.message : undefined,
		status: typeof record.status === 'number' ? record.status : undefined
	};
}

export function logConciergeEvent(input: ConciergeLogEvent) {
	const payload = {
		timestamp: new Date().toISOString(),
		service: 'concierge-chat',
		level: input.level ?? 'info',
		event: input.event,
		route: input.route ?? null,
		sessionId: input.sessionId ?? null,
		threadId: input.threadId ?? null,
		requestId: input.request?.headers.get('cf-ray') ?? null,
		ip: resolveRequestIp(input.request),
		method: input.request?.method ?? null,
		data: sanitizeData(input.data) ?? null
	};

	const line = JSON.stringify(payload);
	switch (input.level) {
		case 'error':
			console.error(line);
			break;
		case 'warn':
			console.warn(line);
			break;
		default:
			console.log(line);
	}
}
