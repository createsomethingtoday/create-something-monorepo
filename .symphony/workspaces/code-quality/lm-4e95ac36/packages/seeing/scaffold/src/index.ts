#!/usr/bin/env node
/**
 * Task Tracker MCP Server — Simple Loom
 *
 * This is your capstone project. You're building automation infrastructure:
 * the layer between human intention ("manage my tasks") and system execution.
 *
 * Complete the TODOs below. Each one applies the Subtractive Triad:
 *
 * TODO 1: Define your tools (DRY — reuse patterns from the scaffold)
 * TODO 2: Handle tool calls (Rams — does each handler earn its existence?)
 * TODO 3: Format returns (Heidegger — does this serve Claude Code's workflow?)
 *
 * When you're done, run: /capstone check
 * Gemini will test your server and help you fix any issues.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// The storage layer is provided. You just need to use it.
import {
	addTask,
	getTasks,
	updateTaskStatus,
	removeTask,
	type Task,
} from './tasks.js';

// ============================================================================
// TODO 1: Define your tools
// ============================================================================
//
// Each tool needs:
// - name: what Claude Code calls it (e.g., 'task_add')
// - description: what it does (Claude reads this to decide when to use it)
// - inputSchema: what parameters it accepts
//
// Apply DRY: Look at how existing MCP servers define tools.
// Apply Rams: Does each tool earn its existence? Four tools is enough.
//
// Your tools:
// - task_add: Add a new task
// - task_list: List tasks (optionally filter by status)
// - task_complete: Mark a task as done
// - task_remove: Delete a task
//
// Replace this empty array with your tool definitions:

const TOOLS = [
	// Example format (delete this comment when you add your tools):
	//
	// {
	//   name: 'task_add',
	//   description: 'Add a new task to the list',
	//   inputSchema: {
	//     type: 'object',
	//     properties: {
	//       title: {
	//         type: 'string',
	//         description: 'The task title',
	//       },
	//     },
	//     required: ['title'],
	//   },
	// },
	//
	// Add your four tools here...
];

// ============================================================================
// Server Setup (provided — don't modify)
// ============================================================================

const server = new Server(
	{
		name: 'task-tracker',
		version: '0.1.0',
	},
	{
		capabilities: {
			tools: {},
		},
	}
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: TOOLS,
}));

// ============================================================================
// TODO 2: Handle tool calls
// ============================================================================
//
// When Claude Code calls a tool, this handler runs.
// You need to:
// 1. Check which tool was called (name)
// 2. Extract the arguments (args)
// 3. Call the appropriate function from tasks.ts
// 4. Return a formatted result
//
// Apply Rams: Each case should do one thing well.
// Apply Heidegger: Return formats that help Claude Code understand what happened.

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	switch (name) {
		// ----------------------------------------------------------------
		// task_add: Add a new task
		// ----------------------------------------------------------------
		case 'task_add': {
			// TODO: Extract title from args, call addTask(), return the task
			//
			// Expected return format:
			// { task: { id: '...', title: '...', status: 'todo', created: ... } }
			//
			// Your code here:
			throw new Error('TODO: Implement task_add');
		}

		// ----------------------------------------------------------------
		// task_list: List tasks
		// ----------------------------------------------------------------
		case 'task_list': {
			// TODO: Extract optional status filter from args, call getTasks()
			//
			// Expected return format:
			// { tasks: [...] }
			//
			// Your code here:
			throw new Error('TODO: Implement task_list');
		}

		// ----------------------------------------------------------------
		// task_complete: Mark a task as done
		// ----------------------------------------------------------------
		case 'task_complete': {
			// TODO: Extract id from args, call updateTaskStatus(id, 'done')
			//
			// Expected return format (success):
			// { task: { ... status: 'done' } }
			//
			// Expected return format (not found):
			// { error: 'Task not found' }
			//
			// Your code here:
			throw new Error('TODO: Implement task_complete');
		}

		// ----------------------------------------------------------------
		// task_remove: Delete a task
		// ----------------------------------------------------------------
		case 'task_remove': {
			// TODO: Extract id from args, call removeTask()
			//
			// Expected return format (success):
			// { removed: true }
			//
			// Expected return format (not found):
			// { removed: false, error: 'Task not found' }
			//
			// Your code here:
			throw new Error('TODO: Implement task_remove');
		}

		default:
			throw new Error(`Unknown tool: ${name}`);
	}
});

// ============================================================================
// TODO 3: Format your returns (already structured above)
// ============================================================================
//
// Look at the "Expected return format" comments above.
// These formats help Claude Code understand what happened:
//
// - Wrap single items: { task: ... } not just the task
// - Wrap lists: { tasks: [...] } not just the array
// - Include errors: { error: '...' } when something fails
//
// Apply Heidegger: Does your format serve the whole workflow?
// Claude Code needs to know: What happened? What's the data? Did it work?

// ============================================================================
// Start the server (provided — don't modify)
// ============================================================================

async function main(): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((error) => {
	console.error('Server error:', error);
	process.exit(1);
});
