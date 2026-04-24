import {
  DEFAULT_SUPADATA_TRANSCRIPT_MODE,
  DEFAULT_TRANSCRIPT_LANGUAGE,
} from './config.js';
import { segmentsToPlainTranscript } from './transcript.js';
import type {
  TranscriptExtractionInput,
  TranscriptProvider,
  TranscriptProviderResult,
  TranscriptRecord,
} from './types.js';
import { normalizeVideoReference } from './youtube.js';

const SUPADATA_API_BASE_URL = 'https://api.supadata.ai/v1';
const SUPADATA_POLL_INTERVAL_MS = 1_000;
const SUPADATA_POLL_TIMEOUT_MS = 60_000;
const SUPADATA_DEFAULT_RETRY_DELAY_MS = 1_100;
const SUPADATA_MAX_REQUEST_ATTEMPTS = 3;
const defaultFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);

type ProviderErrorDetails = Record<string, unknown> | undefined;

type SupadataTranscriptMode = 'native' | 'auto' | 'generate';

type SupadataTranscriptChunk = {
  text: string;
  offset: number;
  duration: number;
  lang?: string;
};

type SupadataTranscriptSuccess = {
  content: SupadataTranscriptChunk[];
  lang?: string;
  availableLangs?: string[];
};

type SupadataTranscriptJobCreated = {
  jobId: string;
};

type SupadataTranscriptJobStatus = {
  status: 'queued' | 'active' | 'completed' | 'failed';
  error?: {
    error?: string;
    message?: string;
    details?: string;
    documentationUrl?: string;
  };
  content?: SupadataTranscriptChunk[];
  lang?: string;
  availableLangs?: string[];
};

type SupadataVideoMetadata = {
  id?: string;
  title?: string | null;
  uploadDate?: string | null;
  thumbnail?: string | null;
  channel?: {
    name?: string | null;
  };
};

type SupadataErrorBody = {
  error?: string;
  message?: string;
  details?: string;
  documentationUrl?: string;
};

type SupadataRequestAttempt = {
  status?: number;
  retryAfterMs?: number;
  message?: string;
};

type SupadataRequestResult<T> = {
  status: number;
  data?: T;
  error?: SupadataErrorBody;
  attempts: SupadataRequestAttempt[];
};

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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryAfterMs(headers: Headers): number {
  const retryAfter = headers.get('retry-after');
  if (!retryAfter) {
    return SUPADATA_DEFAULT_RETRY_DELAY_MS;
  }

  const seconds = Number.parseFloat(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(Math.ceil(seconds * 1_000), SUPADATA_DEFAULT_RETRY_DELAY_MS);
  }

  const absolute = Date.parse(retryAfter);
  if (Number.isFinite(absolute)) {
    return Math.max(absolute - Date.now(), SUPADATA_DEFAULT_RETRY_DELAY_MS);
  }

  return SUPADATA_DEFAULT_RETRY_DELAY_MS;
}

function normalizeSupadataError(status: number, error?: SupadataErrorBody): { code: string; message: string } {
  const providerCode = error?.error?.trim();
  const providerMessage = error?.message?.trim();
  const providerDetails = error?.details?.trim();

  if (providerCode === 'transcript-unavailable' || status === 206) {
    return {
      code: 'TRANSCRIPT_UNAVAILABLE',
      message: providerDetails || providerMessage || 'No transcript is available for this video.',
    };
  }

  if (status === 401 || status === 403) {
    return {
      code: 'SUPADATA_AUTH_FAILED',
      message: providerMessage || providerDetails || 'Supadata rejected the API key.',
    };
  }

  if (status === 404) {
    return {
      code: 'TRANSCRIPT_NOT_FOUND',
      message: providerMessage || providerDetails || 'Supadata could not find the requested video.',
    };
  }

  if (status === 429) {
    return {
      code: 'SUPADATA_RATE_LIMITED',
      message: providerMessage || providerDetails || 'Supadata rate limited this request.',
    };
  }

  return {
    code: 'SUPADATA_REQUEST_FAILED',
    message:
      providerMessage ||
      providerDetails ||
      `Supadata request failed with status ${status}.`,
  };
}

function normalizeSupadataTranscriptSegments(
  content: SupadataTranscriptChunk[],
): TranscriptRecord['segments'] {
  return content
    .map((chunk) => {
      const text = String(chunk.text ?? '').trim();
      const offset = Number(chunk.offset);
      const duration = Number(chunk.duration);

      if (!text || !Number.isFinite(offset)) {
        return null;
      }

      const startSeconds = offset / 1_000;
      const endSeconds =
        Number.isFinite(duration) && duration > 0
          ? (offset + duration) / 1_000
          : undefined;

      return {
        text,
        startSeconds,
        endSeconds,
      };
    })
    .filter(Boolean) as TranscriptRecord['segments'];
}

function isSupadataTranscriptJobCreated(
  payload: SupadataTranscriptSuccess | SupadataTranscriptJobCreated | undefined,
): payload is SupadataTranscriptJobCreated {
  return Boolean(payload && typeof (payload as SupadataTranscriptJobCreated).jobId === 'string');
}

