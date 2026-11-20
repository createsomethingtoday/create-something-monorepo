import { json } from '@sveltejs/kit';
import { readWeeklyScorecard } from '$lib/server/analytics-scorecard';
import { formatWeeklyReport } from '$lib/admin/weekly-scorecard';
import type { RequestHandler } from './$types';

// Identity + D1 admin role verification remains in hooks.server.ts. Defense in depth here.
export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (locals.user?.role !== 'admin')
    return json({ error: 'Admin authorization required' }, { status: 403, headers });
  try {
    const report = await readWeeklyScorecard(platform?.env ?? {}, url.searchParams.get('days'));
    if (url.searchParams.get('format') === 'markdown') {
      return new Response(formatWeeklyReport(report), {
        headers: {
          ...headers,
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': 'attachment; filename="audience-scorecard.md"'
        }
      });
    }
    return json(report, { headers });
  } catch {
    return json(
      { error: 'Scorecard unavailable. Retry; no zero values substituted.' },
      { status: 503, headers }
    );
  }
};
