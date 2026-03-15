/**
 * Three-Tier Framework — Heuristics
 * 
 * Pure functions implementing the framework's analytical capabilities.
 * These power the MCP Tools (Automation tier).
 */

import { TIERS, type TierDefinition } from './definitions.js';
import { AUTOMOTIVE_MAPPINGS } from './mappings.js';

// ============================================================================
// Types
// ============================================================================

export interface TierClassification {
  primary: string;
  tiers: { tier: string; confidence: number; signals: string[] }[];
  rationale: string;
  spansTiers: boolean;
  boundaryNote: string | null;
}

export interface DiagnosticChecklist {
  failure: string;
  steps: { tier: string; order: number; question: string; checks: string[] }[];
}

export interface MCPAnalysis {
  name: string;
  coverage: { tier: string; primitives: string[]; present: boolean }[];
  gaps: string[];
  recommendations: string[];
}

export interface PolicyArtifact {
  constraint: string;
  tier: string;
  mutability: 'mutable' | 'immutable' | 'contextual';
  versionable: boolean;
  rationale: string;
}

export interface AutomotiveMap {
  component: string;
  vehiclePart: string;
  technology: string;
  frameworkTier: string;
  rationale: string;
}

// ============================================================================
// Signal words for tier classification
// ============================================================================

const TIER_SIGNALS: Record<string, { keywords: string[]; patterns: RegExp[] }> = {
  database: {
    keywords: ['store', 'stores', 'persist', 'persists', 'data', 'state', 'record', 'query', 'database', 'cache', 'file', 'storage', 'bucket', 'table', 'schema', 'migration', 'seed', 'backup', 'restore', 'read', 'fetch', 'retrieve', 'kv', 'd1', 'r2', 'durable object', 'content', 'asset', 'blob', 'index'],
    patterns: [/stor(e|es|ing|age)/i, /persist/i, /databas/i, /cach(e|ing)/i, /queri(es|ing)/i, /fetch(es|ing)?/i, /retriev/i]
  },
  automation: {
    keywords: ['execute', 'executes', 'process', 'transform', 'tool', 'action', 'worker', 'function', 'handler', 'middleware', 'pipeline', 'workflow', 'queue', 'job', 'task', 'cron', 'webhook', 'trigger', 'skill', 'agent', 'extract', 'parse', 'convert', 'sync', 'deploy', 'build', 'compile', 'run'],
    patterns: [/execut/i, /process(es|ing)?/i, /transform/i, /handl(e|er|ing)/i, /workflow/i, /automat/i, /pipelin/i]
  },
  judgment: {
    keywords: ['policy', 'constraint', 'oversight', 'approval', 'prompt', 'template', 'review', 'evaluate', 'judge', 'decide', 'criteria', 'rule', 'permission', 'boundary', 'trust', 'safety', 'ethics', 'guideline', 'standard', 'compliance', 'audit', 'quality', 'gate', 'threshold', 'weight', 'priority', 'llm', 'ai model', 'reasoning'],
    patterns: [/polic(y|ies)/i, /constrain/i, /oversight/i, /approv(e|al)/i, /evaluat/i, /permission/i, /boundar/i]
  }
};

// ============================================================================
// classify_component
// ============================================================================

