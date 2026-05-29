import { createAnalyticsHealthHandler } from '@create-something/canon/analytics';

export const { GET } = createAnalyticsHealthHandler({
	properties: ['agency', 'io', 'ltd', 'space', 'lms'],
	staleAfterHours: 24
});
