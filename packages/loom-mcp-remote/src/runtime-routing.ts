import type {
  AgentCapabilities,
  AgentProfile,
  DispatchConfig,
  DispatchAgentConfig,
  ModelConfig,
  ModelsConfig,
  TaskRow,
} from './types.js';
import { ageWeight, parseJsonArray } from './utils.js';

export interface LoomFormulaVariable {
  name: string;
  description: string;
  required: boolean;
  default: string | null;
}

export interface LoomFormulaStep {
  id: string;
  title: string;
  description: string;
  agent: string | null;
  labels: string[];
  prompt: string | null;
  verify: string | null;
  checkpoint: boolean;
  parallel: boolean;
}

export interface LoomFormula {
  name: string;
  description: string;
  quality: 'basic' | 'standard' | 'premium' | 'elite';
  agent: string | null;
  variables: LoomFormulaVariable[];
  steps: LoomFormulaStep[];
  success_criteria: {
    criteria: string[];
    verify_commands: string[];
    ground_checks: string[];
  };
  labels: string[];
  estimated_tokens: number;
}

interface RoutingAgent {
  id: string;
  name: string;
  available: boolean;
  active: number;
  maxConcurrent: number;
  cliPath: string;
  costPer1k: number;
  estimatedCost: (tokens: number) => number;
  qualityScore: number;
  avgDurationSecs: number;
  capabilities: AgentCapabilities;
  capabilityFlags: {
    planning: boolean;
    coding: boolean;
    debugging: boolean;
    ui: boolean;
    refactor: boolean;
    checkpoints: boolean;
    git_aware: boolean;
    sub_agents: boolean;
  };
}

export interface RoutingDecision {
  agent_id: string;
  reason: string;
  estimated_cost: number;
  confidence: number;
  alternatives: string[];
}

export interface RoutingState {
  agents: RoutingAgent[];
  dispatchConfig: DispatchConfig | null;
}

