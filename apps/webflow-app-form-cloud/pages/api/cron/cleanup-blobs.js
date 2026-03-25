import { db } from '../../../lib/db';
import { deletePublicFile } from '../../../lib/blobStore';
import { trackEvent } from '../../../lib/analytics';
import { getEnvValue } from '../../../lib/cloudflareRuntime';

/**
 * Automatic blob cleanup cron job
 *
 * Scheduled to run every 6 hours via vercel.json
 *
 * Process:
 * 1. Get successful submissions (status='webhook_success')
 * 2. Filter for submissions older than 24 hours
 * 3. Filter for submissions where blobs haven't been cleaned yet
 * 4. Delete blob files from Vercel Blob storage
 * 5. Update database with cleanup timestamp
 *
 * This ensures Airtable has time to download files before cleanup
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
    console.log('Starting blob cleanup job...');

    // Get submissions ready for blob cleanup
    // These are successful submissions > 24 hours old with blobs not yet cleaned
    const submissions = await db.getSubmissionsForBlobCleanup();

    if (submissions.length === 0) {
      console.log('No submissions ready for blob cleanup');
      return res.status(200).json({
        success: true,
        message: 'No blobs to clean up',
        processed: 0
      });
    }

    console.log(`Found ${submissions.length} submissions ready for blob cleanup`);

    const results = {
      total: submissions.length,
      succeeded: 0,
      failed: 0,
      blobsDeleted: 0,
      errors: []
    };

    // Process each submission
    for (const submission of submissions) {
      try {
        console.log(`Processing submission ${submission.id} for blob cleanup`);

        const blobUrls = submission.blob_urls || [];

        if (blobUrls.length === 0) {
          console.log(`Submission ${submission.id}: No blobs to clean up`);
          // Still mark as cleaned
          await db.updateSubmission(submission.id, {
            blobsCleanedAt: new Date().toISOString()
          });
          results.succeeded++;
          continue;
        }

        // Delete each blob
        let deletedCount = 0;
        const deletionErrors = [];

        for (const blobUrl of blobUrls) {
          try {
            await deletePublicFile(blobUrl);
            deletedCount++;
            console.log(`Deleted blob: ${blobUrl}`);
          } catch (blobError) {
            console.error(`Failed to delete blob ${blobUrl}:`, blobError);
            deletionErrors.push({
              url: blobUrl,
              error: blobError.message
            });
          }
        }

        // Update database with cleanup timestamp
        // Even if some blobs failed to delete, mark as cleaned to avoid retrying forever
        await db.updateSubmission(submission.id, {
          blobsCleanedAt: new Date().toISOString()
        });

        results.blobsDeleted += deletedCount;
        results.succeeded++;

        if (deletionErrors.length > 0) {
          results.errors.push({
            submissionId: submission.id,
            blobErrors: deletionErrors
          });
          console.log(`Submission ${submission.id}: Deleted ${deletedCount}/${blobUrls.length} blobs`);
        } else {
          console.log(`Submission ${submission.id}: Successfully deleted all ${deletedCount} blobs`);
        }

        // Track cleanup
        await trackEvent('Blobs Cleaned Up', {
          submissionId: submission.id,
          blobsDeleted: deletedCount,
          totalBlobs: blobUrls.length
        });

      } catch (submissionError) {
        console.error(`Failed to process submission ${submission.id}:`, submissionError);
        results.failed++;
        results.errors.push({
          submissionId: submission.id,
          error: submissionError.message
        });
      }
    }

    console.log('Blob cleanup job completed:', results);

    res.status(200).json({
      success: true,
      message: 'Blob cleanup job completed',
      results
    });

  } catch (error) {
    console.error('Blob cleanup job error:', error);
    res.status(500).json({
      success: false,
      message: 'Blob cleanup job failed',
      error: error.message
    });
  }
}
