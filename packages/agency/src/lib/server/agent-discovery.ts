export const AGENCY_ORIGIN = 'https://createsomething.agency';

export const AGENCY_AGENT_DISCOVERY = {
	apiCatalog: `${AGENCY_ORIGIN}/.well-known/api-catalog`,
	apiDescription: `${AGENCY_ORIGIN}/openapi-agent.yaml`,
	apiDocumentation: `${AGENCY_ORIGIN}/agent-api.md`,
	serviceManifest: `${AGENCY_ORIGIN}/api/manifest`,
	status: `${AGENCY_ORIGIN}/api/map/health`,
	auth: `${AGENCY_ORIGIN}/auth.md`,
	protectedResourceMetadata: `${AGENCY_ORIGIN}/.well-known/oauth-protected-resource`,
	skillsIndex: `${AGENCY_ORIGIN}/.well-known/agent-skills/index.json`,
	mcpServerCard: `${AGENCY_ORIGIN}/.well-known/mcp/server-card.json`,
	agentCard: `${AGENCY_ORIGIN}/.well-known/agent-card.json`
} as const;

const discoveryLinkValues = [
	`<${AGENCY_AGENT_DISCOVERY.apiCatalog}>; rel="api-catalog"; type="application/linkset+json"`,
	`<${AGENCY_AGENT_DISCOVERY.apiDescription}>; rel="service-desc"; type="application/vnd.oai.openapi"`,
	`<${AGENCY_AGENT_DISCOVERY.apiDocumentation}>; rel="service-doc"; type="text/markdown"`,
	`<${AGENCY_AGENT_DISCOVERY.serviceManifest}>; rel="describedby"; type="application/json"`
] as const;

/** Adds only public, source-backed discovery links to a response. */
export function withAgentDiscoveryLinks(response: Response): Response {
	const headers = new Headers(response.headers);
	for (const value of discoveryLinkValues) headers.append('Link', value);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
}

export const agencyApiCatalog = {
	linkset: [
		{
			anchor: AGENCY_ORIGIN,
			href: AGENCY_AGENT_DISCOVERY.apiDescription,
			rel: ['service-desc'],
			type: 'application/vnd.oai.openapi',
			title: 'CREATE SOMETHING public agent API'
		},
		{
			anchor: AGENCY_ORIGIN,
			href: AGENCY_AGENT_DISCOVERY.apiDocumentation,
			rel: ['service-doc'],
			type: 'text/markdown',
			title: 'Public agent API instructions and operating boundary'
		},
		{
			anchor: AGENCY_ORIGIN,
			href: AGENCY_AGENT_DISCOVERY.serviceManifest,
			rel: ['describedby'],
			type: 'application/json',
			title: 'Current public service manifest'
		},
		{
			anchor: AGENCY_ORIGIN,
			href: AGENCY_AGENT_DISCOVERY.status,
			rel: ['status'],
			type: 'application/json',
			title: 'Map public-agent readiness status'
		}
	]
} as const;