const DEFAULT_ROUTING_AGENTS: RoutingAgent[] = [
  {
    id: 'codex',
    name: 'Codex',
    available: true,
    active: 0,
    maxConcurrent: 3,
    cliPath: 'codex',
    costPer1k: 0.008,
    estimatedCost: (tokens) => (tokens / 1000) * 0.008,
    qualityScore: 0.5,
    avgDurationSecs: 180,
    capabilities: {
      planning: 0.7,
      coding: 0.85,
      debugging: 0.8,
      ui: 0.65,
      docs: 0.75,
      refactor: 0.75,
      testing: 0.9,
      mcp: true,
      checkpoints: false,
      git_aware: true,
      sub_agents: false,
      max_context: 128000,
    },
    capabilityFlags: {
      planning: true,
      coding: true,
      debugging: true,
      ui: true,
      refactor: true,
      checkpoints: false,
      git_aware: true,
      sub_agents: false,
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    available: true,
    active: 0,
    maxConcurrent: 2,
    cliPath: 'cursor',
    costPer1k: 0.02,
    estimatedCost: (tokens) => (tokens / 1000) * 0.02,
    qualityScore: 0.5,
    avgDurationSecs: 200,
    capabilities: {
      planning: 0.75,
      coding: 0.88,
      debugging: 0.85,
      ui: 0.95,
      docs: 0.7,
      refactor: 0.8,
      testing: 0.75,
      mcp: true,
      checkpoints: false,
      git_aware: true,
      sub_agents: false,
      max_context: 128000,
    },
    capabilityFlags: {
      planning: true,
      coding: true,
      debugging: true,
      ui: true,
      refactor: true,
      checkpoints: false,
      git_aware: true,
      sub_agents: false,
    },
  },
  {
    id: 'gemini',
    name: 'Gemini',
    available: true,
    active: 0,
    maxConcurrent: 3,
    cliPath: 'gemini',
    costPer1k: 0.001,
    estimatedCost: (tokens) => (tokens / 1000) * 0.001,
    qualityScore: 0.5,
    avgDurationSecs: 220,
    capabilities: {
      planning: 0.88,
      coding: 0.85,
      debugging: 0.82,
      ui: 0.75,
      docs: 0.85,
      refactor: 0.82,
      testing: 0.78,
      mcp: true,
      checkpoints: false,
      git_aware: false,
      sub_agents: false,
      max_context: 1000000,
    },
    capabilityFlags: {
      planning: true,
      coding: true,
      debugging: true,
      ui: true,
      refactor: true,
      checkpoints: false,
      git_aware: false,
      sub_agents: false,
    },
  },
];

function computeQualityScore(profile: AgentProfile): number {
  const successes = profile.quality?.successes ?? 0;
  const failures = profile.quality?.failures ?? 0;
  const total = successes + failures;
  return total > 0 ? successes / total : 0.5;
}

function capabilityFlags(capabilities: AgentCapabilities): RoutingAgent['capabilityFlags'] {
  return {
    planning: capabilities.planning >= 0.6,
    coding: capabilities.coding >= 0.6,
    debugging: capabilities.debugging >= 0.6,
    ui: capabilities.ui >= 0.6,
    refactor: capabilities.refactor >= 0.6,
    checkpoints: capabilities.checkpoints,
    git_aware: capabilities.git_aware,
    sub_agents: capabilities.sub_agents,
  };
}

function defaultCapabilities(): AgentCapabilities {
  return {
    planning: 0.5,
    coding: 0.5,
    debugging: 0.5,
    ui: 0.5,
    docs: 0.5,
    refactor: 0.5,
    testing: 0.5,
    mcp: false,
    checkpoints: false,
    git_aware: false,
    sub_agents: false,
    max_context: 128000,
  };
}

function agentFromModel(id: string, config: ModelConfig): AgentProfile {
  const capabilities: AgentCapabilities = {
    planning: config.planning ?? 0.5,
    coding: config.coding ?? 0.5,
    debugging: config.debugging ?? 0.5,
    ui: config.ui ?? 0.5,
    docs: config.docs ?? 0.5,
    refactor: config.refactor ?? 0.5,
    testing: config.testing ?? 0.5,
    mcp: config.mcp ?? false,
    checkpoints: config.checkpoints ?? false,
    git_aware: config.git_aware ?? false,
    sub_agents: config.sub_agents ?? false,
    max_context: config.max_context ?? 128000,
  };

  return {
    id,
    name: config.name ?? id,
    cli_path: config.cli ?? config.family ?? id,
    capabilities,
    cost: {
      input_per_1k: config.input_per_1k ?? config.output_per_1k ?? 0,
      output_per_1k: config.output_per_1k ?? config.input_per_1k ?? 0,
      output_ratio: config.output_ratio ?? 2.5,
    },
    quality: {
      successes: 0,
      failures: 0,
      avg_duration_secs: 0,
      by_type: {},
    },
    max_concurrent: config.max_concurrent ?? 3,
    active: 0,
    available: true,
    last_used: null,
  };
}

function estimatedCost(profile: AgentProfile, dispatchAgent: DispatchAgentConfig | undefined, tokens: number): number {
  if (dispatchAgent?.cost_per_1k != null) {
    return (tokens / 1000) * dispatchAgent.cost_per_1k;
  }
  const input = profile.cost?.input_per_1k ?? 0;
  const output = profile.cost?.output_per_1k ?? 0;
  const ratio = profile.cost?.output_ratio ?? 2.5;
  const inputCost = (tokens / 1000) * input;
  const outputCost = ((tokens * ratio) / 1000) * output;
  return Number((inputCost + outputCost).toFixed(4));
}

function toRoutingAgent(profile: AgentProfile, dispatchAgent: DispatchAgentConfig | undefined): RoutingAgent {
  const costPer1k = dispatchAgent?.cost_per_1k ?? ((profile.cost?.input_per_1k ?? 0) + (profile.cost?.output_per_1k ?? 0));
  const available = profile.available !== false && (profile.active ?? 0) < (dispatchAgent?.max_concurrent ?? profile.max_concurrent ?? 1);
  const capabilities = profile.capabilities ?? defaultCapabilities();

  return {
    id: profile.id,
    name: profile.name || profile.id,
    available,
    active: profile.active ?? 0,
    maxConcurrent: dispatchAgent?.max_concurrent ?? profile.max_concurrent ?? 1,
    cliPath: dispatchAgent?.path ?? profile.cli_path ?? profile.id,
    costPer1k,
    estimatedCost: (tokens) => estimatedCost(profile, dispatchAgent, tokens),
    qualityScore: computeQualityScore(profile),
    avgDurationSecs: profile.quality?.avg_duration_secs ?? 0,
    capabilities,
    capabilityFlags: capabilityFlags(capabilities),
  };
}

export function buildRoutingState(
  agentProfiles: AgentProfile[],
  dispatchConfig: DispatchConfig | null,
  modelsConfig: ModelsConfig | null,
): RoutingState {
  const agentMap = new Map<string, AgentProfile>();

  for (const profile of agentProfiles) {
    agentMap.set(profile.id, profile);
  }

  for (const [id, model] of Object.entries(modelsConfig?.models ?? {})) {
    if (!agentMap.has(id)) {
      agentMap.set(id, agentFromModel(id, model));
    }
  }

  const agents = [...agentMap.values()]
    .map((profile) => toRoutingAgent(profile, dispatchConfig?.agents?.[profile.id]))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    agents: agents.length > 0 ? agents : DEFAULT_ROUTING_AGENTS,
    dispatchConfig,
  };
}