function isSupadataTranscriptSuccess(
  payload:
    | SupadataTranscriptSuccess
    | SupadataTranscriptJobCreated
    | SupadataTranscriptJobStatus
    | undefined,
): payload is SupadataTranscriptSuccess {
  return Boolean(payload && Array.isArray((payload as SupadataTranscriptSuccess).content));
}

async function requestSupadataJson<T>(
  fetchImpl: typeof fetch,
  apiKey: string,
  url: string,
): Promise<SupadataRequestResult<T>> {
  const attempts: SupadataRequestAttempt[] = [];

  for (let attempt = 0; attempt < SUPADATA_MAX_REQUEST_ATTEMPTS; attempt += 1) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push({ message });
      if (attempt < SUPADATA_MAX_REQUEST_ATTEMPTS - 1) {
        await delay(SUPADATA_DEFAULT_RETRY_DELAY_MS);
        continue;
      }

      return {
        status: 0,
        error: {
          error: 'network-error',
          message,
        },
        attempts,
      };
    }

    const text = await response.text();
    let data: T | SupadataErrorBody | undefined;
    if (text) {
      try {
        data = JSON.parse(text) as T | SupadataErrorBody;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          status: response.status,
          error: {
            error: 'invalid-json',
            message,
            details: text.slice(0, 500),
          },
          attempts,
        };
      }
    }

    if (response.ok || response.status === 202 || response.status === 206) {
      return {
        status: response.status,
        data: data as T | undefined,
        attempts,
      };
    }

    if (response.status === 429 && attempt < SUPADATA_MAX_REQUEST_ATTEMPTS - 1) {
      const retryAfterMs = extractRetryAfterMs(response.headers);
      attempts.push({
        status: response.status,
        retryAfterMs,
        message: (data as SupadataErrorBody | undefined)?.message,
      });
      await delay(retryAfterMs);
      continue;
    }

    return {
      status: response.status,
      error: (data as SupadataErrorBody | undefined) ?? {
        error: 'invalid-response',
        message: text.slice(0, 500),
      },
      attempts,
    };
  }

  return {
    status: 0,
    error: {
      error: 'exhausted-retries',
      message: 'Supadata request retries were exhausted.',
    },
    attempts,
  };
}

export class SupadataTranscriptProvider implements TranscriptProvider {
  readonly name = 'supadata' as const;

  constructor(
    private readonly options: {
      apiKey?: string;
      transcriptMode?: SupadataTranscriptMode;
    },
    private readonly fetchImpl: typeof fetch = defaultFetch,
  ) {}

  getStatus() {
    return {
      name: this.name,
      configured: Boolean(this.options.apiKey?.trim()),
      available: Boolean(this.options.apiKey?.trim()),
      details: {
        transcriptMode: this.options.transcriptMode ?? DEFAULT_SUPADATA_TRANSCRIPT_MODE,
      },
    };
  }

