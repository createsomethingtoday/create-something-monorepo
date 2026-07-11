import type { RequestHandler } from './$types';
import { labService } from '$lib/server/lab-service.js';

export const GET: RequestHandler = async () => Response.json(await labService.getWorkspace());
export const DELETE: RequestHandler = async ({ request }) => {
  if (request.headers.get('x-guard-lab-confirm') !== 'reset') return Response.json({ ok: false, error: 'Reset requires x-guard-lab-confirm: reset.' }, { status: 409 });
  return Response.json(await labService.reset());
};
