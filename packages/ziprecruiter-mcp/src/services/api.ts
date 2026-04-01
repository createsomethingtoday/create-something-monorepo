export interface ZipRecruiterClientConfig {
  apiKey: string;
  apiBaseUrl?: string;
  hiringSignalBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

export class ZipRecruiterApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly responseBody: unknown;

  constructor(message: string, status: number, url: string, responseBody: unknown) {
    super(message);
    this.name = 'ZipRecruiterApiError';
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}

const DEFAULT_API_BASE_URL = 'https://api.ziprecruiter.com/partner/v0';
const DEFAULT_HIRING_SIGNAL_BASE_URL = 'https://api.ziprecruiter.com/hiring-signal/v0';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function authorizationHeaderValue(apiKey: string): string {
  return `Basic ${apiKey}`;
}

export function encodeJobIdForPath(jobId: string): string {
  return encodeURIComponent(jobId);
}

export function createZipRecruiterClient(config: ZipRecruiterClientConfig) {
  const fetchImpl = config.fetchImpl ?? fetch;
  const apiBaseUrl = trimTrailingSlash(config.apiBaseUrl ?? DEFAULT_API_BASE_URL);
  const hiringSignalBaseUrl = trimTrailingSlash(
    config.hiringSignalBaseUrl ?? DEFAULT_HIRING_SIGNAL_BASE_URL,
  );

  async function requestJson<T>(
    url: string,
    init: RequestInit = {},
  ): Promise<{ status: number; data: T | null }> {
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Authorization: authorizationHeaderValue(config.apiKey),
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });

    const text = await response.text();
    const parsed = text ? parseJson(text) : null;

    if (!response.ok) {
      throw new ZipRecruiterApiError(
        `ZipRecruiter request failed with status ${response.status}.`,
        response.status,
        url,
        parsed,
      );
    }

    return { status: response.status, data: parsed as T | null };
  }

  return {
    async createJob<T>(payload: unknown): Promise<T | null> {
      const { data } = await requestJson<T>(`${apiBaseUrl}/job`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data;
    },

    async updateJob<T>(payload: unknown, jobId?: string): Promise<T | null> {
      const suffix = jobId ? `/${encodeJobIdForPath(jobId)}` : '';
      const { data } = await requestJson<T>(`${apiBaseUrl}/job${suffix}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      return data;
    },

    async getJob<T>(jobId: string): Promise<T | null> {
      const { data } = await requestJson<T>(`${apiBaseUrl}/job/${encodeJobIdForPath(jobId)}`);
      return data;
    },

    async closeJob<T>(jobId: string): Promise<T | null> {
      const { data } = await requestJson<T>(`${apiBaseUrl}/job/${encodeJobIdForPath(jobId)}`, {
        method: 'DELETE',
      });
      return data;
    },

    async setQuestions<T>(jobId: string, questions: unknown, method: 'POST' | 'PUT' = 'PUT'): Promise<T | null> {
      const { data } = await requestJson<T>(
        `${apiBaseUrl}/job/${encodeJobIdForPath(jobId)}/questions`,
        {
          method,
          body: JSON.stringify(questions),
        },
      );
      return data;
    },

    async getQuestions<T>(jobId: string): Promise<T | null> {
      const { data } = await requestJson<T>(
        `${apiBaseUrl}/job/${encodeJobIdForPath(jobId)}/questions`,
      );
      return data;
    },

    async deleteQuestions<T>(jobId: string): Promise<T | null> {
      const { data } = await requestJson<T>(
        `${apiBaseUrl}/job/${encodeJobIdForPath(jobId)}/questions`,
        { method: 'DELETE' },
      );
      return data;
    },

    async sendHiringSignal<T>(payload: unknown): Promise<T | null> {
      const { data } = await requestJson<T>(`${hiringSignalBaseUrl}/event`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return data;
    },
  };
}