  async extract(input: TranscriptExtractionInput): Promise<TranscriptProviderResult> {
    const apiKey = this.options.apiKey?.trim();
    if (!apiKey) {
      return providerFailure(
        'SUPADATA_UNAVAILABLE',
        'Supadata transcript extraction is unavailable because SUPADATA_API_KEY is not configured.',
      );
    }

    let reference;
    try {
      reference = normalizeVideoReference(input.videoUrl);
    } catch (error) {
      return providerFailure(
        'INVALID_VIDEO_URL',
        error instanceof Error ? error.message : String(error),
      );
    }

    const language = input.language?.trim() || DEFAULT_TRANSCRIPT_LANGUAGE;
    const transcriptMode = this.options.transcriptMode ?? DEFAULT_SUPADATA_TRANSCRIPT_MODE;
    const transcriptUrl = new URL(`${SUPADATA_API_BASE_URL}/transcript`);
    transcriptUrl.searchParams.set('url', reference.url);
    transcriptUrl.searchParams.set('lang', language);
    transcriptUrl.searchParams.set('text', 'false');
    transcriptUrl.searchParams.set('mode', transcriptMode);

    const transcriptResult = await requestSupadataJson<
      SupadataTranscriptSuccess | SupadataTranscriptJobCreated
    >(this.fetchImpl, apiKey, transcriptUrl.toString());

    if (!transcriptResult.data || transcriptResult.status === 206 || transcriptResult.status >= 400) {
      const normalizedError = normalizeSupadataError(transcriptResult.status, transcriptResult.error);
      return providerFailure(normalizedError.code, normalizedError.message, {
        status: transcriptResult.status,
        endpoint: '/v1/transcript',
        transcriptMode,
        attempts: transcriptResult.attempts,
        providerError: transcriptResult.error,
      });
    }

    let transcriptPayload: SupadataTranscriptSuccess | undefined;
    let transcriptJobId: string | undefined;
    const jobStatuses: Array<Record<string, unknown>> = [];

    if (transcriptResult.status === 202 && isSupadataTranscriptJobCreated(transcriptResult.data)) {
      transcriptJobId = transcriptResult.data.jobId;
      const deadline = Date.now() + SUPADATA_POLL_TIMEOUT_MS;

      while (Date.now() < deadline) {
        await delay(SUPADATA_POLL_INTERVAL_MS);
        const jobResult = await requestSupadataJson<SupadataTranscriptJobStatus>(
          this.fetchImpl,
          apiKey,
          `${SUPADATA_API_BASE_URL}/transcript/${transcriptJobId}`,
        );

        if (!jobResult.data || jobResult.status >= 400) {
          const normalizedError = normalizeSupadataError(jobResult.status, jobResult.error);
          return providerFailure(normalizedError.code, normalizedError.message, {
            status: jobResult.status,
            endpoint: `/v1/transcript/${transcriptJobId}`,
            transcriptMode,
            attempts: [...transcriptResult.attempts, ...jobResult.attempts],
            providerError: jobResult.error,
            jobStatuses,
          });
        }

        jobStatuses.push({
          status: jobResult.data.status,
          attempts: jobResult.attempts,
        });

        if (jobResult.data.status === 'completed' && isSupadataTranscriptSuccess(jobResult.data)) {
          transcriptPayload = {
            content: jobResult.data.content ?? [],
            lang: jobResult.data.lang,
            availableLangs: jobResult.data.availableLangs,
          };
          break;
        }

        if (jobResult.data.status === 'failed') {
          const normalizedError = normalizeSupadataError(jobResult.status, jobResult.data.error);
          return providerFailure(normalizedError.code, normalizedError.message, {
            status: jobResult.status,
            endpoint: `/v1/transcript/${transcriptJobId}`,
            transcriptMode,
            attempts: [...transcriptResult.attempts, ...jobResult.attempts],
            providerError: jobResult.data.error,
            jobStatuses,
          });
        }
      }

      if (!transcriptPayload) {
        return providerFailure(
          'SUPADATA_JOB_TIMEOUT',
          'Supadata transcript job did not complete before the timeout expired.',
          {
            endpoint: `/v1/transcript/${transcriptJobId}`,
            transcriptMode,
            attempts: transcriptResult.attempts,
            jobStatuses,
          },
        );
      }
    } else if (isSupadataTranscriptSuccess(transcriptResult.data)) {
      transcriptPayload = transcriptResult.data;
    }

    if (!transcriptPayload) {
      return providerFailure(
        'INVALID_SUPADATA_RESPONSE',
        'Supadata returned an unexpected transcript response payload.',
        {
          status: transcriptResult.status,
          endpoint: '/v1/transcript',
          transcriptMode,
          attempts: transcriptResult.attempts,
        },
      );
    }

    const segments = normalizeSupadataTranscriptSegments(transcriptPayload.content ?? []);
    if (segments.length === 0) {
      return providerFailure(
        'EMPTY_TRANSCRIPT',
        'Supadata returned no transcript segments for this video.',
        {
          status: transcriptResult.status,
          endpoint: '/v1/transcript',
          transcriptMode,
          transcriptJobId,
          attempts: transcriptResult.attempts,
          jobStatuses,
        },
      );
    }

    const metadataUrl = new URL(`${SUPADATA_API_BASE_URL}/youtube/video`);
    metadataUrl.searchParams.set('id', reference.videoId);
    const metadataResult = await requestSupadataJson<SupadataVideoMetadata>(
      this.fetchImpl,
      apiKey,
      metadataUrl.toString(),
    );

    let metadataWarning: string | undefined;
    if (!metadataResult.data || metadataResult.status >= 400) {
      const normalizedError = normalizeSupadataError(metadataResult.status, metadataResult.error);
      metadataWarning = `Supadata metadata lookup failed: ${normalizedError.message}`;
    }

    return {
      ok: true,
      record: {
        videoId: reference.videoId,
        url: reference.url,
        title: metadataResult.data?.title?.trim() || `Video ${reference.videoId}`,
        channelName: metadataResult.data?.channel?.name?.trim() || undefined,
        publishedAt: metadataResult.data?.uploadDate?.trim() || undefined,
        thumbnailUrl: metadataResult.data?.thumbnail?.trim() || undefined,
        transcript: segmentsToPlainTranscript(segments),
        segments,
        extractionMethod: 'supadata',
        language: transcriptPayload.lang?.trim() || language,
        warnings: metadataWarning ? [metadataWarning] : [],
        sourceDiagnostics: {
          attempts: [],
          provider: 'supadata',
          strategy: 'supadata-api',
          transcriptMode,
          transcriptStatus: transcriptResult.status,
          transcriptJobId,
          metadataStatus: metadataResult.status,
          transcriptEndpoint: '/v1/transcript',
          metadataEndpoint: '/v1/youtube/video',
          availableLanguages: transcriptPayload.availableLangs ?? [],
          transcriptAttempts: transcriptResult.attempts,
          metadataAttempts: metadataResult.attempts,
          jobStatuses,
        },
      },
    };
  }
}
