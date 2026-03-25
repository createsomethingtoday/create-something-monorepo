import { db } from '../../../lib/db';
import { requireAdminApiToken } from '../../../lib/apiAuth';
import { trackEvent } from '../../../lib/analytics';
import { buildSubmissionWebhookData, sendSubmissionWebhook } from '../../../lib/submissionPayload';

/**
 * Retry failed webhook submission
 * POST /api/submissions/retry
 *
 * Body:
 * {
 *   "submissionId": "123e4567-e89b-12d3-a456-426614174000"
 * }
 *
 * Attempts to resend a failed submission to the Airtable webhook.
 * Used for manual retry by support team or automatic retry by cron.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!await requireAdminApiToken(req, res)) {
    return;
  }

  try {
    const { submissionId } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        message: 'submissionId is required'
      });
    }

    // Get submission from database
    const submission = await db.getSubmission(submissionId);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Verify submission can be retried
    if (submission.status === 'webhook_success') {
      return res.status(400).json({
        success: false,
        message: 'Submission already succeeded, cannot retry'
      });
    }

    if (submission.retry_count >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Maximum retry attempts (3) reached. Manual review required.',
        submissionId: submission.id,
        retryCount: submission.retry_count
      });
    }

    // Verify blobs still exist
    if (!submission.blob_urls || submission.blob_urls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No blob URLs found for this submission',
        submissionId: submission.id
      });
    }

    if (submission.blobs_cleaned_at) {
      return res.status(400).json({
        success: false,
        message: 'Blob files have been cleaned up, cannot retry',
        submissionId: submission.id
      });
    }

    console.log(`Retrying submission ${submission.id}, attempt ${submission.retry_count + 1}/3`);

    const { airtableSubmissionId, webhookData } = buildSubmissionWebhookData({
      fields: submission.form_data,
      blobUrls: submission.blob_urls || [],
      submissionId: submission.id,
      airtableSubmissionId: submission.airtable_submission_id,
      retryAttempt: submission.retry_count + 1,
      submittedAt: submission.created_at
    });

    try {
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

      // Track successful retry
      await trackEvent('Webhook Retry Succeeded', {
        submissionId: submission.id,
        retryAttempt: submission.retry_count + 1,
        appName: submission.app_name
      });

      res.status(200).json({
        success: true,
        message: 'Webhook retry succeeded',
        submissionId: submission.id,
        retryAttempt: submission.retry_count + 1,
        airtableSubmissionId: airtableSubmissionId
      });

    } catch (webhookError) {
      console.error(`Submission ${submission.id} retry failed on attempt ${submission.retry_count + 1}:`, webhookError);

      // Update database: retry failed
      await db.updateSubmission(submission.id, {
        status: 'webhook_failed',
        errorMessage: `Retry ${submission.retry_count + 1} failed: ${webhookError.message}`,
        webhookSentAt: new Date().toISOString(),
        retryCount: submission.retry_count + 1
      });

      // Track failed retry
      await trackEvent('Webhook Retry Failed', {
        submissionId: submission.id,
        retryAttempt: submission.retry_count + 1,
        appName: submission.app_name,
        error: webhookError.message
      });

      res.status(500).json({
        success: false,
        message: 'Webhook retry failed',
        submissionId: submission.id,
        retryAttempt: submission.retry_count + 1,
        error: webhookError.message,
        canRetryAgain: submission.retry_count + 1 < 3
      });
    }

  } catch (error) {
    console.error('Retry submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry submission',
      error: error.message
    });
  }
}
