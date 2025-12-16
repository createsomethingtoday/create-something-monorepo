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
export { ethosTool, handleEthos } from './ethos.js';
export { analyzeTool, handleAnalyze } from './analyze.js';
export { recommendTool, handleRecommend } from './recommend.js';
export { coachTool, handleCoach } from './coach.js';
export { digestTool, handleDigest } from './digest.js';

// Tool registry for MCP server
export const tools = {
	learn_authenticate: { tool: 'authenticateTool', handler: 'handleAuthenticate' },
	learn_status: { tool: 'statusTool', handler: 'handleStatus' },
	learn_lesson: { tool: 'lessonTool', handler: 'handleLesson' },
	learn_complete: { tool: 'completeTool', handler: 'handleComplete' },
	learn_praxis: { tool: 'praxisTool', handler: 'handlePraxis' },
	learn_ethos: { tool: 'ethosTool', handler: 'handleEthos' },
	learn_analyze_reflection: { tool: 'analyzeTool', handler: 'handleAnalyze' },
	learn_recommend: { tool: 'recommendTool', handler: 'handleRecommend' },
	learn_coach: { tool: 'coachTool', handler: 'handleCoach' },
	learn_digest: { tool: 'digestTool', handler: 'handleDigest' }
} as const;
