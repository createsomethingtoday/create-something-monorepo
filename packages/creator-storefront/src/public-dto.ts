import type { PublicStorefrontV1, ReadModelRow } from './types';
import { linkLabel } from './validation';

/**
 * Builds the public DTO from a live read-model row. Only allow-listed values
 * are copied; Airtable IDs and the internal snapshot never leave this module.
 *
 * Creator identity (name, avatar, bio, website) is NOT in this DTO. The
 * consumer page owns identity from its own CMS/catalog data and joins it
 * (CONTRACT.md §8).
 */
export function toPublicDto(row: ReadModelRow): PublicStorefrontV1 {
	const snapshot = row.snapshot;
	if (row.state !== 'live' || !snapshot) {
		throw new Error('toPublicDto requires a live row with a snapshot');
	}
	return {
		schema: 1,
		creatorSlug: row.creatorSlug,
		version: row.revision,
		publishedAt: snapshot.publishedAt,
		positioning: snapshot.positioning,
		cover: snapshot.cover ? { url: snapshot.cover.url, alt: snapshot.cover.alt } : null,
		links: snapshot.portfolioUrl ? [{ href: snapshot.portfolioUrl, label: linkLabel(snapshot.portfolioUrl) }] : [],
		support: snapshot.support ? { text: snapshot.support.text, href: snapshot.support.href } : null,
		selections: [...snapshot.selections]
			.sort((a, b) => a.position - b.position)
			.map((s) => ({ templateSlug: s.templateSlug, note: s.note }))
	};
}
