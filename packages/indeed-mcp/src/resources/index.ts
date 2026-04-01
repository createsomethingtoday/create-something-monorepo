import type { ScopedMcpServer } from '@create-something/mcp-core';

import { getRuntimeMetadata, requireDb } from '../runtime.js';
import {
  getApplicationByLocalId,
  getJobByLocalId,
  getQuestionsDocument,
  getSyncStatusSummary,
  listRecentWebhookEvents,
  renderFeedFromStorage,
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
    'Indeed Sync Status',
    'indeed://sync-status',
    {
      description: 'Aggregate job/application/webhook counts for the Indeed Apply staffing integration.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const status = await getSyncStatusSummary(db, ctx.accountId);
      return jsonResource(uri, status);
    },
  );

  server.resource(
    'Indeed Recent Webhook Events',
    'indeed://webhook-events/recent',
    {
      description: 'Recent Indeed Apply webhook deliveries and their processing status.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const events = await listRecentWebhookEvents(db, ctx.accountId, 20);
      return jsonResource(uri, { events });
    },
  );

  server.resource(
    'Indeed Job Detail',
    'indeed://jobs/{local_job_id}',
    {
      description: 'Canonical Indeed job configuration.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const localJobId = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      try {
        const job = await getJobByLocalId(db, ctx.accountId, localJobId);
        return jsonResource(uri, job);
      } catch {
        return jsonResource(uri, { error: 'Job not found.', local_job_id: localJobId });
      }
    },
  );

  server.resource(
    'Indeed Application Detail',
    'indeed://applications/{local_application_id}',
    {
      description: 'Canonical Indeed application plus related job context.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const localApplicationId = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const application = await getApplicationByLocalId(db, ctx.accountId, localApplicationId);
      return jsonResource(
        uri,
        application ?? { error: 'Application not found.', local_application_id: localApplicationId },
      );
    },
  );

  server.resource(
    'Indeed Feed Snapshot',
    'indeed://feeds/current',
    {
      description: 'Current XML feed generated from active Indeed jobs.',
      mimeType: 'application/xml',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const runtime = getRuntimeMetadata(ctx);
      const rendered = await renderFeedFromStorage(
        db,
        ctx.accountId,
        {
          apiToken: await ctx.tokenProvider.getAccessToken(),
          publisher: runtime.feedPublisher,
          publisherUrl: runtime.feedPublisherUrl,
          publicBaseUrl: runtime.publicBaseUrl,
        },
        {},
      );

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/xml',
            text: rendered.xml,
          },
        ],
      };
    },
  );

  server.resource(
    'Indeed Questions JSON',
    'indeed://questions/{local_job_id}',
    {
      description: 'Stored Indeed Apply screener JSON document for a job.',
      mimeType: 'application/json',
    },
    async (uri, ctx) => {
      const db = requireDb(ctx);
      const localJobId = decodeURIComponent(uri.pathname.replace(/^\/+/, ''));
      const questions = await getQuestionsDocument(db, ctx.accountId, localJobId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: questions ?? JSON.stringify({ error: 'Questions not found.', local_job_id: localJobId }, null, 2),
          },
        ],
      };
    },
  );
}

