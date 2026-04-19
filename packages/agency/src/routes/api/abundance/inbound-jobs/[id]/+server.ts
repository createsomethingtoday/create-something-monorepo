import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import {
  getInboundJob,
  isInboundJobStatus,
  updateInboundJob
} from '$lib/server/abundance-inbound-jobs';
import { requireAgencyOperator } from '$lib/server/operator-auth';

export const GET: RequestHandler = async ({ params, cookies, platform }) => {
  try {
    await requireAgencyOperator({ cookies, platform });

    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
    }

    const job = await getInboundJob(db, params.id);
    if (!job) {
      return json({ error: 'not_found', message: 'Inbound job not found' }, { status: 404 });
    }

    return json({ success: true, data: job });
  } catch (error) {
    return handleError(error);
  }
};

export const PATCH: RequestHandler = async ({ params, request, cookies, platform }) => {
  try {
    await requireAgencyOperator({ cookies, platform });

    const db = platform?.env?.DB;
    if (!db) {
      return json({ error: 'unavailable', message: 'Database is unavailable' }, { status: 503 });
    }

    const body = (await request.json().catch(() => null)) as {
      status?: string;
      notes?: string | null;
    } | null;

    if (!body || (body.status === undefined && body.notes === undefined)) {
      return json(
        { error: 'invalid_request', message: 'status or notes must be provided' },
        { status: 400 }
      );
    }

    const validatedStatus =
      body.status === undefined ? undefined : isInboundJobStatus(body.status) ? body.status : null;

    if (validatedStatus === null) {
      return json(
        {
          error: 'invalid_request',
          message: 'status must be one of new, reviewing, qualified, rejected, archived'
        },
        { status: 400 }
      );
    }

    const updated = await updateInboundJob(db, params.id, {
      status: validatedStatus,
      notes: body.notes ?? null
    });

    if (!updated) {
      return json({ error: 'not_found', message: 'Inbound job not found' }, { status: 404 });
    }

    return json({ success: true, data: updated });
  } catch (error) {
    return handleError(error);
  }
};

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
