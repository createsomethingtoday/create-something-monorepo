import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { assertAdminMutation } from '$lib/server/admin-mutation';
import { arcCommandSchema } from '$lib/server/arc-command-schema';
import {
  applyPersistedArcCommand,
  getArcDocument,
  getOrCreateAppReviewArc,
  listArcReceipts,
  saveArcDraft
} from '$lib/server/arc-store';
import { getDb } from '$lib/server/db';

const privateHeaders = { 'cache-control': 'no-store, private' };

export const GET: RequestHandler = async ({ params, locals, platform }) => {
  if (!locals.admin) return json({ error: 'Admin login required.' }, { status: 401, headers: privateHeaders });
  try {
    const db = getDb(platform);
    const document =
      params.id === 'app-review-governance'
        ? await getOrCreateAppReviewArc(db)
        : await getArcDocument(db, params.id);
    if (!document) return json({ error: `Arc not found: ${params.id}.` }, { status: 404, headers: privateHeaders });
    const receipts = await listArcReceipts(db, params.id);
    return json({ document, receipts }, { headers: privateHeaders });
  } catch (error) {
    console.error('Arc read failed:', error);
    return json({ error: 'The Arc could not be loaded.' }, { status: 500, headers: privateHeaders });
  }
};

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
  const admin = assertAdminMutation(request, locals);
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return json(
      { error: 'Provide a bounded Idempotency-Key header before mutating an Arc.' },
      { status: 400, headers: privateHeaders }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, { status: 400, headers: privateHeaders });
  }
  const parsed = arcCommandSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      { error: 'Invalid Arc command.', issues: parsed.error.issues },
      { status: 400, headers: privateHeaders }
    );
  }

  try {
    const response = await applyPersistedArcCommand(getDb(platform), {
      arcId: params.id,
      actor: admin.email,
      command: parsed.data,
      idempotencyKey
    });
    return json(response, { headers: privateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Arc command failed.';
    return json({ error: message }, { status: 409, headers: privateHeaders });
  }
};

export const PUT: RequestHandler = async ({ params, request, locals, platform }) => {
  const admin = assertAdminMutation(request, locals);
  const idempotencyKey = request.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return json({ error: 'Provide a bounded Idempotency-Key header before saving.' }, { status: 400, headers: privateHeaders });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 1_000_000) {
    return json({ error: 'Arc drafts must be smaller than 1 MB.' }, { status: 413, headers: privateHeaders });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (!Number.isInteger(body.baseRevision) || !body.document || typeof body.document !== 'object') {
      return json({ error: 'Provide baseRevision and a complete Arc document.' }, { status: 400, headers: privateHeaders });
    }
    const response = await saveArcDraft(getDb(platform), {
      arcId: params.id,
      actor: admin.email,
      baseRevision: body.baseRevision as number,
      document: body.document as Parameters<typeof saveArcDraft>[1]['document'],
      idempotencyKey
    });
    return json(response, { headers: privateHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The Arc draft could not be saved.';
    return json({ error: message }, { status: 409, headers: privateHeaders });
  }
};