function routeByLabel(label: string, dispatchConfig: DispatchConfig | null): string | null {
  const configured = dispatchConfig?.routing?.labels?.[label];
  if (configured) return configured;

  const lower = label.toLowerCase();
  if (['ui', 'frontend', 'svelte', 'design'].includes(lower)) return 'cursor';
  if (['planning', 'architecture', 'testing', 'workers', 'deploy', 'verification'].includes(lower)) return 'codex';
  if (['analysis', 'research', 'large-context'].includes(lower)) return 'gemini';
  return null;
}

function complexity(task: TaskRow): 'trivial' | 'simple' | 'moderate' | 'complex' | 'epic' {
  const text = `${task.title} ${task.description ?? ''}`.toLowerCase();
  const labels = parseJsonArray(task.labels_json).map((label) => label.toLowerCase());

  if (/(refactor|migrate|redesign)/.test(text) || labels.some((label) => label === 'epic' || label === 'architecture')) {
    return 'epic';
  }
  if (/(implement|feature|system)/.test(text) || labels.some((label) => label === 'feature' || label === 'planning')) {
    return 'complex';
  }
  if (/(add|update|improve)/.test(text) || labels.length > 2) {
    return 'moderate';
  }
  if (/(fix|bug|typo)/.test(text)) {
    return 'simple';
  }
  return 'moderate';
}

function qualityThreshold(level: ReturnType<typeof complexity>): number {
  if (level === 'trivial') return 0.3;
  if (level === 'simple') return 0.4;
  if (level === 'moderate') return 0.45;
  if (level === 'complex') return 0.48;
  return 0.5;
}

function recommendedAgent(level: ReturnType<typeof complexity>, state: RoutingState): string | null {
  const byComplexity: Record<string, string[]> = {
    trivial: ['gemini', state.dispatchConfig?.routing?.default ?? ''],
    simple: ['codex', state.dispatchConfig?.routing?.default ?? ''],
    moderate: ['cursor', state.dispatchConfig?.routing?.default ?? ''],
    complex: ['codex', state.dispatchConfig?.routing?.default ?? ''],
    epic: ['codex', state.dispatchConfig?.routing?.default ?? ''],
  };

  for (const candidate of byComplexity[level]) {
    if (candidate && state.agents.some((agent) => agent.id === candidate)) {
      return candidate;
    }
  }

  return state.dispatchConfig?.routing?.default ?? state.agents[0]?.id ?? null;
}

