/**
 * OUTERFIELDS Premium Content Network (PCN) - Remote MCP Server
 *
 * Stateless MCP server on Cloudflare Workers using createMcpHandler
 * and the official @modelcontextprotocol/sdk. Replaces manual JSON-RPC
 * with SDK-based Streamable HTTP transport.
 *
 * Architecture (Three-Tier Framework):
 *   Database tier (Resources)   — Platform architecture, component docs
 *   Automation tier (Tools)     — Component exploration, pattern explanation, extension guides
 *   Judgment tier (Prompts)     — Architecture review, platform onboarding
 *
 * @example
 * # In Claude Desktop settings:
 * {
 *   "mcpServers": {
 *     "outerfields-pcn": {
 *       "url": "https://outerfields.mcp.createsomething.agency/mcp"
 *     }
 *   }
 * }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

// Documentation content
import { COMPONENT_DOCS, PATTERN_DOCS, EXTENSION_GUIDES, DEPLOYMENT_DOCS, ARCHITECTURE_DOC } from './docs.js';

// =============================================================================
// Constants
// =============================================================================

const SERVER_NAME = 'outerfields-pcn';
const SERVER_VERSION = '2.0.0';

// =============================================================================
// Server Factory — creates a new McpServer instance per request
// (Required by MCP SDK 1.26+ to prevent cross-client data leaks)
// =============================================================================

function createServer(): McpServer {
	const server = new McpServer({
		name: SERVER_NAME,
		version: SERVER_VERSION,
		icons: [{
			src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMDAwMDAwIi8+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNCw0KSIgc3Ryb2tlPSIjZmZmZmZmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZmlsbD0ibm9uZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI2Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMiIvPjwvZz48L3N2Zz4=',
			mimeType: 'image/svg+xml',
			sizes: ['any'],
		}],
	});

	// =========================================================================
	// Database Tier — Resources (read-only data, no side effects)
	// =========================================================================

	server.resource(
		'platform-architecture',
		'pcn://architecture',
		{ description: 'OUTERFIELDS PCN platform architecture overview', mimeType: 'text/markdown' },
		async () => ({
			contents: [{
				uri: 'pcn://architecture',
				mimeType: 'text/markdown',
				text: ARCHITECTURE_DOC,
			}],
		}),
	);

	server.resource(
		'available-components',
		'pcn://components',
		{ description: 'List of all PCN platform components with summaries', mimeType: 'application/json' },
		async () => ({
			contents: [{
				uri: 'pcn://components',
				mimeType: 'application/json',
				text: JSON.stringify({
					components: Object.keys(COMPONENT_DOCS).map(name => ({
						name,
						hasDocumentation: true,
					})),
					patterns: Object.keys(PATTERN_DOCS),
					extensions: Object.keys(EXTENSION_GUIDES),
					deploymentTopics: Object.keys(DEPLOYMENT_DOCS),
				}, null, 2),
			}],
		}),
	);

	// =========================================================================
	// Automation Tier — Tools (actions the agent can take)
	// =========================================================================

	server.tool(
		'pcn_explore_component',
		`Explore a PCN platform component's implementation details, features, and usage examples. Use when the user asks about how a specific UI component works, its props, or how to use it.`,
		{
			component: z.enum(['VideoModal', 'Heatmap', 'MetricsDashboard', 'ComponentLab', 'Navigation'])
				.describe('The component to explore'),
		},
		async ({ component }) => {
			const doc = COMPONENT_DOCS[component];
			if (!doc) {
				return {
					content: [{ type: 'text', text: `Component "${component}" not found. Available components: ${Object.keys(COMPONENT_DOCS).join(', ')}. Try one of those instead.` }],
					isError: true,
				};
			}
			return { content: [{ type: 'text', text: doc }] };
		},
	);

	server.tool(
		'pcn_explain_pattern',
		`Explain an architectural pattern used in the PCN platform. Use when the user asks about how a system feature works end-to-end (e.g., "how does engagement tracking work?", "how is the analytics pipeline structured?").`,
		{
			pattern: z.enum(['engagement-tracking', 'analytics-pipeline', 'cloudflare-integration', 'authentication', 'deployment'])
				.describe('The architectural pattern to explain'),
		},
		async ({ pattern }) => {
			const doc = PATTERN_DOCS[pattern];
			if (!doc) {
				return {
					content: [{ type: 'text', text: `Pattern "${pattern}" not found. Available patterns: ${Object.keys(PATTERN_DOCS).join(', ')}. Try one of those instead.` }],
					isError: true,
				};
			}
			return { content: [{ type: 'text', text: doc }] };
		},
	);

	server.tool(
		'pcn_guide_extension',
		`Get step-by-step implementation guidance for extending the PCN platform. Use when the user wants to add a new feature, metric, component, API endpoint, or admin functionality.`,
		{
			extension: z.enum(['add-metric', 'new-video-feature', 'custom-heatmap', 'api-endpoint', 'admin-feature'])
				.describe('The type of extension to implement'),
			details: z.string().optional()
				.describe('Specific details about what to build (e.g., "add a playback speed selector")'),
		},
		async ({ extension, details }) => {
			let doc = EXTENSION_GUIDES[extension];
			if (!doc) {
				return {
					content: [{ type: 'text', text: `Extension guide "${extension}" not found. Available guides: ${Object.keys(EXTENSION_GUIDES).join(', ')}. Try one of those instead.` }],
					isError: true,
				};
			}
			if (details) {
				doc = `**Your Goal**: ${details}\n\n${doc}`;
			}
			return { content: [{ type: 'text', text: doc }] };
		},
	);

	server.tool(
		'pcn_deployment',
		`Get deployment and maintenance guidance for the PCN platform. Use when the user asks about building, deploying, configuring environment variables, troubleshooting, database migrations, or monitoring.`,
		{
			topic: z.enum(['build-deploy', 'environment-vars', 'troubleshooting', 'database-migrations', 'monitoring'])
				.describe('The deployment topic'),
		},
		async ({ topic }) => {
			const doc = DEPLOYMENT_DOCS[topic];
			if (!doc) {
				return {
					content: [{ type: 'text', text: `Deployment topic "${topic}" not found. Available topics: ${Object.keys(DEPLOYMENT_DOCS).join(', ')}. Try one of those instead.` }],
					isError: true,
				};
			}
			return { content: [{ type: 'text', text: doc }] };
		},
	);

	// =========================================================================
	// Judgment Tier — Prompts (reusable interaction templates)
	// =========================================================================

	server.prompt(
		'platform_onboarding',
		'Introduction to the OUTERFIELDS PCN platform for new developers. Use to get oriented with the architecture, components, and development workflow.',
		{},
		async () => ({
			messages: [{
				role: 'user',
				content: {
					type: 'text',
					text: `I'm new to the OUTERFIELDS PCN platform. Give me a comprehensive orientation covering:
1. The platform architecture and technology stack
2. Key components and how they interact
3. The engagement tracking data flow
4. Development and deployment workflow
5. Where to start for common tasks

Use the pcn_explore_component, pcn_explain_pattern, and pcn_deployment tools to gather information, then synthesize a clear onboarding guide.`,
				},
			}],
		}),
	);

	server.prompt(
		'architecture_review',
		'Review the PCN platform architecture for a specific concern (performance, security, scalability, etc.).',
		{
			concern: z.string().describe('The architectural concern to review (e.g., "performance", "security", "scalability")'),
		},
		async ({ concern }) => ({
			messages: [{
				role: 'user',
				content: {
					type: 'text',
					text: `Review the OUTERFIELDS PCN platform architecture with a focus on ${concern}. Use the available tools to examine the architecture, relevant patterns, and components. Provide:
1. Current state assessment
2. Strengths
3. Areas for improvement
4. Specific recommendations with code examples where helpful`,
				},
			}],
		}),
	);

	return server;
}

// =============================================================================
// Worker Entry Point — Streamable HTTP via SDK
// =============================================================================

// =============================================================================
// Authentication Middleware
// =============================================================================

interface McpEnv {
	/** Optional API key for authenticating remote MCP clients */
	MCP_API_KEY?: string;
}

