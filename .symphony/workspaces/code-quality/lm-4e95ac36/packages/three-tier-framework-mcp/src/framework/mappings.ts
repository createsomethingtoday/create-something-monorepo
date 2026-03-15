/**
 * Three-Tier Framework — Mappings
 * 
 * Convergence tables mapping the framework to MCP primitives,
 * Cloudflare services, and the Automotive Framework metaphor.
 */

export interface MCPMapping {
  mcpPrimitive: string;
  controlModel: string;
  frameworkTier: string;
  rationale: string;
}

export interface CloudflareMapping {
  frameworkElement: string;
  cloudflareService: string;
  tier: string;
}

export interface AutomotiveMapping {
  vehiclePart: string;
  technology: string;
  function: string;
  frameworkTier: string;
}

export const MCP_MAPPINGS: MCPMapping[] = [
  {
    mcpPrimitive: 'Resources',
    controlModel: 'Application-controlled',
    frameworkTier: 'Database',
    rationale: 'Data decisions are infrastructure concerns — what exists and when to surface it.'
  },
  {
    mcpPrimitive: 'Tools',
    controlModel: 'Model-controlled',
    frameworkTier: 'Automation',
    rationale: 'Action decisions are agent reasoning — what happens and when to execute.'
  },
  {
    mcpPrimitive: 'Prompts',
    controlModel: 'User-controlled',
    frameworkTier: 'Judgment',
    rationale: 'Policy and guidance decisions are human oversight — what should happen and why.'
  }
];

export const CLOUDFLARE_MAPPINGS: CloudflareMapping[] = [
  { frameworkElement: 'Database Layer', cloudflareService: 'D1, KV, R2, Durable Objects', tier: 'database' },
  { frameworkElement: 'Automation Layer', cloudflareService: 'Workers, Workflows, Queues', tier: 'automation' },
  { frameworkElement: 'Judgment Layer', cloudflareService: 'Workers AI, External LLM APIs', tier: 'judgment' },
  { frameworkElement: 'Touchpoints', cloudflareService: 'Worker endpoints, MCP servers', tier: 'crosscutting' },
  { frameworkElement: 'Orchestration', cloudflareService: 'Workers (procedural), Workflows', tier: 'crosscutting' },
  { frameworkElement: 'Insight', cloudflareService: 'Logpush, Analytics, custom tracing', tier: 'crosscutting' },
  { frameworkElement: 'Artifacts', cloudflareService: 'JSON schemas, structured outputs', tier: 'crosscutting' }
];

export const AUTOMOTIVE_MAPPINGS: AutomotiveMapping[] = [
  { vehiclePart: 'Chassis', technology: 'MCP Servers', function: 'The frame that connects everything', frameworkTier: 'Touchpoints (cross-cutting)' },
  { vehiclePart: 'Engine', technology: 'Workers', function: 'Where execution happens', frameworkTier: 'Automation' },
  { vehiclePart: 'Transmission', technology: 'Durable Objects', function: 'State coordination', frameworkTier: 'Orchestration (cross-cutting)' },
  { vehiclePart: 'Fuel Tank', technology: 'D1', function: 'Data persistence', frameworkTier: 'Database' },
  { vehiclePart: 'Turbocharger', technology: 'Workers AI / LLMs', function: 'Intelligence boost', frameworkTier: 'Judgment' },
  { vehiclePart: 'Cockpit', technology: 'Glass UI', function: 'Where the driver controls the machine', frameworkTier: 'Judgment (user-controlled)' },
  { vehiclePart: 'Instrument Cluster', technology: 'Analytics/Logs', function: 'At-a-glance telemetry', frameworkTier: 'Insight (cross-cutting)' },
  { vehiclePart: 'Ignition', technology: 'Triggers', function: 'What starts the engine', frameworkTier: 'Orchestration (cross-cutting)' }
];

export const SAMPLING_EXPLANATION = {
  title: 'The Recursive Property: Sampling as Feedback Loop',
  summary: 'MCP sampling allows Automation to request Judgment, creating a feedback loop. The tool encounters the world and asks for judgment — mirroring embodied cognition.',
  flow: [
    { step: 1, actor: 'User', action: 'Selects prompts and constraints', tier: 'Judgment' },
    { step: 2, actor: 'Agent', action: 'Reasons and decides to call a tool', tier: 'Automation' },
    { step: 3, actor: 'Tool', action: 'Executes, encounters world data', tier: 'Database' },
    { step: 4, actor: 'Tool', action: 'Needs judgment — sends sampling request', tier: 'Sampling' },
    { step: 5, actor: 'Client', action: 'Proxies request to LLM — judgment returned', tier: 'Judgment' },
    { step: 6, actor: 'Tool', action: 'Completes and returns to agent', tier: 'Automation' }
  ],
  implications: [
    'Context window management: specialized tools carry their own context, keeping the main agent lean.',
    'Cost distribution: the main client bears LLM costs but tools contribute specialized context.',
    'Trust boundaries: the client controls what sampling requests it honors.'
  ]
};

export const POLICY_AS_ARTIFACT = {
  title: 'Policy as Artifact',
  summary: 'Policy is not external to the system — it is an artifact that flows through the tiers. System prompts, constraints, and behavioral rules are stored in Database, transformed by Automation, evaluated by Judgment.',
  tierOperations: [
    { tier: 'Database', operation: 'Stores policy versions (prompts, constraints, ethos as versioned data)' },
    { tier: 'Automation', operation: 'Transforms/requests policy (tool asks "give me the strict constraints" via sampling)' },
    { tier: 'Judgment', operation: 'Evaluates which policy to apply (selects constraints appropriate to context)' }
  ],
  enables: [
    'Policy versioning: multiple constraint sets coexist as stored artifacts.',
    'Context-driven selection: tools encountering sensitive data can request appropriate policy.',
    'Graduated trust: different operations invoke different constraint levels.',
    'Self-modification through the loop: system can observe and modify its own policy under human oversight.'
  ],
  risks: [
    'User-controlled ceiling: Judgment layer remains user-controlled. Humans define what is requestable.',
    'Policy immutability tiers: some constraints are mutable (formatting), some immutable (safety).',
    'Insight as governance: every policy modification is logged. The perceptual loop becomes the audit trail.'
  ]
};
