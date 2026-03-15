/**
 * Shared utilities for coordination package
 */

import type { Issue, IssueStatus } from './types';

/**
 * Convert a database row to an Issue object
 */
export function rowToIssue(row: Record<string, unknown>): Issue {
	return {
		id: row.id as string,
		description: row.description as string,
		status: row.status as IssueStatus,
		projectId: row.project_id as string | null,
		parentId: row.parent_id as string | null,
		priority: row.priority as number,
		labels: JSON.parse((row.labels as string) || '[]'),
		metadata: JSON.parse((row.metadata as string) || '{}'),
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number,
		resolvedAt: row.resolved_at as number | null,
	};
}
