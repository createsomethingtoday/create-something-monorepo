import type { PageServerLoad } from './$types';
import { processUnsubscribe } from '@create-something/canon/newsletter';

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get('token');
	return processUnsubscribe(token, platform?.env?.DB);
};
