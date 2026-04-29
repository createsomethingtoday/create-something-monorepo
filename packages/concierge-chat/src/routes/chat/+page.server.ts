import { getLatestDemoThread, listDemoThreads } from '$server/threads/demo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		threads: listDemoThreads(),
		latestThreadId: getLatestDemoThread()?.id ?? null
	};
};
