import { PUBLIC_TRUST_CATALOG } from './publicTrustCatalog.generated';

export type PublicMcpTrustCard = (typeof PUBLIC_TRUST_CATALOG.mcp)[number];
export type PublicAgentTrustCard = (typeof PUBLIC_TRUST_CATALOG.agents)[number];
export type PublicTrustCard = PublicMcpTrustCard | PublicAgentTrustCard;
export type PublicInstallSnippet = PublicMcpTrustCard['installSnippets'][number];

// Public contact presentation only; preserve the registry's operational escalation routing.
const publicContact = <T extends { escalation: string }>(card: T): T => ({
  ...card,
  escalation: card.escalation.replace(
    /[\w.+-]+@createsomething\.(?:io|agency|ltd|space)\b/g,
    'support@createsomething.io'
  )
});

export const PUBLIC_MCP_TRUST_CARDS = PUBLIC_TRUST_CATALOG.mcp.map(publicContact);
export const PUBLIC_AGENT_TRUST_CARDS = PUBLIC_TRUST_CATALOG.agents.map(publicContact);

export function getPublicMcpTrustCard(slug: string): PublicMcpTrustCard | undefined {
  return PUBLIC_MCP_TRUST_CARDS.find((card) => card.slug === slug);
}

export function getPublicAgentTrustCard(slug: string): PublicAgentTrustCard | undefined {
  return PUBLIC_AGENT_TRUST_CARDS.find((card) => card.slug === slug);
}
