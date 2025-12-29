/**
 * App Routes
 *
 * Handles validation for app client IDs.
 *
 * Canon: Simple checks should have simple implementations.
 */

import type { Env, ClientIdRequest, ClientIdResponse } from '../types';
import { TABLES, FIELDS } from '../types';
import { queryRecords } from '../lib/airtable';
import { jsonResponse } from '../lib/cors';
import { parseJsonBody, ValidationError } from '../lib/validation';

/**
 * POST /app/client-id
 *
 * Check if an app client ID exists in the templates table.
 */
export async function handleClientIdCheck(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<ClientIdRequest>(request);

  if (!body.clientId || typeof body.clientId !== 'string') {
    throw new ValidationError('Client ID is required');
  }

  const clientId = body.clientId;

  // Sanitize for formula injection prevention
  const sanitizedClientId = clientId.replace(/'/g, "\\'");

  // Exact match query
  const filterFormula = `'${sanitizedClientId}' = {${FIELDS.CLIENT_ID}}`;

  const records = await queryRecords(env, TABLES.TEMPLATES, filterFormula);

  const response: ClientIdResponse = {
    clientIdExists: records.length > 0,
  };

  return jsonResponse(response, 200, {});
}
