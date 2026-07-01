import { createPublicHtmlCacheHandle } from '@create-something/canon/server/public-html-cache';

export const handle = createPublicHtmlCacheHandle({
	statusHeader: 'X-LTD-Edge-Cache',
	uncachedPathPrefixes: ['/account', '/api', '/auth', '/login', '/taste/insights']
});
