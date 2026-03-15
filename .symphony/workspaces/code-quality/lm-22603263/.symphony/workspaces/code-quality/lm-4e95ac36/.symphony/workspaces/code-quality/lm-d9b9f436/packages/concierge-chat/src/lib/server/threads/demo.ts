import { conciergeDemoStore, conciergeSettings } from '$demo/concierge';

export function listDemoThreads() {
	return conciergeDemoStore.list();
}

export function getDemoThread(threadId: string) {
	return conciergeDemoStore.get(threadId);
}

export function getLatestDemoThread() {
	return conciergeDemoStore.latest();
}

export function getConciergeDemoSettings() {
	return conciergeSettings;
}
