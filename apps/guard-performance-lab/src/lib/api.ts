import { ZodError } from 'zod';
import { getNextInteraction } from './guide.js';

export async function guideResponse(request: Request): Promise<Response> {
  try {
    const output = getNextInteraction(await request.json());
    return Response.json({ ok: true, output });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ ok: false, error: 'Invalid guidance context.', issues: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) }, { status: 400 });
    return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
  }
}
