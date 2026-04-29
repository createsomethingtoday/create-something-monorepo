import { getConciergeDemoSettings } from '$server/threads/demo';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		settings: getConciergeDemoSettings()
	};
};
