const DEFAULT_HUB_URL = 'https://cs-mcp-hub-remote.createsomething.workers.dev/mcp';
const DEFAULT_TIMEZONE = 'America/Chicago';
const DEFAULT_LOCAL_HOUR = 9;
const DEFAULT_QUERY = 'is:unread';
const DEFAULT_MAX_RESULTS = 25;

type JsonRpcResponse = {
  error?: { code?: number; message?: string };
  result?: {
    isError?: boolean;
    structuredContent?: unknown;
    content?: Array<{ text?: string }>;
  };
};

type HubExecuteResult = {
  data?: {
    composio_execution_message?: string;
    messages?: GmailMessage[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  };
  error?: unknown;
  successful?: boolean;
  logId?: string;
};

export type GmailUnreadSummaryEnv = {
  CS_HUB_MCP_URL?: string;
  CS_HUB_AUTH_TOKEN?: string;
  CS_HUB_SESSION_TOKEN?: string;
  GMAIL_UNREAD_SUMMARY_CONNECTED_ACCOUNT_ID?: string;
  GMAIL_UNREAD_SUMMARY_QUERY?: string;
  GMAIL_UNREAD_SUMMARY_MAX_RESULTS?: string;
  GMAIL_UNREAD_SUMMARY_RECIPIENT_EMAIL?: string;
  GMAIL_UNREAD_SUMMARY_WEBHOOK_URL?: string;
  GMAIL_UNREAD_SUMMARY_TIMEZONE?: string;
  GMAIL_UNREAD_SUMMARY_LOCAL_HOUR?: string;
  GMAIL_UNREAD_SUMMARY_SEND_EMPTY?: string;
};

export type GmailUnreadSummaryMessage = {
  messageId: string;
  threadId?: string;
  subject: string;
  from: string;
  to: string;
  timestamp: string;
  labelIds: string[];
  snippet?: string;
};

type GmailMessage = {
  messageId?: string;
  id?: string;
  threadId?: string;
  subject?: string;
  sender?: string;
  from?: string;
  recipient?: string;
  to?: string;
  internalDate?: string;
  sentAt?: string;
  receivedAt?: string;
  labelIds?: string[];
  snippet?: string;
};

export type GmailUnreadSummaryRunResult = {
  ok: boolean;
  status:
    | 'sent_and_marked_read'
    | 'sent_empty_summary'
    | 'no_unread_messages'
    | 'outside_schedule_window'
    | 'no_delivery_target'
    | 'delivery_failed'
    | 'hub_error'
    | 'config_error';
  query: string;
  timezone: string;
  localHour: number;
  localDate: string;
  unreadCount: number;
  markedReadCount: number;
  deliveredVia: string[];
  summary: string;
  messages: GmailUnreadSummaryMessage[];
  details?: string;
};

type RunOptions = {
  force?: boolean;
};

type DeliveryPayload = {
  text: string;
};

type RunConfig = {
  hubUrl: string;
  authToken?: string;
  sessionToken?: string;
  connectedAccountId?: string;
  query: string;
  maxResults: number;
  recipientEmail?: string;
  webhookUrl?: string;
  timezone: string;
  localHour: number;
  sendEmptySummary: boolean;
};

type LocalTimeParts = {
  date: string;
  hour: number;
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveConfig(env: GmailUnreadSummaryEnv): RunConfig {
  return {
    hubUrl: env.CS_HUB_MCP_URL?.trim() || DEFAULT_HUB_URL,
    authToken: env.CS_HUB_AUTH_TOKEN?.trim() || undefined,
    sessionToken: env.CS_HUB_SESSION_TOKEN?.trim() || undefined,
    connectedAccountId: env.GMAIL_UNREAD_SUMMARY_CONNECTED_ACCOUNT_ID?.trim() || undefined,
    query: env.GMAIL_UNREAD_SUMMARY_QUERY?.trim() || DEFAULT_QUERY,
    maxResults: Math.min(parsePositiveInt(env.GMAIL_UNREAD_SUMMARY_MAX_RESULTS, DEFAULT_MAX_RESULTS), 100),
    recipientEmail: env.GMAIL_UNREAD_SUMMARY_RECIPIENT_EMAIL?.trim() || undefined,
    webhookUrl: env.GMAIL_UNREAD_SUMMARY_WEBHOOK_URL?.trim() || undefined,
    timezone: env.GMAIL_UNREAD_SUMMARY_TIMEZONE?.trim() || DEFAULT_TIMEZONE,
    localHour: Math.min(parsePositiveInt(env.GMAIL_UNREAD_SUMMARY_LOCAL_HOUR, DEFAULT_LOCAL_HOUR), 23),
    sendEmptySummary: parseBoolean(env.GMAIL_UNREAD_SUMMARY_SEND_EMPTY, false),
  };
}

function getLocalTimeParts(now: Date, timezone: string): LocalTimeParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number.parseInt(get('hour') || '0', 10),
  };
}

