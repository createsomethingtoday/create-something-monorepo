import { renderSitemap } from '@create-something/canon/search';
import type { RequestHandler } from './$types';

import { getLtdSitemapPaths } from '$lib/search/sitemap';

export const GET: RequestHandler = async ({ platform }) =>
  new Response(
    renderSitemap(
      'https://createsomething.ltd',
      await getLtdSitemapPaths(platform?.env?.DB)
    ),
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600'
      }
    }
  );
