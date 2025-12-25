import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { MODULES } from '$lib/config/modules';

interface EnrollmentRow {
  module_slug: string;
  enabled: number;
  enrolled_at: number;
  progress_percentage: number;
  last_accessed_at: number | null;
}

/**
 * GET /api/modules
 * Get all modules with user enrollment status
 */
export const GET: RequestHandler = async ({ platform, locals }) => {
  let enrollments = new Map();

  // Get user's module enrollments if authenticated
  if (locals.user?.id && platform?.env.DB) {
    try {
      const result = await platform.env.DB.prepare(
        'SELECT module_slug, enabled, enrolled_at, progress_percentage, last_accessed_at FROM module_enrollment WHERE learner_id = ?'
      )
        .bind(locals.user.id)
        .all<EnrollmentRow>();

      if (result.success && result.results) {
        for (const row of result.results) {
          enrollments.set(row.module_slug, {
            enabled: Boolean(row.enabled),
            enrolledAt: new Date(row.enrolled_at * 1000).toISOString(),
            progressPercentage: row.progress_percentage,
            lastAccessedAt: row.last_accessed_at
              ? new Date(row.last_accessed_at * 1000).toISOString()
              : null,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching user enrollments:', err);
      // Continue without enrollment data on error
    }
  }

  const modules = MODULES.map((module) => ({
    ...module,
    enrollment: enrollments.get(module.slug) || null,
  }));

  return json({
    modules,
  });
};
