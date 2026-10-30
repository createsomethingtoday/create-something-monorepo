import { StorefrontError, isStorefrontError } from './errors';
import type { CreatorRef } from './types';
import type { StorefrontWriter } from './writer';

export type WriterOp =
	| 'view'
	| 'saveDraft'
	| 'replaceSelections'
	| 'preview'
	| 'publish'
	| 'unpublish'
	| 'suspend'
	| 'clearSuspension'
	| 'moveSlug';

export type WriterEnvelope =
	| { ok: true; value: unknown }
	| { ok: false; status: number; body: ReturnType<StorefrontError['toJSON']> };

type Input = { idempotencyKey: string | null; expectedDraftVersion?: unknown; fields?: unknown; selections?: unknown };

/** Runs one writer operation and converts failures into a serializable envelope. */
export async function dispatch(writer: StorefrontWriter, op: WriterOp, creator: CreatorRef, input: Input): Promise<WriterEnvelope> {
	try {
		const value = await run(writer, op, creator, input);
		return { ok: true, value };
	} catch (error) {
		if (isStorefrontError(error)) return { ok: false, status: error.status, body: error.toJSON() };
		console.error('[creator-storefront] unexpected writer error', error instanceof Error ? error.message : 'unknown');
		return { ok: false, status: 500, body: { error: 'invariant_violation', message: 'Unexpected writer error' } };
	}
}

function run(writer: StorefrontWriter, op: WriterOp, creator: CreatorRef, input: Input): Promise<unknown> {
	const key = { idempotencyKey: input.idempotencyKey };
	switch (op) {
		case 'view':
			return writer.view(creator);
		case 'saveDraft':
			return writer.saveDraft(creator, { ...key, expectedDraftVersion: input.expectedDraftVersion, fields: input.fields });
		case 'replaceSelections':
			return writer.replaceSelections(creator, {
				...key,
				expectedDraftVersion: input.expectedDraftVersion,
				selections: input.selections
			});
		case 'preview':
			return writer.preview(creator);
		case 'publish':
			return writer.publish(creator, { ...key, expectedDraftVersion: input.expectedDraftVersion });
		case 'unpublish':
			return writer.unpublish(creator, key);
		case 'suspend':
			return writer.suspend(creator, key);
		case 'clearSuspension':
			return writer.clearSuspension(creator, key);
		case 'moveSlug':
			return writer.moveSlug(creator, key);
	}
}

export function unwrap(envelope: WriterEnvelope): unknown {
	if (envelope.ok) return envelope.value;
	const error = new StorefrontError(envelope.body.error, envelope.body.message, { details: envelope.body.details });
	throw error;
}
