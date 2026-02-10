/**
 * Three-Tier Framework — Content absorbed from three-tier-framework-mcp.
 * Zero external dependencies. Pure framework knowledge embedded in source.
 */

// ============================================================================
// Tier Definitions
// ============================================================================

export const TIERS = {
  database: {
    name: 'Database',
    tier: 'database' as const,
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
    tier: 'automation' as const,
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
    tier: 'judgment' as const,
    definition: 'What should happen.',
    controlModel: 'User-controlled',
    mcpPrimitive: 'Prompts',
    description: 'The policy layer where constraints, weights, and human oversight determine quality and priority. This is where decisions get made about correctness, relevance, and appropriate action.',
    examples: ['System prompts', 'CLAUDE.md policy', 'Skill constraints', 'Human approval gates', 'Trust boundaries', 'Prompt templates'],
    failureMode: 'Wrong prompt selected, poor constraints, misaligned ethos — agent acts correctly but produces wrong outcomes.',
    debugQuestion: 'Was the right policy applied?'
  }
};

// ============================================================================
// Cross-Cutting Concerns
// ============================================================================

export const CROSS_CUTTING_CONCERNS = [
  {
    name: 'Touchpoints',
    definition: 'Where interaction happens.',
    description: 'The MCP server surface that spans all tiers. Every URI, webhook endpoint, embedded interface, and API surface is a touchpoint.',
    role: 'The membrane through which external systems (and humans) interact with the framework.'
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
    role: 'Application-controlled (like Database) but distinct in function: Database stores, Orchestration sequences.'
  },
  {
    name: 'Insight',
    definition: 'How the system perceives itself.',
    description: 'The perceptual membrane that makes execution legible: observability, human-in-the-loop approval, audit trails, confidence scores, reasoning traces.',
    role: 'The reflexive loop that enables the system to observe its own operation and surface understanding to humans.'
  }
];

// ============================================================================
// Mappings
// ============================================================================

export const MCP_MAPPINGS = [
  { mcpPrimitive: 'Resources', controlModel: 'Application-controlled', frameworkTier: 'Database', rationale: 'Data decisions are infrastructure concerns — what exists and when to surface it.' },
  { mcpPrimitive: 'Tools', controlModel: 'Model-controlled', frameworkTier: 'Automation', rationale: 'Action decisions are agent reasoning — what happens and when to execute.' },
  { mcpPrimitive: 'Prompts', controlModel: 'User-controlled', frameworkTier: 'Judgment', rationale: 'Policy and guidance decisions are human oversight — what should happen and why.' }
];

export const CLOUDFLARE_MAPPINGS = [
  { frameworkElement: 'Database Layer', cloudflareService: 'D1, KV, R2, Durable Objects', tier: 'database' },
  { frameworkElement: 'Automation Layer', cloudflareService: 'Workers, Workflows, Queues', tier: 'automation' },
  { frameworkElement: 'Judgment Layer', cloudflareService: 'Workers AI, External LLM APIs', tier: 'judgment' },
  { frameworkElement: 'Touchpoints', cloudflareService: 'Worker endpoints, MCP servers', tier: 'crosscutting' },
  { frameworkElement: 'Orchestration', cloudflareService: 'Workers (procedural), Workflows', tier: 'crosscutting' },
  { frameworkElement: 'Insight', cloudflareService: 'Logpush, Analytics, custom tracing', tier: 'crosscutting' },
  { frameworkElement: 'Artifacts', cloudflareService: 'JSON schemas, structured outputs', tier: 'crosscutting' }
];

