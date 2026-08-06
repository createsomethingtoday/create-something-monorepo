import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import worker from '../src/index.js';
import { TEMPLATES_COLLECTION_ID, verifyWebflowSignature } from '../src/webflow.js';
import { callWorker, createTestEnv } from './support/worker.js';

describe('current Webflow collection webhooks', () => {
  it('accepts a legacy body-only signature when that delivery also has a timestamp header', async () => {
    const body = JSON.stringify({ payload: { id: 'legacy' } });
    const signature = createHmac('sha256', 'legacy-webhook-secret').update(body).digest('hex');

    await expect(verifyWebflowSignature('legacy-webhook-secret', body, signature, '1785850000000')).resolves.toBe(true);
  });

  it('accepts the timestamp-bound v2 signature and routes collectionId events', async () => {
    const { env, close } = createTestEnv();
    env.WEBFLOW_WEBHOOK_SECRET = 'current-webhook-secret';

    try {
      await env.DB.prepare(
        'INSERT INTO template_documents (id, template_slug, name, synced_at) VALUES (?, ?, ?, ?)',
      )
        .bind('recCurrentWebhook', 'before-webhook', 'Webhook Template', '2026-08-04T00:00:00.000Z')
        .run();

      const payload = {
        triggerType: 'collection_item_changed',
        payload: {
          id: 'webflow-item-current',
          collectionId: TEMPLATES_COLLECTION_ID,
          isArchived: false,
          isDraft: false,
          fieldData: {
            'sync-record-id': 'recCurrentWebhook',
            name: 'Webhook Template',
            slug: 'current-webhook-template',
            thumbnail: { url: 'https://cdn.prod.website-files.com/site/current-webhook.webp' },
            'thumbnail-secondary': { url: 'https://cdn.prod.website-files.com/site/current-webhook-secondary.webp' },
            'slider-images': [{ url: 'https://cdn.prod.website-files.com/site/current-webhook-slide.webp' }],
          },
        },
      };
      const body = JSON.stringify(payload);
      const timestamp = '1785850000000';
      const signature = createHmac('sha256', 'current-webhook-secret').update(`${timestamp}:${body}`).digest('hex');

      const response = await callWorker(
        new Request('https://templates.test/api/templates/webhooks/webflow', {
          method: 'POST',
          body,
          headers: {
            'content-type': 'application/json',
            'x-webflow-timestamp': timestamp,
            'x-webflow-signature': signature,
          },
        }),
        env,
      );

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({ status: 'updated', collection: 'templates', id: 'recCurrentWebhook' });

      const row = await env.DB.prepare(
        'SELECT template_slug, listing_url, thumbnail_image_url, thumbnail_image_secondary_url, carousel_image_urls_json FROM template_documents WHERE id = ?',
      )
        .bind('recCurrentWebhook')
        .first<{
          template_slug: string;
          listing_url: string | null;
          thumbnail_image_url: string | null;
          thumbnail_image_secondary_url: string | null;
          carousel_image_urls_json: string;
        }>();

      expect(row).toMatchObject({
        template_slug: 'current-webhook-template',
        listing_url: 'https://webflow.com/templates/html/current-webhook-template',
        thumbnail_image_url: 'https://cdn.prod.website-files.com/site/current-webhook.webp',
        thumbnail_image_secondary_url: 'https://cdn.prod.website-files.com/site/current-webhook-secondary.webp',
      });
      expect(JSON.parse(row?.carousel_image_urls_json ?? '[]')).toEqual(['https://cdn.prod.website-files.com/site/current-webhook-slide.webp']);
    } finally {
      close();
    }
  });
});
