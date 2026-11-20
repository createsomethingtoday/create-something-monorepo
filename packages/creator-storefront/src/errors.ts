/**
 * Expected failures carry a stable code and HTTP status. `cause` keeps the
 * provider error for diagnosis; it is never serialized to callers.
 */
export type StorefrontErrorCode =
	| 'unauthorized'
	| 'forbidden'
	| 'not_configured'
	| 'not_found'
	| 'creator_not_found'
	| 'ambiguous_creator'
	| 'invalid_request'
	| 'validation_failed'
	| 'ineligible_selection'
	| 'version_conflict'
	| 'idempotency_key_required'
	| 'idempotency_conflict'
	| 'suspended'
	| 'intent_pending'
	| 'creator_slug_missing'
	| 'invariant_violation'
	| 'upstream_unavailable'
	| 'upstream_rejected';

const STATUS: Record<StorefrontErrorCode, number> = {
	unauthorized: 401,
	forbidden: 403,
	not_configured: 503,
	not_found: 404,
	creator_not_found: 404,
	ambiguous_creator: 409,
	invalid_request: 400,
	validation_failed: 422,
	ineligible_selection: 422,
	version_conflict: 409,
	idempotency_key_required: 400,
	idempotency_conflict: 422,
	suspended: 423,
	intent_pending: 409,
	creator_slug_missing: 422,
	invariant_violation: 409,
	upstream_unavailable: 503,
	upstream_rejected: 502
};

export class StorefrontError extends Error {
	readonly code: StorefrontErrorCode;
	readonly status: number;
	readonly details?: unknown;

	constructor(code: StorefrontErrorCode, message: string, options: { details?: unknown; cause?: unknown } = {}) {
		super(message, { cause: options.cause });
		this.name = 'StorefrontError';
		this.code = code;
		this.status = STATUS[code];
		this.details = options.details;
	}

	/** Safe body for HTTP callers: no cause, no stack. */
	toJSON(): { error: StorefrontErrorCode; message: string; details?: unknown } {
		return this.details === undefined
			? { error: this.code, message: this.message }
			: { error: this.code, message: this.message, details: this.details };
	}
}

export function isStorefrontError(value: unknown): value is StorefrontError {
	return value instanceof StorefrontError;
}

/** Transient upstream failures that a reconciler may retry. */
export function isTransient(error: unknown): boolean {
	return isStorefrontError(error) && error.code === 'upstream_unavailable';
}
