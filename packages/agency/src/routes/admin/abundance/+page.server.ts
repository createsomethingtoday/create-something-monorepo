import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { INBOUND_JOB_STATUSES, type InboundJobStatus } from '$lib/types/abundance';
import {
  isInboundJobStatus,
  listInboundJobs,
  listInboundJobSourceAgents,
  summarizeInboundJobs,
  updateInboundJob
} from '$lib/server/abundance-inbound-jobs';
import { requireAgencyOperator } from '$lib/server/operator-auth';

const DEFAULT_LIMIT = 50;

export const load: PageServerLoad = async ({ cookies, platform, url }) => {
  const operator = await requireAgencyOperator({ cookies, platform });
  const db = platform?.env?.DB;

  const rawStatus = url.searchParams.get('status');
  const statusFilter: InboundJobStatus | 'all' =
    rawStatus === 'all' ? 'all' : rawStatus && isInboundJobStatus(rawStatus) ? rawStatus : 'all';
  const filters = {
    status: statusFilter,
    source_agent: url.searchParams.get('source_agent') ?? '',
    q: url.searchParams.get('q') ?? '',
    limit: coercePositiveInt(url.searchParams.get('limit'), DEFAULT_LIMIT),
    offset: coercePositiveInt(url.searchParams.get('offset'), 0)
  };

  if (!db) {
    return {
      operator_email: operator.email,
      jobs: [],
      total: 0,
      stats: {
        total: 0,
        new_count: 0,
        reviewing_count: 0,
        qualified_count: 0,
        rejected_count: 0,
        archived_count: 0
      },
      sourceAgents: [],
      filters,
      statuses: INBOUND_JOB_STATUSES,
      exportHref: '/api/abundance/inbound-jobs?format=csv',
      error: 'Database is unavailable',
      generatedAt: new Date().toISOString()
    };
  }

  const [result, stats, sourceAgents] = await Promise.all([
    listInboundJobs(db, {
      status: filters.status === 'all' ? 'all' : filters.status,
      source_agent: filters.source_agent || undefined,
      search: filters.q || undefined,
      limit: filters.limit,
      offset: filters.offset
    }),
    summarizeInboundJobs(db),
    listInboundJobSourceAgents(db)
  ]);

  const exportParams = new URLSearchParams({ format: 'csv' });
  if (filters.status !== 'all' && filters.status) exportParams.set('status', filters.status);
  if (filters.source_agent) exportParams.set('source_agent', filters.source_agent);
  if (filters.q) exportParams.set('q', filters.q);

  return {
    operator_email: operator.email,
    jobs: result.jobs,
    total: result.total,
    stats,
    sourceAgents,
    filters,
    statuses: INBOUND_JOB_STATUSES,
    exportHref: `/api/abundance/inbound-jobs?${exportParams.toString()}`,
    generatedAt: new Date().toISOString()
  };
};

export const actions: Actions = {
  save: async ({ request, cookies, platform }) => {
    await requireAgencyOperator({ cookies, platform });

    const db = platform?.env?.DB;
    if (!db) {
      return fail(503, { error: 'Database is unavailable' });
    }

    const formData = await request.formData();
    const id = String(formData.get('id') ?? '').trim();
    const status = String(formData.get('status') ?? '').trim();
    const notes = formData.get('notes');

    if (!id) {
      return fail(400, { error: 'Job id is required' });
    }

    if (!isInboundJobStatus(status)) {
      return fail(400, { error: 'A valid status is required' });
    }

    const updated = await updateInboundJob(db, id, {
      status,
      notes: typeof notes === 'string' ? notes : null
    });

    if (!updated) {
      return fail(404, { error: 'Inbound job not found' });
    }

    return {
      success: true,
      updated_job_id: updated.id,
      updated_status: updated.status
    };
  }
};

function coercePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
