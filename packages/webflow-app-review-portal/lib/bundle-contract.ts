import { z } from 'zod';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
export class BundleError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export const bundleIdSchema = z.string().uuid();
export const reportSchema = z
  .object({
    bundle_id: bundleIdSchema,
    bundle_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    model_reported: z.string().trim().min(1).max(120),
    summary: z.string().trim().min(1).max(6000),
    checks: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(180),
            status: z.enum(['passed', 'failed', 'not_tested']),
            method: z.enum(['static_analysis', 'runtime_test', 'not_tested']),
            evidence: z.string().trim().min(1).max(4000)
          })
          .strict()
          .superRefine((check, ctx) => {
            if ((check.status === 'not_tested') !== (check.method === 'not_tested')) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Untested checks must use both status and method not_tested.'
              });
            }
          })
      )
      .min(1)
      .max(50),
    findings: z
      .array(
        z
          .object({
            severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
            title: z.string().trim().min(1).max(200),
            evidence: z.string().trim().min(1).max(6000),
            recommendation: z.string().trim().min(1).max(4000),
            file: z.string().max(512).optional(),
            line: z.number().int().positive().max(10000000).optional()
          })
          .strict()
      )
      .max(100)
  })
  .strict();

export function requireSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    throw new BundleError('ORIGIN_REQUIRED', 'Use this Site to submit the request.', 403);
  }
}

export async function readBoundedBody(request: Request, limit: number): Promise<Uint8Array> {
  const length = request.headers.get('content-length');
  if (length && Number(length) > limit)
    throw new BundleError('TOO_LARGE', 'The upload exceeds the allowed size.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new BundleError('EMPTY_BODY', 'A request body is required.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BundleError('TOO_LARGE', 'The upload exceeds the allowed size.', 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function publicError(error: unknown) {
  if (error instanceof BundleError)
    return { code: error.code, message: error.message, status: error.status };
  if (error instanceof z.ZodError)
    return {
      code: 'INVALID_INPUT',
      message: 'The request does not match the required fields.',
      status: 400
    };
  return {
    code: 'SERVICE_UNAVAILABLE',
    message: 'The bundle workspace is temporarily unavailable. Try again shortly.',
    status: 503
  };
}
