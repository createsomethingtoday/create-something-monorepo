/**
 * MCP Tools Index
 *
 * Exports all learning tools for the MCP server.
 */

export { authenticateTool, handleAuthenticate } from './authenticate.js';
export { statusTool, handleStatus } from './status.js';
export { lessonTool, handleLesson } from './lesson.js';
export { completeTool, handleComplete } from './complete.js';
export { praxisTool, handlePraxis } from './praxis.js';

// Tool registry for MCP server
export const tools = {
	learn_authenticate: { tool: 'authenticateTool', handler: 'handleAuthenticate' },
	learn_status: { tool: 'statusTool', handler: 'handleStatus' },
	learn_lesson: { tool: 'lessonTool', handler: 'handleLesson' },
	learn_complete: { tool: 'completeTool', handler: 'handleComplete' },
	learn_praxis: { tool: 'praxisTool', handler: 'handlePraxis' }
} as const;
