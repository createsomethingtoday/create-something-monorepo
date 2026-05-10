import { PUBLIC_TRUST_CATALOG } from './publicTrustCatalog.generated';

export type PublicMcpTrustCard = (typeof PUBLIC_TRUST_CATALOG.mcp)[number];
export type PublicAgentTrustCard = (typeof PUBLIC_TRUST_CATALOG.agents)[number];
export type PublicTrustCard = PublicMcpTrustCard | PublicAgentTrustCard;
export type PublicInstallSnippet = PublicMcpTrustCard['installSnippets'][number];

export const PUBLIC_MCP_TRUST_CARDS = PUBLIC_TRUST_CATALOG.mcp;
export const PUBLIC_AGENT_TRUST_CARDS = PUBLIC_TRUST_CATALOG.agents;

export function getPublicMcpTrustCard(slug: string): PublicMcpTrustCard | undefined {
	return PUBLIC_MCP_TRUST_CARDS.find((card) => card.slug === slug);
}

export function getPublicAgentTrustCard(slug: string): PublicAgentTrustCard | undefined {
	return PUBLIC_AGENT_TRUST_CARDS.find((card) => card.slug === slug);
}
