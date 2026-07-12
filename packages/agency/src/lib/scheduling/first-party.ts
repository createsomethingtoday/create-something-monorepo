export const FIRST_PARTY_SCHEDULER_ORIGIN =
	'https://create-something-scheduler.createsomething.workers.dev';

export const FIRST_PARTY_SCHEDULER_PATH = '/createsomething/together';

export type SchedulerHandoffContext = {
	source?: string;
	intent?: string;
	lane?: string;
	warmup?: string;
	readiness?: string;
	score?: number;
	atlasSessionId?: string;
	agentMessages?: number;
	warmupNotes?: string;
};

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
	append('score', context.score);
	append('atlas_session_id', context.atlasSessionId);
	append('agent_messages', context.agentMessages);
	return target.toString();
}

export function schedulerHandoffContext(search = '', warmupNotes?: string): SchedulerHandoffContext {
	const params = new URLSearchParams(search);
	const context: SchedulerHandoffContext = {};
	const token = (value: string | null, max: number) =>
		(value ?? '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9_-]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, max);
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
	const score = Number(params.get('score'));
	if (Number.isInteger(score) && score >= 0 && score <= 100) context.score = score;
	const agentMessages = Number(params.get('agent_messages'));
	if (Number.isInteger(agentMessages) && agentMessages >= 0 && agentMessages <= 200) {
		context.agentMessages = agentMessages;
	}
	const notes = warmupNotes
		?.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
		.trim();
	if (notes) context.warmupNotes = notes.slice(0, 2000);
	return context;
}
