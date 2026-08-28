import type { FetchFn } from './airtable.js';

export class SlackClientError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SlackClientError';
  }
}

export interface SlackPostMessageInput {
  channel: string;
  text: string;
  threadTs?: string;
}

export interface SlackPostMessageResult {
  ts: string;
  channel: string;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
}

/**
 * Minimal Slack Web API client for the exception webhook leg. Posts as the
 * bot the token belongs to (expected: Marketplace Asset Bot, a member of
 * #app-review-exceptions and the submission channel).
 */
export class SlackClient {
  private readonly token: string;
  private readonly fetchFn: FetchFn;

  constructor(options: { token: string; fetchFn?: FetchFn }) {
    this.token = options.token;
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
  }

  async postMessage(input: SlackPostMessageInput): Promise<SlackPostMessageResult> {
    const response = await this.fetchFn('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({
        channel: input.channel,
        text: input.text,
        unfurl_links: false,
        unfurl_media: false,
        ...(input.threadTs ? { thread_ts: input.threadTs } : {}),
      }),
    });

    if (!response.ok) {
      throw new SlackClientError('SLACK_HTTP_ERROR', `Slack request failed (${response.status})`);
    }

    const data = (await response.json()) as SlackApiResponse;
    if (!data.ok || !data.ts) {
      throw new SlackClientError('SLACK_API_ERROR', `Slack API error: ${data.error ?? 'unknown'}`);
    }

    return { ts: data.ts, channel: data.channel ?? input.channel };
  }
}
