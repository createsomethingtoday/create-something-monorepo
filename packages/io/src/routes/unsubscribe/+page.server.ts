import type { PageServerLoad } from './$types';
import { processUnsubscribe } from '@create-something/canon/newsletter';

export const load: PageServerLoad = async ({ url, platform }) => {
	if (url.searchParams.get('preview') === 'operator-seed') {
		return { success: false, error: null, email: null, preview: true };
	}
	const token = url.searchParams.get('token');
	return processUnsubscribe(token, platform?.env?.DB);
};
