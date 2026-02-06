/**
 * Email notifications for Half Dozen YouTube Sync
 * 
 * Sends styled sync summary emails via Resend.
 * Dark theme (inverted) — on brand with CREATE SOMETHING.
 * 
 * Pattern: packages/halfdozen-zoom-sync/modal_sync.py
 * Sender: Half Dozen Sync <notifications@createsomething.io>
 */

import { Resend } from 'resend';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_FROM = 'Half Dozen Sync <notifications@createsomething.io>';
const DEFAULT_TO = process.env.YOUTUBE_SYNC_ALERT_EMAIL || 'micah@createsomething.io';

// =============================================================================
// Types
// =============================================================================

export interface SyncNotificationData {
  playlist: {
    title: string;
    videoCount: number;
    url?: string;
  };
  extraction: {
    total: number;
    extracted: number;
    withTranscript: number;
    errors: number;
  };
  sync: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  session?: {
    durationMs: number;
    recordingUrl?: string;
  };
  databaseId?: string;
}

export interface FailureNotificationData {
  tool: string;
  error: string;
  context?: Record<string, unknown>;
}

// =============================================================================
// Email Template
// =============================================================================

function wrapInLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Half Dozen YouTube Sync</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="padding: 0 0 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 13px; font-weight: 500; color: #666666; letter-spacing: 0.08em; text-transform: uppercase;">
                    Half Dozen &middot; YouTube Sync
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #0a0a0a; border: 1px solid #1a1a1a; border-radius: 12px; padding: 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size: 11px; color: #444444; line-height: 1.6;">
                    Sent by <span style="color: #666666;">CREATE SOMETHING</span> automation infrastructure<br>
                    <span style="color: #333333;">${new Date().toISOString()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// Sync Success Email
// =============================================================================

function buildSyncSuccessHtml(data: SyncNotificationData): string {
  const { playlist, extraction, sync, session, databaseId } = data;

  const durationSec = session?.durationMs ? Math.round(session.durationMs / 1000) : 0;
  const durationStr = durationSec > 60
    ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
    : `${durationSec}s`;

  const notionUrl = databaseId
    ? `https://notion.so/${databaseId.replace(/-/g, '')}`
    : null;

  const hasFailures = sync.failed > 0 || extraction.errors > 0;
  const statusColor = hasFailures ? '#f59e0b' : '#22c55e';
  const statusText = hasFailures ? 'Completed with warnings' : 'Sync complete';

  let statsRows = '';

  // Extraction stats
  statsRows += statRow('Videos found', `${extraction.total}`, '#e5e5e5');
  statsRows += statRow('Transcripts extracted', `${extraction.withTranscript}`, '#e5e5e5');
  if (extraction.errors > 0) {
    statsRows += statRow('Extraction errors', `${extraction.errors}`, '#f59e0b');
  }

  // Divider
  statsRows += `<tr><td colspan="2" style="padding: 8px 0;"><div style="border-top: 1px solid #1a1a1a;"></div></td></tr>`;

  // Sync stats
  statsRows += statRow('Synced to Notion', `${sync.successful}`, '#22c55e');
  if (sync.skipped > 0) {
    statsRows += statRow('Skipped (duplicates)', `${sync.skipped}`, '#666666');
  }
  if (sync.failed > 0) {
    statsRows += statRow('Failed', `${sync.failed}`, '#ef4444');
  }

  // Session info
  if (session) {
    statsRows += `<tr><td colspan="2" style="padding: 8px 0;"><div style="border-top: 1px solid #1a1a1a;"></div></td></tr>`;
    statsRows += statRow('Session duration', durationStr, '#666666');
  }

  const content = `
    <!-- Status indicator -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding: 0 0 24px 0;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${statusColor}; margin-right: 8px; vertical-align: middle;"></span>
          <span style="font-size: 13px; color: ${statusColor}; font-weight: 500; vertical-align: middle;">${statusText}</span>
        </td>
      </tr>
    </table>

    <!-- Playlist title -->
    <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 600; color: #ffffff; line-height: 1.3;">
      ${escapeHtml(playlist.title)}
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 14px; color: #666666;">
      ${playlist.videoCount} videos${playlist.url ? ` &middot; <a href="${escapeHtml(playlist.url)}" style="color: #666666; text-decoration: underline;">playlist</a>` : ''}
    </p>

    <!-- Stats table -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 28px 0;">
      ${statsRows}
    </table>

    <!-- Action buttons -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        ${notionUrl ? `<td style="padding-right: 12px;">
          <a href="${notionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ffffff; color: #000000; font-size: 13px; font-weight: 600; text-decoration: none; border-radius: 6px;">Open in Notion</a>
        </td>` : ''}
        ${session?.recordingUrl ? `<td>
          <a href="${escapeHtml(session.recordingUrl)}" style="display: inline-block; padding: 10px 20px; background-color: transparent; color: #888888; font-size: 13px; font-weight: 500; text-decoration: none; border: 1px solid #333333; border-radius: 6px;">Session Recording</a>
        </td>` : ''}
      </tr>
    </table>`;

  return wrapInLayout(content);
}

function statRow(label: string, value: string, valueColor: string): string {
  return `<tr>
    <td style="padding: 6px 0; font-size: 14px; color: #888888;">${label}</td>
    <td style="padding: 6px 0; font-size: 14px; color: ${valueColor}; text-align: right; font-variant-numeric: tabular-nums;">${value}</td>
  </tr>`;
}

// =============================================================================
// Failure Email
// =============================================================================

function buildFailureHtml(data: FailureNotificationData): string {
  const content = `
    <!-- Status indicator -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding: 0 0 24px 0;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #ef4444; margin-right: 8px; vertical-align: middle;"></span>
          <span style="font-size: 13px; color: #ef4444; font-weight: 500; vertical-align: middle;">Sync failed</span>
        </td>
      </tr>
    </table>

    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #ffffff; line-height: 1.3;">
      ${escapeHtml(data.tool)} failed
    </h1>

    <!-- Error block -->
    <div style="background-color: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 16px; margin: 0 0 20px 0;">
      <p style="margin: 0; font-size: 13px; color: #ef4444; font-family: 'SF Mono', 'Fira Code', 'Fira Mono', Menlo, monospace; word-break: break-word; line-height: 1.5;">
        ${escapeHtml(data.error)}
      </p>
    </div>

    ${data.context ? `<p style="margin: 0; font-size: 13px; color: #666666;">
      Context: ${escapeHtml(JSON.stringify(data.context))}
    </p>` : ''}`;

  return wrapInLayout(content);
}

// =============================================================================
// Helpers
// =============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// Send Functions
// =============================================================================

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not set — email notifications disabled');
    return null;
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * Send a sync success notification email.
 */
export async function sendSyncNotification(
  data: SyncNotificationData,
  to?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getResendClient();
  if (!client) return { success: false, error: 'Resend not configured' };

  const subject = data.sync.failed > 0
    ? `YouTube Sync: ${data.playlist.title} (${data.sync.failed} failed)`
    : `YouTube Sync: ${data.playlist.title} (${data.sync.successful} synced)`;

  try {
    const result = await client.emails.send({
      from: DEFAULT_FROM,
      to: [to || DEFAULT_TO],
      subject,
      html: buildSyncSuccessHtml(data),
    });

    console.error(`Email sent: ${subject}`);
    return { success: true, id: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send email: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Send a failure notification email.
 */
export async function sendFailureNotification(
  data: FailureNotificationData,
  to?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const client = getResendClient();
  if (!client) return { success: false, error: 'Resend not configured' };

  const subject = `YouTube Sync Failed: ${data.tool}`;

  try {
    const result = await client.emails.send({
      from: DEFAULT_FROM,
      to: [to || DEFAULT_TO],
      subject,
      html: buildFailureHtml(data),
    });

    console.error(`Failure email sent: ${subject}`);
    return { success: true, id: result.data?.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to send failure email: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Send a test email to verify configuration.
 */
export async function sendTestEmail(
  to?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  return sendSyncNotification(
    {
      playlist: {
        title: 'Test Playlist — Video Editing Tutorials',
        videoCount: 12,
        url: 'https://youtube.com/playlist?list=PLtest123',
      },
      extraction: {
        total: 12,
        extracted: 12,
        withTranscript: 10,
        errors: 0,
      },
      sync: {
        total: 10,
        successful: 8,
        skipped: 2,
        failed: 0,
      },
      session: {
        durationMs: 187000,
        recordingUrl: 'https://steel.dev/sessions/test-session/recording',
      },
      databaseId: '27a019187ac580b797fec563c98afbbc',
    },
    to
  );
}
