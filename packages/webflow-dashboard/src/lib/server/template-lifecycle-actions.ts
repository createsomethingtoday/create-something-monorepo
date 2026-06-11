import { error } from '@sveltejs/kit';
import type { Asset } from './airtable';
import {
	computeTemplateHealth,
	type TemplateLifecycleAutomationCode
} from '../utils/template-health';

export type TemplateLifecycleAction =
	| 'move_detail_only'
	| 'request_search_reentry'
	| 'approve_search_reentry';

export type TemplateLifecycleActionStatus = 'applied' | 'review_requested';

export interface TemplateLifecycleActionBody {
	action?: unknown;
	confirm?: unknown;
}

export interface TemplateLifecycleActionPlan {
	action: TemplateLifecycleAction;
	status: TemplateLifecycleActionStatus;
	searchVisibility: string;
	message: string;
	requiresReview: boolean;
	healthCode: TemplateLifecycleAutomationCode;
}

const SUPPORTED_ACTIONS = new Set<TemplateLifecycleAction>([
	'move_detail_only',
	'request_search_reentry',
	'approve_search_reentry'
]);

export const DETAIL_ONLY_SEARCH_VISIBILITY = 'Detail only';
export const REENTRY_REVIEW_SEARCH_VISIBILITY = 'Detail only - re-entry review requested';
export const SEARCHABLE_VISIBILITY = 'Searchable';

function parseLifecycleAction(value: unknown): TemplateLifecycleAction {
	if (typeof value !== 'string' || !SUPPORTED_ACTIONS.has(value as TemplateLifecycleAction)) {
		throw error(400, 'Template lifecycle action is not supported');
	}
	return value as TemplateLifecycleAction;
}

export function normalizeTemplateLifecycleActionBody(
	body: TemplateLifecycleActionBody
): { action: TemplateLifecycleAction; confirm: boolean } {
	return {
		action: parseLifecycleAction(body.action),
		confirm: body.confirm === true
	};
}

function requireTemplate(asset: Asset): void {
	if (asset.type !== 'Template') {
		throw error(400, 'Template lifecycle actions are only available for templates');
	}
}

function requireConfirmation(confirm: boolean): void {
	if (!confirm) {
		throw error(400, 'Template lifecycle action must be confirmed before applying');
	}
}

function rejectBecauseSignalMismatch(action: TemplateLifecycleAction): never {
	const message =
		action === 'move_detail_only'
			? 'This template is not currently eligible to move detail-only from the automated signal.'
			: action === 'request_search_reentry'
				? 'This template has not reached the marketplace search re-entry threshold.'
				: 'This template is not eligible for marketplace search re-entry approval.';
	throw error(400, message);
}

export function planTemplateLifecycleAction(
	asset: Asset,
	body: TemplateLifecycleActionBody,
	options: { isAdmin?: boolean } = {}
): TemplateLifecycleActionPlan {
	const { action, confirm } = normalizeTemplateLifecycleActionBody(body);
	requireTemplate(asset);
	requireConfirmation(confirm);

	const health = computeTemplateHealth(asset);

	if (action === 'move_detail_only') {
		if (health.automation.code !== 'move_detail_only') {
			return rejectBecauseSignalMismatch(action);
		}

		return {
			action,
			status: 'applied',
			searchVisibility: DETAIL_ONLY_SEARCH_VISIBILITY,
			message: 'Template moved detail-only. Direct access stays available while search sync removes it from marketplace discovery.',
			requiresReview: false,
			healthCode: health.automation.code
		};
	}

	if (action === 'request_search_reentry') {
		if (health.automation.code === 'reentry_review_requested') {
			throw error(400, 'Search re-entry review has already been requested for this template');
		}

		if (health.automation.code !== 'eligible_for_reentry') {
			return rejectBecauseSignalMismatch(action);
		}

		return {
			action,
			status: 'review_requested',
			searchVisibility: REENTRY_REVIEW_SEARCH_VISIBILITY,
			message: 'Search re-entry review requested. The template stays detail-only until marketplace review approves search restoration.',
			requiresReview: true,
			healthCode: health.automation.code
		};
	}

	if (!options.isAdmin) {
		throw error(403, 'Only marketplace admins can approve search re-entry');
	}

	if (
		health.automation.code !== 'eligible_for_reentry' &&
		health.automation.code !== 'reentry_review_requested'
	) {
		return rejectBecauseSignalMismatch(action);
	}

	return {
		action,
		status: 'applied',
		searchVisibility: SEARCHABLE_VISIBILITY,
		message: 'Search re-entry approved. The next search sync can return this template to marketplace discovery.',
		requiresReview: false,
		healthCode: health.automation.code
	};
}
