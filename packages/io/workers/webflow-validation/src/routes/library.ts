/**
 * Library Routes
 *
 * Handles validation for library submissions:
 * - User permissions
 * - Name availability
 * - Email format
 *
 * Canon: Same validation logic, different context.
 * The infrastructure recedes; the library gets submitted.
 */

import type {
  Env,
  EmailRequest,
  LibraryNameRequest,
  LibraryUserFields,
  LibraryUserResponse,
  EmailValidationResponse,
} from '../types';
import { TABLES, FIELDS } from '../types';
import { findUserByEmail, queryRecords } from '../lib/airtable';
import { jsonResponse } from '../lib/cors';
import { parseJsonBody, isValidEmail, ValidationError } from '../lib/validation';

/**
 * POST /library/user
 *
 * Check if a user can submit libraries.
 */
export async function handleLibraryUser(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<EmailRequest>(request);

  if (!body.email || typeof body.email !== 'string') {
    throw new ValidationError('Email is required');
  }

  const email = body.email;

  // Check both user table and template users table (for library permission)
  const [userRecord, libraryRecord] = await Promise.all([
    findUserByEmail(env, TABLES.LIBRARY_USERS, FIELDS.LIBRARY_USER_EMAIL, email),
    findUserByEmail<LibraryUserFields>(
      env,
      TABLES.TEMPLATE_USERS,
      FIELDS.LIBRARY_USER_EMAILS_LIST,
      email
    ),
  ]);

  const userExists = userRecord !== null;

  // Check if user can submit libraries
  let canSubmitLibraries = false;
  if (userExists && libraryRecord) {
    const canSubmitField = libraryRecord.fields['⚙️Can submit Libraries?'];
    canSubmitLibraries = canSubmitField === 1;
  }

  console.log('User found:', userExists);
  console.log('Can submit libraries:', canSubmitLibraries);

  const response: LibraryUserResponse = {
    userExists,
    canSubmitLibraries,
  };

  return jsonResponse(response, 200, {});
}

/**
 * POST /library/name
 *
 * Check if a library name is available.
 * Uses similar logic to template name checking.
 */
export async function handleLibraryName(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<LibraryNameRequest>(request);

  if (!body.libraryname || typeof body.libraryname !== 'string') {
    throw new ValidationError('Library name is required');
  }

  const libraryname = body.libraryname;

  // Check for substring match (case-insensitive, excluding archived)
  const escapedName = libraryname.replace(/'/g, "\\'");
  const filterFormula = `AND(FIND(LOWER('${escapedName}'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;

  // Note: Libraries likely use a different table - adjust if needed
  const records = await queryRecords(env, TABLES.TEMPLATES, filterFormula, {
    view: 'viwHnsM1aqC0UvxUG',
  });

  console.log(`Library search for "${libraryname}": ${records.length} records found`);

  return jsonResponse({ taken: records.length > 0 }, 200, {});
}

/**
 * POST /library/email
 *
 * Validate email format.
 */
export async function handleLibraryEmail(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<EmailRequest>(request);

  if (!body.email || typeof body.email !== 'string') {
    throw new ValidationError('Email is required');
  }

  const valid = isValidEmail(body.email);

  const response: EmailValidationResponse = {
    valid,
    message: valid ? 'Email format is valid' : 'Invalid email format',
  };

  return jsonResponse(response, 200, {});
}
