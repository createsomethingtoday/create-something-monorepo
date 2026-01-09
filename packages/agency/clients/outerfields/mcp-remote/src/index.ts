/**
 * OUTERFIELDS Premium Content Network (PCN) - Remote MCP Server
 *
 * Hosted on Cloudflare Workers, accessible via HTTPS.
 * Provides AI-native platform exploration directly in Claude Desktop.
 *
 * @example
 * # In Claude Desktop settings:
 * {
 *   "mcpServers": {
 *     "outerfields-pcn": {
 *       "url": "https://mcp.outerfields.io"
 *     }
 *   }
 * }
 */

const SERVER_NAME = 'outerfields-pcn-remote';
const SERVER_VERSION = '1.0.0';

// Import inline documentation (keeping it simple for Workers)
import { COMPONENT_DOCS, PATTERN_DOCS, EXTENSION_GUIDES, DEPLOYMENT_DOCS, ARCHITECTURE_DOC } from './docs.js';

interface MCPRequest {
	jsonrpc: '2.0';
	id: number | string;
	method: string;
	params?: any;
}

interface MCPResponse {
	jsonrpc: '2.0';
	id: number | string;
	result?: any;
	error?: {
		code: number;
		message: string;
		data?: any;
	};
}

interface Tool {
	name: string;
	description: string;
	inputSchema: {
		type: string;
		properties: Record<string, any>;
		required?: string[];
	};
}

const TOOLS: Tool[] = [
	{
		name: 'pcn_explore_component',
		description: `Understand how a specific component works in your PCN platform.

Available components:
- VideoModal: Cinematic video player with engagement tracking
- Heatmap: Visual replay pattern analysis
- MetricsDashboard: Real-time analytics display
- ComponentLab: Live component preview system
- Navigation: Fixed header with auth state

Returns: Component purpose, key features, implementation details, and usage examples.`,
		inputSchema: {
			type: 'object',
			properties: {
				component: {
					type: 'string',
					enum: ['VideoModal', 'Heatmap', 'MetricsDashboard', 'ComponentLab', 'Navigation'],
					description: 'The component to explore'
				}
			},
			required: ['component']
		}
	},
	{
		name: 'pcn_explain_pattern',
		description: `Explain architectural patterns used in your PCN platform.

Available patterns:
- engagement-tracking: How video engagement is tracked and stored
- analytics-pipeline: Real-time metrics collection and display
- cloudflare-integration: D1, KV, R2 usage patterns
- authentication: Auth flow and protected routes
- deployment: Build and deploy process

Returns: Pattern explanation, code examples, and best practices.`,
		inputSchema: {
			type: 'object',
			properties: {
				pattern: {
					type: 'string',
					enum: [
						'engagement-tracking',
						'analytics-pipeline',
						'cloudflare-integration',
						'authentication',
						'deployment'
					],
					description: 'The architectural pattern to explain'
				}
			},
			required: ['pattern']
		}
	},
	{
		name: 'pcn_guide_extension',
		description: `Get step-by-step guidance for extending your PCN platform.

Common extensions:
- add-metric: Add a new analytics metric to the dashboard
- new-video-feature: Add functionality to the video player
- custom-heatmap: Create custom heatmap visualizations
- api-endpoint: Create new API endpoints
- admin-feature: Add admin-only functionality

Returns: Implementation steps, code examples, files to modify, and testing guidance.`,
		inputSchema: {
			type: 'object',
			properties: {
				extension: {
					type: 'string',
					enum: [
						'add-metric',
						'new-video-feature',
						'custom-heatmap',
						'api-endpoint',
						'admin-feature'
					],
					description: 'The type of extension you want to add'
				},
				details: {
					type: 'string',
					description: 'Optional: Specific details about what you want to build'
				}
			},
			required: ['extension']
		}
	},
	{
		name: 'pcn_deployment',
		description: `Get deployment and maintenance guidance for your PCN platform.

Topics:
- build-deploy: Build process and Cloudflare Pages deployment
- environment-vars: Required environment variables and bindings
- troubleshooting: Common deployment issues and solutions
- database-migrations: D1 database schema updates
- monitoring: Analytics and error tracking

Returns: Deployment commands, configuration details, and best practices.`,
		inputSchema: {
			type: 'object',
			properties: {
				topic: {
					type: 'string',
					enum: [
						'build-deploy',
						'environment-vars',
						'troubleshooting',
						'database-migrations',
						'monitoring'
					],
					description: 'The deployment topic'
				}
			},
			required: ['topic']
		}
	},
	{
		name: 'pcn_architecture',
		description: `Get a high-level overview of your PCN platform architecture.

Shows:
- System architecture diagram
- Key components and their relationships
- Data flow (video upload → storage → analytics → display)
- Cloudflare resources (D1, KV, R2, Pages)
- Technology stack (SvelteKit, TypeScript, Tailwind + Canon)

Returns: Comprehensive platform overview with visual diagrams.`,
		inputSchema: {
			type: 'object',
			properties: {}
		}
	}
];

