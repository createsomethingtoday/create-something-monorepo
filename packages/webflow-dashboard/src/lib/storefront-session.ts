/**
 * Creator selection and request-scoping rules for the Storefront editor.
 *
 * One login can match several Creator records. The editor acts for exactly one
 * of them, named explicitly on every call; the service re-checks the choice
 * against the login email. This module holds the pure parts so they are tested
 * without a browser: how selection reaches each request, which idempotency
 * keys may be reused, and which in-flight results are stale.
 */

/** A Creator record the login email matched (record ID and public slug only). */
export interface CreatorChoice {
	id: string;
	slug: string | null;
}

/** `?preview=1&creator=rec…`; the creator is added only when one is selected. */
export function storefrontQuery(selected: CreatorChoice | null, extra: Record<string, string> = {}): string {
	const params = new URLSearchParams(extra);
	if (selected) params.set('creator', selected.id);
	const text = params.toString();
	return text ? `?${text}` : '';
}

/** POST body for one action. The selection comes from state, never from the payload. */
export function storefrontPostBody(
	selected: CreatorChoice | null,
	action: string,
	payload: Record<string, unknown>
): Record<string, unknown> {
	const { creatorId: _ignored, action: _action, ...rest } = payload;
	return { action, ...(selected ? { creatorId: selected.id } : {}), ...rest };
}

/** Reads `choices` from an ambiguous_creator response; anything else yields none. */
export function readCreatorChoices(body: unknown): CreatorChoice[] {
	const b = body as { error?: unknown; details?: { choices?: unknown } } | null;
	if (b?.error !== 'ambiguous_creator' || !Array.isArray(b.details?.choices)) return [];
	return (b.details.choices as Array<{ id?: unknown; slug?: unknown }>)
		.filter((c) => typeof c?.id === 'string')
		.map((c) => ({ id: c.id as string, slug: typeof c.slug === 'string' ? c.slug : null }));
}

/**
 * Idempotency keys survive a failed attempt so "Try again" replays the same
 * request. They are scoped to the selected creator and dropped on a switch, so
 * a key from one creator's save can never be sent for another's. `generation`
 * changes on every reset; a request that began under an older one is stale.
 */
export class IdempotencyKeys {
	generation = 0;
	private keys = new Map<string, string>();

	constructor(private readonly newKey: () => string = () => crypto.randomUUID()) {}

	scope(selected: CreatorChoice | null, scope: string): string {
		return `${selected?.id ?? '-'}:${scope}`;
	}

	acquire(scope: string): string {
		const key = this.keys.get(scope) ?? this.newKey();
		this.keys.set(scope, key);
		return key;
	}

	release(scope: string): void {
		this.keys.delete(scope);
	}

	reset(): void {
		this.generation += 1;
		this.keys = new Map();
	}

	isStale(startedAt: number): boolean {
		return startedAt !== this.generation;
	}
}
