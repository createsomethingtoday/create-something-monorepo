/**
 * Webflow Validation Worker
 *
 * Airtable-backed validation for Webflow template and library submissions.
 *
 * Canon: The tool recedes; validation just works.
 * Creators submit with confidence; infrastructure is invisible.
 *
 * Routes:
 *   POST /template/user   - Check template user limits, bans
 *   POST /template/name   - Check template name availability
 *   POST /template/email  - Validate email format
 *   POST /library/user    - Check library user permissions
 *   POST /library/name    - Check library name availability
 *   POST /library/email   - Validate email format
 *   POST /app/client-id   - Check app client ID exists
 *   POST /webhook/airtable - Proxy webhook to Airtable
 */

import type { Env } from './types';
import { handleCors, createPreflightResponse, jsonResponse, errorResponse } from './lib/cors';
import { ValidationError } from './lib/validation';
import { AirtableError } from './lib/airtable';
import { createLogger } from '@create-something/components/utils';

const logger = createLogger('WebflowValidation');

// Route handlers
import { handleTemplateUser, handleTemplateName, handleTemplateEmail } from './routes/template';
import { handleLibraryUser, handleLibraryName, handleLibraryEmail } from './routes/library';
import { handleClientIdCheck } from './routes/app';
import { handleAirtableWebhook } from './routes/webhook';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS
    const { headers: corsHeaders, isAllowed } = handleCors(request, env);

    // Preflight requests
    if (request.method === 'OPTIONS') {
      return createPreflightResponse(corsHeaders);
    }

    // Check origin (except for health check)
    const url = new URL(request.url);
    if (url.pathname !== '/' && !isAllowed) {
      return errorResponse('Origin not allowed', 403, corsHeaders);
    }

    try {
      // Route dispatch
      const response = await routeRequest(request, env, ctx, url.pathname);

      // Add CORS headers to response
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      logger.error('Request error', { error, path: url.pathname });

      // Handle known error types
      if (error instanceof ValidationError) {
        return errorResponse(error.message, 400, corsHeaders);
      }

      if (error instanceof AirtableError) {
        if (error.status === 401) {
          return errorResponse('Authentication error with database', 500, corsHeaders);
        }
        if (error.status === 422) {
          return errorResponse('Invalid query parameters', 400, corsHeaders);
        }
        return errorResponse('Database error', 500, corsHeaders);
      }

      // Unknown error
      return errorResponse('Internal server error', 500, corsHeaders);
    }
  },
};

/**
 * Route requests to handlers
 */
async function routeRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  pathname: string
): Promise<Response> {
  // Health check / API info
  if (pathname === '/' && request.method === 'GET') {
    return jsonResponse(
      {
        name: 'Webflow Validation API',
        version: '1.0.0',
        status: 'healthy',
        endpoints: [
          { path: '/template/user', method: 'POST', description: 'Check template user limits and bans' },
          { path: '/template/name', method: 'POST', description: 'Check template name availability' },
          { path: '/template/email', method: 'POST', description: 'Validate email format' },
          { path: '/library/user', method: 'POST', description: 'Check library user permissions' },
          { path: '/library/name', method: 'POST', description: 'Check library name availability' },
          { path: '/library/email', method: 'POST', description: 'Validate email format' },
          { path: '/app/client-id', method: 'POST', description: 'Check app client ID exists' },
          { path: '/webhook/airtable', method: 'POST', description: 'Proxy webhook to Airtable' },
        ],
      },
      200,
      {}
    );
  }

  // Require POST for all API routes
  if (request.method !== 'POST') {
    return jsonResponse({ message: 'Method not allowed' }, 405, {});
  }

  // Template routes
  if (pathname === '/template/user') {
    return handleTemplateUser(request, env);
  }

  if (pathname === '/template/name') {
    return handleTemplateName(request, env);
  }

  if (pathname === '/template/email') {
    return handleTemplateEmail(request, env);
  }

  // Library routes
  if (pathname === '/library/user') {
    return handleLibraryUser(request, env);
  }

  if (pathname === '/library/name') {
    return handleLibraryName(request, env);
  }

  if (pathname === '/library/email') {
    return handleLibraryEmail(request, env);
  }

  // App routes
  if (pathname === '/app/client-id') {
    return handleClientIdCheck(request, env);
  }

  // Webhook routes
  if (pathname === '/webhook/airtable') {
    return handleAirtableWebhook(request, env);
  }

  // Legacy route aliases (for backward compatibility during migration)
  if (pathname === '/api/checkTemplateuser') {
    return handleTemplateUser(request, env);
  }
  if (pathname === '/api/checkTemplatename') {
    return handleTemplateName(request, env);
  }
  if (pathname === '/api/checkTemplateemail') {
    return handleTemplateEmail(request, env);
  }
  if (pathname === '/api/checkLibraryuser') {
    return handleLibraryUser(request, env);
  }
  if (pathname === '/api/checkLibraryname') {
    return handleLibraryName(request, env);
  }
  if (pathname === '/api/checkLibraryemail') {
    return handleLibraryEmail(request, env);
  }
  if (pathname === '/api/checkAppclientid') {
    return handleClientIdCheck(request, env);
  }
  if (pathname === '/api/airtableWebhookProxy') {
    return handleAirtableWebhook(request, env);
  }

  // Not found
  return jsonResponse(
    {
      error: 'Route not found',
      availableRoutes: [
        '/template/user',
        '/template/name',
        '/template/email',
        '/library/user',
        '/library/name',
        '/library/email',
        '/app/client-id',
        '/webhook/airtable',
      ],
      requestedPath: pathname,
    },
    404,
    {}
  );
}