/**
 * Validate API key from Bearer token or X-API-Key header.
 * Returns null if auth passes, or an error Response if it fails.
 * When MCP_API_KEY is not set, auth is bypassed (development mode).
 */
function validateApiKey(request: Request, env: McpEnv): Response | null {
	if (!env.MCP_API_KEY) return null;

	const authHeader = request.headers.get('Authorization');
	const apiKeyHeader = request.headers.get('X-API-Key');

	const token = authHeader?.startsWith('Bearer ')
		? authHeader.slice(7)
		: apiKeyHeader;

	if (!token || token !== env.MCP_API_KEY) {
		return new Response(JSON.stringify({
			error: 'Unauthorized',
			message: 'Valid API key required. Set Bearer token or X-API-Key header.',
		}), {
			status: 401,
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
		});
	}

	return null;
}

export default {
	async fetch(request: Request, env: McpEnv, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Health / info endpoint
		if (url.pathname === '/' || url.pathname === '/health') {
			return new Response(JSON.stringify({
				name: SERVER_NAME,
				version: SERVER_VERSION,
				status: 'healthy',
				transport: 'streamable-http',
				endpoint: '/mcp',
				capabilities: {
					resources: '2 (platform architecture, component catalog)',
					tools: '4 (explore component, explain pattern, guide extension, deployment)',
					prompts: '2 (platform onboarding, architecture review)',
				},
				timestamp: new Date().toISOString(),
			}, null, 2), {
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, Accept',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		// MCP endpoint — Streamable HTTP transport
		if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
			const authError = validateApiKey(request, env);
			if (authError) return authError;

			const server = createServer();
			const transport = new WebStandardStreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
				enableJsonResponse: true,
			});
			await server.connect(transport);
			return transport.handleRequest(request);
		}

		return new Response('Not found. MCP endpoint is at /mcp', {
			status: 404,
			headers: { 'Access-Control-Allow-Origin': '*' },
		});
	},
};
