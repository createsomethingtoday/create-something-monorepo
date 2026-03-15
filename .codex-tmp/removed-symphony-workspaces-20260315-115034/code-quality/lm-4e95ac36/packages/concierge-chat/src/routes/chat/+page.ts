import { getLatestDemoThread, listDemoThreads } from '$server/threads/demo';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	return {
		threads: listDemoThreads(),
		latestThreadId: getLatestDemoThread()?.id ?? null
	};
};
