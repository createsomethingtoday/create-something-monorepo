import { db } from '../../../lib/db';
import { trackEvent } from '../../../lib/analytics';
import { getEnvValue } from '../../../lib/cloudflareRuntime';
import { buildSubmissionWebhookData, sendSubmissionWebhook } from '../../../lib/submissionPayload';

/**
 * Automatic retry cron job for failed webhook submissions
 *
 * Scheduled to run every 15 minutes via vercel.json
 *
 * Process:
 * 1. Get all failed submissions (status='webhook_failed')
 * 2. Filter for submissions with retry_count < 3
 * 3. Filter for submissions not retried in last 15 minutes (exponential backoff)
 * 4. Attempt to resend each submission to webhook
 * 5. Update status and retry_count based on result
 *
 * This is triggered by Vercel Cron, protected by CRON_SECRET
 */
export default async function handler(req, res) {
  // Verify cron secret for security
  const authHeader = req.headers.authorization;
  const cronSecret = await getEnvValue('CRON_SECRET');
  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    return res.status(503).json({ message: 'CRON_SECRET is not configured' });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    console.log('Starting automatic retry job...');

    // Get failed submissions eligible for retry
    const failedSubmissions = await db.getFailedSubmissions(3);

    if (failedSubmissions.length === 0) {
      console.log('No failed submissions to retry');
      return res.status(200).json({
        success: true,
        message: 'No submissions to retry',
        processed: 0
      });
    }

    console.log(`Found ${failedSubmissions.length} submissions to retry`);

    const results = {
      total: failedSubmissions.length,
      succeeded: 0,
      failed: 0,
      maxRetriesReached: 0,
      errors: []
    };

    // Process each submission
    for (const submission of failedSubmissions) {
      try {
        console.log(`Processing submission ${submission.id}, attempt ${submission.retry_count + 1}/3`);

        // Verify blobs still exist
        if (!submission.blob_urls || submission.blob_urls.length === 0 || submission.blobs_cleaned_at) {
          console.log(`Submission ${submission.id}: Blobs not available, skipping`);
          results.errors.push({
            submissionId: submission.id,
            error: 'Blobs not available'
          });
          continue;
        }

        const { airtableSubmissionId, webhookData } = buildSubmissionWebhookData({
          fields: submission.form_data,
          blobUrls: submission.blob_urls || [],
          submissionId: submission.id,
          airtableSubmissionId: submission.airtable_submission_id,
          retryAttempt: submission.retry_count + 1,
          automaticRetry: true,
          submittedAt: submission.created_at
        });

        const webhookResponse = await sendSubmissionWebhook(webhookData);

        // Update database: retry succeeded
        await db.updateSubmission(submission.id, {
          status: 'webhook_success',
          airtableSubmissionId: airtableSubmissionId,
          webhookResponse: webhookResponse,
          webhookSentAt: new Date().toISOString(),
          retryCount: submission.retry_count + 1
        });

        console.log(`Submission ${submission.id} retry succeeded on attempt ${submission.retry_count + 1}`);
        results.succeeded++;

        // Track successful retry
        await trackEvent('Webhook Auto-Retry Succeeded', {
          submissionId: submission.id,
          retryAttempt: submission.retry_count + 1,
          appName: submission.app_name
        });

      } catch (retryError) {
        console.error(`Submission ${submission.id} retry failed on attempt ${submission.retry_count + 1}:`, retryError);

        const newRetryCount = submission.retry_count + 1;

        // Update database: retry failed
        await db.updateSubmission(submission.id, {
          status: 'webhook_failed',
          errorMessage: `Auto-retry ${newRetryCount} failed: ${retryError.message}`,
          webhookSentAt: new Date().toISOString(),
          retryCount: newRetryCount
        });

        if (newRetryCount >= 3) {
          results.maxRetriesReached++;
          console.log(`Submission ${submission.id} reached max retries (3), needs manual review`);
        } else {
          results.failed++;
        }

        results.errors.push({
          submissionId: submission.id,
          retryAttempt: newRetryCount,
          error: retryError.message
        });

        // Track failed retry
        await trackEvent('Webhook Auto-Retry Failed', {
          submissionId: submission.id,
          retryAttempt: newRetryCount,
          appName: submission.app_name,
          error: retryError.message,
          needsManualReview: newRetryCount >= 3
        });
      }
    }

    console.log('Automatic retry job completed:', results);

    res.status(200).json({
      success: true,
      message: 'Retry job completed',
      results
    });

  } catch (error) {
    console.error('Automatic retry job error:', error);
    res.status(500).json({
      success: false,
      message: 'Retry job failed',
      error: error.message
    });
  }
}
