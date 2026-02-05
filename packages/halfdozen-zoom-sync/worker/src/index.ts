/**
 * Zoom Clips Trigger Worker
 * 
 * Lightweight Cloudflare Worker that triggers the Modal sync function on a schedule.
 * Handles cron triggers and sends email alerts via Resend.
 * 
 * Cron: Daily at 9am EST (14:00 UTC)
 */

interface Env {
  MODAL_WEBHOOK_URL: string;
  MODAL_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  LANGFUSE_SECRET_KEY: string;
  LANGFUSE_PUBLIC_KEY: string;
  ALERT_EMAIL: string;
  ENVIRONMENT: string;
}

interface ModalResponse {
  processed?: number;
  synced?: number;
  skipped?: number;
  error?: string;
}

// =============================================================================
// Langfuse Tracing
// =============================================================================

async function createLangfuseTrace(
  env: Env,
  name: string,
  metadata: Record<string, unknown>
): Promise<string> {
  const traceId = crypto.randomUUID();
  
  try {
    await fetch('https://us.cloud.langfuse.com/api/public/traces', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        id: traceId,
        name,
        metadata,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error('Failed to create Langfuse trace:', e);
  }
  
  return traceId;
}

async function updateLangfuseTrace(
  env: Env,
  traceId: string,
  output: Record<string, unknown>,
  level: 'DEFAULT' | 'ERROR' = 'DEFAULT'
): Promise<void> {
  try {
    await fetch(`https://us.cloud.langfuse.com/api/public/traces/${traceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${env.LANGFUSE_PUBLIC_KEY}:${env.LANGFUSE_SECRET_KEY}`)}`,
      },
      body: JSON.stringify({
        output,
        level,
      }),
    });
  } catch (e) {
    console.error('Failed to update Langfuse trace:', e);
  }
}

// =============================================================================
// Email Alerts via Resend
// =============================================================================

async function sendEmail(
  env: Env,
  subject: string,
  html: string
): Promise<void> {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Zoom Clips Sync <notifications@createsomething.io>',
        to: [env.ALERT_EMAIL],
        subject,
        html,
      }),
    });
    console.log(`Email sent: ${subject}`);
  } catch (e) {
    console.error('Failed to send email:', e);
  }
}

// =============================================================================
// Modal Trigger
// =============================================================================

async function triggerModalSync(env: Env): Promise<ModalResponse> {
  const response = await fetch(env.MODAL_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.MODAL_WEBHOOK_SECRET}`,
    },
    body: JSON.stringify({
      trigger: 'cloudflare-cron',
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Modal returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

// =============================================================================
// Worker Handler
// =============================================================================

export default {
  // Cron trigger handler
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[${new Date().toISOString()}] Cron triggered: ${controller.cron}`);

    // Create Langfuse trace
    const traceId = await createLangfuseTrace(env, 'zoom-clips-daily-sync', {
      trigger: 'cron',
      cron: controller.cron,
      environment: env.ENVIRONMENT,
    });

    try {
      // Trigger Modal sync
      const result = await triggerModalSync(env);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update trace with success
      await updateLangfuseTrace(env, traceId, {
        status: 'success',
        processed: result.processed,
        synced: result.synced,
        skipped: result.skipped,
      });

      // Send success email
      await sendEmail(
        env,
        '✅ Zoom Clips Sync Complete',
        `
        <h2>Daily Sync Completed</h2>
        <ul>
          <li><strong>Processed:</strong> ${result.processed || 0} clips</li>
          <li><strong>Synced:</strong> ${result.synced || 0} new</li>
          <li><strong>Skipped:</strong> ${result.skipped || 0} duplicates</li>
        </ul>
        <p><small>Trace ID: ${traceId}</small></p>
        `
      );

      console.log(`Sync complete: ${JSON.stringify(result)}`);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Sync failed: ${errorMsg}`);

      // Update trace with error
      await updateLangfuseTrace(env, traceId, {
        status: 'error',
        error: errorMsg,
      }, 'ERROR');

      // Send failure email
      await sendEmail(
        env,
        '🚨 Zoom Clips Sync FAILED',
        `
        <h2>Daily Sync Failed</h2>
        <p><strong>Error:</strong> ${errorMsg}</p>
        <h3>Action Required:</h3>
        <p>Session cookies may have expired. To fix:</p>
        <ol>
          <li>Run <code>npx tsx watch-session.ts</code> locally</li>
          <li>Log into Zoom in the Live View browser</li>
          <li>Upload: <code>modal volume put zoom-clips-data session-context.json /session-context.json</code></li>
        </ol>
        <p><small>Trace ID: ${traceId}</small></p>
        `
      );
    }
  },

  // HTTP handler for manual triggers
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Manual trigger (POST /trigger)
    if (url.pathname === '/trigger' && request.method === 'POST') {
      // Verify auth header
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${env.MODAL_WEBHOOK_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
      }

      // Create trace
      const traceId = await createLangfuseTrace(env, 'zoom-clips-manual-sync', {
        trigger: 'manual',
        environment: env.ENVIRONMENT,
      });

      try {
        const result = await triggerModalSync(env);
        
        await updateLangfuseTrace(env, traceId, {
          status: 'success',
          ...result,
        });

        return new Response(JSON.stringify({ success: true, traceId, ...result }), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        await updateLangfuseTrace(env, traceId, {
          status: 'error',
          error: errorMsg,
        }, 'ERROR');

        return new Response(JSON.stringify({ success: false, traceId, error: errorMsg }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};