export function classifyComponent(description: string, context?: string): TierClassification {
  const text = `${description} ${context || ''}`.toLowerCase();
  
  const scores: { tier: string; confidence: number; signals: string[] }[] = [];

  for (const [tier, { keywords, patterns }] of Object.entries(TIER_SIGNALS)) {
    const matchedKeywords = keywords.filter(kw => text.includes(kw));
    const matchedPatterns = patterns.filter(p => p.test(text));
    const uniqueSignals = [...new Set([...matchedKeywords])];
    
    // Score: keyword matches weighted by specificity + pattern matches
    const specificKeywords = matchedKeywords.filter(kw => kw.length > 4); // Longer = more specific
    const rawScore = specificKeywords.length * 2 + (matchedKeywords.length - specificKeywords.length) * 1 + matchedPatterns.length * 2;
    const maxPossible = keywords.length + patterns.length * 2;
    const confidence = Math.min(Math.round((rawScore / Math.max(maxPossible * 0.12, 1)) * 100) / 100, 1);
    
    if (uniqueSignals.length > 0) {
      scores.push({ tier, confidence, signals: uniqueSignals.slice(0, 6) });
    }
  }

  // Sort by confidence descending
  scores.sort((a, b) => b.confidence - a.confidence);

  // If no signals found, return unknown
  if (scores.length === 0) {
    return {
      primary: 'unknown',
      tiers: [{ tier: 'unknown', confidence: 0, signals: [] }],
      rationale: 'No tier signals detected in the description. Provide more detail about what this component does.',
      spansTiers: false,
      boundaryNote: null
    };
  }

  const primary = scores[0].tier;
  const tierDef = TIERS[primary];
  
  // Detect multi-tier spanning
  const significantTiers = scores.filter(s => s.confidence > 0.15);
  const spansTiers = significantTiers.length > 1;
  
  // Generate boundary analysis for multi-tier components
  let boundaryNote: string | null = null;
  if (spansTiers) {
    const tierNames = significantTiers.map(s => TIERS[s.tier].name);
    const boundaries = [];
    
    if (significantTiers.some(s => s.tier === 'database') && significantTiers.some(s => s.tier === 'automation')) {
      boundaries.push('This component sits at the Database-Automation boundary: it both stores/retrieves data AND processes/transforms it. Consider whether the storage and processing responsibilities should be separated.');
    }
    if (significantTiers.some(s => s.tier === 'automation') && significantTiers.some(s => s.tier === 'judgment')) {
      boundaries.push('This component sits at the Automation-Judgment boundary: it both executes actions AND makes policy decisions. The embedded judgment may benefit from being extracted into explicit constraints/prompts.');
    }
    if (significantTiers.some(s => s.tier === 'database') && significantTiers.some(s => s.tier === 'judgment')) {
      boundaries.push('This component sits at the Database-Judgment boundary: it stores data that directly encodes policy decisions. These are likely policy artifacts that should be versioned and contextually selectable.');
    }
    
    boundaryNote = boundaries.join(' ');
  }

  // Build rationale
  let rationale: string;
  if (spansTiers) {
    const secondaryNames = significantTiers.slice(1).map(s => TIERS[s.tier].name).join(', ');
    rationale = `Primary tier is ${tierDef.name} (${tierDef.definition}) based on signals: ${scores[0].signals.join(', ')}. Also spans ${secondaryNames} — this is a boundary component where the tier separation is a design decision, not a given.`;
  } else {
    rationale = `Classified as ${tierDef.name} tier (${tierDef.definition}) based on signals: ${scores[0].signals.join(', ')}.`;
  }

  return { primary, tiers: scores, rationale, spansTiers, boundaryNote };
}

// ============================================================================
// debug_system
// ============================================================================

export function debugSystem(failure: string, context?: string): DiagnosticChecklist {
  return {
    failure,
    steps: [
      {
        tier: 'Database',
        order: 1,
        question: TIERS.database.debugQuestion,
        checks: [
          'Are all required data sources accessible and responding?',
          'Is the data fresh or stale? Check cache TTLs and last-updated timestamps.',
          'Are database connections healthy? Check connection pools and error rates.',
          'Is the data schema correct? Look for migration issues or type mismatches.',
          'Are API endpoints returning expected payloads? Check for 4xx/5xx responses.',
          context ? `Specific to "${failure}": What data does this operation need? Is it present?` : 'What data does this operation need? Is it present in the expected location?'
        ]
      },
      {
        tier: 'Automation',
        order: 2,
        question: TIERS.automation.debugQuestion,
        checks: [
          'Did the tool/worker/function execute without throwing?',
          'Are there timeout issues? Check execution duration against limits.',
          'Is the transformation logic correct? Compare input to output.',
          'Are dependencies available? Check external service health.',
          'Is the agent selecting the right tool? Review tool selection reasoning.',
          context ? `Specific to "${failure}": What automation step failed or produced unexpected output?` : 'What was the last successful step before the failure?'
        ]
      },
      {
        tier: 'Judgment',
        order: 3,
        question: TIERS.judgment.debugQuestion,
        checks: [
          'Is the correct prompt/system message being used?',
          'Are constraints too restrictive (blocking valid actions) or too permissive (allowing invalid ones)?',
          'Is the model receiving adequate context for good judgment?',
          'Are approval gates configured correctly? Check human-in-the-loop settings.',
          'Has the policy changed recently? Compare current vs previous versions.',
          context ? `Specific to "${failure}": What policy or constraint governed this operation? Was it appropriate?` : 'What judgment was applied? Was the right policy selected for this context?'
        ]
      }
    ]
  };
}

// ============================================================================
// analyze_mcp_server
// ============================================================================

