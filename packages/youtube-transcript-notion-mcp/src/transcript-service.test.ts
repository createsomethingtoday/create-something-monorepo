import { describe, expect, it, vi } from 'vitest';

import {
  BrowserTranscriptProvider,
  DefaultTranscriptService,
  DirectTranscriptProvider,
  detectYouTubeBotChallengeText,
  extractTranscriptSegmentsFromJson3,
  isLikelyYouTubeBotChallengeFromCaptionTrackAttempts,
} from './transcript-service.js';
import {
  buildBrowserFallbackVideoUrl,
  buildCanonicalVideoUrl,
  buildMobileWatchVideoUrl,
} from './youtube.js';
import type {
  TranscriptProvider,
  TranscriptProviderName,
  TranscriptProviderResult,
  TranscriptRecord,
} from './types.js';

const VIDEO_ID = 'ZDv4iYaLbpI';

function createRecord(extractionMethod: TranscriptProviderName): TranscriptRecord {
  return {
    videoId: VIDEO_ID,
    url: buildCanonicalVideoUrl(VIDEO_ID),
    title: 'Transcript Test Video',
    channelName: 'CREATE SOMETHING',
    publishedAt: '2026-04-20',
    thumbnailUrl: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`,
    transcript: 'First segment Second segment',
    segments: [
      { text: 'First segment', startSeconds: 0, endSeconds: 12 },
      { text: 'Second segment', startSeconds: 12, endSeconds: 24 },
    ],
    extractionMethod,
    language: 'en',
    warnings: [],
    sourceDiagnostics: {
      attempts: [],
    },
  };
}

function createProvider(
  name: TranscriptProviderName,
  result: TranscriptProviderResult,
  available = true,
): TranscriptProvider {
  return {
    name,
    extract: vi.fn(async () => result),
    getStatus: () => ({
      name,
      configured: available,
      available,
    }),
  };
}

function createMobilePlayerHtml(
  captionTracks: Array<Record<string, unknown>>,
  title = 'Binding Test Video',
  bodyContent = '',
): string {
  return [
    '<html><body>',
    '<script>var ytInitialPlayerResponse = null;</script>',
    `<script>var ytInitialPlayerResponse = ${JSON.stringify({
      playabilityStatus: { status: 'OK' },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks,
        },
      },
      microformat: {
        playerMicroformatRenderer: {
          title: {
            runs: [{ text: title }],
          },
          ownerChannelName: 'CREATE SOMETHING',
          publishDate: '2026-04-24',
          thumbnail: {
            thumbnails: [
              { url: `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg` },
            ],
          },
        },
      },
      videoDetails: {
        title,
        author: 'CREATE SOMETHING',
      },
    })};</script>`,
    bodyContent,
    '</body></html>',
  ].join('');
}

describe('DefaultTranscriptService', () => {
  it('returns the Supadata result when the Supadata provider succeeds', async () => {
    const supadataProvider = createProvider('supadata', {
      ok: true,
      record: createRecord('supadata'),
    });
    const directProvider = createProvider('direct', {
      ok: true,
      record: createRecord('direct'),
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(
      supadataProvider,
      directProvider,
      browserProvider,
      'en',
    );

    const result = await service.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result.extractionMethod).toBe('supadata');
    expect(result.sourceDiagnostics.attempts).toEqual([
      {
        provider: 'supadata',
        ok: true,
        details: {
          extractionMethod: 'supadata',
          segmentCount: 2,
        },
      },
    ]);
    expect(directProvider.extract).not.toHaveBeenCalled();
    expect(browserProvider.extract).not.toHaveBeenCalled();
  });

  it('falls back to direct and browser providers when Supadata fails', async () => {
    const supadataProvider = createProvider('supadata', {
      ok: false,
      error: {
        code: 'SUPADATA_RATE_LIMITED',
        message: 'Supadata rate limited this request.',
      },
    });
    const directProvider = createProvider('direct', {
      ok: false,
      error: {
        code: 'FAILED_PRECONDITION',
        message: 'Direct transcript extraction failed with status 400.',
      },
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(
      supadataProvider,
      directProvider,
      browserProvider,
      'en',
    );

    const result = await service.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result.extractionMethod).toBe('browser');
    expect(result.warnings).toEqual([
      'Supadata extraction failed: Supadata rate limited this request.',
      'Direct extraction failed: Direct transcript extraction failed with status 400.',
    ]);
    expect(result.sourceDiagnostics.attempts).toHaveLength(3);
    expect(result.sourceDiagnostics.attempts[0]).toMatchObject({
      provider: 'supadata',
      ok: false,
      code: 'SUPADATA_RATE_LIMITED',
    });
  });

  it('returns the direct result when the direct provider succeeds', async () => {
    const directProvider = createProvider('direct', {
      ok: true,
      record: createRecord('direct'),
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(undefined, directProvider, browserProvider, 'en');

    const result = await service.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result.extractionMethod).toBe('direct');
    expect(result.sourceDiagnostics.attempts).toHaveLength(1);
    expect(result.sourceDiagnostics.attempts[0]).toMatchObject({
      provider: 'direct',
      ok: true,
    });
    expect(browserProvider.extract).not.toHaveBeenCalled();
  });

  it('falls back to the browser provider when the direct provider fails', async () => {
    const directProvider = createProvider('direct', {
      ok: false,
      error: {
        code: 'FAILED_PRECONDITION',
        message: 'Direct transcript extraction failed with status 400.',
      },
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(undefined, directProvider, browserProvider, 'en');

    const result = await service.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result.extractionMethod).toBe('browser');
    expect(result.warnings).toContain(
      'Direct extraction failed: Direct transcript extraction failed with status 400.',
    );
    expect(result.sourceDiagnostics.attempts).toHaveLength(2);
    expect(result.sourceDiagnostics.attempts[1]).toMatchObject({
      provider: 'browser',
      ok: true,
    });
    expect(browserProvider.extract).toHaveBeenCalledOnce();
  });

  it('skips the direct provider when browser-first mode is configured', async () => {
    const directProvider = createProvider('direct', {
      ok: true,
      record: createRecord('direct'),
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(
      undefined,
      directProvider,
      browserProvider,
      'en',
      'browser-first',
    );

    const result = await service.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result.extractionMethod).toBe('browser');
    expect(result.warnings).toEqual([]);
    expect(result.sourceDiagnostics).toMatchObject({
      attempts: [
        {
          provider: 'browser',
          ok: true,
        },
      ],
      directProviderMode: 'browser-first',
    });
    expect(directProvider.extract).not.toHaveBeenCalled();
    expect(browserProvider.extract).toHaveBeenCalledOnce();
  });

  it('raises a capability error when browser fallback is unavailable', async () => {
    const directProvider = createProvider('direct', {
      ok: false,
      error: {
        code: 'FAILED_PRECONDITION',
        message: 'Direct transcript extraction failed with status 400.',
        details: {
          status: 400,
        },
      },
    });
    const browserProvider = createProvider(
      'browser',
      {
        ok: false,
        error: {
          code: 'BROWSER_FALLBACK_UNAVAILABLE',
          message: 'Browser fallback is unavailable.',
        },
      },
      false,
    );
    const service = new DefaultTranscriptService(undefined, directProvider, browserProvider, 'en');

    await expect(
      service.extract({
        videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
      }),
    ).rejects.toMatchObject({
      code: 'BROWSER_FALLBACK_UNAVAILABLE',
      diagnostics: {
        directErrorDetails: {
          status: 400,
        },
      },
      warnings: [
        'Direct extraction failed: Direct transcript extraction failed with status 400.',
      ],
    });
    expect(browserProvider.extract).not.toHaveBeenCalled();
  });

  it('preserves browser provider diagnostics when the fallback fails', async () => {
    const directProvider = createProvider('direct', {
      ok: false,
      error: {
        code: 'FAILED_PRECONDITION',
        message: 'Direct transcript extraction failed with status 400.',
      },
    });
    const browserProvider = createProvider('browser', {
      ok: false,
      error: {
        code: 'TRANSCRIPT_PANEL_UNAVAILABLE',
        message: 'Could not find a transcript control on the YouTube watch page.',
        details: {
          strategy: 'description-panel',
          operatorGuidance: {
            profileConfigured: false,
            recommendedAction:
              'Configure STEEL_PROFILE_ID for a persistent Steel profile and sign in to YouTube in that profile before retrying transcript extraction.',
          },
          timeline: [{ step: 'goto:done', elapsedMs: 1200 }],
        },
      },
    });
    const service = new DefaultTranscriptService(undefined, directProvider, browserProvider, 'en');

    await expect(
      service.extract({
        videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
      }),
    ).rejects.toMatchObject({
      code: 'TRANSCRIPT_PANEL_UNAVAILABLE',
      diagnostics: {
        browserErrorDetails: {
          strategy: 'description-panel',
          operatorGuidance: {
            profileConfigured: false,
            recommendedAction:
              'Configure STEEL_PROFILE_ID for a persistent Steel profile and sign in to YouTube in that profile before retrying transcript extraction.',
          },
          timeline: [{ step: 'goto:done', elapsedMs: 1200 }],
        },
      },
      warnings: [
        'Direct extraction failed: Direct transcript extraction failed with status 400.',
      ],
    });
    expect(browserProvider.extract).toHaveBeenCalledOnce();
  });

  it('reports the active provider order in service status', () => {
    const supadataProvider = createProvider('supadata', {
      ok: true,
      record: createRecord('supadata'),
    });
    const directProvider = createProvider('direct', {
      ok: true,
      record: createRecord('direct'),
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(
      supadataProvider,
      directProvider,
      browserProvider,
      'en',
    );

    expect(service.getStatus()).toMatchObject({
      defaultLanguage: 'en',
      directProviderMode: 'auto',
      primaryProvider: 'supadata',
      attemptOrder: ['supadata', 'direct', 'browser'],
    });
  });

  it('reports browser as the only active provider in browser-first mode', () => {
    const directProvider = createProvider('direct', {
      ok: true,
      record: createRecord('direct'),
    });
    const browserProvider = createProvider('browser', {
      ok: true,
      record: createRecord('browser'),
    });
    const service = new DefaultTranscriptService(
      undefined,
      directProvider,
      browserProvider,
      'en',
      'browser-first',
    );

    expect(service.getStatus()).toMatchObject({
      directProviderMode: 'browser-first',
      primaryProvider: 'browser',
      attemptOrder: ['browser'],
    });
  });
});

describe('BrowserTranscriptProvider', () => {
  it('surfaces trusted profile guidance in status when no profile is configured', () => {
    const provider = new BrowserTranscriptProvider({
      steelApiKey: 'steel_test_key',
    });

    expect(provider.getStatus()).toMatchObject({
      name: 'browser',
      configured: true,
      available: true,
      details: {
        profileConfigured: false,
        operatorGuidance: {
          profileConfigured: false,
          recommendedAction: expect.stringContaining('Configure STEEL_PROFILE_ID'),
        },
      },
    });
  });

  it('surfaces verification guidance when a trusted profile is configured', () => {
    const provider = new BrowserTranscriptProvider({
      steelApiKey: 'steel_test_key',
      steelProfileId: 'profile_123',
    });

    expect(provider.getStatus()).toMatchObject({
      details: {
        profileConfigured: true,
        operatorGuidance: {
          profileConfigured: true,
          recommendedAction: expect.stringContaining('Verify that the configured Steel profile'),
        },
      },
    });
  });
});

describe('DirectTranscriptProvider', () => {
  it('detects YouTube bot challenge copy in rendered text', () => {
    expect(
      detectYouTubeBotChallengeText(
        "Sign in to confirm you’re not a bot. This helps protect our community.",
      ),
    ).toMatchObject({
      detected: true,
      indicators: expect.arrayContaining(["sign in to confirm you're not a bot"]),
    });

    expect(detectYouTubeBotChallengeText('Regular watch page text only.')).toMatchObject({
      detected: false,
      indicators: [],
    });
  });

  it('treats uniformly empty caption-track payloads as a likely trust gate', () => {
    expect(
      isLikelyYouTubeBotChallengeFromCaptionTrackAttempts([
        { status: 200, payloadLength: 0 },
        { status: 200, payloadLength: 0 },
      ]),
    ).toBe(true);

    expect(
      isLikelyYouTubeBotChallengeFromCaptionTrackAttempts([
        { status: 200, payloadLength: 0 },
        { status: 200, payloadLength: 14 },
      ]),
    ).toBe(false);
  });

  it('uses a fetch wrapper that preserves the Cloudflare global this binding', async () => {
    const originalFetch = globalThis.fetch;
    const fetchCalls: string[] = [];

    globalThis.fetch = (async function (
      this: typeof globalThis,
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      if (this !== globalThis) {
        throw new Error('Illegal invocation');
      }

      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      fetchCalls.push(url);

      if (url.includes('/api/timedtext')) {
        return new Response(
          JSON.stringify({
            events: [
              {
                tStartMs: 0,
                dDurationMs: 1000,
                segs: [{ utf8: 'Hello world' }],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        createMobilePlayerHtml([
          {
            baseUrl: `/api/timedtext?v=${VIDEO_ID}&lang=en&track=asr`,
            languageCode: 'en',
            kind: 'asr',
            name: { simpleText: 'English (auto-generated)' },
          },
          {
            baseUrl: `/api/timedtext?v=${VIDEO_ID}&lang=en&track=manual`,
            languageCode: 'en',
            name: { simpleText: 'English' },
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      );
    } as typeof fetch);

    try {
      const provider = new DirectTranscriptProvider();
      const result = await provider.extract({
        videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
      });

      expect(result).toMatchObject({
        ok: true,
      });
      expect(fetchCalls).toHaveLength(2);
      expect(fetchCalls[0]).toBe(buildMobileWatchVideoUrl(VIDEO_ID));
      expect(fetchCalls[1]).toContain('track=manual');
      expect(fetchCalls[1]).toContain('fmt=json3');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to the legacy transcript route when the mobile player lacks caption tracks', async () => {
    const fetchCalls: string[] = [];
    let transcriptRequestBody: string | undefined;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      fetchCalls.push(url);

      if (url === buildMobileWatchVideoUrl(VIDEO_ID)) {
        return new Response(createMobilePlayerHtml([], 'Mobile Watch Without Captions'), {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
      }

      if (url.includes('/youtubei/v1/get_transcript')) {
        transcriptRequestBody = String(init?.body ?? '');
        return new Response(
          JSON.stringify({
            actions: [
              {
                updateEngagementPanelAction: {
                  content: {
                    transcriptRenderer: {
                      content: {
                        transcriptSearchPanelRenderer: {
                          body: {
                            transcriptSegmentListRenderer: {
                              initialSegments: [
                                {
                                  transcriptSegmentRenderer: {
                                    startMs: '0',
                                    endMs: '1000',
                                    snippet: {
                                      simpleText: 'Hello from the legacy route',
                                    },
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        [
          '<html><head>',
          '<meta property="og:title" content="Legacy Fallback Video" />',
          '<meta itemprop="author" content="CREATE SOMETHING" />',
          '<meta itemprop="datePublished" content="2026-04-24" />',
          '</head><body>{"visitorData":"visitor-data-token","getTranscriptEndpoint":{"params":"page-transcript-params"}}</body></html>',
        ].join(''),
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      );
    });

    const provider = new DirectTranscriptProvider(fetchImpl as typeof fetch);
    const result = await provider.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        extractionMethod: 'direct',
        sourceDiagnostics: {
          strategy: 'legacy-get_transcript',
          previousAttempt: {
            code: 'TRANSCRIPT_UNAVAILABLE',
          },
        },
      },
    });
    expect(fetchCalls).toEqual([
      buildMobileWatchVideoUrl(VIDEO_ID),
      buildBrowserFallbackVideoUrl(VIDEO_ID),
      'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false',
    ]);
    expect(JSON.parse(transcriptRequestBody ?? '{}')).toMatchObject({
      params: 'page-transcript-params',
    });
  });

  it('falls back to alternate timedtext formats when json3 is empty', async () => {
    const fetchCalls: string[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      fetchCalls.push(url);

      if (url === buildMobileWatchVideoUrl(VIDEO_ID)) {
        return new Response(
          createMobilePlayerHtml([
            {
              baseUrl: `/api/timedtext?v=${VIDEO_ID}&lang=en&track=asr`,
              languageCode: 'en',
              kind: 'asr',
              name: { simpleText: 'English (auto-generated)' },
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        );
      }

      if (url.includes('fmt=json3')) {
        return new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (url.includes('fmt=srv3')) {
        return new Response(
          '<transcript><text start="0.0" dur="1.0">Hello</text><text start="1.0" dur="1.2">world</text></transcript>',
          { status: 200, headers: { 'Content-Type': 'application/xml' } },
        );
      }

      return new Response('', { status: 404 });
    });

    const provider = new DirectTranscriptProvider(fetchImpl as typeof fetch);
    const result = await provider.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        transcript: 'Hello world',
        sourceDiagnostics: {
          strategy: 'mobile-player-caption-track',
          captionTrack: {
            format: 'srv3',
            parser: 'xml',
          },
        },
      },
    });
    expect(fetchCalls).toEqual([
      buildMobileWatchVideoUrl(VIDEO_ID),
      `https://www.youtube.com/api/timedtext?v=${VIDEO_ID}&lang=en&track=asr&fmt=json3`,
      `https://www.youtube.com/api/timedtext?v=${VIDEO_ID}&lang=en&track=asr&fmt=srv3`,
    ]);
  });

  it('classifies the mobile watch page challenge as a bot gate', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

      if (url === buildMobileWatchVideoUrl(VIDEO_ID)) {
        return new Response(
          createMobilePlayerHtml(
            [
              {
                baseUrl: `/api/timedtext?v=${VIDEO_ID}&lang=en&track=asr`,
                languageCode: 'en',
                kind: 'asr',
                name: { simpleText: 'English (auto-generated)' },
              },
            ],
            'Gated Watch Page',
            "<div>Sign in to confirm you're not a bot. This helps protect our community.</div>",
          ),
          { status: 200, headers: { 'Content-Type': 'text/html' } },
        );
      }

      if (url.includes('/api/timedtext')) {
        return new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response('', { status: 404 });
    });

    const provider = new DirectTranscriptProvider(fetchImpl as typeof fetch);
    const result = await provider.extract({
      videoUrl: buildCanonicalVideoUrl(VIDEO_ID),
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: 'BOT_CHALLENGE',
        message:
          'YouTube asked this session to sign in to confirm it is not a bot on the mobile watch page.',
        details: {
          botChallenge: {
            detected: true,
            indicators: expect.arrayContaining(["sign in to confirm you're not a bot"]),
          },
        },
      },
    });
  });
});

describe('extractTranscriptSegmentsFromJson3', () => {
  it('normalizes json3 caption events into transcript segments', () => {
    const segments = extractTranscriptSegmentsFromJson3({
      events: [
        {
          tStartMs: 0,
          dDurationMs: 1500,
          segs: [{ utf8: 'Hello' }, { utf8: '\nworld' }],
        },
        {
          tStartMs: 1600,
          dDurationMs: 900,
          segs: [{ utf8: 'Again' }],
        },
        {
          tStartMs: 'not-a-number',
          segs: [{ utf8: 'Ignored' }],
        },
      ],
    });

    expect(segments).toEqual([
      { text: 'Hello world', startSeconds: 0, endSeconds: 1.5 },
      { text: 'Again', startSeconds: 1.6, endSeconds: 2.5 },
    ]);
  });
});
