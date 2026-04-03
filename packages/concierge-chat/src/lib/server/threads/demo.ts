import {
	conciergeSettings,
	getLatestSeedThread,
	getSeedThread,
	listSeedThreads
} from '$demo/concierge';

export function listDemoThreads() {
	return listSeedThreads();
}

export function getDemoThread(threadId: string) {
	return getSeedThread(threadId);
}

export function getLatestDemoThread() {
	return getLatestSeedThread();
}

export function getConciergeDemoSettings() {
	return conciergeSettings;
}
