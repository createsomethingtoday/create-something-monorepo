// UI Viewer exports
export { connection, isConnected, connectionStatus } from './stores/connection';
export { operations, componentTree, currentTree, selectedNode, recentChanges, operationHistory } from './stores/operations';
export type { NodeData, Operation, PropChange, FileChange } from './stores/operations';

export { pulse, shrink, slidePanel, highlight } from './transitions/pulse';

// Embed utilities for LMS integration
export { 
	createEmbedController, 
	getEmbedUrl,
	type EmbedController,
	type EmbedControllerOptions,
	type SimulateOptions,
	type SequenceOptions,
} from './embed';

// Client-side diff (for learning mode - no server needed)
export {
	parseHtml,
	computeDiff,
	simulateClientSide,
} from './client-diff';