export function analyzeMCPServer(
  name: string,
  tools?: string[],
  resources?: string[],
  prompts?: string[]
): MCPAnalysis {
  const coverage = [
    {
      tier: 'Database',
      primitives: resources || [],
      present: (resources || []).length > 0
    },
    {
      tier: 'Automation',
      primitives: tools || [],
      present: (tools || []).length > 0
    },
    {
      tier: 'Judgment',
      primitives: prompts || [],
      present: (prompts || []).length > 0
    }
  ];

  const gaps: string[] = [];
  const recommendations: string[] = [];

  if (!coverage[0].present) {
    gaps.push('No Resources defined — Database tier is not represented.');
    recommendations.push('Consider exposing data as MCP Resources so agents can read and reference it (application-controlled).');
  }
  if (!coverage[1].present) {
    gaps.push('No Tools defined — Automation tier is not represented.');
    recommendations.push('Define MCP Tools for actions the agent should be able to invoke during reasoning (model-controlled).');
  }
  if (!coverage[2].present) {
    gaps.push('No Prompts defined — Judgment tier is not represented.');
    recommendations.push('Add MCP Prompts as templates that shape how agents reason about this domain (user-controlled).');
  }

  const coveredCount = coverage.filter(c => c.present).length;
  if (coveredCount === 3) {
    recommendations.push(`${name} covers all three tiers — full MCP surface area utilized.`);
  } else if (coveredCount === 1 && coverage[1].present) {
    recommendations.push('Most MCP servers start Tools-only. Consider adding Resources for data and Prompts for guidance to achieve full tier coverage.');
  }

  // Check for sampling opportunity
  if ((tools || []).length > 0 && (prompts || []).length === 0) {
    recommendations.push('Without Prompts, this server cannot leverage the sampling feedback loop (Automation requesting Judgment). Consider adding prompt templates.');
  }

  return { name, coverage, gaps, recommendations };
}

// ============================================================================
// identify_policy_artifacts
// ============================================================================

export function identifyPolicyArtifacts(system: string, constraints?: string[]): PolicyArtifact[] {
  if (!constraints || constraints.length === 0) {
    return [{
      constraint: 'No explicit constraints provided',
      tier: 'judgment',
      mutability: 'contextual',
      versionable: true,
      rationale: `Describe the constraints in "${system}" to identify policy artifacts. Policy artifacts are constraints that should be stored, versioned, and selected contextually rather than hardcoded.`
    }];
  }

  return constraints.map(constraint => {
    const lower = constraint.toLowerCase();
    
    // Classify mutability
    let mutability: 'mutable' | 'immutable' | 'contextual' = 'contextual';
    if (/safety|security|auth|permission|access control|encryption/i.test(lower)) {
      mutability = 'immutable';
    } else if (/format|style|preference|default|template/i.test(lower)) {
      mutability = 'mutable';
    }

    // Classify tier
    let tier = 'judgment';
    if (/stored|database|config|file|env/i.test(lower)) {
      tier = 'database';
    } else if (/runtime|execution|transform|process/i.test(lower)) {
      tier = 'automation';
    }

    const versionable = mutability !== 'immutable';

    const rationale = mutability === 'immutable'
      ? `"${constraint}" is a safety/security boundary — store as immutable policy in Database, enforce in Automation, never override in Judgment.`
      : mutability === 'mutable'
      ? `"${constraint}" is a formatting/preference constraint — version in Database, select contextually in Judgment.`
      : `"${constraint}" is context-dependent — store multiple versions in Database, let Judgment select the appropriate version per context.`;

    return { constraint, tier, mutability, versionable, rationale };
  });
}

// ============================================================================
// map_to_automotive
// ============================================================================

export function mapToAutomotive(components: string[]): AutomotiveMap[] {
  return components.map(component => {
    const lower = component.toLowerCase();
    
    // Try to match against known automotive mappings
    let bestMatch = AUTOMOTIVE_MAPPINGS[0]; // Default to Chassis
    let bestScore = 0;

    for (const mapping of AUTOMOTIVE_MAPPINGS) {
      let score = 0;
      const techLower = mapping.technology.toLowerCase();
      const funcLower = mapping.function.toLowerCase();
      
      if (lower.includes(techLower) || techLower.includes(lower)) score += 3;
      if (lower.includes(mapping.vehiclePart.toLowerCase())) score += 2;
      
      // Function-based matching
      const funcWords = funcLower.split(/\s+/);
      for (const word of funcWords) {
        if (word.length > 3 && lower.includes(word)) score += 1;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = mapping;
      }
    }

    // If no strong match, classify by tier signals and map
    if (bestScore < 2) {
      const classification = classifyComponent(component);
      const tierToAuto: Record<string, typeof AUTOMOTIVE_MAPPINGS[0]> = {
        database: AUTOMOTIVE_MAPPINGS.find(m => m.vehiclePart === 'Fuel Tank')!,
        automation: AUTOMOTIVE_MAPPINGS.find(m => m.vehiclePart === 'Engine')!,
        judgment: AUTOMOTIVE_MAPPINGS.find(m => m.vehiclePart === 'Turbocharger')!,
        unknown: AUTOMOTIVE_MAPPINGS.find(m => m.vehiclePart === 'Chassis')!
      };
      bestMatch = tierToAuto[classification.primary] || tierToAuto.unknown;
    }

    return {
      component,
      vehiclePart: bestMatch.vehiclePart,
      technology: bestMatch.technology,
      frameworkTier: bestMatch.frameworkTier,
      rationale: `"${component}" maps to ${bestMatch.vehiclePart} (${bestMatch.function}) in the Automotive Framework.`
    };
  });
}

