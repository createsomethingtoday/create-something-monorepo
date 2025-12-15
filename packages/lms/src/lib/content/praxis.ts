/**
 * Praxis Exercises Configuration
 *
 * Hands-on exercises that accompany lessons.
 * Each exercise has a type that determines the UI component used.
 *
 * Meta-Learning Principle: Every praxis exercise includes Beads tasks.
 * You learn Beads by using Beads to track your learning—dwelling through doing.
 */

export type ExerciseType = 'triad-audit' | 'code' | 'analysis' | 'design';

/**
 * A Beads task template for tracking exercise progress.
 * Users create these tasks before starting the exercise.
 */
export interface BeadsTask {
  title: string;
  type: 'task' | 'feature' | 'research';
  labels?: string[];
}

export interface PraxisExercise {
  id: string;
  lessonId: string;
  pathId: string;
  title: string;
  description: string;
  type: ExerciseType;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  objectives: string[];
  /**
   * Beads tasks to create before starting the exercise.
   * Meta-learning: you learn Beads by using Beads.
   */
  beadsTasks?: BeadsTask[];
}

export const PRAXIS_EXERCISES: PraxisExercise[] = [
  // ============ FOUNDATIONS ============
  {
    id: 'identify-duplication',
    lessonId: 'dry-implementation',
    pathId: 'foundations',
    title: 'Identify Duplication',
    description: 'Find repeated patterns in code and propose unification strategies.',
    type: 'code',
    difficulty: 'beginner',
    duration: '15 min',
    objectives: [
      'Recognize structural duplication in component code',
      'Distinguish essential similarity from coincidental',
      'Propose a unified abstraction'
    ],
    beadsTasks: [
      { title: 'Praxis: Identify duplication in [target]', type: 'task', labels: ['learn', 'foundations'] },
      { title: 'Document 3+ duplication patterns found', type: 'task', labels: ['learn'] },
      { title: 'Propose unified abstraction', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'audit-artifact',
    lessonId: 'rams-artifact',
    pathId: 'foundations',
    title: 'Audit an Artifact',
    description: 'Apply Rams\' principles to evaluate whether each element earns its existence.',
    type: 'triad-audit',
    difficulty: 'beginner',
    duration: '20 min',
    objectives: [
      'Apply "Does this earn its existence?" to each element',
      'Identify decorative vs. functional elements',
      'Propose removals with justification'
    ],
    beadsTasks: [
      { title: 'Praxis: Audit [component] with Rams principles', type: 'task', labels: ['learn', 'foundations'] },
      { title: 'List elements that fail "earns existence" test', type: 'task', labels: ['learn'] },
      { title: 'Propose removal strategy with rationale', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'trace-connections',
    lessonId: 'heidegger-system',
    pathId: 'foundations',
    title: 'Trace Connections',
    description: 'Map how a component connects to and serves the larger system.',
    type: 'analysis',
    difficulty: 'intermediate',
    duration: '25 min',
    objectives: [
      'Identify dependencies and dependents',
      'Trace data flow through the system',
      'Evaluate system-level coherence'
    ],
    beadsTasks: [
      { title: 'Praxis: Trace connections for [module]', type: 'research', labels: ['learn', 'foundations'] },
      { title: 'Map upstream dependencies', type: 'task', labels: ['learn'] },
      { title: 'Map downstream dependents', type: 'task', labels: ['learn'] },
      { title: 'Evaluate system coherence—does it serve the whole?', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'triad-audit',
    lessonId: 'triad-application',
    pathId: 'foundations',
    title: 'Complete Triad Audit',
    description: 'Apply all three levels of the Subtractive Triad to a real codebase artifact.',
    type: 'triad-audit',
    difficulty: 'intermediate',
    duration: '45 min',
    objectives: [
      'Apply DRY analysis to find duplication',
      'Apply Rams analysis to question existence',
      'Apply Heidegger analysis to verify system coherence',
      'Synthesize findings into actionable recommendations'
    ],
    beadsTasks: [
      { title: 'Praxis: Complete Triad Audit of [target]', type: 'feature', labels: ['learn', 'foundations'] },
      { title: 'Level 1: DRY analysis—identify duplication', type: 'task', labels: ['learn'] },
      { title: 'Level 2: Rams analysis—question existence', type: 'task', labels: ['learn'] },
      { title: 'Level 3: Heidegger analysis—verify coherence', type: 'task', labels: ['learn'] },
      { title: 'Synthesize findings into recommendations', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ CRAFT ============
  {
    id: 'token-migration',
    lessonId: 'canon-tokens',
    pathId: 'craft',
    title: 'Token Migration',
    description: 'Convert Tailwind design utilities to Canon CSS variables.',
    type: 'code',
    difficulty: 'beginner',
    duration: '20 min',
    objectives: [
      'Identify Tailwind design utilities (colors, shadows, radii)',
      'Find corresponding Canon tokens',
      'Migrate while preserving layout utilities'
    ],
    beadsTasks: [
      { title: 'Praxis: Migrate [file] from Tailwind to Canon', type: 'task', labels: ['learn', 'craft'] },
      { title: 'Audit file for design utilities (colors, shadows, radii)', type: 'task', labels: ['learn'] },
      { title: 'Create mapping: Tailwind → Canon tokens', type: 'task', labels: ['learn'] },
      { title: 'Apply migration, preserve layout utilities', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'build-component',
    lessonId: 'component-patterns',
    pathId: 'craft',
    title: 'Build a Component',
    description: 'Create a component that embodies Canon principles—ready-to-hand, not present-at-hand.',
    type: 'code',
    difficulty: 'intermediate',
    duration: '30 min',
    objectives: [
      'Design a minimal prop interface',
      'Use Svelte 5 runes correctly',
      'Apply Canon CSS tokens for aesthetics',
      'Ensure the component "recedes into use"'
    ],
    beadsTasks: [
      { title: 'Praxis: Build [component] with Canon principles', type: 'feature', labels: ['learn', 'craft'] },
      { title: 'Design minimal prop interface', type: 'task', labels: ['learn'] },
      { title: 'Implement with Svelte 5 runes', type: 'task', labels: ['learn'] },
      { title: 'Apply Canon CSS tokens (no Tailwind design utilities)', type: 'task', labels: ['learn'] },
      { title: 'Verify component recedes into use—test with real usage', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'motion-audit',
    lessonId: 'animation-restraint',
    pathId: 'craft',
    title: 'Motion Audit',
    description: 'Analyze a page\'s animations and determine which reveal vs. distract.',
    type: 'analysis',
    difficulty: 'intermediate',
    duration: '25 min',
    objectives: [
      'Categorize animations as functional or decorative',
      'Identify animations that violate reduced-motion',
      'Propose restraint-based alternatives'
    ],
    beadsTasks: [
      { title: 'Praxis: Motion audit of [URL/page]', type: 'research', labels: ['learn', 'craft'] },
      { title: 'Catalog all animations on page', type: 'task', labels: ['learn'] },
      { title: 'Categorize each as functional or decorative', type: 'task', labels: ['learn'] },
      { title: 'Test with prefers-reduced-motion', type: 'task', labels: ['learn'] },
      { title: 'Propose restraint-based alternatives for decorative animations', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ INFRASTRUCTURE ============
  {
    id: 'd1-migration',
    lessonId: 'd1-patterns',
    pathId: 'infrastructure',
    title: 'D1 Migration',
    description: 'Write a D1 migration that follows CREATE SOMETHING patterns.',
    type: 'code',
    difficulty: 'intermediate',
    duration: '25 min',
    objectives: [
      'Design a minimal schema',
      'Write reversible migrations',
      'Apply proper indexing strategy'
    ],
    beadsTasks: [
      { title: 'Praxis: D1 migration for [feature]', type: 'task', labels: ['learn', 'infrastructure'] },
      { title: 'Design minimal schema (question every column)', type: 'task', labels: ['learn'] },
      { title: 'Write up migration', type: 'task', labels: ['learn'] },
      { title: 'Write down migration (reversible)', type: 'task', labels: ['learn'] },
      { title: 'Add indexes with justification', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'worker-service',
    lessonId: 'workers-composition',
    pathId: 'infrastructure',
    title: 'Worker Service',
    description: 'Build a Cloudflare Worker that composes cleanly with other services.',
    type: 'code',
    difficulty: 'advanced',
    duration: '40 min',
    objectives: [
      'Design a clean service interface',
      'Implement proper error handling',
      'Use service bindings for composition',
      'Follow gateway pattern principles'
    ],
    beadsTasks: [
      { title: 'Praxis: Build [service] Worker', type: 'feature', labels: ['learn', 'infrastructure'] },
      { title: 'Design service interface (inputs, outputs, errors)', type: 'task', labels: ['learn'] },
      { title: 'Implement core handler logic', type: 'task', labels: ['learn'] },
      { title: 'Add error handling with proper HTTP semantics', type: 'task', labels: ['learn'] },
      { title: 'Configure service bindings for composition', type: 'task', labels: ['learn'] },
      { title: 'Test end-to-end with wrangler dev', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ AGENTS ============
  {
    id: 'coordination-setup',
    lessonId: 'coordination-primitives',
    pathId: 'agents',
    title: 'Coordination Setup',
    description: 'Set up a work coordination system using Beads primitives.',
    type: 'design',
    difficulty: 'intermediate',
    duration: '30 min',
    objectives: [
      'Create issues with proper metadata',
      'Establish dependency relationships',
      'Set up claim patterns for work distribution'
    ],
    beadsTasks: [
      { title: 'Praxis: Set up Beads coordination for [project]', type: 'feature', labels: ['learn', 'agents'] },
      { title: 'Initialize .beads/ directory with bd init', type: 'task', labels: ['learn'] },
      { title: 'Create 3+ issues with proper labels and priority', type: 'task', labels: ['learn'] },
      { title: 'Establish dependency graph with bd dep add', type: 'task', labels: ['learn'] },
      { title: 'Test bd ready to verify unblocked work surfaces', type: 'task', labels: ['learn'] },
      { title: 'Document claim pattern for your workflow', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'ethos-config',
    lessonId: 'ethos-layer',
    pathId: 'agents',
    title: 'Ethos Configuration',
    description: 'Define an ethos layer for a project with principles, constraints, and health checks.',
    type: 'design',
    difficulty: 'advanced',
    duration: '35 min',
    objectives: [
      'Define project principles',
      'Establish constraints with enforcement',
      'Create health check criteria',
      'Set up norm-based behaviors'
    ],
    beadsTasks: [
      { title: 'Praxis: Configure ethos for [project/domain]', type: 'feature', labels: ['learn', 'agents'] },
      { title: 'Define 1+ DRY-level principle with learn_ethos', type: 'task', labels: ['learn'] },
      { title: 'Define 1+ Rams-level principle with learn_ethos', type: 'task', labels: ['learn'] },
      { title: 'Define 1+ Heidegger-level principle with learn_ethos', type: 'task', labels: ['learn'] },
      { title: 'Add constraint to enforce a principle', type: 'task', labels: ['learn'] },
      { title: 'Add health check with measurable threshold', type: 'task', labels: ['learn'] },
      { title: 'Export ethos and commit to repository', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ METHOD ============
  {
    id: 'discovery-session',
    lessonId: 'discovery-patterns',
    pathId: 'method',
    title: 'Discovery Session',
    description: 'Conduct a hermeneutic discovery session with a simulated client.',
    type: 'analysis',
    difficulty: 'intermediate',
    duration: '30 min',
    objectives: [
      'Apply the hermeneutic approach to questioning',
      'Distinguish stated needs from real needs',
      'Create discovery artifacts (problem statement, stakeholder map)'
    ],
    beadsTasks: [
      { title: 'Praxis: Discovery session for [client/project]', type: 'research', labels: ['learn', 'method'] },
      { title: 'Prepare hermeneutic questions (what, why, for whom)', type: 'task', labels: ['learn'] },
      { title: 'Conduct session—document stated needs', type: 'task', labels: ['learn'] },
      { title: 'Analyze gap between stated and real needs', type: 'task', labels: ['learn'] },
      { title: 'Create problem statement artifact', type: 'task', labels: ['learn'] },
      { title: 'Create stakeholder map artifact', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ SYSTEMS ============
  {
    id: 'template-vertical',
    lessonId: 'template-architecture',
    pathId: 'systems',
    title: 'Template Vertical',
    description: 'Design a template architecture for a specific vertical (e.g., law firm, architecture studio).',
    type: 'design',
    difficulty: 'advanced',
    duration: '45 min',
    objectives: [
      'Define structure vs. configuration boundaries',
      'Create a configuration schema',
      'Identify extension points',
      'Document constraints with rationale'
    ],
    beadsTasks: [
      { title: 'Praxis: Design template for [vertical]', type: 'feature', labels: ['learn', 'systems'] },
      { title: 'Research vertical—identify common patterns', type: 'research', labels: ['learn'] },
      { title: 'Define structure (what cannot change)', type: 'task', labels: ['learn'] },
      { title: 'Define configuration schema (what can change)', type: 'task', labels: ['learn'] },
      { title: 'Identify extension points with constraints', type: 'task', labels: ['learn'] },
      { title: 'Document rationale for each constraint', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'system-audit',
    lessonId: 'holistic-systems',
    pathId: 'systems',
    title: 'System Audit',
    description: 'Evaluate how a set of properties forms a coherent system.',
    type: 'triad-audit',
    difficulty: 'advanced',
    duration: '50 min',
    objectives: [
      'Map relationships between properties',
      'Identify gaps in the hermeneutic circle',
      'Propose structural improvements',
      'Validate against Subtractive Triad'
    ],
    beadsTasks: [
      { title: 'Praxis: System audit of [system/organization]', type: 'research', labels: ['learn', 'systems'] },
      { title: 'Map all properties and their relationships', type: 'task', labels: ['learn'] },
      { title: 'Trace hermeneutic circle—does each serve the whole?', type: 'task', labels: ['learn'] },
      { title: 'Identify gaps where circle breaks', type: 'task', labels: ['learn'] },
      { title: 'Apply Subtractive Triad to each property', type: 'task', labels: ['learn'] },
      { title: 'Propose structural improvements with rationale', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ PARTNERSHIP ============
  {
    id: 'partnership-audit',
    lessonId: 'claude-code-partnership',
    pathId: 'partnership',
    title: 'Partnership Audit',
    description: 'Evaluate how well human and agent collaborate on a task.',
    type: 'analysis',
    difficulty: 'intermediate',
    duration: '30 min',
    objectives: [
      'Identify delegation vs. collaboration moments',
      'Assess trust calibration accuracy',
      'Map complementary contributions',
      'Propose workflow improvements'
    ],
    beadsTasks: [
      { title: 'Praxis: Partnership audit of [recent session]', type: 'research', labels: ['learn', 'partnership'] },
      { title: 'Review session transcript for delegation moments', type: 'task', labels: ['learn'] },
      { title: 'Identify collaboration vs. handoff patterns', type: 'task', labels: ['learn'] },
      { title: 'Assess trust calibration—over/under-trusted?', type: 'task', labels: ['learn'] },
      { title: 'Map complementary contributions (human vs. agent)', type: 'task', labels: ['learn'] },
      { title: 'Propose workflow improvements', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'mcp-setup',
    lessonId: 'tool-configuration',
    pathId: 'partnership',
    title: 'MCP Setup',
    description: 'Configure MCP servers, skills, and hooks for a project.',
    type: 'code',
    difficulty: 'intermediate',
    duration: '40 min',
    objectives: [
      'Create an MCP server configuration',
      'Define a custom skill',
      'Set up a useful hook',
      'Validate tool integration'
    ],
    beadsTasks: [
      { title: 'Praxis: Configure MCP for [project]', type: 'feature', labels: ['learn', 'partnership'] },
      { title: 'Create .mcp.json configuration', type: 'task', labels: ['learn'] },
      { title: 'Define a domain-specific skill', type: 'task', labels: ['learn'] },
      { title: 'Set up pre-commit or validation hook', type: 'task', labels: ['learn'] },
      { title: 'Test tool integration end-to-end', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'learn-mcp-setup',
    lessonId: 'using-learn-mcp',
    pathId: 'partnership',
    title: 'Learn MCP Setup',
    description: 'Install, configure, and authenticate with Learn MCP—using the tool to learn the tool.',
    type: 'code',
    difficulty: 'beginner',
    duration: '20 min',
    objectives: [
      'Add Learn MCP to Claude Code configuration',
      'Complete magic link authentication',
      'Use learn_status to view progress',
      'Fetch and complete a lesson through the tool',
      'Reflect on the recursive experience'
    ],
    beadsTasks: [
      { title: 'Praxis: Set up Learn MCP in Claude Code', type: 'task', labels: ['learn', 'partnership'] },
      { title: 'Add MCP server to settings.json', type: 'task', labels: ['learn'] },
      { title: 'Complete magic link authentication', type: 'task', labels: ['learn'] },
      { title: 'Test learn_status and learn_lesson', type: 'task', labels: ['learn'] },
      { title: 'Define first ethos principle using learn_ethos', type: 'task', labels: ['learn'] },
      { title: 'Reflect: How does the recursive structure feel?', type: 'task', labels: ['learn'] }
    ]
  },

  // ============ ADVANCED ============
  {
    id: 'build-mcp-server',
    lessonId: 'mcp-server-development',
    pathId: 'advanced',
    title: 'Build MCP Server',
    description: 'Create a custom MCP server that composes multiple operations into a single tool.',
    type: 'code',
    difficulty: 'advanced',
    duration: '45 min',
    objectives: [
      'Design an MCP server for composed operations',
      'Implement tool definitions with proper schemas',
      'Handle JSON-RPC communication',
      'Test server with Claude Code integration'
    ],
    beadsTasks: [
      { title: 'Praxis: Build MCP server for [domain]', type: 'feature', labels: ['learn', 'advanced'] },
      { title: 'Design tool composition—what operations merge?', type: 'task', labels: ['learn'] },
      { title: 'Define JSON schema for tool inputs', type: 'task', labels: ['learn'] },
      { title: 'Implement stdio transport handler', type: 'task', labels: ['learn'] },
      { title: 'Implement tool execution logic', type: 'task', labels: ['learn'] },
      { title: 'Test with Claude Code integration', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'hook-suite',
    lessonId: 'custom-hooks',
    pathId: 'advanced',
    title: 'Hook Suite',
    description: 'Build a comprehensive hook suite that enforces your project standards.',
    type: 'code',
    difficulty: 'advanced',
    duration: '40 min',
    objectives: [
      'Implement validation hooks for code standards',
      'Create session lifecycle hooks',
      'Handle exit codes appropriately (0, 1, 2)',
      'Test hook behavior with simulated inputs'
    ],
    beadsTasks: [
      { title: 'Praxis: Build hook suite for [project]', type: 'feature', labels: ['learn', 'advanced'] },
      { title: 'Design hook architecture (which events, what actions)', type: 'task', labels: ['learn'] },
      { title: 'Implement validation hook (exit code 0/1/2)', type: 'task', labels: ['learn'] },
      { title: 'Implement session lifecycle hook', type: 'task', labels: ['learn'] },
      { title: 'Test hooks with simulated inputs', type: 'task', labels: ['learn'] },
      { title: 'Document hook behavior for team', type: 'task', labels: ['learn'] }
    ]
  },
  {
    id: 'multi-agent-system',
    lessonId: 'agent-orchestration',
    pathId: 'advanced',
    title: 'Multi-Agent System',
    description: 'Design and implement a multi-agent system for a complex task.',
    type: 'design',
    difficulty: 'advanced',
    duration: '50 min',
    objectives: [
      'Choose appropriate orchestration pattern',
      'Define agent specializations',
      'Design communication mechanism',
      'Handle coordination and error recovery'
    ],
    beadsTasks: [
      { title: 'Praxis: Design multi-agent system for [task]', type: 'feature', labels: ['learn', 'advanced'] },
      { title: 'Choose orchestration pattern (parallel, sequential, swarm)', type: 'task', labels: ['learn'] },
      { title: 'Define agent specializations and boundaries', type: 'task', labels: ['learn'] },
      { title: 'Design communication mechanism', type: 'task', labels: ['learn'] },
      { title: 'Implement coordination logic', type: 'task', labels: ['learn'] },
      { title: 'Handle error recovery and graceful degradation', type: 'task', labels: ['learn'] }
    ]
  }
];

/**
 * Get a praxis exercise by ID.
 */
export function getPraxisExercise(id: string): PraxisExercise | undefined {
  return PRAXIS_EXERCISES.find((e) => e.id === id);
}

/**
 * Get all praxis exercises for a path.
 */
export function getPraxisExercisesForPath(pathId: string): PraxisExercise[] {
  return PRAXIS_EXERCISES.filter((e) => e.pathId === pathId);
}

/**
 * Get the praxis exercise for a specific lesson.
 */
export function getPraxisExerciseForLesson(lessonId: string): PraxisExercise | undefined {
  return PRAXIS_EXERCISES.find((e) => e.lessonId === lessonId);
}
