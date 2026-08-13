import type { RequestHandler } from './$types';

const contentMcpServerCard = {
	$schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
	name: 'createsomething.ltd/content',
	version: '1.0.0',
	title: 'CREATE SOMETHING Content MCP',
	description: 'Public CREATE SOMETHING content MCP for research, Canon, and workflow planning.',
	websiteUrl: 'https://createsomething.agency/agent-api.md',
	repository: {
		url: 'https://github.com/createsomethingtoday/create-something-monorepo',
		source: 'github',
		subfolder: 'packages/create-something-mcp'
	},
	remotes: [
		{
			type: 'streamable-http',
			url: 'https://mcp.createsomething.ltd/mcp',
			supportedProtocolVersions: ['2025-11-25']
		}
	],
	// Compatibility fields for discovery clients that predate the current card schema.
	// Runtime capability enumeration remains authoritative through MCP initialization.
	serverInfo: { name: 'create-something', version: '1.0.0' },
	capabilities: { tools: true, resources: true, prompts: true }
} as const;

export const GET: RequestHandler = async () =>
	new Response(JSON.stringify(contentMcpServerCard), {
		headers: {
			'content-type': 'application/mcp-server-card+json; charset=utf-8',
			'access-control-allow-origin': '*',
			'access-control-allow-methods': 'GET',
			'access-control-allow-headers': 'Content-Type, If-None-Match',
			'access-control-expose-headers': 'ETag',
			'cache-control': 'public, max-age=3600',
			etag: '"create-something-content-mcp-1.0.0"'
		}
	});
