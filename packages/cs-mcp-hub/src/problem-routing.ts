type ProblemAxis =
  | 'reasoning'
  | 'effort'
  | 'coordination'
  | 'domain_expertise'
  | 'ambiguity'
  | 'judgment_willpower'
  | 'emotional_intelligence';

type RoutingProfile =
  | 'pure_reasoner'
  | 'equipped_reasoner'
  | 'specialist_coder'
  | 'fast_generalist'
  | 'human_judgment_first';

type RiskLevel = 'low' | 'medium' | 'high';
type CriticalityLevel = 'low' | 'medium' | 'high';

export type HubProblemRouteArgs = {
  task: string;
  context?: string;
  requiresToolOrchestration: boolean;
  stakeholderCount: number;
  expectedDurationMinutes: number;
  riskLevel: RiskLevel;
  domainCriticality: CriticalityLevel;
  isCodeTask?: boolean | null;
};

type AxisScore = {
  axis: ProblemAxis;
  score: number;
  evidence: string[];
};

type StagePlan = {
  stage: string;
  objective: string;
  profile: RoutingProfile;
  mode: 'naked_reasoner' | 'equipped_reasoner' | 'specialist' | 'human_gate' | 'low_cost_scan';
  thinkingDepth: 'low' | 'medium' | 'high' | 'max' | 'human';
  toolUse: 'none' | 'light' | 'moderate' | 'heavy' | 'human_managed';
};

const AXIS_ORDER: ProblemAxis[] = [
  'reasoning',
  'effort',
  'coordination',
  'domain_expertise',
  'ambiguity',
  'judgment_willpower',
  'emotional_intelligence',
];

const AXIS_KEYWORDS: Record<ProblemAxis, string[]> = {
  reasoning: [
    'prove',
    'proof',
    'logic',
    'first principles',
    'hypothesis',
    'deduce',
    'optimize',
    'derivative',
    'regulatory interaction',
    'root cause',
    'novel',
    'multi-step',
    'counterexample',
    'mathematical',
    'scientific',
  ],
  effort: [
    'audit',
    'bulk',
    'migrate',
    'thousands',
    'backlog',
    'line-by-line',
    'sweep',
    'repetitive',
    'batch',
    'large surface area',
    'sustained',
    'hours',
    'days',
  ],
  coordination: [
    'stakeholder',
    'cross-functional',
    'alignment',
    'dependencies',
    'handoff',
    'routing',
    'escalate',
    'teams',
    'owners',
    'org',
    'repo ownership',
    'multi-repo',
  ],
  domain_expertise: [
    'precedent',
    'litigation',
    'jurisdiction',
    'stack trace',
    'production incident',
    'deal terms',
    'undocumented',
    'specialized',
    'tribal knowledge',
    'historical context',
    'expert review',
  ],
  ambiguity: [
    'unclear',
    'fuzzy',
    'contradictory',
    'define the problem',
    'unknown unknown',
    'strategy',
    'product sense',
    'what should we build',
    'conflicting signals',
    'cannot articulate',
  ],
  judgment_willpower: [
    'kill project',
    'tradeoff',
    'political risk',
    'unpopular',
    'values',
    'go/no-go',
    'ownership',
    'executive opposition',
    'hard decision',
    'accept risk',
  ],
  emotional_intelligence: [
    'feedback conversation',
    'underperforming',
    'negotiation',
    'boardroom',
    'morale',
    'reorg',
    'conflict',
    'sensitive',
    'tone',
    'trust',
    'relationship',
  ],
};

const CODE_KEYWORDS = [
  'code',
  'coding',
  'repository',
  'refactor',
  'implement',
  'compile',
  'test',
  'bug',
  'endpoint',
  'api',
  'typescript',
  'javascript',
  'python',
  'rust',
];

