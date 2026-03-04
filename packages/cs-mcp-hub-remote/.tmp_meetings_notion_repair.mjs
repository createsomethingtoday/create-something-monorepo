import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const HUB_URL = process.env.HUB_URL || 'https://mj.mcp.createsomething.agency/mcp';
const HUB_TOKEN = process.env.HUB_TOKEN || '795b3abbdc4d927eeefbc1a76ef6ae3735b6bc13b86e42b8728448878a9fd620';
const HUB_ACCOUNT_ID = process.env.HUB_ACCOUNT_ID || 'acct_mj';
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '319fa874-0b15-812d-95a6-caee7600d607';
const MAX_REPAIR_ROWS = Number(process.env.MAX_REPAIR_ROWS || 200);

const GENERIC_TITLES = new Set([
  'zoom',
  'google meet',
  'microsoft teams',
  'webex',
  'facetime',
  'slack huddle',
  'manual recording',
]);

const VALID_STATUS = new Set(['pending', 'processing', 'completed', 'failed']);
const VALID_PROPERTY = new Set(['agency', 'io', 'space', 'ltd', 'unknown']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseToolOutput(out) {
  if (out?.structuredContent != null) return out.structuredContent;
  const text = out?.content?.find((c) => c?.type === 'text')?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function summarizeErr(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function isRetryableError(errLike) {
  const msg = summarizeErr(errLike).toLowerCase();
  return (
    msg.includes('409') ||
    msg.includes('429') ||
    msg.includes('status code 500') ||
    msg.includes('status code 502') ||
    msg.includes('status code 503') ||
    msg.includes('status code 504') ||
    /\b5\d\d\b/.test(msg)
  );
}

function truncate1900(value) {
  const s = (value ?? '').toString();
  return s.length <= 1900 ? s : s.slice(0, 1900);
}

function normalizeDate(value) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  // Convert "YYYY-MM-DD HH:mm:ss" to ISO UTC.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? raw.replace(' ', 'T') + 'Z'
    : raw;

  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

function normalizeStatus(value) {
  const s = (value ?? '').toString().trim().toLowerCase();
  return VALID_STATUS.has(s) ? s : 'completed';
}

function normalizeProperty(value) {
  const s = (value ?? '').toString().trim().toLowerCase();
  return VALID_PROPERTY.has(s) ? s : 'unknown';
}

function chooseName(meetingId, title) {
  const candidate = (title ?? '').toString().trim();
  if (!candidate) return `Meeting ${meetingId}`;
  if (GENERIC_TITLES.has(candidate.toLowerCase())) return `Meeting ${meetingId}`;
  return candidate;
}

function extractMeetingId(page) {
  const rt = page?.properties?.['Meeting ID']?.rich_text;
  if (!Array.isArray(rt) || rt.length === 0) return '';
  return (rt[0]?.plain_text ?? '').toString().trim();
}

function unwrapProxyResult(value) {
  if (value && typeof value === 'object' && 'successful' in value) {
    if (value.successful === false) {
      throw new Error(summarizeErr(value.error ?? value));
    }
    return value.data ?? null;
  }
  return value;
}

function jsonMetadata(meeting, transcriptChars) {
  return JSON.stringify(
    {
      id: meeting.id,
      property: meeting.property ?? null,
      project_id: meeting.project_id ?? null,
      participants: Array.isArray(meeting.participants) ? meeting.participants : [],
      topics: Array.isArray(meeting.topics) ? meeting.topics : [],
      tags: Array.isArray(meeting.tags) ? meeting.tags : [],
      audio_key: meeting.audio_key ?? null,
      audio_format: meeting.audio_format ?? null,
      audio_size_bytes: meeting.audio_size_bytes ?? null,
      status: meeting.status ?? null,
      error_message: meeting.error_message ?? null,
      transcript_char_count: transcriptChars,
    },
    null,
    2,
  );
}

function buildRowProperties(meeting, transcriptHash, transcriptChars) {
  const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];
  const topics = Array.isArray(meeting.topics) ? meeting.topics : [];
  const participants = Array.isArray(meeting.participants) ? meeting.participants : [];
  const tags = Array.isArray(meeting.tags) ? meeting.tags : [];

  const meetingId = meeting.id;
  const name = chooseName(meetingId, meeting.title);

  const props = [
    { name: 'Name', type: 'title', value: name },
    { name: 'Meeting ID', type: 'rich_text', value: meetingId },
    { name: 'Recorded At', type: 'date', value: normalizeDate(meeting.recorded_at) },
    { name: 'Processed At', type: 'date', value: normalizeDate(meeting.processed_at) },
    { name: 'Duration Seconds', type: 'number', value: String(Number(meeting.duration_seconds ?? 0) || 0) },
    { name: 'Status', type: 'select', value: normalizeStatus(meeting.status) },
    { name: 'Property', type: 'select', value: normalizeProperty(meeting.property) },
    { name: 'Project ID', type: 'rich_text', value: (meeting.project_id ?? '').toString() },
    { name: 'Audio Key', type: 'rich_text', value: (meeting.audio_key ?? '').toString() },
    { name: 'Audio Size Bytes', type: 'number', value: String(Number(meeting.audio_size_bytes ?? 0) || 0) },
    { name: 'Transcript Truncated', type: 'checkbox', value: meeting.transcript_truncated ? 'True' : 'False' },
    { name: 'Transcript Hash', type: 'rich_text', value: transcriptHash },
    { name: 'Created At', type: 'date', value: normalizeDate(meeting.created_at) },
    { name: 'Updated At', type: 'date', value: normalizeDate(meeting.updated_at) },
    { name: 'Summary Preview', type: 'rich_text', value: truncate1900(meeting.summary ?? '') },
    { name: 'Action Items Preview', type: 'rich_text', value: truncate1900(actionItems.join(' | ')) },
    { name: 'Topics Preview', type: 'rich_text', value: truncate1900(topics.join(' | ')) },
    { name: 'Participants Preview', type: 'rich_text', value: truncate1900(participants.join(' | ')) },
    { name: 'Tags Preview', type: 'rich_text', value: truncate1900(tags.join(' | ')) },
  ];

  if (meeting.audio_format && String(meeting.audio_format).trim()) {
    props.splice(9, 0, { name: 'Audio Format', type: 'select', value: String(meeting.audio_format).trim() });
  }

  // Keep metadata transcript count represented in summary if needed by future debugging.
  if (transcriptChars === 0 && props.find((p) => p.name === 'Transcript Hash')?.value) {
    // no-op; this path is informational only
  }

  return props.filter((p) => p.value !== '');
}

function buildContentBlocks(meeting, transcript) {
  const summary = (meeting.summary ?? '').toString().trim();
  const actionItems = Array.isArray(meeting.action_items) ? meeting.action_items : [];
  const transcriptBody = transcript && transcript.length > 0 ? transcript : '(No transcript available)';
  const metadata = jsonMetadata(meeting, transcript.length);

  const blocks = [];
  const add = (content, block_property) => {
    blocks.push({ content_block: { content, block_property } });
  };

  add('Summary', 'heading_2');
  add(summary || '(No summary available)', 'paragraph');

  add('Action Items', 'heading_2');
  if (actionItems.length > 0) {
    for (const item of actionItems) {
      const line = (item ?? '').toString().trim();
      if (line) add(line, 'bulleted_list_item');
    }
  } else {
    add('(No action items)', 'paragraph');
  }

  add('Transcript', 'heading_2');
  add(transcriptBody, 'paragraph');

  add('Metadata', 'heading_2');
  add(metadata, 'paragraph');

  return blocks;
}

async function main() {
  const transport = new StreamableHTTPClientTransport(new URL(HUB_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${HUB_TOKEN}`,
        'x-mcp-account-id': HUB_ACCOUNT_ID,
      },
    },
  });

  const client = new Client({ name: 'meetings-notion-repair', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);

  const callHubTool = async (name, args = {}) => {
    const out = await client.callTool({ name, arguments: args });
    return parseToolOutput(out);
  };

  const execProxy = async (proxyToolName, args = {}) => {
    const raw = await callHubTool('hub_execute_proxy_tool', { proxyToolName, args });
    return unwrapProxyResult(raw);
  };

  const execProxyWithRetry = async (proxyToolName, args = {}, retries = 3) => {
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        return await execProxy(proxyToolName, args);
      } catch (err) {
        if (attempt >= retries || !isRetryableError(err)) {
          throw err;
        }
        const delay = 500 * 2 ** (attempt - 1);
        await sleep(delay);
      }
    }
  };

  const notionStatus = await execProxy('composio-toolkit-notion__connection_status', {});
  if (!notionStatus?.connected) {
    throw new Error(`Notion toolkit is not connected for account ${HUB_ACCOUNT_ID}`);
  }

  const repairRows = [];
  let cursor = undefined;

  while (repairRows.length < MAX_REPAIR_ROWS) {
    const page = await execProxy('composio-toolkit-notion__notion_query_database_with_filter', {
      database_id: DATABASE_ID,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
      filter: {
        or: [
          { property: 'Transcript Hash', rich_text: { is_empty: true } },
          { property: 'Transcript Truncated', checkbox: { equals: true } },
        ],
      },
    });

    const results = Array.isArray(page?.results) ? page.results : [];
    repairRows.push(...results);

    if (!page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }

  const rowsToProcess = repairRows.slice(0, MAX_REPAIR_ROWS);

  const failures = [];
  let repaired = 0;

  for (const row of rowsToProcess) {
    const rowId = row?.id;
    const meetingId = extractMeetingId(row);

    if (!rowId || !meetingId) {
      failures.push({ rowId: rowId ?? '(unknown)', meetingId: meetingId ?? '', error: 'Missing row_id or Meeting ID' });
      continue;
    }

    try {
      const meetingResp = await execProxy('meetings__get_meeting', {
        meeting_id: meetingId,
        include_transcript: true,
        max_transcript_chars: 50000,
      });

      const meeting = meetingResp?.meeting;
      if (!meeting?.id) {
        throw new Error('Meeting payload missing meeting.id');
      }

      const transcript = (meeting.transcript ?? '').toString();
      const transcriptHash = createHash('sha256').update(transcript).digest('hex');
      const rowProperties = buildRowProperties(meeting, transcriptHash, transcript.length);

      await execProxyWithRetry('composio-toolkit-notion__notion_update_row_database', {
        row_id: rowId,
        properties: rowProperties,
      });

      await execProxyWithRetry('composio-toolkit-notion__notion_replace_page_content', {
        page_id: rowId,
        new_children: [],
      });

      await execProxyWithRetry('composio-toolkit-notion__notion_add_multiple_page_content', {
        parent_block_id: rowId,
        content_blocks: buildContentBlocks(meeting, transcript),
      });

      repaired += 1;
      // Keep calls steady to avoid accidental throttling.
      await sleep(150);
    } catch (err) {
      failures.push({ rowId, meetingId, error: summarizeErr(err) });
    }
  }

  // Verify quick spot checks.
  const remaining = await execProxy('composio-toolkit-notion__notion_query_database_with_filter', {
    database_id: DATABASE_ID,
    page_size: 1,
    filter: {
      or: [
        { property: 'Transcript Hash', rich_text: { is_empty: true } },
        { property: 'Transcript Truncated', checkbox: { equals: true } },
      ],
    },
  });

  const zoomNamed = await execProxy('composio-toolkit-notion__notion_query_database_with_filter', {
    database_id: DATABASE_ID,
    page_size: 5,
    filter: { property: 'Name', title: { equals: 'Zoom' } },
  });

  const summary = {
    database_id: DATABASE_ID,
    rows_flagged_initial: rowsToProcess.length,
    rows_repaired: repaired,
    rows_failed: failures.length,
    failures: failures.slice(0, 10),
    remaining_flagged_count_estimate: Array.isArray(remaining?.results) ? remaining.results.length : 0,
    remaining_flagged_has_more: Boolean(remaining?.has_more),
    zoom_named_count_estimate: Array.isArray(zoomNamed?.results) ? zoomNamed.results.length : 0,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(summary, null, 2));

  await client.close();
}

main().catch((err) => {
  console.error(JSON.stringify({ fatal: summarizeErr(err) }, null, 2));
  process.exitCode = 1;
});
