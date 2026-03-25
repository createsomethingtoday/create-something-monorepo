import { db } from '../../../lib/db';
import { requireAdminApiToken } from '../../../lib/apiAuth';

/**
 * Get single submission by ID
 * GET /api/submissions/{id}
 *
 * Returns complete submission details including:
 * - All metadata and status information
 * - Full form data (JSON)
 * - Blob URLs for uploaded files
 * - Webhook response and error details
 * - Retry information
 *
 * Example:
 * /api/submissions/123e4567-e89b-12d3-a456-426614174000
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!await requireAdminApiToken(req, res)) {
    return;
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Submission ID is required'
      });
    }

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid UUID format'
      });
    }

    // Get submission from database
    const submission = await db.getSubmission(id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Format response with complete details
    res.status(200).json({
      success: true,
      submission: {
        // Basic info
        id: submission.id,
        submissionType: submission.submission_type,
        appName: submission.app_name,
        clientId: submission.client_id,
        creatorEmail: submission.creator_email,

        // Status tracking
        status: submission.status,
        createdAt: submission.created_at,
        updatedAt: submission.updated_at,

        // Form data (full JSON)
        formData: submission.form_data,

        // File storage
        blobUrls: submission.blob_urls,
        blobsCleaned: submission.blobs_cleaned_at !== null,
        blobsCleanedAt: submission.blobs_cleaned_at,

        // Webhook details
        airtableSubmissionId: submission.airtable_submission_id,
        webhookResponse: submission.webhook_response,
        webhookSentAt: submission.webhook_sent_at,

        // Error tracking
        errorMessage: submission.error_message,
        retryCount: submission.retry_count,

        // Helper flags
        canRetry: submission.status === 'webhook_failed' && submission.retry_count < 3,
        needsManualReview: submission.retry_count >= 3,
        hasBlobsForRetry: submission.blob_urls && submission.blob_urls.length > 0 && !submission.blobs_cleaned_at
      }
    });

  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve submission',
      error: error.message
    });
  }
}