export function routeProblem(args: HubProblemRouteArgs): Record<string, unknown> {
  const text = normalizeText(`${args.task} ${args.context ?? ''}`);

  const scoreMap = buildInitialScoreMap();
  const evidenceMap = buildInitialEvidenceMap();

  for (const axis of AXIS_ORDER) {
    const matches = findKeywordMatches(text, AXIS_KEYWORDS[axis]);
    if (matches.length === 0) continue;
    addScore(scoreMap, evidenceMap, axis, Math.min(0.42, matches.length * 0.12), `keywords: ${matches.join(', ')}`);
  }

  const inferredCodeMatches = findKeywordMatches(text, CODE_KEYWORDS);
  const isCodeTask = args.isCodeTask ?? inferredCodeMatches.length > 0;
  if (isCodeTask) {
    addScore(scoreMap, evidenceMap, 'reasoning', 0.08, 'code task needs technical reasoning');
    addScore(scoreMap, evidenceMap, 'effort', 0.08, 'code task has execution surface area');
  }

  if (args.requiresToolOrchestration) {
    addScore(scoreMap, evidenceMap, 'effort', 0.22, 'requires tool orchestration');
    addScore(scoreMap, evidenceMap, 'coordination', 0.18, 'tool orchestration introduces coordination overhead');
  }

  if (args.stakeholderCount >= 4) {
    addScore(scoreMap, evidenceMap, 'coordination', 0.25, `stakeholder_count=${args.stakeholderCount}`);
  } else if (args.stakeholderCount >= 2) {
    addScore(scoreMap, evidenceMap, 'coordination', 0.1, `stakeholder_count=${args.stakeholderCount}`);
  }

  if (args.expectedDurationMinutes >= 480) {
    addScore(scoreMap, evidenceMap, 'effort', 0.3, `expected_duration=${args.expectedDurationMinutes}m`);
  } else if (args.expectedDurationMinutes >= 180) {
    addScore(scoreMap, evidenceMap, 'effort', 0.18, `expected_duration=${args.expectedDurationMinutes}m`);
  } else if (args.expectedDurationMinutes <= 45) {
    addScore(scoreMap, evidenceMap, 'reasoning', 0.05, `short_duration=${args.expectedDurationMinutes}m`);
  }

  if (args.riskLevel === 'high') {
    addScore(scoreMap, evidenceMap, 'judgment_willpower', 0.22, 'high-risk decision pressure');
    addScore(scoreMap, evidenceMap, 'domain_expertise', 0.14, 'high-risk requires domain confidence');
    addScore(scoreMap, evidenceMap, 'reasoning', 0.1, 'high-risk requires stronger reasoning checks');
  } else if (args.riskLevel === 'medium') {
    addScore(scoreMap, evidenceMap, 'reasoning', 0.05, 'medium risk needs explicit reasoning');
  }

  if (args.domainCriticality === 'high') {
    addScore(scoreMap, evidenceMap, 'domain_expertise', 0.24, 'high domain criticality');
    addScore(scoreMap, evidenceMap, 'reasoning', 0.08, 'critical domain requires defensible logic');
  } else if (args.domainCriticality === 'medium') {
    addScore(scoreMap, evidenceMap, 'domain_expertise', 0.1, 'medium domain criticality');
  }

  if (totalScore(scoreMap) === 0) {
    addScore(scoreMap, evidenceMap, 'reasoning', 0.15, 'default fallback when little signal is available');
    addScore(scoreMap, evidenceMap, 'ambiguity', 0.1, 'default ambiguity hedge');
  }

  const axisScores = AXIS_ORDER.map((axis) => ({
    axis,
    score: clamp(scoreMap[axis], 0, 1),
    evidence: unique(evidenceMap[axis]).slice(0, 4),
  })).sort((a, b) => b.score - a.score);

  const primary = axisScores[0];
  const secondary = axisScores.slice(1).filter((item) => item.score >= 0.35).slice(0, 2);
  const confidence = computeConfidence(axisScores);
  const primaryProfile = resolvePrimaryProfile({
    primaryAxis: primary.axis,
    axisScores,
    isCodeTask,
    requiresTools: args.requiresToolOrchestration,
  });
  const stageAxis = primaryProfile === 'human_judgment_first' ? 'ambiguity' : primary.axis;
  const stagePlan = buildStagePlan(stageAxis, secondary.map((item) => item.axis), {
    isCodeTask,
    requiresTools: args.requiresToolOrchestration,
    maxThinking: primary.score >= 0.7,
  });

  const guardrails = buildGuardrails({
    primaryAxis: primary.axis,
    routingProfile: primaryProfile,
    scores: axisScores,
    riskLevel: args.riskLevel,
    domainCriticality: args.domainCriticality,
    isCodeTask,
  });

  return {
    transcriptAlignment: {
      point: 'Route by bottleneck axis, not by global benchmark rank.',
      resolvedQuestion: 'Which model/profile should handle this specific problem type?',
    },
    input: {
      task: args.task,
      context: args.context ?? null,
      requiresToolOrchestration: args.requiresToolOrchestration,
      stakeholderCount: args.stakeholderCount,
      expectedDurationMinutes: args.expectedDurationMinutes,
      riskLevel: args.riskLevel,
      domainCriticality: args.domainCriticality,
      isCodeTask,
      inferredCodeSignals: inferredCodeMatches,
    },
    classification: {
      primaryAxis: primary.axis,
      primaryScore: round(primary.score),
      secondaryAxes: secondary.map((item) => ({
        axis: item.axis,
        score: round(item.score),
      })),
      confidence: round(confidence),
      axisScores: axisScores.map((item) => ({
        axis: item.axis,
        score: round(item.score),
        evidence: item.evidence,
      })),
    },
    routing: {
      profile: primaryProfile,
      mode: profileMode(primaryProfile),
      rationale: routingRationale(primary.axis, primaryProfile),
      modelFamilyHints: modelFamilyHints(primaryProfile),
      stagePlan,
      guardrails,
    },
  };
}

