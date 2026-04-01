import type { IndeedEnv } from './types.js';
import { IndeedApplyWebhookPayloadSchema } from './schemas/index.js';
import { verifyIndeedSignature } from './signature.js';
import { upsertApplicationFromWebhook } from './storage.js';

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function handleApplyWebhook(request: Request, env: IndeedEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, { status: 405 });
  }

  if (!env.DB) {
    return json({ error: 'DB binding is required.' }, { status: 500 });
  }

  const rawPayload = await request.text();
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawPayload) as unknown;
  } catch {
    return json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = IndeedApplyWebhookPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return json(
      {
        error: 'Invalid Indeed Apply payload.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const signature = await verifyIndeedSignature({
    secret: env.INDEED_APPLY_SECRET,
    payload: rawPayload,
    signature: request.headers.get('x-indeed-signature'),
  });

  if (signature.enabled && !signature.verified) {
    return json(
      {
        error: 'Invalid Indeed signature.',
        reason: signature.reason ?? 'verification_failed',
      },
      { status: 401 },
    );
  }

  try {
    const result = await upsertApplicationFromWebhook({
      db: env.DB,
      storage: env.STORAGE,
      accountId: env.INDEED_ACCOUNT_ID?.trim() || 'abundance',
      payload: parsed.data as Record<string, unknown>,
      rawPayload,
      signature,
    });

    if (result.duplicate && !result.existingById) {
      return json(
        {
          duplicate: true,
          local_application_id: result.application.id,
          local_job_id: result.job.id,
          indeed_apply_id: result.application.indeed_apply_id,
        },
        { status: 409 },
      );
    }

    return json(
      {
        duplicate: result.duplicate,
        local_application_id: result.application.id,
        local_job_id: result.job.id,
        indeed_apply_id: result.application.indeed_apply_id,
        signature_verified: signature.verified,
        resume_artifact_ref: result.resume.key,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return json({ error: message }, { status: 404 });
    }
    if (message.includes('expired')) {
      return json({ error: message }, { status: 410 });
    }
    return json({ error: message }, { status: 500 });
  }
}

