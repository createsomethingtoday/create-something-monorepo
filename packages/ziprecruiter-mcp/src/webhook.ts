import type { ZipRecruiterEnv } from './types.js';
import { ZipRecruiterApplyWebhookPayloadSchema } from './schemas/index.js';
import { verifyZipRecruiterSignature } from './signature.js';
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

export async function handleApplyWebhook(
  request: Request,
  env: ZipRecruiterEnv,
): Promise<Response> {
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

  const parsed = ZipRecruiterApplyWebhookPayloadSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return json(
      {
        error: 'Invalid Apply Webhook payload.',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const signature = await verifyZipRecruiterSignature({
    secret: env.ZIPRECRUITER_WEBHOOK_SECRET,
    payload: rawPayload,
    timestamp: request.headers.get('x-ziprecruiter-signature-timestamp'),
    signature: request.headers.get('x-ziprecruiter-signature'),
    version: request.headers.get('x-ziprecruiter-signature-version'),
    toleranceMs: (() => {
      const raw = env.ZIPRECRUITER_SIGNATURE_TOLERANCE_SECONDS;
      const seconds = raw ? Number(raw) : NaN;
      return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 300_000;
    })(),
  });

  if (signature.enabled && !signature.verified) {
    return json(
      {
        error: 'Invalid ZipRecruiter signature.',
        reason: signature.reason ?? 'verification_failed',
      },
      { status: 401 },
    );
  }

  try {
    const result = await upsertApplicationFromWebhook({
      db: env.DB,
      storage: env.STORAGE,
      payload: parsed.data,
      rawPayload,
      signature,
    });

    return json(
      {
        application_id: result.application.id,
        candidate_id: result.candidate.id,
        job_id: result.job.id,
        additional_data: {
          ziprecruiter_response_id: parsed.data.response_id,
          ziprecruiter_job_id: parsed.data.job_id,
          zr_application_id: result.application.zr_application_id,
          duplicate: result.duplicate,
          signature: {
            enabled: signature.enabled,
            verified: signature.verified,
            version: signature.version ?? null,
            timestamp: signature.timestamp ?? null,
          },
          resume_artifact_ref: result.resume.key,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