function capabilityScore(agent: RoutingAgent, labels: string[]): number {
  if (labels.length === 0) return 0.5;

  const scores = labels
    .map((label) => {
      const lower = label.toLowerCase();
      if (['planning', 'architecture', 'design'].includes(lower)) return agent.capabilities.planning;
      if (['coding', 'implementation', 'feature', 'task'].includes(lower)) return agent.capabilities.coding;
      if (['debugging', 'bug', 'fix'].includes(lower)) return agent.capabilities.debugging;
      if (['ui', 'frontend', 'svelte', 'css', 'design'].includes(lower)) return agent.capabilities.ui;
      if (['docs', 'documentation', 'readme'].includes(lower)) return agent.capabilities.docs;
      if (['refactor', 'dry', 'cleanup'].includes(lower)) return agent.capabilities.refactor;
      if (['test', 'testing', 'spec'].includes(lower)) return agent.capabilities.testing;
      return 0.5;
    })
    .filter((score) => score > 0);

  if (scores.length === 0) return 0.5;
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function estimateTaskTokens(task: TaskRow): number {
  const base = 5000;
  const title = task.title.length * 2;
  const description = (task.description ?? '').length * 2;
  const level = complexity(task);
  const multiplier = level === 'trivial' ? 1 : level === 'simple' ? 2 : level === 'moderate' ? 4 : level === 'complex' ? 8 : 16;
  return (base + title + description) * multiplier;
}

export function chooseAgent(
  task: TaskRow,
  strategy: 'best' | 'cheapest' | 'fastest',
  maxCost: number | undefined,
  state: RoutingState,
): RoutingDecision {
  const tokens = estimateTaskTokens(task);
  const labels = parseJsonArray(task.labels_json);
  const filtered = state.agents.filter((agent) => {
    if (!agent.available) return false;
    return typeof maxCost === 'number' ? agent.estimatedCost(tokens) <= maxCost : true;
  });

  if (filtered.length === 0) {
    throw new Error('No agents available under current constraints');
  }

  if (strategy === 'cheapest') {
    const sorted = [...filtered].sort((a, b) => a.estimatedCost(tokens) - b.estimatedCost(tokens));
    const [best, ...rest] = sorted;
    return {
      agent_id: best.id,
      reason: `Cheapest route at $${best.estimatedCost(tokens).toFixed(4)}`,
      estimated_cost: Number(best.estimatedCost(tokens).toFixed(4)),
      confidence: 0.8,
      alternatives: rest.slice(0, 2).map((agent) => agent.id),
    };
  }

  if (strategy === 'fastest') {
    const sorted = [...filtered].sort((a, b) => a.avgDurationSecs - b.avgDurationSecs);
    const [best, ...rest] = sorted;
    return {
      agent_id: best.id,
      reason: `Fastest route with ~${Math.round(best.avgDurationSecs)}s average runtime`,
      estimated_cost: Number(best.estimatedCost(tokens).toFixed(4)),
      confidence: 0.7,
      alternatives: rest.slice(0, 2).map((agent) => agent.id),
    };
  }

  const level = complexity(task);
  const recommended = recommendedAgent(level, state);
  const scored = filtered
    .map((agent) => {
      if (agent.qualityScore < qualityThreshold(level)) {
        return { agent, score: 0, estimatedCost: agent.estimatedCost(tokens) };
      }

      let labelBonus = 0;
      for (const label of labels) {
        if (routeByLabel(label, state.dispatchConfig) === agent.id) {
          labelBonus += 0.3;
        }
      }

      const score =
        capabilityScore(agent, labels) * 0.3 +
        labelBonus +
        (recommended === agent.id ? 0.2 : 0) +
        agent.qualityScore * 0.3 +
        0.1 / (1 + agent.estimatedCost(tokens)) +
        0.1 +
        ageWeight(task.created_at) * 0.05;

      return { agent, score, estimatedCost: agent.estimatedCost(tokens) };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    throw new Error('No candidates meet the quality threshold for this task');
  }

  const [best, ...rest] = scored;
  return {
    agent_id: best.agent.id,
    reason: `Best for ${level} work with labels ${JSON.stringify(labels)} (score ${best.score.toFixed(2)})`,
    estimated_cost: Number(best.estimatedCost.toFixed(4)),
    confidence: Number(Math.min(1, best.score).toFixed(2)),
    alternatives: rest.slice(0, 2).map((entry) => entry.agent.id),
  };
}

export function agentViews(state: RoutingState): Array<Record<string, unknown>> {
  return state.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    available: agent.available,
    active: agent.active,
    max_concurrent: agent.maxConcurrent,
    success_rate: Number(agent.qualityScore.toFixed(2)),
    avg_duration_secs: Number(agent.avgDurationSecs.toFixed(2)),
    capabilities: agent.capabilityFlags,
    cli_path: agent.cliPath,
  }));
}