// ============================================================================
// architecture_diff
// ============================================================================

export interface ArchitectureDiff {
  systemA: { name: string; coverage: Record<string, boolean>; componentCount: number };
  systemB: { name: string; coverage: Record<string, boolean>; componentCount: number };
  tierComparison: {
    tier: string;
    inA: string[];
    inB: string[];
    delta: string;
  }[];
  gaps: string[];
  recommendations: string[];
}

export function architectureDiff(
  nameA: string,
  componentsA: string[],
  nameB: string,
  componentsB: string[]
): ArchitectureDiff {
  // Classify all components in both systems
  const classifiedA = componentsA.map(c => ({ name: c, ...classifyComponent(c) }));
  const classifiedB = componentsB.map(c => ({ name: c, ...classifyComponent(c) }));

  const tiers = ['database', 'automation', 'judgment'];
  
  const coverageA: Record<string, boolean> = {};
  const coverageB: Record<string, boolean> = {};
  
  const tierComparison = tiers.map(tier => {
    const inA = classifiedA.filter(c => c.primary === tier).map(c => c.name);
    const inB = classifiedB.filter(c => c.primary === tier).map(c => c.name);
    
    coverageA[tier] = inA.length > 0;
    coverageB[tier] = inB.length > 0;

    let delta: string;
    if (inA.length === 0 && inB.length === 0) {
      delta = `Neither system has ${TIERS[tier].name} tier components.`;
    } else if (inA.length === 0) {
      delta = `${nameA} is missing ${TIERS[tier].name} tier — ${nameB} has ${inB.length} component(s).`;
    } else if (inB.length === 0) {
      delta = `${nameB} is missing ${TIERS[tier].name} tier — ${nameA} has ${inA.length} component(s).`;
    } else if (inA.length === inB.length) {
      delta = `Both systems have ${inA.length} ${TIERS[tier].name} tier component(s).`;
    } else {
      const stronger = inA.length > inB.length ? nameA : nameB;
      delta = `${stronger} has stronger ${TIERS[tier].name} tier coverage (${Math.max(inA.length, inB.length)} vs ${Math.min(inA.length, inB.length)} components).`;
    }

    return { tier: TIERS[tier].name, inA, inB, delta };
  });

  const gaps: string[] = [];
  const recommendations: string[] = [];

  // Identify gaps
  for (const tier of tiers) {
    if (coverageA[tier] && !coverageB[tier]) {
      gaps.push(`${nameB} is missing the ${TIERS[tier].name} tier that ${nameA} has.`);
    }
    if (!coverageA[tier] && coverageB[tier]) {
      gaps.push(`${nameA} is missing the ${TIERS[tier].name} tier that ${nameB} has.`);
    }
  }

  // Count boundary components
  const boundaryA = classifiedA.filter(c => c.spansTiers).length;
  const boundaryB = classifiedB.filter(c => c.spansTiers).length;
  
  if (boundaryA > 0 || boundaryB > 0) {
    recommendations.push(`Boundary components (spanning tiers): ${nameA} has ${boundaryA}, ${nameB} has ${boundaryB}. Review whether responsibilities should be separated.`);
  }

  // Coverage comparison
  const totalA = Object.values(coverageA).filter(Boolean).length;
  const totalB = Object.values(coverageB).filter(Boolean).length;
  
  if (totalA === 3 && totalB < 3) {
    recommendations.push(`${nameA} has full tier coverage. ${nameB} should consider adding the missing tier(s).`);
  } else if (totalB === 3 && totalA < 3) {
    recommendations.push(`${nameB} has full tier coverage. ${nameA} should consider adding the missing tier(s).`);
  } else if (totalA < 3 && totalB < 3) {
    recommendations.push('Neither system has full tier coverage. Both would benefit from explicitly addressing the missing tiers.');
  }

  return {
    systemA: { name: nameA, coverage: coverageA, componentCount: componentsA.length },
    systemB: { name: nameB, coverage: coverageB, componentCount: componentsB.length },
    tierComparison,
    gaps,
    recommendations
  };
}
