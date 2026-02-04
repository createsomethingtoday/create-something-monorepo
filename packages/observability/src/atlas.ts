/**
 * AI Interaction Atlas Vocabulary
 * 
 * Shared taxonomy for AI interaction design from quietloudlab.
 * https://github.com/quietloudlab/ai-interaction-atlas
 * 
 * Six core dimensions for consistent observability annotations.
 */

// =============================================================================
// AI Tasks - What capabilities AI provides
// =============================================================================

export type AITaskType =
  | 'generate'      // Create new content (text, code, images)
  | 'classify'      // Categorize inputs
  | 'verify'        // Check correctness/validity
  | 'transform'     // Convert between formats
  | 'summarize'     // Condense information
  | 'extract'       // Pull specific data from content
  | 'compare'       // Analyze differences
  | 'recommend'     // Suggest options
  | 'predict'       // Forecast outcomes
  | 'explain'       // Provide reasoning
  | 'translate'     // Language conversion
  | 'rewrite'       // Improve/modify content
  | 'analyze'       // Deep examination
  | 'route'         // Direct to appropriate handler
  | 'orchestrate';  // Coordinate multiple tasks

// =============================================================================
// Human Tasks - What people do in the loop
// =============================================================================

export type HumanTaskType =
  | 'review'        // Examine AI output
  | 'approve'       // Authorize action
  | 'edit'          // Modify AI output
  | 'compare'       // Evaluate alternatives
  | 'provide_input' // Supply initial data
  | 'escalate'      // Route to specialist
  | 'override'      // Reject AI decision
  | 'annotate'      // Add context/feedback
  | 'verify'        // Confirm correctness
  | 'select';       // Choose from options

export type HumanOversightLevel =
  | 'required'      // Human must approve before action
  | 'recommended'   // Human review suggested
  | 'optional'      // Human can intervene
  | 'none';         // Fully automated

// =============================================================================
// System Tasks - What infrastructure handles
// =============================================================================

export type SystemTaskType =
  | 'routing'           // Direct to appropriate handler
  | 'logging'           // Record events
  | 'state_management'  // Track session state
  | 'caching'           // Store for reuse
  | 'rate_limiting'     // Control throughput
  | 'authentication'    // Verify identity
  | 'authorization'     // Check permissions
  | 'transformation'    // Format conversion
  | 'validation'        // Input checking
  | 'notification'      // Alert delivery
  | 'scheduling'        // Time-based execution
  | 'retry'             // Failure recovery
  | 'aggregation';      // Combine data

// =============================================================================
// Data Artifacts - What information flows between tasks
// =============================================================================

export type DataArtifactCategory =
  | 'prompt'            // Input to AI
  | 'completion'        // Output from AI
  | 'context'           // Supporting information
  | 'feedback'          // Human corrections
  | 'configuration'     // System settings
  | 'state'             // Session data
  | 'reference'         // External data
  | 'result';           // Final output

// =============================================================================
// Constraints - What boundaries shape the design
// =============================================================================

export type ConstraintType =
  | 'latency'       // Response time limits
  | 'cost'          // Budget limits
  | 'accuracy'      // Quality thresholds
  | 'privacy'       // Data protection
  | 'compliance'    // Regulatory requirements
  | 'availability'  // Uptime requirements
  | 'throughput'    // Volume limits
  | 'context'       // Token/memory limits
  | 'permission';   // Access control

// =============================================================================
// Touchpoints - Where interactions happen
// =============================================================================

export type TouchpointType =
  | 'mcp_server'    // Model Context Protocol server
  | 'api'           // REST/GraphQL endpoint
  | 'cli'           // Command-line interface
  | 'ui'            // User interface
  | 'notification'  // Push/email/SMS
  | 'webhook'       // Event callback
  | 'queue'         // Async message
  | 'worker';       // Background process

// =============================================================================
// Combined Atlas Metadata
// =============================================================================

export interface AtlasMetadata {
  // Touchpoint identification
  'touchpoint.type'?: TouchpointType;
  'touchpoint.mcp_server'?: string;
  'touchpoint.api_endpoint'?: string;

  // AI task classification
  'ai_task.type'?: AITaskType;
  'ai_task.model'?: string;
  'ai_task.skill'?: string;

  // Human oversight
  'human_task.type'?: HumanTaskType;
  'human_task.oversight_level'?: HumanOversightLevel;

  // System operation
  'system_task.type'?: SystemTaskType;
  'system_task.worker'?: string;

  // Data artifact
  'data_artifact.category'?: DataArtifactCategory;
  'data_artifact.schema'?: string;

  // Constraints
  'constraint.type'?: ConstraintType;
  'constraint.budget_usd'?: number;
  'constraint.latency_ms'?: number;

  // Allow additional custom metadata
  [key: string]: string | number | boolean | undefined;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create Atlas metadata for an MCP tool call
 */
export function mcpToolMetadata(
  serverName: string,
  toolName: string,
  aiTaskType: AITaskType = 'orchestrate'
): AtlasMetadata {
  return {
    'touchpoint.type': 'mcp_server',
    'touchpoint.mcp_server': serverName,
    'ai_task.type': aiTaskType,
    'ai_task.skill': toolName,
    'system_task.type': 'routing'
  };
}

/**
 * Create Atlas metadata for an LLM generation
 */
export function llmGenerationMetadata(
  model: string,
  taskType: AITaskType,
  oversightLevel: HumanOversightLevel = 'optional'
): AtlasMetadata {
  return {
    'touchpoint.type': 'api',
    'ai_task.type': taskType,
    'ai_task.model': model,
    'human_task.oversight_level': oversightLevel
  };
}

/**
 * Create Atlas metadata for a worker task
 */
export function workerTaskMetadata(
  workerName: string,
  systemTaskType: SystemTaskType
): AtlasMetadata {
  return {
    'touchpoint.type': 'worker',
    'touchpoint.mcp_server': workerName,
    'system_task.type': systemTaskType,
    'system_task.worker': workerName
  };
}
