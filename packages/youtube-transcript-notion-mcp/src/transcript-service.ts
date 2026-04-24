import Steel from 'steel-sdk';
import type { Browser, Page } from 'puppeteer-core';

import {
  DEFAULT_TRANSCRIPT_LANGUAGE,
  STEEL_BROWSER_TIMEOUT_MS,
  TRANSCRIPT_PANEL_TIMEOUT_MS,
  YOUTUBE_ANDROID_CLIENT_VERSION,
  YOUTUBE_ANDROID_USER_AGENT,
  YOUTUBE_MOBILE_USER_AGENT,
  YOUTUBE_NAVIGATION_TIMEOUT_MS,
  YOUTUBE_ORIGIN,
  YOUTUBE_WEB_USER_AGENT,
} from './config.js';
import {
  extractTranscriptSegmentsFromVtt,
  extractTranscriptSegmentsFromXml,
  normalizeTranscriptSegments,
  segmentsToPlainTranscript,
  type RawTranscriptSegment,
} from './transcript.js';
import {
  buildBrowserFallbackVideoUrl,
  buildMobileWatchVideoUrl,
  extractInitialPlayerResponseFromHtml,
  extractVideoMetadataFromPlayerResponse,
  extractVideoMetadataFromHtml,
  extractTranscriptParamsFromHtml,
  extractVisitorData,
  normalizeVideoReference,
} from './youtube.js';
import { connectPuppeteer } from './puppeteer-runtime.js';
import { SupadataTranscriptProvider } from './supadata.js';
import type {
  SourceAttemptDiagnostic,
  TranscriptExtractionInput,
  TranscriptProviderName,
  TranscriptProvider,
  TranscriptProviderError,
  TranscriptProviderResult,
  TranscriptRecord,
  TranscriptService,
} from './types.js';

type ProviderErrorDetails = Record<string, unknown> | undefined;
const workerFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

export class TranscriptExtractionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly diagnostics: Record<string, unknown>,
    public readonly warnings: string[] = [],
  ) {
    super(message);
    this.name = 'TranscriptExtractionError';
  }
}

function providerFailure(
  code: string,
  message: string,
  details?: ProviderErrorDetails,
): TranscriptProviderResult {
  return {
    ok: false,
    error: {
      code,
      message,
      details,
    },
  };
}

function buildSteelProfileOperatorGuidance(profileConfigured: boolean): Record<string, unknown> {
  if (profileConfigured) {
    return {
      profileConfigured: true,
      recommendedAction:
        'Verify that the configured Steel profile is still trusted and signed in to YouTube before retrying transcript extraction.',
      rationale:
        'Trusted Steel profiles reduce the chance that YouTube will gate transcript surfaces behind a sign-in or anti-bot check.',
    };
  }

  return {
    profileConfigured: false,
    recommendedAction:
      'Configure STEEL_PROFILE_ID for a persistent Steel profile and sign in to YouTube in that profile before retrying transcript extraction.',
    rationale:
      'Anonymous Steel sessions are more likely to hit YouTube sign-in or anti-bot challenges.',
  };
}

function toAttemptDiagnostic(
  provider: TranscriptProviderName,
  result: TranscriptProviderResult,
): SourceAttemptDiagnostic {
  if (result.ok) {
    return {
      provider,
      ok: true,
      details: {
        extractionMethod: result.record.extractionMethod,
        segmentCount: result.record.segments.length,
      },
    };
  }

  return {
    provider,
    ok: false,
    code: result.error.code,
    message: result.error.message,
    details: result.error.details,
  };
}

function providerLabel(provider: TranscriptProviderName): string {
  switch (provider) {
    case 'supadata':
      return 'Supadata';
    case 'direct':
      return 'Direct';
    case 'browser':
      return 'Browser';
  }
}

function extractTranscriptSegmentsFromPayload(payload: any): RawTranscriptSegment[] {
  const action = payload?.actions?.[0];
  const webSegments =
    action?.updateEngagementPanelAction?.content?.transcriptRenderer?.content
      ?.transcriptSearchPanelRenderer?.body?.transcriptSegmentListRenderer
      ?.initialSegments;
  const androidSegments =
    action?.elementsCommand?.transformEntityCommand?.arguments
      ?.transformTranscriptSegmentListArguments?.overwrite?.initialSegments;

  const rawSegments = (webSegments ?? androidSegments ?? []) as Array<any>;

  return rawSegments
    .map((segment) => {
      const renderer = segment?.transcriptSegmentRenderer;
      if (!renderer) {
        return null;
      }

      const text =
        renderer.snippet?.elementsAttributedString?.content ??
        renderer.snippet?.runs?.map((part: any) => part.text).join('') ??
        renderer.snippet?.simpleText ??
        '';
      const startMs = Number.parseInt(renderer.startMs ?? '0', 10);
      const endMs = Number.parseInt(renderer.endMs ?? '0', 10);

      if (!text.trim()) {
        return null;
      }

      return {
        text,
        startSeconds: startMs / 1000,
        endSeconds: Number.isFinite(endMs) ? endMs / 1000 : undefined,
      };
    })
    .filter(Boolean) as RawTranscriptSegment[];
}

export function extractTranscriptSegmentsFromJson3(payload: any): RawTranscriptSegment[] {
  const events = Array.isArray(payload?.events) ? payload.events : [];

  return events
    .map((event: any) => {
      const segments = Array.isArray(event?.segs) ? event.segs : [];
      const text = segments
        .map((segment: any) => segment?.utf8 ?? '')
        .join('')
        .replace(/\n+/g, ' ')
        .trim();
      const startMs = Number(event?.tStartMs ?? NaN);
      const durationMs = Number(event?.dDurationMs ?? NaN);

      if (!text || !Number.isFinite(startMs)) {
        return null;
      }

      return {
        text,
        startSeconds: startMs / 1000,
        endSeconds: Number.isFinite(durationMs) ? (startMs + durationMs) / 1000 : undefined,
      };
    })
    .filter(Boolean) as RawTranscriptSegment[];
}

type DirectCaptionTrackSelection = {
  track: any;
  availableLanguages: string[];
  selection: 'exact-language' | 'language-prefix' | 'default-manual' | 'first-available';
};

type CaptionTrackPayloadFormat = 'json3' | 'srv3' | 'ttml' | 'vtt' | 'default';
type CaptionTrackPayloadParser = 'json3' | 'xml' | 'vtt';

type CaptionTrackAttempt = {
  format: CaptionTrackPayloadFormat;
  requestUrl: string;
  status: number;
  payloadLength: number;
  parser?: CaptionTrackPayloadParser;
  segmentCount?: number;
  parseError?: string;
  bodyPreview?: string;
};

type CaptionTrackResolutionResult =
  | {
      ok: true;
      format: CaptionTrackPayloadFormat;
      parser: CaptionTrackPayloadParser;
      requestUrl: string;
      payloadText: string;
      status: number;
      segments: TranscriptRecord['segments'];
      attempts: CaptionTrackAttempt[];
    }
  | {
      ok: false;
      message: string;
      status?: number;
      requestUrl?: string;
      payloadText?: string;
      attempts: CaptionTrackAttempt[];
    };

const CAPTION_TRACK_FORMATS: CaptionTrackPayloadFormat[] = [
  'json3',
  'srv3',
  'ttml',
  'vtt',
  'default',
];

