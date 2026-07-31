export const FIRST_PARTY_SCHEDULER_ORIGIN =
	'https://create-something-scheduler.createsomething.workers.dev';

export const FIRST_PARTY_SCHEDULER_PATH = '/createsomething/together';

export type SchedulerHandoffContext = {
	source?: string;
	intent?: string;
	lane?: string;
	warmup?: string;
	readiness?: string;
	trafficClass?: SchedulerDeclaredTrafficClass;
	score?: number;
	atlasSessionId?: string;
	agentMessages?: number;
	warmupNotes?: string;
};

export type SchedulerDeclaredTrafficClass = 'internal' | 'test';

export type SchedulerAccess = {
	bookingId: string;
	actionToken: string;
	cleanPath: string;
};

export type SchedulerLifecycleAction =
	| 'booking_form_started'
	| 'booking_initiated'
	| 'booking_completed';

export type NormalizedSchedulerLifecycle = {
	action: SchedulerLifecycleAction;
	metadata: {
		surface: 'first-party-scheduler';
		schedulerSessionId?: string;
		trafficClass?: SchedulerDeclaredTrafficClass;
		bookingId?: string;
		receiptId?: string;
		durationMinutes?: number;
	};
};

const DECLARED_TRAFFIC_CLASSES = new Set<SchedulerDeclaredTrafficClass>(['internal', 'test']);
const SCHEDULER_LIFECYCLE_ACTIONS = new Set<SchedulerLifecycleAction>([
	'booking_form_started',
	'booking_initiated',
	'booking_completed'
]);
const BOOKING_ID = /^[A-Za-z0-9_-]{1,200}$/;
const ACTION_TOKEN = /^[A-Za-z0-9._~-]{16,4096}$/;
const SCHEDULER_DOCUMENT_HEIGHT_MIN = 320;
const SCHEDULER_DOCUMENT_HEIGHT_MAX = 6000;

function token(value: unknown, max: number): string {
	return String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, max);
}

function declaredTrafficClass(value: unknown): SchedulerDeclaredTrafficClass | undefined {
	const normalized = token(value, 20) as SchedulerDeclaredTrafficClass;
	return DECLARED_TRAFFIC_CLASSES.has(normalized) ? normalized : undefined;
}

export function buildFirstPartySchedulerUrl(search = ''): string {
	const target = new URL(FIRST_PARTY_SCHEDULER_PATH, FIRST_PARTY_SCHEDULER_ORIGIN);
	const context = schedulerHandoffContext(search);
	const append = (key: string, value: string | number | undefined) => {
		if (value !== undefined) target.searchParams.set(key, String(value));
	};
	append('source', context.source);
	append('intent', context.intent);
	append('lane', context.lane);
	append('warmup', context.warmup);
	append('readiness', context.readiness);
	append('traffic_class', context.trafficClass);
	append('score', context.score);
	append('atlas_session_id', context.atlasSessionId);
	append('agent_messages', context.agentMessages);
	const bookingId = new URLSearchParams(search).get('booking');
	if (bookingId && BOOKING_ID.test(bookingId)) target.searchParams.set('booking', bookingId);
	return target.toString();
}

export function normalizeSchedulerAccessUrl(value: string | URL): SchedulerAccess | null {
	let url: URL;
	try {
		url = value instanceof URL ? new URL(value.toString()) : new URL(value);
	} catch {
		return null;
	}
	if (url.origin !== 'https://createsomething.agency' || url.pathname !== '/book') return null;
	if (url.searchParams.has('access')) return null;
	const bookingId = url.searchParams.get('booking');
	const fragment = new URLSearchParams(url.hash.slice(1));
	const actionToken = fragment.get('access');
	if (
		!bookingId ||
		!BOOKING_ID.test(bookingId) ||
		!actionToken ||
		!ACTION_TOKEN.test(actionToken) ||
		Array.from(fragment.keys()).some((key) => key !== 'access')
	) return null;
	return {
		bookingId,
		actionToken,
		cleanPath: `${url.pathname}${url.search}`
	};
}

export function schedulerHandoffContext(search = '', warmupNotes?: string): SchedulerHandoffContext {
	const params = new URLSearchParams(search);
	const context: SchedulerHandoffContext = {};
	const copy = (key: string, target: keyof SchedulerHandoffContext, max: number) => {
		const value = token(params.get(key), max);
		if (value) Object.assign(context, { [target]: value });
	};
	copy('source', 'source', 64);
	copy('intent', 'intent', 90);
	copy('lane', 'lane', 64);
	copy('warmup', 'warmup', 64);
	copy('readiness', 'readiness', 64);
	copy('atlas_session_id', 'atlasSessionId', 100);
	const trafficClass = declaredTrafficClass(params.get('traffic_class'));
	if (trafficClass) context.trafficClass = trafficClass;
	if (params.has('score')) {
		const score = Number(params.get('score'));
		if (Number.isInteger(score) && score >= 0 && score <= 100) context.score = score;
	}
	if (params.has('agent_messages')) {
		const agentMessages = Number(params.get('agent_messages'));
		if (Number.isInteger(agentMessages) && agentMessages >= 0 && agentMessages <= 200) {
			context.agentMessages = agentMessages;
		}
	}
	const notes = warmupNotes
		?.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
		.trim();
	if (notes) context.warmupNotes = notes.slice(0, 2000);
	return context;
}

export function normalizeSchedulerLifecycleMessage(
	input: unknown
): NormalizedSchedulerLifecycle | null {
	if (!input || typeof input !== 'object') return null;
	const candidate = input as Record<string, unknown>;
	if (candidate.type !== 'create-something:scheduler-lifecycle') return null;

	const action = token(candidate.action, 40) as SchedulerLifecycleAction;
	if (!SCHEDULER_LIFECYCLE_ACTIONS.has(action)) return null;

	const schedulerSessionId = token(candidate.schedulerSessionId, 120) || undefined;
	const trafficClass = declaredTrafficClass(candidate.trafficClass);
	const bookingId = token(candidate.bookingId, 120) || undefined;
	const receiptId = token(candidate.receiptId, 120) || undefined;
	const duration = Number(candidate.durationMinutes);
	const durationMinutes =
		Number.isInteger(duration) && duration >= 15 && duration <= 240 ? duration : undefined;

	return {
		action,
		metadata: {
			surface: 'first-party-scheduler',
			...(schedulerSessionId ? { schedulerSessionId } : {}),
			...(trafficClass ? { trafficClass } : {}),
			...(bookingId ? { bookingId } : {}),
			...(receiptId ? { receiptId } : {}),
			...(durationMinutes ? { durationMinutes } : {})
		}
	};
}

export function normalizeSchedulerResizeMessage(input: unknown): number | null {
	if (!input || typeof input !== 'object') return null;
	const candidate = input as Record<string, unknown>;
	if (candidate.type !== 'create-something:scheduler-resize') return null;
	if (typeof candidate.height !== 'number') return null;
	const height = candidate.height;
	if (
		!Number.isFinite(height) ||
		height < SCHEDULER_DOCUMENT_HEIGHT_MIN ||
		height > SCHEDULER_DOCUMENT_HEIGHT_MAX
	) return null;
	return Math.ceil(height);
}
