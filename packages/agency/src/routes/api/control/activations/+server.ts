import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  createControlActivationApiHandler,
  createControlActivationLedger,
  createD1ControlActivationRepository
} from '$lib/server/control-activation';
import { resolveControlActivationContext } from '$lib/server/control-activation-context';
import { controlActivationHttpErrorStatus } from '$lib/server/control-activation-http';

export const GET: RequestHandler = async ({ locals, platform, url }) => {
  if (!locals.user?.id || !locals.user.email) throw error(401, 'Authentication required');
  const db = platform?.env?.DB;
  if (!db) throw error(503, 'Control activation database is unavailable');
  const context = await resolveControlActivationContext({ platform, user: locals.user });
  const execute = createControlActivationApiHandler(
    createControlActivationLedger({ repository: createD1ControlActivationRepository(db) })
  );
  try {
    const activationId = url.searchParams.get('activation_id')?.trim();
    const result = activationId
      ? await execute(context, { operation: 'get', activationId })
      : await execute(context, { operation: 'list' });
    return json({
      schema: 'create-something/control-activation-api@1',
      operation: activationId ? 'get' : 'list',
      result
    });
  } catch (cause) {
    const status = controlActivationHttpErrorStatus(cause);
    if (status)
      throw error(
        status,
        cause instanceof Error ? cause.message : 'Control activation request failed'
      );
    throw cause;
  }
};