type BotChallengeSignal = {
  detected: boolean;
  indicators: string[];
  sample?: string;
};

const YOUTUBE_BOT_CHALLENGE_INDICATORS = [
  "sign in to confirm you're not a bot",
  'sign in to confirm you are not a bot',
  "confirm you're not a bot",
  'confirm you are not a bot',
  'unusual traffic from your computer network',
  'our systems have detected unusual traffic',
];

function normalizeBotChallengeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function buildBotChallengeSample(text: string, indicator: string): string | undefined {
  const normalized = normalizeBotChallengeText(text);
  const index = normalized.indexOf(indicator);
  if (index === -1) {
    return undefined;
  }

  return normalized.slice(Math.max(0, index - 80), Math.min(normalized.length, index + indicator.length + 80));
}

export function detectYouTubeBotChallengeText(text: string): BotChallengeSignal {
  const normalized = normalizeBotChallengeText(text);
  if (!normalized) {
    return {
      detected: false,
      indicators: [],
    };
  }

  const indicators = YOUTUBE_BOT_CHALLENGE_INDICATORS.filter((indicator) =>
    normalized.includes(indicator),
  );

  return {
    detected: indicators.length > 0,
    indicators,
    sample: indicators[0] ? buildBotChallengeSample(normalized, indicators[0]) : undefined,
  };
}

export function isLikelyYouTubeBotChallengeFromCaptionTrackAttempts(
  attempts: Array<{ status: number; payloadLength: number }> | undefined,
): boolean {
  return Array.isArray(attempts) && attempts.length > 0
    ? attempts.every((attempt) => attempt.status === 200 && attempt.payloadLength === 0)
    : false;
}

async function detectYouTubeBotChallengeOnPage(page: Page): Promise<BotChallengeSignal> {
  try {
    const snapshot = await page.evaluate(() => ({
      title: document.title ?? '',
      bodyText: document.body?.innerText ?? document.body?.textContent ?? '',
    }));

    return detectYouTubeBotChallengeText(`${snapshot.title}\n${snapshot.bodyText}`);
  } catch {
    return {
      detected: false,
      indicators: [],
    };
  }
}

function isLikelyYouTubeBotChallengeFromCaptionTracks(
  ...results: Array<BrowserCaptionTrackResult | undefined>
): boolean {
  return results.some((result) =>
    isLikelyYouTubeBotChallengeFromCaptionTrackAttempts(result?.attempts),
  );
}

function extractTrackDisplayName(track: any): string | undefined {
  const simpleText = track?.name?.simpleText?.trim();
  if (simpleText) {
    return simpleText;
  }

  const runs = Array.isArray(track?.name?.runs) ? track.name.runs : [];
  const joined = runs
    .map((entry: any) => entry?.text ?? '')
    .join('')
    .trim();
  return joined || undefined;
}

function buildCaptionTrackRequestUrl(
  baseUrl: string,
  format: CaptionTrackPayloadFormat,
): string {
  const url = new URL(baseUrl, YOUTUBE_ORIGIN);
  if (format === 'default') {
    url.searchParams.delete('fmt');
  } else {
    url.searchParams.set('fmt', format);
  }
  return url.toString();
}

function buildCaptionTrackParserOrder(
  payloadText: string,
  format: CaptionTrackPayloadFormat,
): CaptionTrackPayloadParser[] {
  const order: CaptionTrackPayloadParser[] = [];
  const add = (parser: CaptionTrackPayloadParser) => {
    if (!order.includes(parser)) {
      order.push(parser);
    }
  };

  const trimmed = payloadText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    add('json3');
  }
  if (/^WEBVTT/i.test(trimmed)) {
    add('vtt');
  }
  if (trimmed.startsWith('<')) {
    add('xml');
  }

  switch (format) {
    case 'json3':
      add('json3');
      break;
    case 'vtt':
      add('vtt');
      break;
    case 'srv3':
    case 'ttml':
    case 'default':
      add('xml');
      add('vtt');
      add('json3');
      break;
  }

  return order;
}

function parseCaptionTrackPayloadText(
  payloadText: string,
  format: CaptionTrackPayloadFormat,
): {
  segments: TranscriptRecord['segments'];
  parser?: CaptionTrackPayloadParser;
  parseError?: string;
} {
  const trimmed = payloadText.trim();
  if (!trimmed) {
    return {
      segments: [],
      parseError: 'Caption track payload was empty.',
    };
  }

  const parserOrder = buildCaptionTrackParserOrder(trimmed, format);
  let lastParseError: string | undefined;

  for (const parser of parserOrder) {
    try {
      const rawSegments =
        parser === 'json3'
          ? extractTranscriptSegmentsFromJson3(JSON.parse(trimmed))
          : parser === 'vtt'
            ? extractTranscriptSegmentsFromVtt(trimmed)
            : extractTranscriptSegmentsFromXml(trimmed);
      const segments = normalizeTranscriptSegments(rawSegments);

      if (segments.length > 0) {
        return {
          segments,
          parser,
        };
      }

      lastParseError = `No transcript segments found in ${parser} payload.`;
    } catch (error) {
      lastParseError =
        error instanceof Error ? error.message : `Failed to parse ${parser} payload.`;
    }
  }

  return {
    segments: [],
    parser: parserOrder[0],
    parseError: lastParseError ?? 'No transcript segments found in caption track payload.',
  };
}

