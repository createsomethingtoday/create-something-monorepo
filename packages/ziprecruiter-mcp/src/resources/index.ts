import type { ScopedMcpServer } from '@create-something/mcp-core';

import { requireDb } from '../runtime.js';
import {
  getApplicationDetailByLocalId,
  getJobDetailByLocalId,
  getSyncStatusSummary,
  listRecentWebhookEvents,
} from '../storage.js';

function jsonResource(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerResources(server: ScopedMcpServer): void {
  server.resource(
    'ZipRecruiter Sync Status',
    'ziprecruiter://sync-status',
    {
      description: 'Aggregate job/application/webhook counts for the ZipRecruiter staffing integration.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const status = await getSyncStatusSummary(db);
      return jsonResource(uri, status);
    },
  );

  server.resource(
    'ZipRecruiter Recent Webhook Events',
    'ziprecruiter://webhook-events/recent',
    {
      description: 'Recent Apply Webhook deliveries and their processing status.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const events = await listRecentWebhookEvents(db, 20);
      return jsonResource(uri, { events });
    },
  );

  server.resource(
    'ZipRecruiter Job Detail',
    'ziprecruiter://jobs/{local_job_id}',
    {
      description: 'Canonical staffing job plus its ZipRecruiter linkage.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const localJobId = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const job = await getJobDetailByLocalId(db, localJobId);
      return jsonResource(uri, job ?? { error: 'Job not found.', local_job_id: localJobId });
    },
  );

  server.resource(
    'ZipRecruiter Application Detail',
    'ziprecruiter://applications/{local_application_id}',
    {
      description: 'Canonical staffing application plus candidate and job context.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const localApplicationId = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const application = await getApplicationDetailByLocalId(db, localApplicationId);
      return jsonResource(
        uri,
        application ?? { error: 'Application not found.', local_application_id: localApplicationId },
      );
    },
  );
}
