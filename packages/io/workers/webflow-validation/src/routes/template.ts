/**
 * Template Routes
 *
 * Handles validation for template submissions:
 * - User limits and bans
 * - Name availability
 * - Email format
 *
 * Canon: Creators submit with confidence; validation guides without punishing.
 */

import type {
  Env,
  EmailRequest,
  TemplateNameRequest,
  TemplateUserFields,
  BannedInstanceFields,
  TemplateUserResponse,
  TemplateNameResponse,
  EmailValidationResponse,
} from '../types';
import { TABLES, FIELDS, WHITELISTED_CREATORS } from '../types';
import { findUserByEmail, getRecord, queryRecords, countRecords } from '../lib/airtable';
import { jsonResponse } from '../lib/cors';
import {
  parseJsonBody,
  isValidEmail,
  containsRestrictedAI,
  isNameException,
  ValidationError,
} from '../lib/validation';

/**
 * POST /template/user
 *
 * Check template user limits, bans, and submission status.
 */
export async function handleTemplateUser(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<EmailRequest>(request);

  if (!body.email || typeof body.email !== 'string') {
    throw new ValidationError('Email is required');
  }

  if (!isValidEmail(body.email)) {
    throw new ValidationError('Invalid email format');
  }

  const email = body.email;

  // Find user by email
  const user = await findUserByEmail<TemplateUserFields>(
    env,
    TABLES.TEMPLATE_USERS,
    FIELDS.TEMPLATE_USER_EMAILS,
    email
  );

  if (!user) {
    const response: TemplateUserResponse = {
      userExists: false,
      hasError: true,
      message: 'User not found in our system.',
    };
    return jsonResponse(response, 200, {});
  }

  // Extract user stats
  const publishedTemplates = user.fields['#️⃣👛Templates Published'] ?? 0;
  const rejectedTemplates = user.fields['#️⃣👛Templates Rejected'] ?? 0;
  const submittedTemplates = user.fields['#️⃣👛Templates Submitted'] ?? 0;
  const delistedTemplates = user.fields['#️⃣👛Templates Delisted'] ?? 0;
  const assetsSubmitted30 = user.fields['#️⃣Submission cap count'] ?? 0;
  const bannedInstances = user.fields['❌Banned Instance'] ?? [];

  // Check for active bans
  if (bannedInstances.length > 0) {
    const activeBan = await checkActiveBan(env, bannedInstances);

    if (activeBan) {
      const banReason = activeBan.fields['Name'] || activeBan.fields['Reason'] || 'No reason provided';
      const startDate = activeBan.fields['Start Date'] || 'Unknown date';
      const endDate = activeBan.fields['End Date'] || 'Not specified';
      const creator = activeBan.fields['Creator'] || 'Unknown';

      let banMessage = `Your account has been banned from submitting templates. Reason: ${banReason}.`;
      if (startDate !== 'Unknown date') {
        banMessage += ` Ban started: ${startDate}.`;
      }
      if (endDate !== 'Not specified') {
        banMessage += ` Ban ends: ${endDate}.`;
      }
      banMessage += ' Please contact support for assistance.';

      const response: TemplateUserResponse = {
        userExists: true,
        isBanned: true,
        hasError: true,
        message: banMessage,
        banDetails: {
          reason: banReason,
          startDate,
          endDate,
          creator,
          status: 'Active',
        },
      };
      return jsonResponse(response, 200, {});
    }
  }

  // Check submission limits and active reviews
  const isWhitelisted = WHITELISTED_CREATORS.includes(email as typeof WHITELISTED_CREATORS[number]);
  let message: string;
  let hasError = false;

  if (assetsSubmitted30 >= 6) {
    // Monthly limit reached
    message = `You have reached your submission limit of 6 templates for the past 30 days. Total submitted: ${submittedTemplates}. Please wait to submit new templates.`;
    hasError = true;
  } else if (publishedTemplates >= 5 || isWhitelisted) {
    // Established creator or whitelisted - unlimited concurrent submissions
    message = `${assetsSubmitted30} out of 6 templates submitted this month. Total submitted: ${submittedTemplates}. You can have unlimited concurrent submissions for review.`;
    hasError = false;
  } else {
    // New creator - check for active reviews
    // publishedTemplates = currently published (decrements when delisted)
    // delistedTemplates = templates that were published then delisted
    // So we need: submitted - published - rejected - delisted = actual active reviews
    const activeReviews = submittedTemplates - publishedTemplates - rejectedTemplates - delistedTemplates;

    if (activeReviews >= 1) {
      message = `${assetsSubmitted30} out of 6 templates submitted this month. Total submitted: ${submittedTemplates}. You already have an active review in progress. Please wait for the review to complete before submitting another template.`;
      hasError = true;
    } else {
      message = `${assetsSubmitted30} out of 6 templates submitted this month. Total submitted: ${submittedTemplates}. You can have 1 template submitted for review at a time.`;
      hasError = false;
    }
  }

  const response: TemplateUserResponse = {
    userExists: true,
    message,
    hasError,
    publishedTemplates,
    submittedTemplates,
    isWhitelisted,
    assetsSubmitted30,
  };

  return jsonResponse(response, 200, {});
}

