// Queue Consumer - Processes full project reviews in background

import type { Env, Finding } from '../../../shared/types';
import { checkSEO } from '../../seo-checker/src/index';
import { validateLinks } from '../../link-validator/src/index';
import { QUEUE_BATCH_SIZE, SEVERITY_WEIGHTS } from '../../../shared/constants';

interface QueueMessage {
  reviewId: string;
  projectId: string;
  webhookUrl?: string;
  pages: string[];
}

export default {
  async queue(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processReview(message.body, env);
        message.ack();
      } catch (error) {
        console.error('Failed to process review:', error);

        // Update review status to failed
        try {
          await env.DB.prepare(`
            UPDATE reviews
            SET status = 'failed', error = ?, completed_at = ?
            WHERE id = ?
          `).bind(
            error instanceof Error ? error.message : String(error),
            Date.now(),
            message.body.reviewId
          ).run();
        } catch (dbError) {
          console.error('Failed to update review status:', dbError);
        }

        // Retry up to 3 times
        if (message.attempts < 3) {
          message.retry({ delaySeconds: 60 * message.attempts });
        } else {
          message.ack(); // Give up after 3 attempts
        }
      }
    }
  },
};

async function processReview(msg: QueueMessage, env: Env): Promise<void> {
  const { reviewId, projectId, webhookUrl, pages } = msg;

  // Update status to running
  await env.DB.prepare(`
    UPDATE reviews SET status = 'running' WHERE id = ?
  `).bind(reviewId).run();

  const allFindings: Finding[] = [];
  let totalScore = 0;

  // Process pages in batches
  for (let i = 0; i < pages.length; i += QUEUE_BATCH_SIZE) {
    const batch = pages.slice(i, i + QUEUE_BATCH_SIZE);

    // Process batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(pageUrl => processPage(reviewId, pageUrl, env))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allFindings.push(...result.value.findings);
        totalScore += result.value.score;
      }
    }
  }

  // Calculate overall score
  const overallScore = pages.length > 0 ? Math.round(totalScore / pages.length) : 0;

  // Store all findings in D1
  for (const finding of allFindings) {
    const findingId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO findings (
        id, review_id, check_type, severity, page_url,
        element_selector, message, evidence, auto_fixable, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      findingId,
      reviewId,
      finding.checkType,
      finding.severity,
      finding.pageUrl || null,
      finding.elementSelector || null,
      finding.message,
      finding.evidence ? JSON.stringify(finding.evidence) : null,
      finding.autoFixable ? 1 : 0,
      Date.now()
    ).run();
  }

  // Update review as completed
  await env.DB.prepare(`
    UPDATE reviews
    SET status = 'completed', overall_score = ?, completed_at = ?
    WHERE id = ?
  `).bind(overallScore, Date.now(), reviewId).run();

  // Call webhook if provided
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId,
          projectId,
          status: 'completed',
          score: overallScore,
          findingsCount: allFindings.length,
          reportUrl: `/api/review/${reviewId}/report`,
        }),
      });
    } catch (error) {
      console.error('Failed to call webhook:', error);
      // Don't fail the review if webhook fails
    }
  }
}

async function processPage(
  reviewId: string,
  pageUrl: string,
  env: Env
): Promise<{ findings: Finding[]; score: number }> {
  const pageId = crypto.randomUUID();

  try {
    // Update page status
    await env.DB.prepare(`
      UPDATE review_pages
      SET status = 'processing', started_at = ?
      WHERE review_id = ? AND page_url = ?
    `).bind(Date.now(), reviewId, pageUrl).run();

    // Run checks
    const [seoFindings, linkFindings] = await Promise.all([
      checkSEO(pageUrl, env),
      validateLinks(pageUrl, env),
    ]);

    const findings = [...seoFindings, ...linkFindings];

    // Calculate page score
    let penalties = 0;
    for (const finding of findings) {
      penalties += SEVERITY_WEIGHTS[finding.severity];
    }
    const score = Math.max(0, Math.min(100, 100 - penalties));

    // Update page as completed
    await env.DB.prepare(`
      UPDATE review_pages
      SET status = 'completed', score = ?, findings_count = ?, completed_at = ?
      WHERE review_id = ? AND page_url = ?
    `).bind(score, findings.length, Date.now(), reviewId, pageUrl).run();

    return { findings, score };
  } catch (error) {
    // Update page as failed
    await env.DB.prepare(`
      UPDATE review_pages
      SET status = 'failed', error = ?, completed_at = ?
      WHERE review_id = ? AND page_url = ?
    `).bind(
      error instanceof Error ? error.message : String(error),
      Date.now(),
      reviewId,
      pageUrl
    ).run();

    throw error;
  }
}