function buildHubHeaders(config: RunConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };

  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  if (config.sessionToken) {
    headers['X-MCP-Session-Token'] = config.sessionToken;
  }

  return headers;
}

function extractStructuredPayload(response: JsonRpcResponse): Record<string, unknown> {
  if (response.error) {
    throw new Error(`Hub RPC error ${response.error.code ?? 'unknown'}: ${response.error.message ?? 'Unknown error'}`);
  }

  if (!response.result) {
    throw new Error('Hub RPC result payload missing.');
  }

  if (response.result.isError) {
    const message = response.result.content?.find((entry) => typeof entry.text === 'string')?.text;
    throw new Error(message || 'Hub tool returned an error result.');
  }

  if (response.result.structuredContent && typeof response.result.structuredContent === 'object') {
    return response.result.structuredContent as Record<string, unknown>;
  }

  const text = response.result.content?.find((entry) => typeof entry.text === 'string')?.text;
  if (!text) {
    return {};
  }

  return JSON.parse(text) as Record<string, unknown>;
}

async function callHubTool(
  config: RunConfig,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (!config.authToken && !config.sessionToken) {
    throw new Error('Missing Hub auth. Configure CS_HUB_AUTH_TOKEN or CS_HUB_SESSION_TOKEN.');
  }

  const response = await fetch(config.hubUrl, {
    method: 'POST',
    headers: buildHubHeaders(config),
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${toolName}-${Date.now()}`,
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Hub HTTP ${response.status}: ${text}`);
  }

  return extractStructuredPayload(JSON.parse(text) as JsonRpcResponse);
}

function normalizeMessage(message: GmailMessage): GmailUnreadSummaryMessage | null {
  const messageId = message.messageId ?? message.id;
  if (!messageId) return null;

  return {
    messageId,
    threadId: message.threadId,
    subject: message.subject?.trim() || '(no subject)',
    from: message.sender?.trim() || message.from?.trim() || '(unknown sender)',
    to: message.recipient?.trim() || message.to?.trim() || '',
    timestamp: message.internalDate ?? message.receivedAt ?? message.sentAt ?? '',
    labelIds: Array.isArray(message.labelIds) ? message.labelIds : [],
    snippet: message.snippet?.trim() || undefined,
  };
}

