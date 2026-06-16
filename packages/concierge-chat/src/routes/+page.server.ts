import { getLatestDemoThread, listDemoThreads } from '$server/threads/demo';
import {
	clearCommunicationRules,
	difyRuntimeBoundary,
	operatorMode,
	operatorShellPlanes,
	operatorStateDefinitions
} from '$lib/operator/clear-shell';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		threads: listDemoThreads(),
		latestThreadId: getLatestDemoThread()?.id ?? null,
		operatorMode,
		operatorShellPlanes,
		operatorStateDefinitions,
		clearCommunicationRules,
		difyRuntimeBoundary
	};
};
