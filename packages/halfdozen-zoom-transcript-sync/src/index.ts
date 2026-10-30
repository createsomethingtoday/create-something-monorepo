import { PAGE_FORMAT } from './page-transcript';
import { publicationPlan } from './publication-plan';
import { InlineContinuation } from './inline-transcript';
import { atOrAfter, ledgerAdmitted, rolloutCutoff } from './rollout';
import { INGESTION_LEASE_TTL_SECONDS, claimIngestion, meetingKey, selectRendition } from './ingestion-state';
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
  markLedgerSynced,
  releaseLock,
} from './db';
import { syncTranscriptToNotion, invalidateNotionReadiness, publishNotionReadiness } from './notion';
import type { Env, SyncRunSummary, TranscriptQueueMessage, TranscriptCandidate } from './types';
import { downloadTranscript, inspectMeetingRecordings, listTranscriptCandidates, parseTranscript, selectCanonicalRendition } from './zoom';

const DISCOVERY_LOCK_ID = 'zoom-transcript-sync-discovery';
const LOCK_TTL_SECONDS = 10 * 60;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
        indexed_ingestion_not_before: env.INDEXED_INGESTION_NOT_BEFORE ?? null,
        transcript_publication_format: PAGE_FORMAT,
        unchanged_projections: 'preserve existing format unless explicitly replayed',
      });
    }

    if (url.pathname === '/status') {
      const authError = requireApiKey(request, env);
      if (authError) return authError;

      const limit = parsePositiveInt(url.searchParams.get('limit'), 10);
      const status = url.searchParams.get('status')?.trim() || undefined;
      const [runs, ledger, ingestion] = await Promise.all([
        listRecentRuns(env.DB, limit),
        listLedgerEntries(env.DB, limit, status),
        env.DB.prepare(`SELECT * FROM transcript_ingestion LIMIT ?`).bind(limit).all(),
      ]);
      return json({ ok: true, runs, ledger, ingestion: ingestion.results });
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

      rolloutCutoff(env);
      await initSchema(env.DB);
      const trigger = 'manual';
      const runPromise = executeDiscoveryRun(env, trigger);
      ctx.waitUntil(runPromise);
      return json({ ok: true, accepted: true, trigger });
    }

    if (url.pathname.startsWith('/replay/') && request.method === 'POST') {
      const authError = requireApiKey(request, env);
      if (authError) return authError;

      const cutoff = rolloutCutoff(env);
      const dedupKey = decodeURIComponent(url.pathname.slice('/replay/'.length));
      const ledger = await getLedgerByDedupKey(env.DB, dedupKey);
      if (!ledger) {
        return json({ ok: false, error: `No ledger row found for ${dedupKey}` }, 404);
      }

      if (!ledgerAdmitted(ledger, cutoff)) {
        return json({ ok: false, error: 'Record is outside the forward-only rollout boundary' }, 409);
      }
      await env.SYNC_QUEUE.send({
        runId: null,
        rolloutCutoff: cutoff,
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
    rolloutCutoff(env);
    await initSchema(env.DB);
    await executeDiscoveryRun(env, 'scheduled');
  },

  async queue(batch: MessageBatch<TranscriptQueueMessage>, env: Env): Promise<void> {
    rolloutCutoff(env);
    await initSchema(env.DB);

    for (const message of batch.messages) {
      try {
        const outcome = await processTranscriptMessage(env, message.body);
        if (outcome === 'processed' && message.body.runId) {
          await incrementRunCounter(env.DB, message.body.runId, 'synced_count');
        }
        message.ack();
      } catch (error) {
        if (error instanceof InlineContinuation) {
          await env.SYNC_QUEUE.send({ ...message.body, inlineContinuation: (message.body.inlineContinuation ?? 0) + 1 });
          message.ack();
          continue;
        }
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Transcript sync failed for ${message.body.dedupKey}:`, errorMessage);

        if (errorMessage.startsWith('Meeting sync lock is busy')) {
          // A canceled owner can retain its full lease. Wait past that lease
          // rather than spending the queue retry budget while it is still held.
          message.retry({ delaySeconds: INGESTION_LEASE_TTL_SECONDS + 1 });
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
  const cutoff = rolloutCutoff(env);
  const acquired = await acquireLock(env.DB, DISCOVERY_LOCK_ID, LOCK_TTL_SECONDS);
  if (!acquired) {
    console.log(`[${trigger}] skipped discovery because another run holds the lock`);
    return null;
  }

  const runId = await createSyncRun(env.DB, trigger);

  try {
    const discovery = await listTranscriptCandidates(env);
    // Readiness is an observed snapshot. Invalidate the scanned window even when
    // a formerly selected recording disappears or loses transcript eligibility.
    const tracked = await env.DB.prepare(`SELECT * FROM transcript_sync_ledger WHERE meeting_date BETWEEN ? AND ?`)
      .bind(discovery.from, discovery.to).all<import('./types').LedgerRow>();
    const observed = new Map<string, TranscriptCandidate[]>();
    for (const candidate of discovery.candidates) {
      if (!atOrAfter(candidate.startTime, cutoff)) continue;
      const key = meetingKey(candidate); observed.set(key, [...(observed.get(key) ?? []), candidate]);
    }
    const invalidated = new Set<string>();
    for (const row of tracked.results ?? []) {
      if (!ledgerAdmitted(row, cutoff)) continue;
      const key = meetingKey({ canonicalMeetingKey: row.canonical_meeting_key, meetingDate: row.meeting_date });
      if (invalidated.has(key)) continue;
      invalidated.add(key);
      const prior = await env.DB.prepare('SELECT selected_key, page_id FROM transcript_ingestion WHERE meeting_key = ?')
        .bind(key).first<{ selected_key: string; page_id: string | null }>();
      const next = selectCanonicalRendition(observed.get(key) ?? []);
      await env.DB.prepare(`UPDATE transcript_ingestion SET ready_version = NULL,
        index_block_id = NULL, verified_at = NULL, selected_key = 'unobserved', owner = NULL, expires_at = NULL
      WHERE meeting_key = ?`)
      .bind(key).run();
      if (prior?.page_id && next?.dedupKey !== prior.selected_key) {
        const lease = await claimIngestion(env.DB, key, 'unobserved');
        try { await invalidateNotionReadiness(env, prior.page_id, lease); } finally { await lease.release(); }
      }
    }
    let queued = 0;
    let skipped = 0;

    const groups = new Map<string, TranscriptCandidate[]>();
    for (const candidate of discovery.candidates) {
      if (!atOrAfter(candidate.startTime, cutoff)) { skipped++; continue; }
      const prior = await getLedgerByDedupKey(env.DB, candidate.dedupKey);
      if (prior && !ledgerAdmitted(prior, cutoff)) { skipped++; continue; }
      const key = meetingKey(candidate);
      groups.set(key, [...(groups.get(key) ?? []), candidate]);
    }
    for (const [key, files] of groups) {
      const candidate = selectCanonicalRendition(files);
      await selectRendition(env.DB, key, candidate?.dedupKey ?? 'ambiguous');
      if (!candidate) {
        console.warn(`Canonical rendition is ambiguous for ${key}; readiness withheld`);
        skipped += files.length;
        continue;
      }
      const { shouldEnqueue } = await discoverTranscript(env.DB, candidate);
      if (shouldEnqueue) {
        await env.SYNC_QUEUE.send({
          ...candidate,
          runId,
          rolloutCutoff: cutoff,
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

async function processTranscriptMessage(env: Env, payload: TranscriptQueueMessage): Promise<'processed' | 'excluded'> {
  const cutoff = rolloutCutoff(env);
  if (payload.rolloutCutoff !== cutoff) return 'excluded';
  const ledger = await getLedgerByDedupKey(env.DB, payload.dedupKey);
  if (!ledger) {
    throw new Error(`No transcript ledger row found for ${payload.dedupKey}`);
  }

  if (!ledgerAdmitted(ledger, cutoff) || payload.canonicalMeetingKey !== ledger.canonical_meeting_key
    || payload.meetingDate !== ledger.meeting_date) return 'excluded';
  // A presentation release must not silently migrate already-written pages.
  // An authenticated, explicit replay may replace an archived page; the Notion
  // layer still refuses in-place conversion of an untracked existing body.
  const priorPage = ledger.notion_page_id ?? (await getCanonicalMeetingPage(env.DB, ledger.canonical_meeting_key, ledger.meeting_date))?.pageId;
  if (priorPage && !payload.replay) {
    const tracked = await env.DB.prepare('SELECT page_id FROM transcript_inline_projection WHERE page_id = ?')
      .bind(priorPage).first();
    if (!tracked) return 'excluded';
  }
  const key = meetingKey({ canonicalMeetingKey: ledger.canonical_meeting_key, meetingDate: ledger.meeting_date });
  // Use the latest discovered file URL, never the stale URL carried by a queued message.
  const current = {
    ...payload,
    canonicalMeetingKey: ledger.canonical_meeting_key,
    meetingDate: ledger.meeting_date,
    meetingTitle: ledger.meeting_title,
    sourceUrl: ledger.source_url,
    transcriptDownloadUrl: ledger.transcript_download_url,
    transcriptFileExtension: ledger.transcript_file_extension,
  };
  const selected = await env.DB.prepare(`SELECT selected_key FROM transcript_ingestion WHERE meeting_key = ?`)
    .bind(key).first<{ selected_key: string }>();
  if (!selected || selected.selected_key !== payload.dedupKey) return 'excluded';
  const lease = await claimIngestion(env.DB, key, payload.dedupKey);
  let gatePage = priorPage;
  try {
    // Claim clears readiness before download, parse, or writes can fail.
    const rawTranscript = await downloadTranscript(env, current);
    const parsedTranscript = parseTranscript(rawTranscript, current.transcriptFileExtension);
    const priorProjection = priorPage ? await env.DB.prepare('SELECT version, phase FROM transcript_inline_projection WHERE page_id = ?')
      .bind(priorPage).first<{ version: string; phase: string }>() : null;
    const plan = await publicationPlan(parsedTranscript, priorProjection, payload.replay === true);
    await lease.begin(plan.version);
    const canonicalPage = await getCanonicalMeetingPage(env.DB, current.canonicalMeetingKey, current.meetingDate);
    const notionWrite = await syncTranscriptToNotion(env, current, parsedTranscript, plan, lease, canonicalPage, payload.replay === true);
    gatePage = notionWrite.pageId;
    if (!notionWrite.indexBlockId) throw new Error('Missing verified index receipt');
    // Detect edits made while the write was running before publishing readiness.
    const latest = await downloadTranscript(env, current);
    if (latest !== rawTranscript) throw new Error('Transcript changed during ingestion; readiness withheld');
    await lease.ready(plan.version, notionWrite.pageId, notionWrite.indexBlockId);
    await publishNotionReadiness(env, notionWrite, lease);
    await markLedgerSynced(env.DB, payload.dedupKey, notionWrite.pageId, notionWrite.pageUrl, plan.version);
    return 'processed';
  } catch (error) {
    if (!(error instanceof InlineContinuation)) {
      await lease.invalidateReady();
      if (gatePage) await invalidateNotionReadiness(env, gatePage, lease);
    }
    throw error;
  } finally {
    await lease.release();
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

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export const ingestionTestExports = { processTranscriptMessage, executeDiscoveryRun };