/**
 * Check for active bans
 */
async function checkActiveBan(
  env: Env,
  bannedInstanceIds: string[]
): Promise<{ fields: BannedInstanceFields } | null> {
  for (const bannedInstanceId of bannedInstanceIds) {
    try {
      const bannedInstance = await getRecord<BannedInstanceFields>(
        env,
        TABLES.BANNED_INSTANCES,
        bannedInstanceId
      );

      // Check ban status using both field ID and field name for reliability
      const banStatus =
        bannedInstance.fields[FIELDS.BAN_STATUS_FIELD_ID] ||
        bannedInstance.fields['Ban Status'];

      if (banStatus === 'Active') {
        return bannedInstance;
      }
    } catch (error) {
      console.error(`Error fetching banned instance ${bannedInstanceId}:`, error);
      // Continue checking other instances
    }
  }

  return null;
}

/**
 * POST /template/name
 *
 * Check if a template name is available.
 */
export async function handleTemplateName(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await parseJsonBody<TemplateNameRequest>(request);

  if (!body.templatename || typeof body.templatename !== 'string') {
    throw new ValidationError('Template name is required');
  }

  const templatename = body.templatename;

  // Check for AI restriction
  if (containsRestrictedAI(templatename)) {
    const response: TemplateNameResponse = {
      taken: true,
      message: 'Template names containing "AI" are not allowed. Please use alternative naming.',
    };
    return jsonResponse(response, 400, {});
  }

  // Check for known exceptions
  if (isNameException(templatename)) {
    const response: TemplateNameResponse = { taken: false };
    return jsonResponse(response, 200, {});
  }

  // Special case: Allow "Relay" if fewer than 2 exist
  if (templatename.toLowerCase().includes('relay')) {
    const relayCount = await countRelayTemplates(env);
    if (relayCount < 2) {
      const response: TemplateNameResponse = { taken: false };
      return jsonResponse(response, 200, {});
    }
  }

  // Check for substring match (case-insensitive, excluding archived)
  const escapedName = templatename.replace(/'/g, "\\'");
  const filterFormula = `AND(FIND(LOWER('${escapedName}'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;

  const records = await queryRecords(env, TABLES.TEMPLATES, filterFormula, {
    view: 'viwHnsM1aqC0UvxUG',
  });

  console.log(`Template search for "${templatename}": ${records.length} records found`);

  if (records.length > 0) {
    console.log('Found records:', records.map((r) => ({
      name: r.fields['Name'],
      status: r.fields['🚀Marketplace Status'],
    })));
  }

  const response: TemplateNameResponse = { taken: records.length > 0 };
  return jsonResponse(response, 200, {});
}

/**
 * Count Relay templates (for special exception)
 */
async function countRelayTemplates(env: Env): Promise<number> {
  const filterFormula = `AND(FIND(LOWER('relay'), LOWER({Name})) > 0, NOT(FIND(LOWER('archived'), LOWER({Name})) > 0))`;

  return countRecords(env, TABLES.TEMPLATES, filterFormula, {
    view: 'viwHnsM1aqC0UvxUG',
  });
}

/**
 * POST /template/email
 *
 * Validate email format.
 */
export async function handleTemplateEmail(
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
