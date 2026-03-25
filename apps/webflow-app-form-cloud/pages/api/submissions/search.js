import { db } from '../../../lib/db';
import { requireAdminApiToken } from '../../../lib/apiAuth';

/**
 * Search submissions API
 * GET /api/submissions/search
 *
 * Query parameters:
 * - appName: Filter by app name (partial match, case-insensitive)
 * - clientId: Filter by exact client ID
 * - creatorEmail: Filter by creator email (partial match, case-insensitive)
 * - status: Filter by status (processing, pending, webhook_success, webhook_failed)
 * - startDate: Filter by created_at >= startDate (ISO 8601 format)
 * - endDate: Filter by created_at <= endDate (ISO 8601 format)
 * - limit: Number of results to return (default: 50, max: 100)
 * - offset: Number of results to skip (default: 0)
 *
 * Example:
 * /api/submissions/search?appName=AxOrigin&startDate=2025-10-15
 * /api/submissions/search?creatorEmail=user@example.com&status=webhook_failed
 * /api/submissions/search?startDate=2025-10-01&endDate=2025-10-31&limit=100
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!await requireAdminApiToken(req, res)) {
    return;
  }

  try {
    const {
      appName,
      clientId,
      creatorEmail,
      status,
      startDate,
      endDate,
      limit: rawLimit,
      offset: rawOffset
    } = req.query;

    // Parse and validate limit/offset
    let limit = parseInt(rawLimit) || 50;
    let offset = parseInt(rawOffset) || 0;

    // Enforce max limit
    if (limit > 100) limit = 100;
    if (limit < 1) limit = 50;
    if (offset < 0) offset = 0;

    // Validate status if provided
    const validStatuses = ['processing', 'pending', 'webhook_success', 'webhook_failed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
        validStatuses
      });
    }

    // Validate dates if provided
    if (startDate && isNaN(Date.parse(startDate))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid startDate format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
      });
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid endDate format. Use ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)'
      });
    }

    // Query database
    const results = await db.searchSubmissions({
      appName: appName || undefined,
      clientId: clientId || undefined,
      creatorEmail: creatorEmail || undefined,
      status: status || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      offset
    });

    // Build response with metadata
    res.status(200).json({
      success: true,
      count: results.length,
      limit,
      offset,
      filters: {
        appName: appName || null,
        clientId: clientId || null,
        creatorEmail: creatorEmail || null,
        status: status || null,
        startDate: startDate || null,
        endDate: endDate || null
      },
      results: results.map(submission => ({
        id: submission.id,
        submissionType: submission.submission_type,
        appName: submission.app_name,
        clientId: submission.client_id,
        creatorEmail: submission.creator_email,
        status: submission.status,
        airtableSubmissionId: submission.airtable_submission_id,
        createdAt: submission.created_at,
        updatedAt: submission.updated_at,
        webhookSentAt: submission.webhook_sent_at,
        errorMessage: submission.error_message,
        retryCount: submission.retry_count,
        blobsCleaned: submission.blobs_cleaned_at !== null,
        // Don't return full form_data or blob URLs in search results for performance
        // Use the single submission API to get full details
      }))
    });

  } catch (error) {
    console.error('Submission search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search submissions',
      error: error.message
    });
  }
}
