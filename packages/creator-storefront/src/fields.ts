/**
 * Airtable schema IDs verified live on 2026-10-29 (see
 * packages/webflow-dashboard/docs/creator-storefront/SCHEMA_EVIDENCE.md).
 * Reads use returnFieldsByFieldId, so renames in Airtable do not break them.
 */
export const BASE_ID = 'appMoIgXMTTTNIc3p';

export const TABLES = {
	creators: 'tbljt0plqxdMARZXb',
	assets: 'tblRwzpWoLgE9MrUm',
	storefronts: 'tblSnWOQgkHNig95k',
	selections: 'tbl56WtGtAEQJ30eC'
} as const;

export const CREATOR = {
	name: 'fldQIcXYW9GJY7NKG',
	cmsSlug: 'fldf2qDe5IC6Aw5w0',
	assets: 'fldGpJPqmH67pJcMV',
	storefronts: 'fld5qVag8xWpA2PSm'
} as const;

export const ASSET = {
	name: 'fldUzJBor3Gnkykjc',
	creator: 'fldGDWo2VfnTbSUiL',
	marketplaceStatus: 'fld51CeQNGDgW9b0D',
	cmsSlug: 'fldXvOFvxtksUts0w',
	typeText: 'fld7kubS6EE1LOC8d'
} as const;

/** 🚀Marketplace Status choice name for live listings (choice selR1B9B9s2NMF3x1). */
export const ASSET_PUBLISHED_STATUS = '3️⃣Published🚀';

export const STOREFRONT = {
	number: 'fldMRv4zPwBn69h1j',
	creator: 'fldTuNRh1bMLbVRG7',
	positioning: 'fld7RLVCWyPHbU8rH',
	coverUrl: 'fld3TNgJIt9uVJRI2',
	coverAlt: 'fldiRB8Lz2o2Cjd9g',
	portfolioUrl: 'fldsvNIy41QDEwM8l',
	supportText: 'fldtgnAD2o2KFvBbr',
	supportUrl: 'fldGxY3XKCdEzh3BV',
	draftVersion: 'fldAHtyPL8vg8hBai',
	status: 'fldlRactB8YHualTY',
	publishedDraftVersion: 'fldaRPLn0m5gB7ahX',
	publishedAt: 'fldsHCtAn19R5j2ep',
	snapshotJson: 'fldabdMwfrb7lNsnW',
	selections: 'fld2oOVxEVeUrL2fO'
} as const;

export const PUBLICATION_STATUS = {
	neverPublished: 'Never published',
	published: 'Published',
	unpublished: 'Unpublished',
	suspended: 'Suspended'
} as const;

export type PublicationStatus = (typeof PUBLICATION_STATUS)[keyof typeof PUBLICATION_STATUS];

export const SELECTION = {
	number: 'fldPXGZi6EICUC5Dc',
	storefront: 'fld23ami8BlZnxj8V',
	asset: 'fld3qcdNbY9wdgdcB',
	position: 'fldOOH5EBi8siiwqe',
	note: 'fldDSa1hkW5evvjcK'
} as const;
