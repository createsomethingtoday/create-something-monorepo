import {
  acquireLock,
  completeSyncRun,
  createSyncRun,
  discoverTranscript,
  getCanonicalMeetingPage,
  getLedgerByDedupKey,
  incrementRunCounter,
  initSchema,
  listLedgerEntries,
  listRecentRuns,
  markLedgerEnqueued,
  markLedgerFailed,
  markLedgerSkipped,
  markLedgerSynced,
  releaseLock,
} from './db';
import { syncTranscriptToNotion } from './notion';
import type { Env, SyncRunSummary, TranscriptQueueMessage } from './types';
import { downloadTranscript, inspectMeetingRecordings, listTranscriptCandidates, parseTranscript } from './zoom';

const DISCOVERY_LOCK_ID = 'zoom-transcript-sync-discovery';
const LOCK_TTL_SECONDS = 10 * 60;
const MEETING_SYNC_LOCK_TTL_SECONDS = 10 * 60;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    await initSchema(env.DB);

    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        worker: 'halfdozen-zoom-transcript-sync',
        notion_write_mode: resolveWriteMode(env),
        notion_database_configured: Boolean(env.NOTION_DATABASE_ID?.trim()),
        notion_runtime_connection_configured: Boolean(env.NOTION_RUNTIME_CONNECTION_REF?.trim()),
        sync_api_key_configured: Boolean(env.SYNC_API_KEY?.trim()),
        zoom_auth_mode: resolveZoomAuthMode(env),
      });
    }

    if (url.pathname === '/status') {
      const authError = requireApiKey(request, env);
      if (authError) return authError;

      const limit = parsePositiveInt(url.searchParams.get('limit'), 10);
      const status = url.searchParams.get('status')?.trim() || undefined;
      const [runs, ledger] = await Promise.all([
        listRecentRuns(env.DB, limit),
        listLedgerEntries(env.DB, limit, status),
      ]);
      return json({ ok: true, runs, ledger });
    }

    if (url.pathname.startsWith('/recordings/') && request.method === 'GET') {
      const authError = requireApiKey(request, env);
      if (authError) return authError;

      const meetingId = decodeURIComponent(url.pathname.slice('/recordings/'.length)).trim();
      if (!meetingId) {
        return json({ ok: false, error: 'meeting_id is required' }, 400);
      }

      try {
        const inspection = await inspectMeetingRecordings(env, meetingId, {
          from: url.searchParams.get('from') ?? undefined,
          to: url.searchParams.get('to') ?? undefined,
        });
        return json({ ok: true, ...inspection });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = message.startsWith('from ') || message.startsWith('to ') ? 400 : 502;
        return json({ ok: false, error: message }, status);
      }
    }

    if (url.pathname === '/scan' && request.method === 'POST') {
      const authError = requireApiKey(request, env);
      if (authError) return authError;

      const trigger = 'manual';
      const runPromise = executeDiscoveryRun(env, trigger);
      ctx.waitUntil(runPromise);
      return json({ ok: true, accepted: true, trigger });
    }

    if (url.pathname.startsWith('/replay/') && request.method === 'POST') {
      const authError = requireApiKey(request, env);
      if (authError) return authError;

      const dedupKey = decodeURIComponent(url.pathname.slice('/replay/'.length));
      const ledger = await getLedgerByDedupKey(env.DB, dedupKey);
      if (!ledger) {
        return json({ ok: false, error: `No ledger row found for ${dedupKey}` }, 404);
      }

      await env.SYNC_QUEUE.send({
        runId: null,
        replay: true,
        dedupKey: ledger.dedup_key,
        canonicalMeetingKey: ledger.canonical_meeting_key,
        meetingId: ledger.zoom_meeting_id,
        meetingUuid: ledger.zoom_meeting_uuid,
        meetingTitle: ledger.meeting_title,
        meetingDate: ledger.meeting_date,
        startTime: ledger.recording_start_time,
        sourceUrl: ledger.source_url,
        originalSourceUrl: ledger.original_source_url,
        transcriptDownloadUrl: ledger.transcript_download_url,
        transcriptFileId: ledger.transcript_file_id,
        transcriptFileType: ledger.transcript_file_type,
        transcriptFileExtension: ledger.transcript_file_extension,
        hostId: null,
      });
      await markLedgerEnqueued(env.DB, dedupKey);

      return json({ ok: true, replayed: dedupKey });
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },

  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    await initSchema(env.DB);
    await executeDiscoveryRun(env, 'scheduled');
  },

  async queue(batch: MessageBatch<TranscriptQueueMessage>, env: Env): Promise<void> {
    await initSchema(env.DB);

    for (const message of batch.messages) {
      try {
        await processTranscriptMessage(env, message.body);
        if (message.body.runId) {
          await incrementRunCounter(env.DB, message.body.runId, 'synced_count');
        }
        message.ack();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Transcript sync failed for ${message.body.dedupKey}:`, errorMessage);

        if (errorMessage.startsWith('Meeting sync lock is busy')) {
          await env.SYNC_QUEUE.send(message.body, { delaySeconds: 60 });
          message.ack();
          continue;
        }

        if (message.attempts < 3) {
          message.retry({ delaySeconds: message.attempts * 60 });
        } else {
          await markLedgerFailed(env.DB, message.body.dedupKey, errorMessage);
          if (message.body.runId) {
            await incrementRunCounter(env.DB, message.body.runId, 'failed_count');
          }
          message.ack();
        }
      }
    }
  },
};

async function executeDiscoveryRun(env: Env, trigger: string): Promise<SyncRunSummary | null> {
  const acquired = await acquireLock(env.DB, DISCOVERY_LOCK_ID, LOCK_TTL_SECONDS);
  if (!acquired) {
    console.log(`[${trigger}] skipped discovery because another run holds the lock`);
    return null;
  }

  const runId = await createSyncRun(env.DB, trigger);

  try {
    const discovery = await listTranscriptCandidates(env);
    let queued = 0;
    let skipped = 0;

    for (const candidate of discovery.candidates) {
      const { shouldEnqueue } = await discoverTranscript(env.DB, candidate);
      if (shouldEnqueue) {
        await env.SYNC_QUEUE.send({
          ...candidate,
          runId,
          replay: false,
        });
        await markLedgerEnqueued(env.DB, candidate.dedupKey);
        queued += 1;
      } else {
        skipped += 1;
      }
    }

    await completeSyncRun(env.DB, runId, 'success', {
      discovered_count: discovery.candidates.length,
      queued_count: queued,
      skipped_count: skipped,
    });

    const summary: SyncRunSummary = {
      runId,
      trigger,
      discovered: discovery.candidates.length,
      queued,
      skipped,
      meetingsScanned: discovery.meetingsScanned,
      transcriptFilesScanned: discovery.transcriptFilesScanned,
      from: discovery.from,
      to: discovery.to,
    };
    console.log(`[${trigger}] discovery complete`, summary);
    return summary;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await completeSyncRun(env.DB, runId, 'failed', { error: errorMessage });
    throw error;
  } finally {
    await releaseLock(env.DB, DISCOVERY_LOCK_ID);
  }
}

async function processTranscriptMessage(env: Env, payload: TranscriptQueueMessage): Promise<void> {
  const ledger = await getLedgerByDedupKey(env.DB, payload.dedupKey);
  if (!ledger) {
    throw new Error(`No transcript ledger row found for ${payload.dedupKey}`);
  }

  if (ledger.status === 'synced' && ledger.transcript_sha256 && ledger.notion_page_id && !payload.replay) {
    return;
  }

  const rawTranscript = await downloadTranscript(env, payload);
  const parsedTranscript = parseTranscript(rawTranscript, payload.transcriptFileExtension);
  if (!parsedTranscript.plainText.trim()) {
    await markLedgerSkipped(env.DB, payload.dedupKey, ledger.notion_page_id, ledger.notion_page_url, null, 'Transcript file was empty');
    if (payload.runId) {
      await incrementRunCounter(env.DB, payload.runId, 'skipped_count');
    }
    return;
  }

  const transcriptHash = await sha256Hex(parsedTranscript.plainText);
  if (ledger.status === 'synced' && ledger.transcript_sha256 === transcriptHash && ledger.notion_page_id && !payload.replay) {
    return;
  }

  const meetingLockId = `zoom-transcript-sync-meeting:${payload.canonicalMeetingKey}:${payload.meetingDate}`;
  const acquired = await acquireLock(env.DB, meetingLockId, MEETING_SYNC_LOCK_TTL_SECONDS);
  if (!acquired) {
    throw new Error(`Meeting sync lock is busy for ${payload.canonicalMeetingKey} on ${payload.meetingDate}`);
  }

  try {
    const canonicalPage = await getCanonicalMeetingPage(env.DB, payload.canonicalMeetingKey, payload.meetingDate);
    const notionWrite = await syncTranscriptToNotion(env, payload, parsedTranscript, transcriptHash, canonicalPage);
    if (notionWrite.action === 'skipped') {
      await markLedgerSkipped(
        env.DB,
        payload.dedupKey,
        notionWrite.pageId,
        notionWrite.pageUrl,
        transcriptHash,
        notionWrite.reason ?? 'Transcript already present in page body',
      );
      if (payload.runId) {
        await incrementRunCounter(env.DB, payload.runId, 'skipped_count');
      }
      return;
    }

    await markLedgerSynced(env.DB, payload.dedupKey, notionWrite.pageId, notionWrite.pageUrl, transcriptHash);
  } finally {
    await releaseLock(env.DB, meetingLockId);
  }
}

function requireApiKey(request: Request, env: Env): Response | null {
  const configured = env.SYNC_API_KEY?.trim();
  if (!configured) {
    return json({ ok: false, error: 'SYNC_API_KEY is not configured' }, 503);
  }

  const headerValue = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    || request.headers.get('x-api-key')?.trim();

  if (headerValue !== configured) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  return null;
}

function resolveWriteMode(env: Env): string {
  if (env.NOTION_WRITE_MODE?.trim()) {
    return env.NOTION_WRITE_MODE.trim();
  }
  if (env.NOTION_HUB_URL?.trim() && env.NOTION_HUB_API_TOKEN?.trim() && env.NOTION_HUB_PROXY_TOOL?.trim()) {
    return 'hub';
  }
  if (env.NOTION_API_KEY?.trim()) {
    return 'api';
  }
  return 'unconfigured';
}

function resolveZoomAuthMode(env: Env): string {
  if (env.ZOOM_ACCESS_TOKEN?.trim()) return 'access_token';
  if (env.ZOOM_CLIENT_ID?.trim() && env.ZOOM_CLIENT_SECRET?.trim() && env.ZOOM_ACCOUNT_ID?.trim()) return 'server_to_server';
  if (env.ZOOM_CLIENT_ID?.trim() && env.ZOOM_CLIENT_SECRET?.trim() && env.ZOOM_REFRESH_TOKEN?.trim()) return 'refresh_token';
  return 'unconfigured';
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
