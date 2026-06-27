export const PUBLIC_ATLAS_STORAGE_KEYS = {
	canvas: 'create-something:public-atlas-canvas',
	meta: 'create-something:public-atlas-meta',
	warmupSummary: 'create-something:workflow-mapping-warmup',
	warmupDraft: 'create-something:workflow-mapping-warmup-draft'
} as const;

export const PUBLIC_ATLAS_LIMITS = {
	anonymous: {
		messagesPerMap: 10,
		mutationsPerMap: 20,
		dailyMessagesPerVisitor: 20,
		maxMessageChars: 900,
		maxNodes: 36,
		maxEdges: 52
	},
	warmLead: {
		messagesPerMap: 30,
		mutationsPerMap: 75,
		dailyMessagesPerVisitor: 60,
		maxMessageChars: 1200,
		maxNodes: 48,
		maxEdges: 72
	}
} as const;

export type PublicAtlasTier = keyof typeof PUBLIC_ATLAS_LIMITS;
