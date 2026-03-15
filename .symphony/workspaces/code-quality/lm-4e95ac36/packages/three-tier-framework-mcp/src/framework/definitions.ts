/**
 * Three-Tier Framework — Definitions
 * 
 * Structured data for the three tiers and four cross-cutting concerns.
 * Database tier: what exists. Automation tier: what happens. Judgment tier: what should happen.
 */

export interface TierDefinition {
  name: string;
  tier: 'database' | 'automation' | 'judgment';
  definition: string;
  controlModel: string;
  mcpPrimitive: string;
  description: string;
  examples: string[];
  failureMode: string;
  debugQuestion: string;
}

export interface CrossCuttingConcern {
  name: string;
  definition: string;
  description: string;
  role: string;
}

export const TIERS: Record<string, TierDefinition> = {
  database: {
    name: 'Database',
    tier: 'database',
    definition: 'What exists.',
    controlModel: 'Application-controlled',
    mcpPrimitive: 'Resources',
    description: 'The substrate of state, content, and record. This layer contains everything that can be touched, queried, or persisted: databases, applications, payment systems, websites, files, API endpoints exposing data.',
    examples: ['D1 databases', 'KV stores', 'R2 storage', 'Durable Objects', 'API data endpoints', 'Files', 'Procore project data'],
    failureMode: 'Missing data, stale state, unavailable resources — agent cannot act because substrate is broken.',
    debugQuestion: 'Is the data available and correct?'
  },
  automation: {
    name: 'Automation',
    tier: 'automation',
    definition: 'What happens.',
    controlModel: 'Model-controlled',
    mcpPrimitive: 'Tools',
    description: 'The agentic layer where LLM-driven functions execute. This includes tools, skills, and the harness that constrains agent behavior. The LLM decides when to invoke tools during its reasoning process.',
    examples: ['MCP server tools', 'Cloudflare Workers', 'Agent skills', 'Browser automation', 'Data transformation functions'],
    failureMode: 'Tool errors, skill bugs, agent mistakes — agent has right constraints but execution fails.',
    debugQuestion: 'Did execution complete successfully?'
  },
  judgment: {
    name: 'Judgment',
    tier: 'judgment',
    definition: 'What should happen.',
    controlModel: 'User-controlled',
    mcpPrimitive: 'Prompts',
    description: 'The policy layer where constraints, weights, and human oversight determine quality and priority. This is where decisions get made about correctness, relevance, and appropriate action.',
    examples: ['System prompts', 'CLAUDE.md policy', 'Skill constraints', 'Human approval gates', 'Trust boundaries', 'Prompt templates'],
    failureMode: 'Wrong prompt selected, poor constraints, misaligned ethos — agent acts correctly but produces wrong outcomes.',
    debugQuestion: 'Was the right policy applied?'
  }
};

export const CROSS_CUTTING_CONCERNS: CrossCuttingConcern[] = [
  {
    name: 'Touchpoints',
    definition: 'Where interaction happens.',
    description: 'The MCP server surface that spans all tiers. Every URI, webhook endpoint, embedded interface, and API surface is a touchpoint.',
    role: 'The membrane through which external systems (and humans) interact with the framework. Not a layer but a cross-cutting concern.'
  },
  {
    name: 'Artifacts',
    definition: 'What flows between layers.',
    description: 'Typed payloads that move through the system: RFI objects, submittal payloads, log summaries, decision records.',
    role: 'Boundary contracts between tiers — they can be versioned, validated at transitions, and observed in flight.'
  },
  {
    name: 'Orchestration',
    definition: 'How execution flows.',
    description: 'The procedural coordination that connects tiers and sequences operations. Includes workflows, triggers, cron jobs, webhook handlers.',
    role: 'Application-controlled (like Database) but distinct in function: Database stores, Orchestration sequences. Distinguishes procedural automation (deterministic) from agentic automation (probabilistic).'
  },
  {
    name: 'Insight',
    definition: 'How the system perceives itself.',
    description: 'The perceptual membrane that makes execution legible: observability, human-in-the-loop approval, audit trails, confidence scores, reasoning traces.',
    role: 'The reflexive loop that enables the system to observe its own operation and surface understanding to humans. Without Insight, policy modification is blind mutation.'
  }
];
