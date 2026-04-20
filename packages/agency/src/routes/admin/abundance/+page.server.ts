import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { INBOUND_JOB_STATUSES, type InboundJobStatus } from '$lib/types/abundance';
import {
  handoffInboundJobToFunnelLead,
  isInboundJobStatus,
  listInboundJobs,
  listInboundJobSourceAgents,
  summarizeInboundJobs,
  updateInboundJob
} from '$lib/server/abundance-inbound-jobs';
import { runFunnelLeadAutomation } from '$lib/server/funnel-automation';
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
      page: {
        start: 0,
        end: 0,
        previousPageHref: null,
        nextPageHref: null
      },
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

  const pageStart = result.total === 0 ? 0 : filters.offset + 1;
  const pageEnd = Math.min(filters.offset + result.jobs.length, result.total);
  const hasPreviousPage = filters.offset > 0;
  const hasNextPage = filters.offset + result.jobs.length < result.total;

  return {
    operator_email: operator.email,
    jobs: result.jobs,
    total: result.total,
    page: {
      start: pageStart,
      end: pageEnd,
      previousPageHref: hasPreviousPage
        ? buildAbundancePageHref(filters, Math.max(filters.offset - filters.limit, 0))
        : null,
      nextPageHref: hasNextPage
        ? buildAbundancePageHref(filters, filters.offset + filters.limit)
        : null
    },
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
  },

  handoff: async ({ request, cookies, platform }) => {
    const operator = await requireAgencyOperator({ cookies, platform });

    const db = platform?.env?.DB;
    if (!db) {
      return fail(503, { error: 'Database is unavailable' });
    }

    const formData = await request.formData();
    const id = String(formData.get('id') ?? '').trim();

    if (!id) {
      return fail(400, { error: 'Job id is required' });
    }

    try {
      const result = await handoffInboundJobToFunnelLead(db, id, {
        operator_email: operator.email
      });

      if (!result) {
        return fail(404, { error: 'Inbound job not found' });
      }

      if (result.created) {
        const automationPromise = runFunnelLeadAutomation({
          db,
          env: platform.env,
          lead: result.lead,
          trigger: 'lead_created'
        }).catch((automationError) => {
          console.error('Abundance handoff automation failed:', automationError);
          return null;
        });

        if (platform.context) {
          platform.context.waitUntil(automationPromise);
        } else {
          await automationPromise;
        }
      }

      return {
        handoff_success: true,
        handoff_job_id: result.job.id,
        handoff_lead_id: result.lead.id,
        handoff_created: result.created
      };
    } catch (error) {
      if (error instanceof TypeError) {
        return fail(400, { error: error.message });
      }

      throw error;
    }
  }
};

function coercePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function buildAbundancePageHref(
  filters: {
    status: InboundJobStatus | 'all';
    source_agent: string;
    q: string;
    limit: number;
  },
  offset: number
): string {
  const params = new URLSearchParams();
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.source_agent) params.set('source_agent', filters.source_agent);
  if (filters.q) params.set('q', filters.q);
  params.set('limit', String(filters.limit));
  params.set('offset', String(offset));
  return `/admin/abundance?${params.toString()}`;
}