async function resolveCaptionTrackPayload(
  baseUrl: string,
  fetchPayload: (requestUrl: string) => Promise<{ status: number; payloadText: string }>,
): Promise<CaptionTrackResolutionResult> {
  const attempts: CaptionTrackAttempt[] = [];

  for (const format of CAPTION_TRACK_FORMATS) {
    const requestUrl = buildCaptionTrackRequestUrl(baseUrl, format);

    let response: { status: number; payloadText: string };
    try {
      response = await fetchPayload(requestUrl);
    } catch (error) {
      attempts.push({
        format,
        requestUrl,
        status: 0,
        payloadLength: 0,
        parseError: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const attempt: CaptionTrackAttempt = {
      format,
      requestUrl,
      status: response.status,
      payloadLength: response.payloadText.length,
    };

    if (response.status < 200 || response.status >= 300) {
      attempt.parseError = `Caption track request failed with status ${response.status}.`;
      attempt.bodyPreview = response.payloadText.slice(0, 500);
      attempts.push(attempt);
      continue;
    }

    const parsed = parseCaptionTrackPayloadText(response.payloadText, format);
    attempt.parser = parsed.parser;
    attempt.segmentCount = parsed.segments.length;
    attempt.parseError = parsed.parseError;
    attempts.push(attempt);

    if (parsed.segments.length > 0 && parsed.parser) {
      return {
        ok: true,
        format,
        parser: parsed.parser,
        requestUrl,
        payloadText: response.payloadText,
        status: response.status,
        segments: parsed.segments,
        attempts,
      };
    }
  }

  const lastAttempt = attempts[attempts.length - 1];
  return {
    ok: false,
    message: 'YouTube returned no usable transcript payload for the selected caption track.',
    status: lastAttempt?.status,
    requestUrl: lastAttempt?.requestUrl,
    attempts,
  };
}

function preferManualTrack(tracks: any[]): any | undefined {
  return tracks.find((track) => String(track?.kind ?? '').toLowerCase() !== 'asr') ?? tracks[0];
}

function selectCaptionTrack(
  tracks: any[],
  requestedLanguage: string,
): DirectCaptionTrackSelection | null {
  if (tracks.length === 0) {
    return null;
  }

  const availableLanguages = Array.from(
    new Set(
      tracks
        .map((track) => String(track?.languageCode ?? '').trim())
        .filter((languageCode) => Boolean(languageCode)),
    ),
  );

  const normalizedRequested = requestedLanguage.trim().toLowerCase();
  if (normalizedRequested) {
    const exact = tracks.filter(
      (track) =>
        String(track?.languageCode ?? '').trim().toLowerCase() === normalizedRequested,
    );
    if (exact.length > 0) {
      return {
        track: preferManualTrack(exact),
        availableLanguages,
        selection: 'exact-language',
      };
    }

    if (normalizedRequested.length >= 2) {
      const prefix = tracks.filter((track) =>
        String(track?.languageCode ?? '')
          .trim()
          .toLowerCase()
          .startsWith(normalizedRequested.slice(0, 2)),
      );
      if (prefix.length > 0) {
        return {
          track: preferManualTrack(prefix),
          availableLanguages,
          selection: 'language-prefix',
        };
      }
    }
  }

  const manualTrack = preferManualTrack(
    tracks.filter((track) => String(track?.kind ?? '').toLowerCase() !== 'asr'),
  );
  if (manualTrack) {
    return {
      track: manualTrack,
      availableLanguages,
      selection: 'default-manual',
    };
  }

  return {
    track: tracks[0],
    availableLanguages,
    selection: 'first-available',
  };
}

export class DirectTranscriptProvider implements TranscriptProvider {
  readonly name = 'direct' as const;

  constructor(private readonly fetchImpl: typeof fetch = workerFetch) {}

  getStatus() {
    return {
      name: this.name,
      configured: true,
      available: true,
    };
  }

  private encodeVarint(value: number): number[] {
    const bytes: number[] = [];
    let remaining = value;

    while (remaining > 0x7f) {
      bytes.push((remaining & 0x7f) | 0x80);
      remaining >>>= 7;
    }

    bytes.push(remaining);
    return bytes;
  }

  private buildTranscriptParams(videoId: string, language: string): string {
    const innerParts = [
      0x0a,
      0x03,
      ...Buffer.from('asr'),
      0x12,
      ...this.encodeVarint(language.length),
      ...Buffer.from(language),
      0x1a,
      0x00,
    ];
    const innerBase64 = Buffer.from(innerParts).toString('base64');
    const innerEncoded = encodeURIComponent(innerBase64);
    const panelName = 'engagement-panel-searchable-transcript-search-panel';

    const outerParts = [
      0x0a,
      ...this.encodeVarint(videoId.length),
      ...Buffer.from(videoId),
      0x12,
      ...this.encodeVarint(innerEncoded.length),
      ...Buffer.from(innerEncoded),
      0x18,
      0x01,
      0x2a,
      ...this.encodeVarint(panelName.length),
      ...Buffer.from(panelName),
      0x30,
      0x01,
      0x38,
      0x01,
      0x40,
      0x01,
    ];

    return Buffer.from(outerParts).toString('base64');
  }

  private detectFailureCode(status: number, bodyText: string): string {
    if (status === 429) {
      return 'RATE_LIMITED';
    }
    if (/FAILED_PRECONDITION/i.test(bodyText)) {
      return 'FAILED_PRECONDITION';
    }
    if (/LOGIN_REQUIRED/i.test(bodyText)) {
      return 'LOGIN_REQUIRED';
    }
    if (/TRANSCRIPT/i.test(bodyText) && /UNAVAILABLE|NOT FOUND/i.test(bodyText)) {
      return 'TRANSCRIPT_UNAVAILABLE';
    }
    if (status === 404) {
      return 'TRANSCRIPT_NOT_FOUND';
    }
    if (status >= 500) {
      return 'YOUTUBE_UPSTREAM_ERROR';
    }
    return 'DIRECT_REQUEST_FAILED';
  }

  private async extractViaMobilePlayer(
    reference: { videoId: string; url: string },
    language: string,
  ): Promise<TranscriptProviderResult> {
    const mobileWatchUrl = buildMobileWatchVideoUrl(reference.videoId);
    const watchResponse = await this.fetchImpl(mobileWatchUrl, {
      headers: {
        'User-Agent': YOUTUBE_MOBILE_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!watchResponse.ok) {
      return providerFailure(
        'WATCH_PAGE_FAILED',
        `Failed to fetch the YouTube mobile watch page (${watchResponse.status}).`,
        {
          status: watchResponse.status,
          watchUrl: mobileWatchUrl,
        },
      );
    }

    const html = await watchResponse.text();
    const watchBotChallenge = detectYouTubeBotChallengeText(html);
    const playerResponse = extractInitialPlayerResponseFromHtml(html);
    if (!playerResponse) {
      return providerFailure(
        watchBotChallenge.detected ? 'BOT_CHALLENGE' : 'PLAYER_RESPONSE_UNAVAILABLE',
        watchBotChallenge.detected
          ? 'YouTube asked this session to sign in to confirm it is not a bot on the mobile watch page.'
          : 'The YouTube mobile watch page did not expose a player response.',
        {
          watchUrl: mobileWatchUrl,
          watchPageStatus: watchResponse.status,
          ...(watchBotChallenge.detected ? { botChallenge: watchBotChallenge } : {}),
        },
      );
    }

    const metadata = extractVideoMetadataFromPlayerResponse(playerResponse, reference.videoId);
    const playabilityStatus = (playerResponse as any)?.playabilityStatus;
    const captionTracks = Array.isArray(
      (playerResponse as any)?.captions?.playerCaptionsTracklistRenderer?.captionTracks,
    )
      ? ((playerResponse as any).captions.playerCaptionsTracklistRenderer.captionTracks as any[])
      : [];
    const selectedTrack = selectCaptionTrack(captionTracks, language);

    if (!selectedTrack) {
      return providerFailure(
        watchBotChallenge.detected ? 'BOT_CHALLENGE' : 'TRANSCRIPT_UNAVAILABLE',
        watchBotChallenge.detected
          ? 'YouTube asked this session to sign in to confirm it is not a bot on the mobile watch page.'
          : 'YouTube did not expose caption tracks on the mobile watch page.',
        {
          watchUrl: mobileWatchUrl,
          watchPageStatus: watchResponse.status,
          playabilityStatus: playabilityStatus?.status,
          playabilityReason: playabilityStatus?.reason,
          ...(watchBotChallenge.detected ? { botChallenge: watchBotChallenge } : {}),
        },
      );
    }

    const baseUrl = String(selectedTrack.track?.baseUrl ?? '').trim();
    if (!baseUrl) {
      return providerFailure(
        'TRANSCRIPT_TRACK_UNAVAILABLE',
        'The selected caption track is missing a baseUrl.',
        {
          watchUrl: mobileWatchUrl,
          availableLanguages: selectedTrack.availableLanguages,
          languageCode: selectedTrack.track?.languageCode,
          kind: selectedTrack.track?.kind,
          selection: selectedTrack.selection,
        },
      );
    }

    const captionTrackResult = await resolveCaptionTrackPayload(
      baseUrl,
      async (requestUrl) => {
        const response = await this.fetchImpl(requestUrl, {
          headers: {
            'User-Agent': YOUTUBE_WEB_USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });

        return {
          status: response.status,
          payloadText: await response.text(),
        };
      },
    );

    if (!captionTrackResult.ok) {
      const failedAttempt =
        [...captionTrackResult.attempts]
          .reverse()
          .find((attempt) => attempt.status >= 400) ?? captionTrackResult.attempts.at(-1);
      const failureCode =
        failedAttempt && failedAttempt.status >= 400
          ? this.detectFailureCode(failedAttempt.status, failedAttempt.bodyPreview ?? '')
          : 'INVALID_CAPTION_TRACK_PAYLOAD';

      return providerFailure(
        watchBotChallenge.detected ? 'BOT_CHALLENGE' : failureCode,
        watchBotChallenge.detected
          ? 'YouTube asked this session to sign in to confirm it is not a bot on the mobile watch page.'
          : failedAttempt && failedAttempt.status >= 400
            ? `Direct caption track extraction failed with status ${failedAttempt.status}.`
            : captionTrackResult.message,
        {
          status: failedAttempt?.status,
          bodyPreview: failedAttempt?.bodyPreview,
          requestedUrl: failedAttempt?.requestUrl ?? captionTrackResult.requestUrl,
          attempts: captionTrackResult.attempts,
          availableLanguages: selectedTrack.availableLanguages,
          languageCode: selectedTrack.track?.languageCode,
          kind: selectedTrack.track?.kind,
          selection: selectedTrack.selection,
          ...(watchBotChallenge.detected ? { botChallenge: watchBotChallenge } : {}),
        },
      );
    }

    const segments = captionTrackResult.segments;

    return {
      ok: true,
      record: {
        videoId: reference.videoId,
        url: reference.url,
        title: metadata.title ?? `Video ${reference.videoId}`,
        channelName: metadata.channelName,
        publishedAt: metadata.publishedAt,
        thumbnailUrl: metadata.thumbnailUrl,
        transcript: segmentsToPlainTranscript(segments),
        segments,
        extractionMethod: 'direct',
        language: String(selectedTrack.track?.languageCode ?? language).trim() || language,
        warnings: [],
        sourceDiagnostics: {
          attempts: [],
          provider: 'direct',
          strategy: 'mobile-player-caption-track',
          watchUrl: mobileWatchUrl,
          watchPageStatus: watchResponse.status,
          transcriptStatus: captionTrackResult.status,
          playabilityStatus: playabilityStatus?.status,
          playabilityReason: playabilityStatus?.reason,
          captionTrack: {
            selection: selectedTrack.selection,
            languageCode: selectedTrack.track?.languageCode,
            kind: selectedTrack.track?.kind,
            name: extractTrackDisplayName(selectedTrack.track),
            availableLanguages: selectedTrack.availableLanguages,
            format: captionTrackResult.format,
            parser: captionTrackResult.parser,
            requestUrl: captionTrackResult.requestUrl,
            attempts: captionTrackResult.attempts,
          },
        },
      },
    };
  }

  private async extractViaInnertubeTranscript(
    reference: { videoId: string; url: string },
    language: string,
    previousAttempt?: TranscriptProviderError,
  ): Promise<TranscriptProviderResult> {
    const watchUrl = buildBrowserFallbackVideoUrl(reference.videoId);
    const watchResponse = await this.fetchImpl(watchUrl, {
      headers: {
        'User-Agent': YOUTUBE_WEB_USER_AGENT,
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!watchResponse.ok) {
      return providerFailure(
        'WATCH_PAGE_FAILED',
        `Failed to fetch the YouTube watch page (${watchResponse.status}).`,
        {
          status: watchResponse.status,
          watchUrl,
          previousAttempt,
        },
      );
    }

    const html = await watchResponse.text();
    const watchBotChallenge = detectYouTubeBotChallengeText(html);
    const metadata = extractVideoMetadataFromHtml(html, reference.videoId);
    const visitorData = extractVisitorData(html);
    const pageTranscriptParams = extractTranscriptParamsFromHtml(html);
    const transcriptResponse = await this.fetchImpl(
      'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': YOUTUBE_ANDROID_USER_AGENT,
          Origin: YOUTUBE_ORIGIN,
        },
        body: JSON.stringify({
          context: {
            client: {
              hl: language,
              gl: 'US',
              clientName: 'ANDROID',
              clientVersion: YOUTUBE_ANDROID_CLIENT_VERSION,
              androidSdkVersion: 30,
              ...(visitorData ? { visitorData } : {}),
            },
          },
          params: pageTranscriptParams ?? this.buildTranscriptParams(reference.videoId, language),
        }),
      },
    );

    const responseText = await transcriptResponse.text();
    if (!transcriptResponse.ok) {
      return providerFailure(
        watchBotChallenge.detected ? 'BOT_CHALLENGE' : this.detectFailureCode(transcriptResponse.status, responseText),
        watchBotChallenge.detected
          ? 'YouTube asked this session to sign in to confirm it is not a bot on the watch page.'
          : `Direct transcript extraction failed with status ${transcriptResponse.status}.`,
        {
          status: transcriptResponse.status,
          bodyPreview: responseText.slice(0, 500),
          watchUrl,
          previousAttempt,
          ...(watchBotChallenge.detected ? { botChallenge: watchBotChallenge } : {}),
        },
      );
    }

    const payload = JSON.parse(responseText) as any;
    if (payload?.error) {
      return providerFailure(
        this.detectFailureCode(transcriptResponse.status, JSON.stringify(payload.error)),
        payload.error?.message ?? 'YouTube returned an error while loading the transcript.',
        {
          error: payload.error,
          watchUrl,
          previousAttempt,
        },
      );
    }

    const segments = normalizeTranscriptSegments(extractTranscriptSegmentsFromPayload(payload));
    if (segments.length === 0) {
      return providerFailure(
        'EMPTY_TRANSCRIPT',
        'YouTube returned no transcript segments for this video.',
        {
          status: transcriptResponse.status,
          watchUrl,
          previousAttempt,
        },
      );
    }

    return {
      ok: true,
      record: {
        videoId: reference.videoId,
        url: reference.url,
        title: metadata.title ?? `Video ${reference.videoId}`,
        channelName: metadata.channelName,
        publishedAt: metadata.publishedAt,
        thumbnailUrl: metadata.thumbnailUrl,
        transcript: segmentsToPlainTranscript(segments),
        segments,
        extractionMethod: 'direct',
        language,
        warnings: [],
        sourceDiagnostics: {
          attempts: [],
          provider: 'direct',
          strategy: 'legacy-get_transcript',
          watchUrl,
          watchPageStatus: watchResponse.status,
          transcriptStatus: transcriptResponse.status,
          visitorDataPresent: Boolean(visitorData),
          transcriptParamsSource: pageTranscriptParams ? 'page' : 'generated',
          previousAttempt,
        },
      },
    };
  }

  async extract(input: TranscriptExtractionInput): Promise<TranscriptProviderResult> {
    const language = input.language?.trim() || DEFAULT_TRANSCRIPT_LANGUAGE;
    let reference;

    try {
      reference = normalizeVideoReference(input.videoUrl);
    } catch (error) {
      return providerFailure(
        'INVALID_VIDEO_URL',
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      const mobilePlayerResult = await this.extractViaMobilePlayer(reference, language);
      if (mobilePlayerResult.ok) {
        return mobilePlayerResult;
      }
      if (mobilePlayerResult.error.code === 'BOT_CHALLENGE') {
        return mobilePlayerResult;
      }

      const legacyResult = await this.extractViaInnertubeTranscript(
        reference,
        language,
        mobilePlayerResult.error,
      );
      if (legacyResult.ok) {
        return legacyResult;
      }

      return providerFailure(legacyResult.error.code, legacyResult.error.message, {
        primaryAttempt: mobilePlayerResult.error,
        secondaryAttempt: legacyResult.error.details,
      });
    } catch (error) {
      return providerFailure(
        'DIRECT_PROVIDER_FAILED',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

async function pause(page: Page, ms: number): Promise<void> {
  await page.evaluate(
    (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
    ms,
  );
}

async function hasTranscriptSegments(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.querySelectorAll('ytd-transcript-segment-renderer, transcript-segment-view-model')
        .length > 0,
  );
}

async function waitForTranscriptSegments(page: Page): Promise<boolean> {
  try {
    await page.waitForFunction(
      () =>
        document.querySelectorAll(
          'ytd-transcript-segment-renderer, transcript-segment-view-model',
        ).length > 0,
      { timeout: TRANSCRIPT_PANEL_TIMEOUT_MS },
    );
    return true;
  } catch {
    return false;
  }
}

async function clickByText(page: Page, candidates: string[]): Promise<boolean> {
  return page.evaluate((matchers) => {
    const allCandidates = Array.from(
      document.querySelectorAll(
        'button, [role="button"], ytd-menu-service-item-renderer, tp-yt-paper-item, yt-formatted-string, a, div',
      ),
    );

    for (const candidate of allCandidates) {
      const label = (
        (candidate as HTMLElement).innerText ??
          candidate.textContent ??
          candidate.getAttribute('aria-label') ??
          ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      if (!label) {
        continue;
      }

      let matched = false;
      for (const matcher of matchers) {
        if (label.includes(matcher)) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        continue;
      }

      let clickable = candidate as HTMLElement | null;
      while (clickable) {
        if (typeof clickable.click === 'function') {
          clickable.click();
          return true;
        }
        clickable = clickable.parentElement;
      }
    }

    return false;
  }, candidates.map((candidate) => candidate.toLowerCase()));
}

async function maybeAcceptConsent(page: Page): Promise<void> {
  const clicked = await clickByText(page, ['accept all', 'i agree', 'agree']);
  if (clicked) {
    await pause(page, 1_000);
  }
}

async function openTranscriptPanel(
  page: Page,
): Promise<{ ok: true; strategy: string } | { ok: false; message: string; strategy?: string }> {
  if (await hasTranscriptSegments(page)) {
    return { ok: true, strategy: 'already-open' };
  }

  const transcriptButtonSelectors = [
    'button[aria-label="Show transcript"]',
    'ytd-video-description-transcript-section-renderer button',
    'button[aria-label="Transcript"]',
    'ytd-engagement-panel-section-list-renderer button[aria-label="Transcript"]',
  ];

  for (const selector of transcriptButtonSelectors) {
    const clicked = await page
      .evaluate((query) => {
        const element = document.querySelector(query) as HTMLElement | null;
        if (!element) {
          return false;
        }
        element.click();
        return true;
      }, selector)
      .catch(() => false);

    if (clicked) {
      if (await waitForTranscriptSegments(page)) {
        return { ok: true, strategy: `explicit-selector:${selector}` };
      }
    }
  }

  if (await clickByText(page, ['show transcript', 'open transcript'])) {
    if (await waitForTranscriptSegments(page)) {
      return { ok: true, strategy: 'direct-button' };
    }
  }

  const menuSelectors = [
    'button[aria-label*="More actions"]',
    '#top-level-buttons-computed button[aria-label*="More"]',
    'ytd-menu-renderer button[aria-label*="More"]',
  ];

  for (const selector of menuSelectors) {
    const clicked = await page
      .evaluate((query) => {
        const element = document.querySelector(query) as HTMLElement | null;
        if (!element) {
          return false;
        }
        element.click();
        return true;
      }, selector)
      .catch(() => false);

    if (clicked) {
      await pause(page, 500);
      if (await clickByText(page, ['show transcript', 'open transcript'])) {
        if (await waitForTranscriptSegments(page)) {
          return { ok: true, strategy: 'overflow-menu' };
        }
      }
    }
  }

  const expandSelectors = [
    '#description-inline-expander tp-yt-paper-button',
    'tp-yt-paper-button#expand',
    'button[aria-label*="Show more"]',
  ];

  for (const selector of expandSelectors) {
    const clicked = await page
      .evaluate((query) => {
        const element = document.querySelector(query) as HTMLElement | null;
        if (!element) {
          return false;
        }
        element.click();
        return true;
      }, selector)
      .catch(() => false);

    if (clicked) {
      await pause(page, 500);
      if (await clickByText(page, ['show transcript', 'open transcript'])) {
        if (await waitForTranscriptSegments(page)) {
          return { ok: true, strategy: 'description-panel' };
        }
      }
    }
  }

  return {
    ok: false,
    message: 'Could not find a transcript control on the YouTube watch page.',
  };
}

async function collectTranscriptSegments(page: Page): Promise<RawTranscriptSegment[]> {
  return page.evaluate(() => {
    const results: Array<RawTranscriptSegment> = [];

    const legacyNodes = Array.from(document.querySelectorAll('ytd-transcript-segment-renderer'));
    for (const node of legacyNodes) {
      const text = (
        node.querySelector('#segment-text, .segment-text, yt-formatted-string')?.textContent ?? ''
      ).trim();
      const timestamp = (
        node.querySelector('#start-offset, .segment-timestamp, .cue-group-start-offset')
          ?.textContent ?? ''
      ).trim();

      if (!text || !timestamp) {
        continue;
      }

      const rawParts = timestamp.split(':');
      if (rawParts.length < 2 || rawParts.length > 3) {
        continue;
      }

      const numericParts: number[] = [];
      let invalid = false;
      for (const rawPart of rawParts) {
        const value = Number.parseInt(rawPart, 10);
        if (Number.isNaN(value)) {
          invalid = true;
          break;
        }
        numericParts.push(value);
      }

      if (invalid) {
        continue;
      }

      const startSeconds =
        numericParts.length === 2
          ? numericParts[0] * 60 + numericParts[1]
          : numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2];

      results.push({
        text,
        startSeconds,
      });
    }

    const modernNodes = Array.from(document.querySelectorAll('transcript-segment-view-model'));
    for (const node of modernNodes) {
      const text = (
        node.querySelector('span[role="text"], .ytAttributedStringHost')?.textContent ?? ''
      ).trim();
      const timestamp = (
        node.querySelector('.ytwTranscriptSegmentViewModelTimestamp')?.textContent ?? ''
      ).trim();

      if (!text || !timestamp) {
        continue;
      }

      const rawParts = timestamp.split(':');
      if (rawParts.length < 2 || rawParts.length > 3) {
        continue;
      }

      const numericParts: number[] = [];
      let invalid = false;
      for (const rawPart of rawParts) {
        const value = Number.parseInt(rawPart, 10);
        if (Number.isNaN(value)) {
          invalid = true;
          break;
        }
        numericParts.push(value);
      }

      if (invalid) {
        continue;
      }

      const startSeconds =
        numericParts.length === 2
          ? numericParts[0] * 60 + numericParts[1]
          : numericParts[0] * 3600 + numericParts[1] * 60 + numericParts[2];

      results.push({
        text,
        startSeconds,
      });
    }

    return results;
  });
}

type BrowserCaptionTrackResult =
  | {
      ok: true;
      format: CaptionTrackPayloadFormat;
      parser: CaptionTrackPayloadParser;
      payloadText: string;
      requestUrl: string;
      languageCode?: string;
      kind?: string;
      trackSource?: string;
      availableLanguages: string[];
      status: number;
      attempts: CaptionTrackAttempt[];
      segments: TranscriptRecord['segments'];
    }
  | {
      ok: false;
      message: string;
      status?: number;
      availableLanguages?: string[];
      attempts?: CaptionTrackAttempt[];
    };

function summarizeBrowserCaptionTrack(
  captionTrack: BrowserCaptionTrackResult | undefined,
): Record<string, unknown> | undefined {
  if (!captionTrack) {
    return undefined;
  }

  if (!captionTrack.ok) {
    return {
      ...captionTrack,
      ...(captionTrack.attempts ? { attempts: captionTrack.attempts } : {}),
    };
  }

  return {
    languageCode: captionTrack.languageCode,
    availableLanguages: captionTrack.availableLanguages,
    kind: captionTrack.kind,
    status: captionTrack.status,
    trackSource: captionTrack.trackSource,
    format: captionTrack.format,
    parser: captionTrack.parser,
    requestUrl: captionTrack.requestUrl,
    payloadLength: captionTrack.payloadText.length,
    attempts: captionTrack.attempts,
  };
}

async function fetchCaptionTrackPayload(
  page: Page,
  requestedLanguage: string,
): Promise<BrowserCaptionTrackResult> {
  const pageTrackInfo = await page.evaluate(() => {
    const player = (globalThis as any).ytInitialPlayerResponse;
    const renderer = player?.captions?.playerCaptionsTracklistRenderer;
    const tracks = Array.isArray(renderer?.captionTracks) ? renderer.captionTracks : [];

    return {
      source: 'page-global',
      tracks,
    };
  });

  let tracks = Array.isArray(pageTrackInfo?.tracks) ? pageTrackInfo.tracks : [];
  let trackSource = 'page-global';

  if (tracks.length === 0) {
    const html = await page.content();
    const playerResponse = extractInitialPlayerResponseFromHtml(html);
    const htmlTracks = Array.isArray(
      (playerResponse as any)?.captions?.playerCaptionsTracklistRenderer?.captionTracks,
    )
      ? (((playerResponse as any).captions.playerCaptionsTracklistRenderer.captionTracks ??
          []) as any[])
      : [];

    if (htmlTracks.length > 0) {
      tracks = htmlTracks;
      trackSource = 'page-html';
    }
  }

  const selectedTrack = selectCaptionTrack(tracks, requestedLanguage);
  if (!selectedTrack) {
    return {
      ok: false,
      message: 'No caption tracks were present on the loaded YouTube page.',
    };
  }

  const baseUrl = String(selectedTrack.track?.baseUrl ?? '').trim();
  if (!baseUrl) {
    return {
      ok: false,
      message: 'The selected caption track is missing a baseUrl.',
      availableLanguages: selectedTrack.availableLanguages,
    };
  }

  const resolvedTrack = await resolveCaptionTrackPayload(baseUrl, async (requestUrl) =>
    page.evaluate(async (url) => {
      const result = await fetch(url, {
        credentials: 'include',
      });

      return {
        status: result.status,
        payloadText: await result.text(),
      };
    }, requestUrl),
  );

  if (!resolvedTrack.ok) {
    return {
      ok: false,
      message: resolvedTrack.message,
      status: resolvedTrack.status,
      availableLanguages: selectedTrack.availableLanguages,
      attempts: resolvedTrack.attempts,
    };
  }

  return {
    ok: true,
    format: resolvedTrack.format,
    parser: resolvedTrack.parser,
    payloadText: resolvedTrack.payloadText,
    requestUrl: resolvedTrack.requestUrl,
    languageCode: selectedTrack.track?.languageCode,
    kind: selectedTrack.track?.kind,
    availableLanguages: selectedTrack.availableLanguages,
    status: resolvedTrack.status,
    trackSource,
    attempts: resolvedTrack.attempts,
    segments: resolvedTrack.segments,
  };
}

export class BrowserTranscriptProvider implements TranscriptProvider {
  readonly name = 'browser' as const;

  constructor(
    private readonly options: {
      steelApiKey?: string;
      steelProfileId?: string;
    },
  ) {}

  getStatus() {
    const operatorGuidance = buildSteelProfileOperatorGuidance(
      Boolean(this.options.steelProfileId),
    );

    return {
      name: this.name,
      configured: Boolean(this.options.steelApiKey),
      available: Boolean(this.options.steelApiKey),
      details: {
        profileConfigured: Boolean(this.options.steelProfileId),
        operatorGuidance,
      },
    };
  }

  async extract(input: TranscriptExtractionInput): Promise<TranscriptProviderResult> {
    const steelApiKey = this.options.steelApiKey?.trim();
    if (!steelApiKey) {
      return providerFailure(
        'BROWSER_FALLBACK_UNAVAILABLE',
        'Browser fallback is unavailable because STEEL_API_KEY is not configured.',
      );
    }

    const language = input.language?.trim() || DEFAULT_TRANSCRIPT_LANGUAGE;
    let reference;

    try {
      reference = normalizeVideoReference(input.videoUrl);
    } catch (error) {
      return providerFailure(
        'INVALID_VIDEO_URL',
        error instanceof Error ? error.message : String(error),
      );
    }

    let steel: Steel | null = null;
    let session: { id: string } | null = null;
    let browser: Browser | null = null;
    const startedAt = Date.now();
    const debugBrowser = typeof process !== 'undefined' && process.env.DEBUG_TRANSCRIPT_BROWSER === '1';
    const timeline: Array<Record<string, unknown>> = [];
    const mark = (step: string, details?: Record<string, unknown>) => {
      const entry = {
        step,
        elapsedMs: Date.now() - startedAt,
        ...(details ?? {}),
      };
      timeline.push(entry);
      if (debugBrowser) {
        console.log('[youtube-transcript-notion-mcp][browser]', entry);
      }
    };

    try {
      mark('create-session:start');
      steel = new Steel({ steelAPIKey: steelApiKey });
      session = (await steel.sessions.create({
        timeout: STEEL_BROWSER_TIMEOUT_MS,
        solveCaptcha: true,
        ...(this.options.steelProfileId ? { profileId: this.options.steelProfileId } : {}),
      })) as { id: string };
      mark('create-session:done', {
        sessionId: session.id,
      });

      mark('connect-browser:start');
      browser = (await connectPuppeteer({
        browserWSEndpoint: `wss://connect.steel.dev?apiKey=${steelApiKey}&sessionId=${session.id}`,
      })) as Browser;
      mark('connect-browser:done');

      const pages = await browser.pages();
      const page = pages[0] ?? (await browser.newPage());
      await page.setViewport({ width: 1440, height: 1200 });
      const browserWatchUrl = buildBrowserFallbackVideoUrl(reference.videoId);
      mark('goto:start', {
        url: browserWatchUrl,
      });
      await page.goto(browserWatchUrl, {
        waitUntil: 'domcontentloaded',
        timeout: YOUTUBE_NAVIGATION_TIMEOUT_MS,
      });
      mark('goto:done');
      await pause(page, 1_500);
      mark('post-goto-pause:done');
      await maybeAcceptConsent(page);
      mark('consent:done');
      let desktopBotChallenge = await detectYouTubeBotChallengeOnPage(page);
      mark('desktop-bot-challenge:done', {
        detected: desktopBotChallenge.detected,
        indicators: desktopBotChallenge.indicators,
      });

      mark('caption-track:start');
      let captionTrack = await fetchCaptionTrackPayload(page, language);
      mark('caption-track:done', {
        ok: captionTrack.ok,
        status: captionTrack.status,
        languageCode: captionTrack.ok ? captionTrack.languageCode : undefined,
        availableLanguages: captionTrack.availableLanguages,
      });

      let mobileCaptionTrack: BrowserCaptionTrackResult | undefined;
      let mobileBotChallenge: BotChallengeSignal | undefined;
      let segments: TranscriptRecord['segments'] = captionTrack.ok ? captionTrack.segments : [];
      let extractionStrategy = captionTrack.ok
        ? `caption-track-${captionTrack.format}`
        : 'caption-track-unavailable';
      let navigatedUrl = browserWatchUrl;
      let metadataPage = page;

      if (segments.length === 0) {
        const mobilePage = await browser.newPage();
        await mobilePage.setUserAgent(YOUTUBE_MOBILE_USER_AGENT);
        await mobilePage.setViewport({ width: 430, height: 932 });
        const mobileWatchUrl = buildMobileWatchVideoUrl(reference.videoId);

        mark('mobile-goto:start', {
          url: mobileWatchUrl,
        });
        await mobilePage.goto(mobileWatchUrl, {
          waitUntil: 'domcontentloaded',
          timeout: YOUTUBE_NAVIGATION_TIMEOUT_MS,
        });
        mark('mobile-goto:done');
        await pause(mobilePage, 1_500);
        mark('mobile-post-goto-pause:done');
        await maybeAcceptConsent(mobilePage);
        mark('mobile-consent:done');
        mobileBotChallenge = await detectYouTubeBotChallengeOnPage(mobilePage);
        mark('mobile-bot-challenge:done', {
          detected: mobileBotChallenge.detected,
          indicators: mobileBotChallenge.indicators,
        });

        mark('mobile-caption-track:start');
        mobileCaptionTrack = await fetchCaptionTrackPayload(mobilePage, language);
        mark('mobile-caption-track:done', {
          ok: mobileCaptionTrack.ok,
          status: mobileCaptionTrack.status,
          languageCode: mobileCaptionTrack.ok ? mobileCaptionTrack.languageCode : undefined,
          availableLanguages: mobileCaptionTrack.availableLanguages,
        });

        if (mobileCaptionTrack.ok) {
          segments = mobileCaptionTrack.segments;
          captionTrack = mobileCaptionTrack;
          extractionStrategy = `mobile-caption-track-${mobileCaptionTrack.format}`;
          navigatedUrl = mobileWatchUrl;
          metadataPage = mobilePage;
        }
      }

      if (segments.length === 0) {
        if (!desktopBotChallenge.detected) {
          desktopBotChallenge = await detectYouTubeBotChallengeOnPage(page);
          mark('desktop-bot-challenge:refresh', {
            detected: desktopBotChallenge.detected,
            indicators: desktopBotChallenge.indicators,
          });
        }

        if (desktopBotChallenge.detected || mobileBotChallenge?.detected) {
          return providerFailure(
            'BOT_CHALLENGE',
            'YouTube asked the browser session to sign in to confirm it is not a bot, so transcript extraction could not continue.',
            {
              operatorGuidance: buildSteelProfileOperatorGuidance(
                Boolean(this.options.steelProfileId),
              ),
              botChallenge: {
                desktop: desktopBotChallenge.detected ? desktopBotChallenge : undefined,
                mobile: mobileBotChallenge?.detected ? mobileBotChallenge : undefined,
              },
              captionTrack: summarizeBrowserCaptionTrack(captionTrack),
              mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
              timeline,
            },
          );
        }

        mark('transcript-panel:start');
        const openResult = await openTranscriptPanel(page);
        mark('transcript-panel:done', {
          ok: openResult.ok,
          strategy: openResult.strategy,
        });
        if (!openResult.ok) {
          const refreshedDesktopBotChallenge = await detectYouTubeBotChallengeOnPage(page);
          if (refreshedDesktopBotChallenge.detected || mobileBotChallenge?.detected) {
            return providerFailure(
              'BOT_CHALLENGE',
              'YouTube asked the browser session to sign in to confirm it is not a bot, so transcript extraction could not continue.',
              {
                operatorGuidance: buildSteelProfileOperatorGuidance(
                  Boolean(this.options.steelProfileId),
                ),
                botChallenge: {
                  desktop: refreshedDesktopBotChallenge.detected
                    ? refreshedDesktopBotChallenge
                    : undefined,
                  mobile: mobileBotChallenge?.detected ? mobileBotChallenge : undefined,
                },
                strategy: openResult.strategy,
                captionTrack: summarizeBrowserCaptionTrack(captionTrack),
                mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
                timeline,
              },
            );
          }

          if (isLikelyYouTubeBotChallengeFromCaptionTracks(captionTrack, mobileCaptionTrack)) {
            return providerFailure(
              'BOT_CHALLENGE_SUSPECTED',
              'YouTube appears to be gating this browser session behind a bot or trust challenge: caption-track URLs returned empty payloads and the transcript panel did not open.',
              {
                operatorGuidance: buildSteelProfileOperatorGuidance(
                  Boolean(this.options.steelProfileId),
                ),
                suspectedBotChallenge: {
                  reason: 'empty-caption-track-payloads',
                },
                strategy: openResult.strategy,
                captionTrack: summarizeBrowserCaptionTrack(captionTrack),
                mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
                timeline,
              },
            );
          }

          const hadCaptionTrackAttempt =
            Boolean(captionTrack.attempts && captionTrack.attempts.length > 0) ||
            Boolean(mobileCaptionTrack?.attempts && mobileCaptionTrack.attempts.length > 0);
          return providerFailure(
            'TRANSCRIPT_PANEL_UNAVAILABLE',
            hadCaptionTrackAttempt
              ? 'Caption tracks were present but did not produce transcript segments, and the transcript panel could not be opened.'
              : openResult.message,
            {
              strategy: openResult.strategy,
              captionTrack: summarizeBrowserCaptionTrack(captionTrack),
              mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
              timeline,
            },
          );
        }

        extractionStrategy = openResult.strategy;
        mark('collect-segments:start');
        segments = normalizeTranscriptSegments(await collectTranscriptSegments(page));
        mark('collect-segments:done', {
          segmentCount: segments.length,
        });
      }

      if (segments.length === 0) {
        if (isLikelyYouTubeBotChallengeFromCaptionTracks(captionTrack, mobileCaptionTrack)) {
          return providerFailure(
            'BOT_CHALLENGE_SUSPECTED',
            'YouTube appears to be gating this browser session behind a bot or trust challenge: caption-track URLs returned empty payloads and no transcript segments became available.',
            {
              operatorGuidance: buildSteelProfileOperatorGuidance(
                Boolean(this.options.steelProfileId),
              ),
              suspectedBotChallenge: {
                reason: 'empty-caption-track-payloads',
              },
              strategy: extractionStrategy,
              captionTrack: summarizeBrowserCaptionTrack(captionTrack),
              mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
              timeline,
            },
          );
        }

        return providerFailure(
          'BROWSER_TRANSCRIPT_EMPTY',
          'Browser fallback opened the watch page but did not find transcript segments.',
          {
            strategy: extractionStrategy,
            captionTrack: summarizeBrowserCaptionTrack(captionTrack),
            mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
            timeline,
          },
        );
      }

      mark('capture-html:start');
      const html = await metadataPage.content();
      mark('capture-html:done');
      const metadata = extractVideoMetadataFromHtml(html, reference.videoId);

      const record: TranscriptRecord = {
        videoId: reference.videoId,
        url: reference.url,
        title: metadata.title ?? `Video ${reference.videoId}`,
        channelName: metadata.channelName,
        publishedAt: metadata.publishedAt,
        thumbnailUrl: metadata.thumbnailUrl,
        transcript: segmentsToPlainTranscript(segments),
        segments,
        extractionMethod: 'browser',
        language,
        warnings: [],
        sourceDiagnostics: {
          attempts: [],
          provider: 'browser',
          strategy: extractionStrategy,
          navigatedUrl,
          profileUsed: Boolean(this.options.steelProfileId),
          captionTrack: summarizeBrowserCaptionTrack(captionTrack),
          mobileCaptionTrack: summarizeBrowserCaptionTrack(mobileCaptionTrack),
          timeline,
        },
      };

      return { ok: true, record };
    } catch (error) {
      mark('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      return providerFailure(
        'BROWSER_PROVIDER_FAILED',
        error instanceof Error ? error.message : String(error),
        {
          timeline,
        },
      );
    } finally {
      try {
        await browser?.close();
      } catch {
        // Ignore teardown errors.
      }

      try {
        if (steel && session?.id) {
          await steel.sessions.release(session.id);
        }
      } catch {
        // Ignore teardown errors.
      }
    }
  }
}

export class DefaultTranscriptService implements TranscriptService {
  constructor(
    private readonly supadataProvider: TranscriptProvider | undefined,
    private readonly directProvider: TranscriptProvider,
    private readonly browserProvider: TranscriptProvider,
    private readonly defaultLanguage = DEFAULT_TRANSCRIPT_LANGUAGE,
    private readonly directProviderMode: 'auto' | 'browser-first' = 'auto',
  ) {}

  getStatus(): Record<string, unknown> {
    const supadataStatus = this.supadataProvider?.getStatus();
    const directStatus = this.directProvider.getStatus();
    const browserStatus = this.browserProvider.getStatus();
    const providerStatuses = {
      ...(supadataStatus ? { supadata: supadataStatus } : {}),
      direct: directStatus,
      browser: browserStatus,
    };
    const attemptOrder: TranscriptProviderName[] = [];

    if (supadataStatus?.available) {
      attemptOrder.push('supadata');
    }

    if (this.directProviderMode === 'auto' && directStatus.available) {
      attemptOrder.push('direct');
    }

    if (browserStatus.available) {
      attemptOrder.push('browser');
    }

    return {
      defaultLanguage: this.defaultLanguage,
      directProviderMode: this.directProviderMode,
      primaryProvider: attemptOrder[0] ?? null,
      attemptOrder,
      providers: providerStatuses,
    };
  }

  async extract(input: TranscriptExtractionInput): Promise<TranscriptRecord> {
    const normalizedInput: TranscriptExtractionInput = {
      ...input,
      language: input.language?.trim() || this.defaultLanguage,
    };

    const warnings: string[] = [];
    const attempts: SourceAttemptDiagnostic[] = [];
    const browserStatus = this.browserProvider.getStatus();

    if (this.supadataProvider?.getStatus().available) {
      const supadataResult = await this.supadataProvider.extract(normalizedInput);
      attempts.push(toAttemptDiagnostic(this.supadataProvider.name, supadataResult));

      if (supadataResult.ok) {
        supadataResult.record.warnings = [...warnings, ...supadataResult.record.warnings];
        supadataResult.record.sourceDiagnostics.attempts = attempts;
        supadataResult.record.sourceDiagnostics.directProviderMode = this.directProviderMode;
        return supadataResult.record;
      }

      warnings.push(
        `${providerLabel(this.supadataProvider.name)} extraction failed: ${supadataResult.error.message}`,
      );
    }

    if (this.directProviderMode === 'auto') {
      const directResult = await this.directProvider.extract(normalizedInput);
      attempts.push(toAttemptDiagnostic('direct', directResult));

      if (directResult.ok) {
        directResult.record.warnings = [...warnings, ...directResult.record.warnings];
        directResult.record.sourceDiagnostics.attempts = attempts;
        directResult.record.sourceDiagnostics.directProviderMode = this.directProviderMode;
        return directResult.record;
      }

      warnings.push(`Direct extraction failed: ${directResult.error.message}`);

      if (!browserStatus.available) {
        throw new TranscriptExtractionError(
          'BROWSER_FALLBACK_UNAVAILABLE',
          'Direct transcript extraction failed and browser fallback is unavailable because STEEL_API_KEY is not configured.',
          {
            attempts,
            browserStatus,
            directProviderMode: this.directProviderMode,
            directErrorDetails: directResult.error.details,
          },
          warnings,
        );
      }
    } else if (!browserStatus.available) {
      throw new TranscriptExtractionError(
        'BROWSER_FALLBACK_UNAVAILABLE',
        'Browser-first transcript extraction is configured but browser fallback is unavailable because STEEL_API_KEY is not configured.',
        {
          attempts,
          browserStatus,
          directProviderMode: this.directProviderMode,
        },
      );
    }

    const browserResult = await this.browserProvider.extract(normalizedInput);
    attempts.push(toAttemptDiagnostic('browser', browserResult));

    if (browserResult.ok) {
      browserResult.record.warnings = [...warnings, ...browserResult.record.warnings];
      browserResult.record.sourceDiagnostics.attempts = attempts;
      browserResult.record.sourceDiagnostics.directProviderMode = this.directProviderMode;
      return browserResult.record;
    }

    throw new TranscriptExtractionError(
      browserResult.error.code,
      browserResult.error.message,
      {
        attempts,
        directProviderMode: this.directProviderMode,
        browserErrorDetails: browserResult.error.details,
      },
      warnings,
    );
  }
}

export function createTranscriptService(options: {
  steelApiKey?: string;
  steelProfileId?: string;
  supadataApiKey?: string;
  supadataTranscriptMode?: 'native' | 'auto' | 'generate';
  defaultLanguage?: string;
  directProviderMode?: 'auto' | 'browser-first';
}): TranscriptService {
  return new DefaultTranscriptService(
    options.supadataApiKey
      ? new SupadataTranscriptProvider({
          apiKey: options.supadataApiKey,
          transcriptMode: options.supadataTranscriptMode,
        })
      : undefined,
    new DirectTranscriptProvider(),
    new BrowserTranscriptProvider({
      steelApiKey: options.steelApiKey,
      steelProfileId: options.steelProfileId,
    }),
    options.defaultLanguage,
    options.directProviderMode,
  );
}
