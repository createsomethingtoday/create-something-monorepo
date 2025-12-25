import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getModule } from '$lib/config/modules';

interface EnrollmentRow {
  module_slug: string;
  enabled: number;
  enrolled_at: number;
  progress_percentage: number;
  last_accessed_at: number | null;
}

/**
 * GET /api/modules/[slug]
 * Get a specific module with user enrollment status
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
  const module = getModule(params.slug);

  if (!module) {
    throw error(404, 'Module not found');
  }

  // Get user enrollment status if authenticated
  let enrollment = null;
  if (locals.user?.id && platform?.env.DB) {
    const result = await platform.env.DB.prepare(
      'SELECT * FROM module_enrollment WHERE learner_id = ? AND module_slug = ?'
    )
      .bind(locals.user.id, params.slug)
      .first<EnrollmentRow>();

    if (result) {
      enrollment = {
        enabled: Boolean(result.enabled),
        enrolledAt: new Date(result.enrolled_at * 1000).toISOString(),
        progressPercentage: result.progress_percentage,
        lastAccessedAt: result.last_accessed_at
          ? new Date(result.last_accessed_at * 1000).toISOString()
          : null,
      };
    }
  }

  return json({
    module,
    enrollment,
  });
};

/**
 * POST /api/modules/[slug]
 * Enable or disable a module for the current user
 */
export const POST: RequestHandler = async ({ params, platform, locals, request }) => {
  // Require authentication
  if (!locals.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const module = getModule(params.slug);
  if (!module) {
    throw error(404, 'Module not found');
  }

  const body = (await request.json()) as { enabled?: boolean };
  const enabled = body.enabled === true;

  const db = platform?.env.DB;
  if (!db) {
    throw error(500, 'Database not available');
  }

  try {
    if (enabled) {
      // Enable the module (insert or update)
      await db
        .prepare(
          `INSERT INTO module_enrollment (learner_id, module_slug, enabled, enrolled_at)
         VALUES (?, ?, 1, ?)
         ON CONFLICT(learner_id, module_slug) DO UPDATE SET enabled = 1`
        )
        .bind(locals.user.id, params.slug, Math.floor(Date.now() / 1000))
        .run();
    } else {
      // Disable the module
      await db
        .prepare(
          'UPDATE module_enrollment SET enabled = 0 WHERE learner_id = ? AND module_slug = ?'
        )
        .bind(locals.user.id, params.slug)
        .run();
    }

    const result = await db
      .prepare(
        'SELECT * FROM module_enrollment WHERE learner_id = ? AND module_slug = ?'
      )
      .bind(locals.user.id, params.slug)
      .first<EnrollmentRow>();

    if (!result) {
      throw error(500, 'Failed to retrieve enrollment');
    }

    return json({
      success: true,
      enrollment: {
        enabled: Boolean(result.enabled),
        enrolledAt: new Date(result.enrolled_at * 1000).toISOString(),
        progressPercentage: result.progress_percentage,
      },
    });
  } catch (err) {
    console.error('Error updating module enrollment:', err);
    throw error(500, 'Failed to update module enrollment');
  }
};
