/**
 * Meeting Transcription Worker
 * "Tools recede, understanding remains"
 *
 * Endpoints:
 *   POST /upload      - Upload audio file for processing
 *   GET  /meetings    - List meetings
 *   GET  /meetings/:id - Get single meeting
 *   GET  /search      - Full-text search transcripts
 *   POST /reprocess/:id - Reprocess a failed meeting
 *
 * Queue Consumer:
 *   Processes audio files asynchronously (no timeout issues)
 */

import type { Env, Meeting, MeetingResponse, ProcessingMessage } from './types';
import { handleUpload } from './handlers/upload';
import { processAudio } from './handlers/process';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for local development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      // Route requests
      if (path === '/upload' && request.method === 'POST') {
        response = await handleUpload(request, env, ctx);
      } else if (path === '/meetings' && request.method === 'GET') {
        response = await handleListMeetings(url, env);
      } else if (
        path.startsWith('/meetings/') &&
        !path.includes('/reprocess') &&
        request.method === 'GET'
      ) {
        const id = path.split('/')[2];
        response = await handleGetMeeting(id, env);
      } else if (path.startsWith('/reprocess/') && request.method === 'POST') {
        const id = path.split('/')[2];
        response = await handleReprocess(id, env);
      } else if (path === '/search' && request.method === 'GET') {
        response = await handleSearch(url, env);
      } else if (path === '/health') {
        response = jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
        });
      } else {
        response = jsonResponse({ error: 'Not found' }, 404);
      }

      // Add CORS headers to response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('Request error:', error);
      return jsonResponse(
        { error: error instanceof Error ? error.message : 'Internal error' },
        500
      );
    }
  },

  /**
   * Queue Consumer - processes audio files asynchronously
   * Has 15 minute timeout vs 30 second HTTP timeout
   */
  async queue(
    batch: MessageBatch<ProcessingMessage>,
    env: Env
  ): Promise<void> {
    for (const message of batch.messages) {
      const { meetingId, audioKey } = message.body;

      console.log(`Processing meeting ${meetingId} from queue (attempt ${message.attempts})`);

      try {
        // Get audio from R2
        const audioObject = await env.STORAGE.get(audioKey);
        if (!audioObject) {
          throw new Error(`Audio not found in R2: ${audioKey}`);
        }

        const audioBuffer = await audioObject.arrayBuffer();
        console.log(`Audio loaded: ${(audioBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

        // Process the audio (transcribe + summarize)
        await processAudio(meetingId, audioBuffer, audioKey, env);

        // Acknowledge successful processing
        message.ack();
        console.log(`Successfully processed meeting ${meetingId}`);
      } catch (error) {
        console.error(`Failed to process meeting ${meetingId}:`, error);

        // Retry up to 3 times (configured in wrangler.toml)
        if (message.attempts < 3) {
          message.retry({ delaySeconds: 60 * message.attempts }); // 1min, 2min, 3min backoff
          console.log(`Retrying meeting ${meetingId} in ${60 * message.attempts}s`);
        } else {
          // After 3 failures, mark as failed and ack (moves to DLQ)
          await env.DB.prepare(`
            UPDATE meetings SET
              status = 'failed',
              error_message = ?,
              updated_at = datetime('now')
            WHERE id = ?
          `)
            .bind(
              error instanceof Error ? error.message : 'Unknown error after 3 retries',
              meetingId
            )
            .run();

          message.ack(); // Will go to dead letter queue
          console.log(`Meeting ${meetingId} failed after 3 attempts, moved to DLQ`);
        }
      }
    }
  },
};

async function handleListMeetings(url: URL, env: Env): Promise<Response> {
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');
  const property = url.searchParams.get('property');

  let query = 'SELECT * FROM meetings WHERE 1=1';
  const params: (string | number)[] = [];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (property) {
    query += ' AND property = ?';
    params.push(property);
  }

  query += ' ORDER BY recorded_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all<Meeting>();

  return jsonResponse({
    meetings: result.results,
    meta: {
      limit,
      offset,
      total: result.results.length,
    },
  });
}

async function handleGetMeeting(id: string, env: Env): Promise<Response> {
  const result = await env.DB.prepare('SELECT * FROM meetings WHERE id = ?')
    .bind(id)
    .first<Meeting>();

  if (!result) {
    return jsonResponse<MeetingResponse>(
      { success: false, message: 'Meeting not found' },
      404
    );
  }

  return jsonResponse<MeetingResponse>({
    success: true,
    meeting: result,
  });
}

async function handleReprocess(
  id: string,
  env: Env
): Promise<Response> {
  // Get the meeting
  const meeting = await env.DB.prepare('SELECT * FROM meetings WHERE id = ?')
    .bind(id)
    .first<Meeting>();

  if (!meeting) {
    return jsonResponse({ success: false, message: 'Meeting not found' }, 404);
  }

  if (!meeting.audio_key) {
    return jsonResponse(
      { success: false, message: 'No audio file for this meeting' },
      400
    );
  }

  // Verify audio exists in R2
  const audioObject = await env.STORAGE.head(meeting.audio_key);
  if (!audioObject) {
    return jsonResponse(
      { success: false, message: 'Audio file not found in storage' },
      404
    );
  }

  // Update status
  await env.DB.prepare(
    `UPDATE meetings SET status = 'processing', error_message = NULL, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(id)
    .run();

  // Queue for reprocessing (uses the same queue consumer)
  const message: ProcessingMessage = {
    meetingId: id,
    audioKey: meeting.audio_key,
  };
  await env.PROCESSING_QUEUE.send(message);

  return jsonResponse({
    success: true,
    message: 'Reprocessing queued',
  });
}

async function handleSearch(url: URL, env: Env): Promise<Response> {
  const query = url.searchParams.get('q');

  if (!query) {
    return jsonResponse({ error: 'Search query required' }, 400);
  }

  const limit = parseInt(url.searchParams.get('limit') || '20');

  // Use FTS5 for full-text search
  const result = await env.DB.prepare(
    `
    SELECT m.* FROM meetings m
    JOIN meetings_fts fts ON m.id = fts.id
    WHERE meetings_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `
  )
    .bind(query, limit)
    .all<Meeting>();

  return jsonResponse({
    meetings: result.results,
    query,
  });
}

function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