function handleMCPRequest(request: MCPRequest): MCPResponse {
	const { id, method, params } = request;

	try {
		// Handle tools/list
		if (method === 'tools/list') {
			return {
				jsonrpc: '2.0',
				id,
				result: { tools: TOOLS }
			};
		}

		// Handle tools/call
		if (method === 'tools/call') {
			const { name, arguments: args } = params;

			let content: string;

			switch (name) {
				case 'pcn_explore_component':
					content = COMPONENT_DOCS[args.component] || 'Component documentation not found.';
					break;

				case 'pcn_explain_pattern':
					content = PATTERN_DOCS[args.pattern] || 'Pattern documentation not found.';
					break;

				case 'pcn_guide_extension':
					content = EXTENSION_GUIDES[args.extension] || 'Extension guide not found.';
					// Inject user's specific details if provided
					if (args.details) {
						content = content.replace('${details ? ', `**Your Goal**: ${args.details}\n\n`);
					}
					break;

				case 'pcn_deployment':
					content = DEPLOYMENT_DOCS[args.topic] || 'Deployment topic not found.';
					break;

				case 'pcn_architecture':
					content = ARCHITECTURE_DOC;
					break;

				default:
					throw new Error(`Unknown tool: ${name}`);
			}

			return {
				jsonrpc: '2.0',
				id,
				result: {
					content: [
						{
							type: 'text',
							text: content
						}
					]
				}
			};
		}

		// Handle initialize
		if (method === 'initialize') {
			return {
				jsonrpc: '2.0',
				id,
				result: {
					protocolVersion: '2024-11-05',
					serverInfo: {
						name: SERVER_NAME,
						version: SERVER_VERSION,
						// OUTERFIELDS favicon (black rounded square with white circle and dot)
						icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8IS0tIEJhY2tncm91bmQgLS0+CiAgPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzAwMDAwMCIvPgoKICA8IS0tIE91dGVyIHJpbmcgLS0+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIxLjUiLz4KCiAgPCEtLSBJbm5lciBkb3QgLS0+CiAgPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNCIgZmlsbD0iI2ZmZmZmZiIvPgo8L3N2Zz4K'
					},
					capabilities: {
						tools: {}
					}
				}
			};
		}

		// Unknown method
		return {
			jsonrpc: '2.0',
			id,
			error: {
				code: -32601,
				message: `Method not found: ${method}`
			}
		};
	} catch (error) {
		return {
			jsonrpc: '2.0',
			id,
			error: {
				code: -32603,
				message: error instanceof Error ? error.message : String(error)
			}
		};
	}
}

// Cloudflare Workers export
export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// CORS headers for Claude Desktop
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
			'Access-Control-Max-Age': '86400'
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// Health check endpoint
		if (url.pathname === '/' || url.pathname === '/health') {
			return new Response(
				JSON.stringify({
					status: 'healthy',
					server: SERVER_NAME,
					version: SERVER_VERSION,
					tools: TOOLS.length,
					timestamp: new Date().toISOString()
				}),
				{
					headers: {
						...corsHeaders,
						'Content-Type': 'application/json'
					}
				}
			);
		}

		// SSE endpoint - handles both GET (SSE) and POST (JSON-RPC)
		if (url.pathname === '/sse') {
			// GET request - SSE streaming for server-to-client messages
			if (request.method === 'GET') {
				// Return SSE stream (keep-alive)
				const stream = new ReadableStream({
					start(controller) {
						// Send initial comment to establish connection
						controller.enqueue(new TextEncoder().encode(': connected\n\n'));

						// Keep connection alive with periodic pings
						const keepAlive = setInterval(() => {
							controller.enqueue(new TextEncoder().encode(': ping\n\n'));
						}, 15000);

						// Store cleanup function
						(controller as any).cleanup = () => clearInterval(keepAlive);
					},
					cancel(controller) {
						if ((controller as any).cleanup) {
							(controller as any).cleanup();
						}
					}
				});

				return new Response(stream, {
					headers: {
						...corsHeaders,
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive'
					}
				});
			}

			// POST request - JSON-RPC message
			if (request.method === 'POST') {
				try {
					const mcpRequest = (await request.json()) as MCPRequest;
					const mcpResponse = handleMCPRequest(mcpRequest);

					return new Response(JSON.stringify(mcpResponse), {
						headers: {
							...corsHeaders,
							'Content-Type': 'application/json'
						}
					});
				} catch (error) {
					return new Response(
						JSON.stringify({
							jsonrpc: '2.0',
							id: null,
							error: {
								code: -32700,
								message: 'Parse error'
							}
						}),
						{
							status: 400,
							headers: {
								...corsHeaders,
								'Content-Type': 'application/json'
							}
						}
					);
				}
			}
		}

		// 404 for unknown paths
		return new Response('Not Found', {
			status: 404,
			headers: corsHeaders
		});
	}
};
