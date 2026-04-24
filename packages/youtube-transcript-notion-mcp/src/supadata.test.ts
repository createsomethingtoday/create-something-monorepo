import { describe, expect, it, vi } from 'vitest';

import { SupadataTranscriptProvider } from './supadata.js';
import { buildCanonicalVideoUrl } from './youtube.js';

const VIDEO_ID = 'ZDv4iYaLbpI';

describe('SupadataTranscriptProvider', () => {
  it('surfaces status details when configured', () => {
    const provider = new SupadataTranscriptProvider({
      apiKey: 'sd_test_key',
      transcriptMode: 'auto',
    });

    expect(provider.getStatus()).toMatchObject({
      name: 'supadata',
      configured: true,
      available: true,
      details: {
        transcriptMode: 'auto',
      },
    });
  });

  it('extracts transcript chunks and metadata from Supadata responses', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (url.startsWith('https://api.supadata.ai/v1/transcript?')) {
        return new Response(
          JSON.stringify({
            lang: 'en',
            availableLangs: ['en'],
            content: [
              { text: 'Hello world', offset: 0, duration: 1200, lang: 'en' },
              { text: 'Again', offset: 1200, duration: 800, lang: 'en' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.startsWith('https://api.supadata.ai/v1/youtube/video?')) {
        return new Response(
          JSON.stringify({
            title: 'Supadata Test Video',
            uploadDate: '2026-04-23T00:00:00.000Z',
            thumbnail: `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
            channel: {
              name: 'Cloudflare Developers',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response('', { status: 404 });
    });

    const provider = new SupadataTranscriptProvider(
      {
        apiKey: 'sd_test_key',
        transcriptMode: 'native',
      },
      fetchImpl as typeof fetch,
    );

    const result = await provider.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        extractionMethod: 'supadata',
        title: 'Supadata Test Video',
        channelName: 'Cloudflare Developers',
        publishedAt: '2026-04-23T00:00:00.000Z',
        transcript: 'Hello world Again',
        language: 'en',
        sourceDiagnostics: {
          strategy: 'supadata-api',
          transcriptMode: 'native',
          transcriptStatus: 200,
          metadataStatus: 200,
          availableLanguages: ['en'],
        },
      },
    });
  });

  it('retries Supadata metadata after a rate limit response', async () => {
    let metadataRequests = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (url.startsWith('https://api.supadata.ai/v1/transcript?')) {
        return new Response(
          JSON.stringify({
            lang: 'en',
            availableLangs: ['en'],
            content: [
              { text: 'Hello world', offset: 0, duration: 1200, lang: 'en' },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      if (url.startsWith('https://api.supadata.ai/v1/youtube/video?')) {
        metadataRequests += 1;

        if (metadataRequests === 1) {
          return new Response(
            JSON.stringify({
              error: 'limit-exceeded',
              message: 'Limit Exceeded',
              details: 'Request rate limit on current plan was exceeded.',
            }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': '0',
              },
            },
          );
        }

        return new Response(
          JSON.stringify({
            title: 'Supadata Retried Video',
            uploadDate: '2026-04-23T00:00:00.000Z',
            thumbnail: `https://i.ytimg.com/vi/${VIDEO_ID}/maxresdefault.jpg`,
            channel: {
              name: 'Cloudflare Developers',
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response('', { status: 404 });
    });

    const provider = new SupadataTranscriptProvider(
      {
        apiKey: 'sd_test_key',
      },
      fetchImpl as typeof fetch,
    );

    const result = await provider.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        title: 'Supadata Retried Video',
      },
    });
    expect(metadataRequests).toBe(2);
  });
});