function formatTimestamp(value: string, timezone: string): string {
  if (!value) return 'unknown time';

  const numeric = Number.parseInt(value, 10);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown time';

  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatSummary(messages: GmailUnreadSummaryMessage[], config: RunConfig, now: Date): string {
  const local = getLocalTimeParts(now, config.timezone);
  const lines = [
    `Unread Gmail summary for ${local.date} (${config.timezone})`,
    `Query: ${config.query}`,
    `Count: ${messages.length}`,
    '',
  ];

  for (const message of messages) {
    const snippet = message.snippet ? ` | ${message.snippet.replace(/\s+/g, ' ').slice(0, 140)}` : '';
    lines.push(`- ${message.subject}`);
    lines.push(`  From: ${message.from}`);
    lines.push(`  Received: ${formatTimestamp(message.timestamp, config.timezone)}${snippet}`);
  }

  return lines.join('\n');
}

async function fetchUnreadMessages(config: RunConfig): Promise<GmailUnreadSummaryMessage[]> {
  const payload = await callHubTool(config, 'hub_execute_proxy_tool', {
    proxyToolName: 'composio-toolkit-gmail__gmail_fetch_emails',
    args: {
      query: config.query,
      user_id: 'me',
      verbose: false,
      include_payload: false,
      max_results: config.maxResults,
      ...(config.connectedAccountId ? { connectedAccountId: config.connectedAccountId } : {}),
    },
  });

  const result = payload as HubExecuteResult;
  if (result.successful === false || result.error) {
    throw new Error(`Gmail fetch failed: ${JSON.stringify(result.error ?? payload)}`);
  }

  return (result.data?.messages ?? [])
    .map((message) => normalizeMessage(message))
    .filter((message): message is GmailUnreadSummaryMessage => Boolean(message));
}

async function markMessagesRead(config: RunConfig, messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;

  const payload = await callHubTool(config, 'hub_execute_proxy_tool', {
    proxyToolName: 'composio-toolkit-gmail__gmail_batch_modify_messages',
    args: {
      userId: 'me',
      messageIds,
      removeLabelIds: ['UNREAD'],
      ...(config.connectedAccountId ? { connectedAccountId: config.connectedAccountId } : {}),
    },
  });

  const result = payload as HubExecuteResult;
  if (result.successful === false || result.error) {
    throw new Error(`Mark-read failed: ${JSON.stringify(result.error ?? payload)}`);
  }
}

async function postWebhook(webhookUrl: string, payload: DeliveryPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook delivery failed (${response.status}): ${body}`);
  }
}

async function sendSummaryEmail(config: RunConfig, summary: string, unreadCount: number): Promise<void> {
  if (!config.recipientEmail) return;

  const payload = await callHubTool(config, 'hub_execute_proxy_tool', {
    proxyToolName: 'composio-toolkit-gmail__gmail_send_email',
    args: {
      user_id: 'me',
      recipient_email: config.recipientEmail,
      subject: unreadCount > 0 ? `Unread Gmail summary (${unreadCount})` : 'Unread Gmail summary (0)',
      body: summary,
      ...(config.connectedAccountId ? { connectedAccountId: config.connectedAccountId } : {}),
    },
  });

  const result = payload as HubExecuteResult;
  if (result.successful === false || result.error) {
    throw new Error(`Summary email failed: ${JSON.stringify(result.error ?? payload)}`);
  }
}

async function deliverSummary(config: RunConfig, summary: string, unreadCount: number): Promise<string[]> {
  const deliveredVia: string[] = [];

  if (config.webhookUrl) {
    await postWebhook(config.webhookUrl, { text: summary });
    deliveredVia.push('webhook');
  }

  if (config.recipientEmail) {
    await sendSummaryEmail(config, summary, unreadCount);
    deliveredVia.push('gmail_send_email');
  }

  return deliveredVia;
}

export async function runGmailUnreadSummary(
  env: GmailUnreadSummaryEnv,
  options: RunOptions = {},
): Promise<GmailUnreadSummaryRunResult> {
  const config = resolveConfig(env);
  const now = new Date();
  const local = getLocalTimeParts(now, config.timezone);

  if (!options.force && local.hour !== config.localHour) {
    return {
      ok: true,
      status: 'outside_schedule_window',
      query: config.query,
      timezone: config.timezone,
      localHour: config.localHour,
      localDate: local.date,
      unreadCount: 0,
      markedReadCount: 0,
      deliveredVia: [],
      summary: '',
      messages: [],
      details: `Local hour ${local.hour} does not match scheduled hour ${config.localHour}.`,
    };
  }

  try {
    const messages = await fetchUnreadMessages(config);
    const summary = formatSummary(messages, config, now);

    if (messages.length === 0 && !config.sendEmptySummary) {
      return {
        ok: true,
        status: 'no_unread_messages',
        query: config.query,
        timezone: config.timezone,
        localHour: config.localHour,
        localDate: local.date,
        unreadCount: 0,
        markedReadCount: 0,
        deliveredVia: [],
        summary,
        messages,
      };
    }

    if (!config.webhookUrl && !config.recipientEmail) {
      return {
        ok: false,
        status: 'no_delivery_target',
        query: config.query,
        timezone: config.timezone,
        localHour: config.localHour,
        localDate: local.date,
        unreadCount: messages.length,
        markedReadCount: 0,
        deliveredVia: [],
        summary,
        messages,
        details: 'Configure GMAIL_UNREAD_SUMMARY_WEBHOOK_URL and/or GMAIL_UNREAD_SUMMARY_RECIPIENT_EMAIL before enabling the automation.',
      };
    }

    const deliveredVia = await deliverSummary(config, summary, messages.length);
    if (messages.length > 0) {
      await markMessagesRead(config, messages.map((message) => message.messageId));
    }

    return {
      ok: true,
      status: messages.length > 0 ? 'sent_and_marked_read' : 'sent_empty_summary',
      query: config.query,
      timezone: config.timezone,
      localHour: config.localHour,
      localDate: local.date,
      unreadCount: messages.length,
      markedReadCount: messages.length,
      deliveredVia,
      summary,
      messages,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isConfigError = /Missing Hub auth/i.test(message);

    return {
      ok: false,
      status: isConfigError ? 'config_error' : message.includes('failed') ? 'delivery_failed' : 'hub_error',
      query: config.query,
      timezone: config.timezone,
      localHour: config.localHour,
      localDate: local.date,
      unreadCount: 0,
      markedReadCount: 0,
      deliveredVia: [],
      summary: '',
      messages: [],
      details: message,
    };
  }
}
