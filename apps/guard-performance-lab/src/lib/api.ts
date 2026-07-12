import { ZodError } from 'zod';
import { programMap } from './data.js';
import { getNextInteraction } from './guide.js';

export function programResponse(): Response {
  return Response.json(
    { ok: true, program: programMap },
    { headers: { 'cache-control': 'private, no-store' } }
  );
}

export async function guideResponse(request: Request): Promise<Response> {
  try {
    const output = getNextInteraction(await request.json());
    return Response.json({ ok: true, output });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ ok: false, error: 'Invalid guidance context.', issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, { status: 400 });
    return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }
}