export const AUTOMOTIVE_MAPPINGS = [
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
  summary: 'Policy is not external to the system — it is an artifact that flows through the tiers.',
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

// ============================================================================
// Heuristic Functions (absorbed from three-tier-framework-mcp)
// ============================================================================

const TIER_SIGNALS: Record<string, { keywords: string[]; patterns: RegExp[] }> = {
  database: {
    keywords: ['store', 'persist', 'data', 'state', 'record', 'query', 'database', 'cache', 'file', 'storage', 'bucket', 'table', 'schema', 'kv', 'd1', 'r2', 'content', 'asset', 'index'],
    patterns: [/stor(e|es|ing|age)/i, /persist/i, /databas/i, /cach(e|ing)/i, /queri(es|ing)/i]
  },
  automation: {
    keywords: ['execute', 'process', 'transform', 'tool', 'action', 'worker', 'function', 'handler', 'middleware', 'pipeline', 'workflow', 'queue', 'job', 'task', 'webhook', 'trigger', 'skill', 'agent', 'sync', 'deploy', 'build'],
    patterns: [/execut/i, /process(es|ing)?/i, /transform/i, /handl(e|er|ing)/i, /workflow/i, /automat/i]
  },
  judgment: {
    keywords: ['policy', 'constraint', 'oversight', 'approval', 'prompt', 'template', 'review', 'evaluate', 'judge', 'decide', 'criteria', 'rule', 'permission', 'boundary', 'trust', 'safety', 'guideline', 'standard', 'compliance', 'audit', 'quality', 'gate', 'llm', 'reasoning'],
    patterns: [/polic(y|ies)/i, /constrain/i, /oversight/i, /approv(e|al)/i, /evaluat/i, /permission/i, /boundar/i]
  }
};

export function classifyComponent(description: string, context?: string) {
  const text = `${description} ${context || ''}`.toLowerCase();
  const scores: { tier: string; confidence: number; signals: string[] }[] = [];

  for (const [tier, { keywords, patterns }] of Object.entries(TIER_SIGNALS)) {
    const matchedKeywords = keywords.filter(kw => text.includes(kw));
    const matchedPatterns = patterns.filter(p => p.test(text));
    const uniqueSignals = [...new Set([...matchedKeywords])];
    const specificKeywords = matchedKeywords.filter(kw => kw.length > 4);
    const rawScore = specificKeywords.length * 2 + (matchedKeywords.length - specificKeywords.length) + matchedPatterns.length * 2;
    const maxPossible = keywords.length + patterns.length * 2;
    const confidence = Math.min(Math.round((rawScore / Math.max(maxPossible * 0.12, 1)) * 100) / 100, 1);
    if (uniqueSignals.length > 0) {
      scores.push({ tier, confidence, signals: uniqueSignals.slice(0, 6) });
    }
  }

  scores.sort((a, b) => b.confidence - a.confidence);

  if (scores.length === 0) {
    return { primary: 'unknown', tiers: scores, rationale: 'No tier signals detected.', spansTiers: false, boundaryNote: null };
  }

  const primary = scores[0].tier;
  const tierDef = TIERS[primary as keyof typeof TIERS];
  const significantTiers = scores.filter(s => s.confidence > 0.15);
  const spansTiers = significantTiers.length > 1;

  let boundaryNote: string | null = null;
  if (spansTiers) {
    const boundaries = [];
    if (significantTiers.some(s => s.tier === 'database') && significantTiers.some(s => s.tier === 'automation')) {
      boundaries.push('Database-Automation boundary: stores/retrieves AND processes/transforms. Consider separating.');
    }
    if (significantTiers.some(s => s.tier === 'automation') && significantTiers.some(s => s.tier === 'judgment')) {
      boundaries.push('Automation-Judgment boundary: executes AND makes policy decisions. Consider extracting judgment.');
    }
    boundaryNote = boundaries.join(' ');
  }

  const rationale = spansTiers
    ? `Primary: ${tierDef.name} (${tierDef.definition}). Also spans ${significantTiers.slice(1).map(s => TIERS[s.tier as keyof typeof TIERS].name).join(', ')}.`
    : `Classified as ${tierDef.name} (${tierDef.definition}). Signals: ${scores[0].signals.join(', ')}.`;

  return { primary, tiers: scores, rationale, spansTiers, boundaryNote };
}

export function debugSystem(failure: string, context?: string) {
  return {
    failure,
    steps: [
      { tier: 'Database', order: 1, question: TIERS.database.debugQuestion, checks: [
        'Are all required data sources accessible?',
        'Is the data fresh? Check cache TTLs.',
        'Are database connections healthy?',
        'Is the schema correct? Look for migration issues.',
        context ? `For "${failure}": What data does this need? Is it present?` : 'What data does this operation need?'
      ]},
      { tier: 'Automation', order: 2, question: TIERS.automation.debugQuestion, checks: [
        'Did the tool/worker/function execute without error?',
        'Are there timeout issues?',
        'Is the transformation logic correct?',
        'Are external dependencies available?',
        context ? `For "${failure}": What automation step failed?` : 'What was the last successful step?'
      ]},
      { tier: 'Judgment', order: 3, question: TIERS.judgment.debugQuestion, checks: [
        'Is the correct prompt being used?',
        'Are constraints too restrictive or permissive?',
        'Is the model receiving adequate context?',
        'Has the policy changed recently?',
        context ? `For "${failure}": What policy governed this? Was it appropriate?` : 'What judgment was applied?'
      ]}
    ]
  };
}

export function analyzeMCPServer(name: string, tools?: string[], resources?: string[], prompts?: string[]) {
  const coverage = [
    { tier: 'Database', primitives: resources || [], present: (resources || []).length > 0 },
    { tier: 'Automation', primitives: tools || [], present: (tools || []).length > 0 },
    { tier: 'Judgment', primitives: prompts || [], present: (prompts || []).length > 0 }
  ];
  const gaps: string[] = [];
  const recommendations: string[] = [];
  if (!coverage[0].present) { gaps.push('No Resources — Database tier missing.'); recommendations.push('Expose data as MCP Resources.'); }
  if (!coverage[1].present) { gaps.push('No Tools — Automation tier missing.'); recommendations.push('Define MCP Tools for actions.'); }
  if (!coverage[2].present) { gaps.push('No Prompts — Judgment tier missing.'); recommendations.push('Add MCP Prompts as guidance templates.'); }
  const coveredCount = coverage.filter(c => c.present).length;
  if (coveredCount === 3) recommendations.push(`${name} covers all three tiers.`);
  return { name, coverage, gaps, recommendations };
}

export function mapToAutomotive(components: string[]) {
  return components.map(component => {
    const lower = component.toLowerCase();
    let bestMatch = AUTOMOTIVE_MAPPINGS[0];
    let bestScore = 0;
    for (const mapping of AUTOMOTIVE_MAPPINGS) {
      let score = 0;
      if (lower.includes(mapping.technology.toLowerCase())) score += 3;
      if (lower.includes(mapping.vehiclePart.toLowerCase())) score += 2;
      const funcWords = mapping.function.toLowerCase().split(/\s+/);
      for (const word of funcWords) { if (word.length > 3 && lower.includes(word)) score += 1; }
      if (score > bestScore) { bestScore = score; bestMatch = mapping; }
    }
    if (bestScore < 2) {
      const classification = classifyComponent(component);
      const tierMap: Record<string, string> = { database: 'Fuel Tank', automation: 'Engine', judgment: 'Turbocharger' };
      const part = tierMap[classification.primary] || 'Chassis';
      bestMatch = AUTOMOTIVE_MAPPINGS.find(m => m.vehiclePart === part) || AUTOMOTIVE_MAPPINGS[0];
    }
    return { component, vehiclePart: bestMatch.vehiclePart, technology: bestMatch.technology, frameworkTier: bestMatch.frameworkTier, rationale: `"${component}" maps to ${bestMatch.vehiclePart} (${bestMatch.function}).` };
  });
}
