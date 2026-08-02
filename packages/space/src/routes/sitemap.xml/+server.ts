import { renderSitemap } from '@create-something/canon/search';
import type { RequestHandler } from './$types';

import { getSpaceSitemapPaths } from '$lib/search/sitemap';

export const GET: RequestHandler = () =>
  new Response(renderSitemap('https://createsomething.space', getSpaceSitemapPaths()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