function buildInitialScoreMap(): Record<ProblemAxis, number> {
  return {
    reasoning: 0,
    effort: 0,
    coordination: 0,
    domain_expertise: 0,
    ambiguity: 0,
    judgment_willpower: 0,
    emotional_intelligence: 0,
  };
}

function buildInitialEvidenceMap(): Record<ProblemAxis, string[]> {
  return {
    reasoning: [],
    effort: [],
    coordination: [],
    domain_expertise: [],
    ambiguity: [],
    judgment_willpower: [],
    emotional_intelligence: [],
  };
}

function addScore(
  scoreMap: Record<ProblemAxis, number>,
  evidenceMap: Record<ProblemAxis, string[]>,
  axis: ProblemAxis,
  delta: number,
  evidence: string,
): void {
  scoreMap[axis] += delta;
  evidenceMap[axis].push(evidence);
}

function normalizeText(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findKeywordMatches(text: string, keywords: string[]): string[] {
  const matches: string[] = [];
  for (const keyword of keywords) {
    if (containsKeyword(text, keyword)) {
      matches.push(keyword);
    }
  }
  return matches;
}

function containsKeyword(text: string, keyword: string): boolean {
  const normalizedKeyword = normalizeText(keyword);
  if (normalizedKeyword.includes(' ')) {
    return text.includes(normalizedKeyword);
  }
  const escaped = escapeRegex(normalizedKeyword);
  const re = new RegExp(`\\b${escaped}\\b`, 'i');
  return re.test(text);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function totalScore(scoreMap: Record<ProblemAxis, number>): number {
  return AXIS_ORDER.reduce((sum, axis) => sum + scoreMap[axis], 0);
}

function computeConfidence(scores: AxisScore[]): number {
  const primary = scores[0]?.score ?? 0;
  const secondary = scores[1]?.score ?? 0;
  const gap = Math.max(0, primary - secondary);
  const signal = scores.reduce((count, item) => count + item.evidence.length, 0);
  return clamp(0.45 + gap * 0.9 + Math.min(0.2, signal * 0.02), 0.4, 0.98);
}

function resolvePrimaryProfile(args: {
  primaryAxis: ProblemAxis;
  axisScores: AxisScore[];
  isCodeTask: boolean;
  requiresTools: boolean;
}): RoutingProfile {
  const { primaryAxis, axisScores, isCodeTask, requiresTools } = args;
  const scoreByAxis = new Map(axisScores.map((item) => [item.axis, item.score]));
  const primaryScore = scoreByAxis.get(primaryAxis) ?? 0;
  const maxHumanSignal = Math.max(
    scoreByAxis.get('ambiguity') ?? 0,
    scoreByAxis.get('judgment_willpower') ?? 0,
    scoreByAxis.get('emotional_intelligence') ?? 0,
  );

  // When human-centered uncertainty is strong and close to the leading axis,
  // route to human-gated workflow first, even if another axis narrowly wins.
  if (maxHumanSignal >= 0.35 && primaryScore - maxHumanSignal <= 0.12) {
    return 'human_judgment_first';
  }

  if (primaryAxis === 'reasoning') {
    return requiresTools ? 'equipped_reasoner' : 'pure_reasoner';
  }
  if (primaryAxis === 'effort' || primaryAxis === 'coordination') {
    if (isCodeTask) return 'specialist_coder';
    return 'equipped_reasoner';
  }
  if (primaryAxis === 'domain_expertise') {
    return requiresTools ? 'equipped_reasoner' : 'pure_reasoner';
  }
  return 'human_judgment_first';
}

function buildStagePlan(
  primaryAxis: ProblemAxis,
  secondaryAxes: ProblemAxis[],
  opts: { isCodeTask: boolean; requiresTools: boolean; maxThinking: boolean },
): StagePlan[] {
  const plan: StagePlan[] = [];

  if (
    primaryAxis === 'ambiguity' ||
    primaryAxis === 'judgment_willpower' ||
    primaryAxis === 'emotional_intelligence'
  ) {
    plan.push({
      stage: 'frame',
      objective: 'Human owner defines decision boundary and success criteria.',
      profile: 'human_judgment_first',
      mode: 'human_gate',
      thinkingDepth: 'human',
      toolUse: 'human_managed',
    });
    plan.push({
      stage: 'options',
      objective: 'Generate options and tradeoffs for human review.',
      profile: 'fast_generalist',
      mode: 'low_cost_scan',
      thinkingDepth: 'medium',
      toolUse: 'light',
    });
    if (opts.requiresTools || opts.isCodeTask) {
      plan.push({
        stage: 'execute',
        objective: 'Execute approved option with explicit checkpoints.',
        profile: opts.isCodeTask ? 'specialist_coder' : 'equipped_reasoner',
        mode: opts.isCodeTask ? 'specialist' : 'equipped_reasoner',
        thinkingDepth: 'medium',
        toolUse: 'heavy',
      });
    }
    return plan;
  }

  if (primaryAxis === 'reasoning') {
    plan.push({
      stage: 'reason',
      objective: 'Solve core logic path and edge cases.',
      profile: 'pure_reasoner',
      mode: 'naked_reasoner',
      thinkingDepth: opts.maxThinking ? 'max' : 'high',
      toolUse: 'light',
    });
    if (opts.isCodeTask) {
      plan.push({
        stage: 'implement',
        objective: 'Translate reasoning into working code and tests.',
        profile: 'specialist_coder',
        mode: 'specialist',
        thinkingDepth: 'medium',
        toolUse: 'heavy',
      });
    } else if (opts.requiresTools || secondaryAxes.includes('coordination')) {
      plan.push({
        stage: 'operationalize',
        objective: 'Execute through tools/APIs while preserving solved logic.',
        profile: 'equipped_reasoner',
        mode: 'equipped_reasoner',
        thinkingDepth: 'medium',
        toolUse: 'heavy',
      });
    }
    return plan;
  }

  plan.push({
    stage: 'plan',
    objective: 'Chunk work, assign order, and set checkpoints.',
    profile: 'fast_generalist',
    mode: 'low_cost_scan',
    thinkingDepth: 'low',
    toolUse: 'moderate',
  });
  plan.push({
    stage: 'execute',
    objective: 'Run sustained execution over the full task surface.',
    profile: opts.isCodeTask ? 'specialist_coder' : 'equipped_reasoner',
    mode: opts.isCodeTask ? 'specialist' : 'equipped_reasoner',
    thinkingDepth: 'medium',
    toolUse: 'heavy',
  });
  plan.push({
    stage: 'verify',
    objective: 'Perform focused reasoning checks on high-risk outputs.',
    profile: 'pure_reasoner',
    mode: 'naked_reasoner',
    thinkingDepth: 'high',
    toolUse: 'light',
  });
  return plan;
}

function buildGuardrails(args: {
  primaryAxis: ProblemAxis;
  routingProfile: RoutingProfile;
  scores: AxisScore[];
  riskLevel: RiskLevel;
  domainCriticality: CriticalityLevel;
  isCodeTask: boolean;
}): string[] {
  const guardrails: string[] = [];
  const scoreByAxis = new Map(args.scores.map((item) => [item.axis, item.score]));

  const ambiguityScore = scoreByAxis.get('ambiguity') ?? 0;
  const emotionalScore = scoreByAxis.get('emotional_intelligence') ?? 0;
  const judgmentScore = scoreByAxis.get('judgment_willpower') ?? 0;
  const domainScore = scoreByAxis.get('domain_expertise') ?? 0;

  if (
    args.routingProfile === 'human_judgment_first' ||
    ambiguityScore >= 0.45 ||
    emotionalScore >= 0.4 ||
    judgmentScore >= 0.4
  ) {
    guardrails.push('Require human checkpoint before irreversible actions.');
  }
  if (domainScore >= 0.45 || args.domainCriticality === 'high') {
    guardrails.push('Require domain-expert validation of final output.');
  }
  if (args.riskLevel === 'high') {
    guardrails.push('Use two-pass verification before shipping (independent reviewer pass).');
  }
  if (args.isCodeTask) {
    guardrails.push('Gate merge on tests + static checks + rollback path.');
  }
  if (guardrails.length === 0) {
    guardrails.push('Use standard review before deployment.');
  }

  return guardrails;
}

function profileMode(profile: RoutingProfile): StagePlan['mode'] {
  if (profile === 'pure_reasoner') return 'naked_reasoner';
  if (profile === 'equipped_reasoner') return 'equipped_reasoner';
  if (profile === 'specialist_coder') return 'specialist';
  if (profile === 'human_judgment_first') return 'human_gate';
  return 'low_cost_scan';
}

function routingRationale(primaryAxis: ProblemAxis, profile: RoutingProfile): string {
  const axisLabel = primaryAxis.replace(/_/g, ' ');
  if (profile === 'pure_reasoner') {
    return `Primary bottleneck is ${axisLabel}; optimize for deep logic before heavy tool execution.`;
  }
  if (profile === 'equipped_reasoner') {
    return `Primary bottleneck is ${axisLabel}; optimize for sustained tool-linked execution.`;
  }
  if (profile === 'specialist_coder') {
    return `Primary bottleneck is ${axisLabel} in a coding context; optimize for code-focused execution loops.`;
  }
  if (profile === 'human_judgment_first') {
    return `Primary bottleneck is ${axisLabel}; human judgment is the first gate, with AI as support.`;
  }
  return `Primary bottleneck is ${axisLabel}; start with low-cost scoping and escalate only if needed.`;
}

function modelFamilyHints(profile: RoutingProfile): string[] {
  if (profile === 'pure_reasoner') {
    return ['Use a strong pure reasoner model profile (high/max thinking).'];
  }
  if (profile === 'equipped_reasoner') {
    return ['Use an equipped reasoner profile optimized for tool orchestration and long-running tasks.'];
  }
  if (profile === 'specialist_coder') {
    return ['Use a specialist coding profile with strong edit/test iteration throughput.'];
  }
  if (profile === 'human_judgment_first') {
    return ['Keep humans as decision owners; use AI for option generation and analysis support.'];
  }
  return ['Use a low-cost general model for decomposition and triage.'];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Number(value.toFixed(3));
}
