#!/usr/bin/env node
/**
 * Subtractive Triad Audit - MCP Server
 *
 * Exposes triad-audit as an MCP server for Claude Code and other clients.
 *
 * Tools:
 * - audit: Run full Subtractive Triad audit
 * - audit_dry: Run DRY (Implementation) analysis only
 * - audit_rams: Run Rams (Artifact) analysis only
 * - audit_heidegger: Run Heidegger (System) analysis only
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	type Tool
} from '@modelcontextprotocol/sdk/types.js';

import { runAudit } from './audit.js';
import { collectDRYMetrics, collectRamsMetrics, collectHeideggerMetrics } from './collectors/index.js';
import { formatAsMarkdown } from './reporters/index.js';
import path from 'path';

const TOOLS: Tool[] = [
	{
		name: 'audit',
		description: `Run a full Subtractive Triad audit on a codebase.

The Subtractive Triad operates at three levels:
- DRY (Implementation): "Have I built this before?" → Unify
- Rams (Artifact): "Does this earn its existence?" → Remove
- Heidegger (System): "Does this serve the whole?" → Reconnect

Returns scores (0-10) for each level, violations, and commendations.`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				path: {
					type: 'string',
					description: 'Path to the directory to audit (defaults to current working directory)'
				},
				format: {
					type: 'string',
					enum: ['json', 'markdown'],
					description: 'Output format (defaults to markdown for readability)'
				}
			}
		}
	},
	{
		name: 'audit_dry',
		description: `Run DRY (Implementation) analysis only.

Detects:
- Duplicate code blocks (copy-paste code)
- Similar files (near-duplicates indicating missing abstractions)
- Duplicate constants

Question: "Have I built this before?"
Action: Unify`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				path: {
					type: 'string',
					description: 'Path to the directory to audit'
				}
			}
		}
	},
	{
		name: 'audit_rams',
		description: `Run Rams (Artifact) analysis only.

Detects:
- Dead exports (exports never imported)
- Unused dependencies (npm packages not used)
- Large files (>500 lines, may need splitting)
- Empty files

Question: "Does this earn its existence?"
Action: Remove`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				path: {
					type: 'string',
					description: 'Path to the directory to audit'
				}
			}
		}
	},
	{
		name: 'audit_heidegger',
		description: `Run Heidegger (System) analysis only.

Detects:
- Orphaned files (not connected to import graph)
- Circular dependencies (import cycles)
- Package completeness (missing package.json fields, README, etc.)

Question: "Does this serve the whole?"
Action: Reconnect`,
		inputSchema: {
			type: 'object' as const,
			properties: {
				path: {
					type: 'string',
					description: 'Path to the directory to audit'
				}
			}
		}
	}
];

const DEFAULT_IGNORE = [
	'**/node_modules/**',
	'**/dist/**',
	'**/build/**',
	'**/.git/**',
	'**/*.min.js',
	'**/*.map',
	'**/.svelte-kit/**',
	'**/coverage/**'
];

class TriadAuditServer {
	private server: Server;

	constructor() {
		this.server = new Server(
			{
				name: 'triad-audit',
				version: '0.1.0'
			},
			{
				capabilities: {
					tools: {}
				}
			}
		);

		this.setupHandlers();
	}

