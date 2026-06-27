import type { PublicAtlasCanvas, PublicAtlasReadiness } from '@create-something/canon/atlas/headless';

export type PublicAtlasAgentResult = {
	reply: string;
	canvas: PublicAtlasCanvas;
	mutationCount: number;
	suggestions: string[];
	readiness: PublicAtlasReadiness;
	agentMode: 'model' | 'fallback';
};
