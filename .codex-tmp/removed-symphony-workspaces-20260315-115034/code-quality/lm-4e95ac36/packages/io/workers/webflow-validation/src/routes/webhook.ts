/**
 * Webhook Routes
 *
 * Proxies Webflow form submissions to Airtable webhooks
 * with HMAC signature verification.
 *
 * Canon: The proxy is invisible; the form submission just works.
 * Security happens without user awareness.
 */

import type { Env, WebhookProxyResponse } from '../types';
import { WEBHOOK_ROUTES } from '../types';
import { jsonResponse } from '../lib/cors';
import { createLogger } from '@create-something/canon/utils';

const logger = createLogger('WebhookProxy');

/**
 * POST /webhook/airtable
 *
 * Proxy Webflow form submissions to Airtable webhook.
 * Verifies Webflow webhook signature before forwarding.
 */
export async function handleAirtableWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  // Get raw body for signature verification
  const rawBody = await request.text();

  // Extract Webflow signature headers
  const signature =
    request.headers.get('webflow-webhook-signature') ||
    request.headers.get('x-webflow-signature') ||
    request.headers.get('x-webflow-webhook-signature');

  const timestamp = request.headers.get('x-webflow-timestamp');

  logger.debug('Webhook received', {
    hasSignature: !!signature,
    hasTimestamp: !!timestamp,
    bodyLength: rawBody.length,
  });

  // Verify Webflow webhook signature
  const signatureValid = await verifyWebflowSignature(
    rawBody,
    signature,
    env.WEBFLOW_WEBHOOK_SECRET,
    timestamp
  );

  if (!signatureValid) {
    logger.error('Webhook signature verification failed', {
      hasSignature: !!signature,
      hasTimestamp: !!timestamp,
    });

    const response: WebhookProxyResponse = {
      message: 'Unauthorized: Invalid webhook signature',
      error: 'Ensure this request is coming from Webflow with the correct signature',
    };
    return jsonResponse(response, 401, {});
  }

  logger.debug('Webhook signature verified');

  // Parse JSON body
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch (parseError) {
    logger.error('Failed to parse JSON body', { error: parseError });
    const response: WebhookProxyResponse = {
      message: 'Invalid JSON payload',
      error: String(parseError),
    };
    return jsonResponse(response, 400, {});
  }

  // Get webhook destination from query param
  const url = new URL(request.url);
  const webhookKey = url.searchParams.get('webhook') || 'default';
  const targetWebhook = WEBHOOK_ROUTES[webhookKey as keyof typeof WEBHOOK_ROUTES];

  if (!targetWebhook) {
    const response: WebhookProxyResponse = {
      message: `Invalid webhook route: ${webhookKey}`,
      error: `Available routes: ${Object.keys(WEBHOOK_ROUTES).join(', ')}`,
    };
    return jsonResponse(response, 400, {});
  }

  // Validate payload format - must have payload.data (new format)
  const payload = body as { payload?: { data?: unknown } };
  if (!payload.payload?.data) {
    const response: WebhookProxyResponse = {
      message: 'Invalid payload format. This endpoint expects new format with payload.data structure.',
      error: 'Old format submissions should use the direct Airtable webhook.',
    };
    return jsonResponse(response, 400, {});
  }

  // Normalize: move payload.data to top-level data for Airtable
  const normalizedPayload = {
    ...body,
    data: payload.payload.data,
    payload: { ...payload.payload, data: undefined },
  };

  // Clean up undefined data in payload
  delete normalizedPayload.payload.data;

  logger.debug('Normalized payload format');

  // Forward to Airtable webhook
  try {
    const airtableResponse = await fetch(targetWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(normalizedPayload),
    });

    logger.info('Webhook forwarded successfully', {
      webhookKey,
      status: airtableResponse.status,
    });

    const response: WebhookProxyResponse = {
      message: 'Webhook forwarded successfully',
      airtableStatus: airtableResponse.status,
      webhook: webhookKey,
    };
    return jsonResponse(response, 200, {});
  } catch (error) {
    logger.error('Webhook proxy error', { error, webhookKey });

    const response: WebhookProxyResponse = {
      message: 'Upstream webhook error',
      error: String(error),
    };
    return jsonResponse(response, 502, {});
  }
}

/**
 * Verify Webflow webhook signature using Web Crypto API
 *
 * According to Webflow docs: timestamp + ":" + JSON.stringify(request_body)
 */
async function verifyWebflowSignature(
  payload: string,
  signature: string | null,
  secret: string,
  timestamp: string | null
): Promise<boolean> {
  if (!signature || !timestamp) {
    return false;
  }

  try {
    // Build data string: timestamp:payload
    const data = `${timestamp}:${payload}`;

    // Create HMAC key from secret
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Generate HMAC
    const dataBuffer = encoder.encode(data);
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, dataBuffer);

    // Convert to hex
    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Timing-safe comparison
    if (signature.length !== expectedHash.length) {
      logger.error('Signature length mismatch', {
        receivedLength: signature.length,
        expectedLength: expectedHash.length,
      });
      return false;
    }

    // Compare byte-by-byte (constant time)
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }

    if (result !== 0) {
      return false;
    }

    // Verify timestamp (within 5 minutes)
    const currentTime = Date.now();
    const requestTimestamp = parseInt(timestamp, 10);
    if (currentTime - requestTimestamp > 300000) {
      // 5 minutes
      logger.error('Request timestamp too old', {
        ageMilliseconds: currentTime - requestTimestamp,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error verifying signature', { error });
    return false;
  }
}
