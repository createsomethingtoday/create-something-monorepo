import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import {
  ingestInboundJob,
  isInboundJobStatus,
  listInboundJobs,
  listInboundJobSourceAgents,
  summarizeInboundJobs,
  toInboundJobsCsv
} from '$lib/server/abundance-inbound-jobs';
import type { InboundJobStatus } from '$lib/types/abundance';
import { requireAgencyOperator } from '$lib/server/operator-auth';

const DEFAULT_JSON_LIMIT = 50;
const DEFAULT_CSV_LIMIT = 1000;

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  try {
    await requireAgencyOperator({ cookies, platform });

    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
    }

    const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
    const statusParam = url.searchParams.get('status');

    if (statusParam && statusParam !== 'all' && !isInboundJobStatus(statusParam)) {
      return json(
        {
          error: 'invalid_request',
          message: 'status must be one of new, reviewing, qualified, rejected, archived, or all'
        },
        { status: 400 }
      );
    }

    const statusFilter: InboundJobStatus | 'all' | undefined =
      statusParam === 'all'
        ? 'all'
        : statusParam && isInboundJobStatus(statusParam)
          ? statusParam
          : undefined;

    const defaultLimit = format === 'csv' ? DEFAULT_CSV_LIMIT : DEFAULT_JSON_LIMIT;
    const limit = Number.parseInt(url.searchParams.get('limit') ?? `${defaultLimit}`, 10);
    const offset = Number.parseInt(url.searchParams.get('offset') ?? '0', 10);

    const [result, stats, sourceAgents] = await Promise.all([
      listInboundJobs(db, {
        status: statusFilter,
        source_agent: url.searchParams.get('source_agent') ?? undefined,
        search: url.searchParams.get('q') ?? undefined,
        limit: Number.isFinite(limit) ? limit : defaultLimit,
        offset: Number.isFinite(offset) ? Math.max(offset, 0) : 0
      }),
      summarizeInboundJobs(db),
      listInboundJobSourceAgents(db)
    ]);

    if (format === 'csv') {
      const filenameDate = new Date().toISOString().slice(0, 10);
      return new Response(toInboundJobsCsv(result.jobs), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="abundance-inbound-jobs-${filenameDate}.csv"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    return json({
      success: true,
      data: result.jobs,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      stats,
      available_source_agents: sourceAgents
    });
  } catch (error) {
    return handleError(error);
  }
};

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  try {
    await requireInboundJobIngestAccess({ request, cookies, platform });

    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || Array.isArray(body)) {
      return json(
        { error: 'invalid_request', message: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const result = await ingestInboundJob(db, body);

    return json(
      {
        success: true,
        data: result.job,
        created: result.created,
        duplicate: result.duplicate
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    if (error instanceof TypeError) {
      return json({ error: 'invalid_request', message: error.message }, { status: 400 });
    }
    return handleError(error);
  }
};

async function requireInboundJobIngestAccess(input: {
  request: Request;
  cookies: Parameters<typeof requireAgencyOperator>[0]['cookies'];
  platform: App.Platform | undefined;
}) {
  const configuredKey = input.platform?.env?.ABUNDANCE_INGEST_API_KEY?.trim();
  const providedKey = input.request.headers.get('x-abundance-ingest-key')?.trim();

  if (configuredKey && providedKey === configuredKey) {
    return;
  }

  await requireAgencyOperator({ cookies: input.cookies, platform: input.platform });
}

function handleError(error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && 'body' in error) {
    const kitError = error as { status: number; body?: { message?: string } };
    return json(
      { error: 'request_failed', message: kitError.body?.message ?? 'Request failed' },
      { status: kitError.status }
    );
  }

  return json(
    {
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unexpected error'
    },
    { status: 500 }
  );
}
