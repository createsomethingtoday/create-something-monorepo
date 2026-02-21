import {
  buildOutboundPayload,
  getAirtableConfig,
  getRecordById,
  getRecordByMessageKey,
  markDeadLetter,
  transitionWorkflowState,
  upsertIngestRecord
} from './airtable.js';
import { parseSlackOnboardingMessage } from './parser.js';
import { errorMessage, type IngestRequest, type TransitionRequest, type WorkerEnv } from './types.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

function validateIngestPayload(payload: unknown): payload is IngestRequest {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<IngestRequest>;

  return Boolean(
    typeof value.source === 'string' &&
      value.source.trim() &&
      typeof value.channel_id === 'string' &&
      value.channel_id.trim() &&
      typeof value.message_ts === 'string' &&
      value.message_ts.trim() &&
      typeof value.thread_ts === 'string' &&
      value.thread_ts.trim() &&
      typeof value.raw_text === 'string'
  );
}

function validateTransitionPayload(payload: unknown): payload is TransitionRequest {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<TransitionRequest>;
  const hasLookupKey =
    (typeof value.record_id === 'string' && value.record_id.trim().length > 0) ||
    (typeof value.message_key === 'string' && value.message_key.trim().length > 0);

  const hasState =
    value.to_state === 'Queue' ||
    value.to_state === 'In-Progress' ||
    value.to_state === 'Blocked' ||
    value.to_state === 'Done';

  return hasLookupKey && hasState;
}

async function handleIngest(request: Request, env: WorkerEnv): Promise<Response> {
  let payload: IngestRequest;
  try {
    payload = (await request.json()) as IngestRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }

  if (!validateIngestPayload(payload)) {
    return jsonResponse({ ok: false, error: 'Payload missing required ingest fields.' }, 400);
  }

  const parseResult = parseSlackOnboardingMessage(payload.raw_text);

  let config;
  try {
    config = getAirtableConfig(env);
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500);
  }

  try {
    const result = await upsertIngestRecord(config, payload, parseResult);

    return jsonResponse({
      ok: true,
      message_key: `${payload.channel_id}:${payload.message_ts}`,
      record_id: result.recordId,
      parse_status: result.parseStatus,
      action: result.action,
      revision: result.revision,
      warnings: parseResult.warnings
    });
  } catch (error) {
    const reason = errorMessage(error);
    await markDeadLetter(config, payload, reason, parseResult.parseStatus);

    return jsonResponse(
      {
        ok: false,
        error: reason,
        message_key: `${payload.channel_id}:${payload.message_ts}`,
        parse_status: parseResult.parseStatus,
        dead_letter: true
      },
      500
    );
  }
}

async function handleTransition(request: Request, env: WorkerEnv): Promise<Response> {
  let payload: TransitionRequest;
  try {
    payload = (await request.json()) as TransitionRequest;
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }

  if (!validateTransitionPayload(payload)) {
    return jsonResponse({ ok: false, error: 'Invalid transition payload.' }, 400);
  }

  let config;
  try {
    config = getAirtableConfig(env);
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500);
  }

  try {
    const result = await transitionWorkflowState(config, payload);
    const status = result.ok ? 200 : 409;
    return jsonResponse(result, status);
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500);
  }
}

async function handleOutboundPayload(request: Request, env: WorkerEnv): Promise<Response> {
  let config;
  try {
    config = getAirtableConfig(env);
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500);
  }

  let payload: { record_id?: string; message_key?: string };
  try {
    payload = (await request.json()) as { record_id?: string; message_key?: string };
  } catch {
    return jsonResponse({ ok: false, error: 'Invalid JSON payload.' }, 400);
  }

  if (!payload.record_id && !payload.message_key) {
    return jsonResponse({ ok: false, error: 'Provide record_id or message_key.' }, 400);
  }

  try {
    const record = payload.record_id
      ? await getRecordById(config, payload.record_id)
      : await getRecordByMessageKey(config, payload.message_key as string);

    if (!record) {
      return jsonResponse({ ok: false, error: 'Record not found.' }, 404);
    }

    const outboundPayload = buildOutboundPayload(record);
    if (!outboundPayload) {
      return jsonResponse({
        ok: false,
        error: 'Record does not satisfy outbound trigger contract.',
        required: {
          workflow_state: 'Done',
          outbound_status: 'ready',
          response_text: 'non-empty'
        }
      }, 409);
    }

    return jsonResponse({ ok: true, payload: outboundPayload });
  } catch (error) {
    return jsonResponse({ ok: false, error: errorMessage(error) }, 500);
  }
}

function handleHealth(env: WorkerEnv): Response {
  return jsonResponse({
    ok: true,
    service: 'webflow-onboarding-sync-worker',
    version: '0.1.0',
    airtableConfigured: Boolean(env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID),
    tableConfigured: env.AIRTABLE_ONBOARDING_TABLE ?? 'Partner Onboarding Ops',
    endpoints: {
      ingest: 'POST /onboarding/ingest',
      transition: 'POST /onboarding/transition',
      outbound_payload: 'POST /onboarding/outbound-payload',
      health: 'GET /health'
    },
    stateMachine: {
      allowedTransitions: {
        empty: ['Queue'],
        Queue: ['In-Progress'],
        'In-Progress': ['Done', 'Blocked'],
        Blocked: ['In-Progress'],
        Done: []
      }
    }
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET' && url.pathname === '/health') {
      return handleHealth(env);
    }

    if (request.method === 'POST' && url.pathname === '/onboarding/ingest') {
      return handleIngest(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/onboarding/transition') {
      return handleTransition(request, env);
    }

    if (request.method === 'POST' && url.pathname === '/onboarding/outbound-payload') {
      return handleOutboundPayload(request, env);
    }

    return jsonResponse(
      {
        ok: false,
        error: 'Not found',
        routes: ['GET /health', 'POST /onboarding/ingest', 'POST /onboarding/transition', 'POST /onboarding/outbound-payload']
      },
      404
    );
  }
};