	private setupHandlers() {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
			tools: TOOLS
		}));

		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;

			try {
				switch (name) {
					case 'audit':
						return await this.handleFullAudit(args);
					case 'audit_dry':
						return await this.handleDRYAudit(args);
					case 'audit_rams':
						return await this.handleRamsAudit(args);
					case 'audit_heidegger':
						return await this.handleHeideggerAudit(args);
					default:
						throw new Error(`Unknown tool: ${name}`);
				}
			} catch (error) {
				return {
					content: [
						{
							type: 'text' as const,
							text: `Error: ${error instanceof Error ? error.message : String(error)}`
						}
					],
					isError: true
				};
			}
		});
	}

	private async handleFullAudit(args: Record<string, unknown> | undefined) {
		const auditPath = (args?.path as string) || process.cwd();
		const format = (args?.format as string) || 'markdown';

		const result = await runAudit({ path: auditPath });

		const output =
			format === 'markdown' ? formatAsMarkdown(result) : JSON.stringify(result, null, 2);

		return {
			content: [
				{
					type: 'text' as const,
					text: output
				}
			]
		};
	}

	private async handleDRYAudit(args: Record<string, unknown> | undefined) {
		const auditPath = path.resolve((args?.path as string) || process.cwd());

		const metrics = await collectDRYMetrics(auditPath, DEFAULT_IGNORE);

		const output = `# DRY Analysis (Implementation Level)

**Score: ${metrics.score}/10**

## Question: "Have I built this before?"
## Action: Unify

### Duplicate Blocks: ${metrics.duplicateBlocks.length}
${metrics.duplicateBlocks.map((d) => `- ${d.files.join(', ')} (${d.lines} lines)`).join('\n') || 'None detected'}

### Similar Files: ${metrics.similarFiles.length}
${metrics.similarFiles.map((s) => `- ${s.fileA} ↔ ${s.fileB} (${Math.round(s.similarity * 100)}%)`).join('\n') || 'None detected'}

### Violations: ${metrics.violations.length}
${metrics.violations.map((v) => `- [${v.severity}] ${v.message}`).join('\n') || 'None'}
`;

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	private async handleRamsAudit(args: Record<string, unknown> | undefined) {
		const auditPath = path.resolve((args?.path as string) || process.cwd());

		const metrics = await collectRamsMetrics(auditPath, DEFAULT_IGNORE);

		const output = `# Rams Analysis (Artifact Level)

**Score: ${metrics.score}/10**

## Question: "Does this earn its existence?"
## Action: Remove

### Dead Exports: ${metrics.deadExports.length}
${metrics.deadExports.map((d) => `- ${d.file}: ${d.export}`).join('\n') || 'None detected'}

### Unused Dependencies: ${metrics.unusedDependencies.length}
${metrics.unusedDependencies.map((d) => `- ${d.name} (${d.type})`).join('\n') || 'None detected'}

### Large Files (>500 lines): ${metrics.largeFiles.length}
${metrics.largeFiles.map((f) => `- ${f.file} (${f.lines} lines)`).join('\n') || 'None detected'}

### Empty Files: ${metrics.emptyFiles.length}
${metrics.emptyFiles.join('\n') || 'None detected'}

### Violations: ${metrics.violations.length}
${metrics.violations.map((v) => `- [${v.severity}] ${v.message}`).join('\n') || 'None'}
`;

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	private async handleHeideggerAudit(args: Record<string, unknown> | undefined) {
		const auditPath = path.resolve((args?.path as string) || process.cwd());

		const metrics = await collectHeideggerMetrics(auditPath, DEFAULT_IGNORE);

		const output = `# Heidegger Analysis (System Level)

**Score: ${metrics.score}/10**

## Question: "Does this serve the whole?"
## Action: Reconnect

### Circular Dependencies: ${metrics.circularDependencies.length}
${metrics.circularDependencies.map((c) => `- ${c.cycle.join(' → ')}`).join('\n') || 'None detected'}

### Orphaned Files: ${metrics.orphanedFiles.length}
${metrics.orphanedFiles.map((o) => `- ${o.file}: ${o.reason}`).join('\n') || 'None detected'}

### Package Completeness:
${metrics.packageCompleteness.map((p) => `- ${p.package}: ${Math.round(p.completeness * 100)}%`).join('\n') || 'No packages found'}

### Violations: ${metrics.violations.length}
${metrics.violations.map((v) => `- [${v.severity}] ${v.message}`).join('\n') || 'None'}
`;

		return {
			content: [{ type: 'text' as const, text: output }]
		};
	}

	async run() {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		console.error('Subtractive Triad Audit MCP server running');
	}
}

const server = new TriadAuditServer();
server.run().catch(console.error);
