/**
 * Praxis Exercises Configuration
 *
 * Hands-on exercises that accompany lessons.
 * Each exercise has a type that determines the UI component used.
 */

export type ExerciseType = 'triad-audit' | 'code' | 'analysis' | 'design';

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
