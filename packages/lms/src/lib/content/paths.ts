/**
 * Learning Paths Configuration
 *
 * Six interconnected paths teaching the CREATE SOMETHING ethos.
 * Each path follows the hermeneutic spiral: Read → Practice → Reflect → Repeat
 */

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;  // "15 min", "30 min", etc.
  praxis?: string;   // ID of associated praxis exercise
}

export interface Path {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  principle: string;
  color: string;
  lessons: Lesson[];
  prerequisites?: string[];  // Path IDs
}

export const PATHS: Path[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    subtitle: 'The Subtractive Triad',
    description: 'The philosophical core of CREATE SOMETHING. Learn the three-level discipline of subtractive revelation.',
    principle: 'Creation is the discipline of removing what obscures.',
    color: 'path-foundations',
    lessons: [
      {
        id: 'what-is-creation',
        title: 'What is Creation?',
        description: 'Understanding creation as subtraction, not addition.',
        duration: '15 min',
      },
      {
        id: 'dry-implementation',
        title: 'DRY: Implementation Level',
        description: 'Have I built this before? The discipline of unifying.',
        duration: '20 min',
        praxis: 'identify-duplication',
      },
      {
        id: 'rams-artifact',
        title: 'Rams: Artifact Level',
        description: 'Does this earn its existence? The discipline of removing.',
        duration: '25 min',
        praxis: 'audit-artifact',
      },
      {
        id: 'heidegger-system',
        title: 'Heidegger: System Level',
        description: 'Does this serve the whole? The discipline of reconnecting.',
        duration: '30 min',
        praxis: 'trace-connections',
      },
      {
        id: 'triad-application',
        title: 'Applying the Triad',
        description: 'Using all three levels together in real decisions.',
        duration: '45 min',
        praxis: 'triad-audit',
      },
    ],
  },
  {
    id: 'craft',
    title: 'Craft',
    subtitle: 'SvelteKit + Canon CSS',
    description: 'Building interfaces the CREATE SOMETHING way. Tailwind for structure, Canon for aesthetics.',
    principle: 'The interface disappears; the content remains.',
    color: 'path-craft',
    prerequisites: ['foundations'],
    lessons: [
      {
        id: 'sveltekit-philosophy',
        title: 'SvelteKit Philosophy',
        description: 'Why SvelteKit aligns with subtractive design.',
        duration: '20 min',
      },
      {
        id: 'canon-tokens',
        title: 'Canon Design Tokens',
        description: 'The semantic token system for consistent aesthetics.',
        duration: '25 min',
        praxis: 'token-migration',
      },
      {
        id: 'component-patterns',
        title: 'Component Patterns',
        description: 'Building components that recede into use.',
        duration: '30 min',
        praxis: 'build-component',
      },
      {
        id: 'layout-architecture',
        title: 'Layout Architecture',
        description: 'Route structures that serve the content.',
        duration: '25 min',
      },
      {
        id: 'animation-restraint',
        title: 'Animation with Restraint',
        description: 'Motion that reveals, not distracts.',
        duration: '20 min',
        praxis: 'motion-audit',
      },
    ],
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    subtitle: 'Cloudflare Workers/D1/KV',
    description: 'Edge-first architecture where infrastructure disappears into capability.',
    principle: 'The infrastructure disappears; only the work remains.',
    color: 'path-infrastructure',
    prerequisites: ['foundations'],
    lessons: [
      {
        id: 'edge-philosophy',
        title: 'Edge Philosophy',
        description: 'Why edge-first matters for subtractive design.',
        duration: '15 min',
      },
      {
        id: 'd1-patterns',
        title: 'D1 Database Patterns',
        description: 'SQLite at the edge—simplicity as feature.',
        duration: '30 min',
        praxis: 'd1-migration',
      },
      {
        id: 'kv-caching',
        title: 'KV Caching Strategies',
        description: 'When and how to cache at the edge.',
        duration: '25 min',
      },
      {
        id: 'workers-composition',
        title: 'Workers Composition',
        description: 'Building services that compose cleanly.',
        duration: '35 min',
        praxis: 'worker-service',
      },
      {
        id: 'deployment-patterns',
        title: 'Deployment Patterns',
        description: 'Making deployment invisible.',
        duration: '20 min',
      },
    ],
  },
  {
    id: 'agents',
    title: 'Agents',
    subtitle: 'Coordination + Claude Code',
    description: 'Multi-agent systems that reason together. The tool recedes; the swarm works.',
    principle: 'The tool recedes; the swarm reasons.',
    color: 'path-agents',
    prerequisites: ['foundations', 'infrastructure'],
    lessons: [
      {
        id: 'agent-philosophy',
        title: 'Agent Philosophy',
        description: 'Zuhandenheit for AI—tools that disappear into use.',
        duration: '20 min',
      },
      {
        id: 'coordination-primitives',
        title: 'Coordination Primitives',
        description: 'Issues, claims, dependencies—the graph of work.',
        duration: '30 min',
        praxis: 'coordination-setup',
      },
      {
        id: 'priority-algorithms',
        title: 'Priority Algorithms',
        description: 'PageRank, Critical Path, and impact scoring.',
        duration: '25 min',
      },
      {
        id: 'ethos-layer',
        title: 'The Ethos Layer',
        description: 'Health monitoring and self-correction.',
        duration: '30 min',
        praxis: 'ethos-config',
      },
      {
        id: 'hierarchical-telos',
        title: 'Hierarchical Telos',
        description: 'Ethos, projects, and issues—the three levels.',
        duration: '35 min',
      },
    ],
  },
  {
    id: 'method',
    title: 'Method',
    subtitle: 'WORKWAY Professional Services',
    description: 'Delivering value through the CREATE SOMETHING methodology. Being-as-Service.',
    principle: 'Value emerges through disciplined practice.',
    color: 'path-method',
    prerequisites: ['foundations'],
    lessons: [
      {
        id: 'workway-philosophy',
        title: 'WORKWAY Philosophy',
        description: 'Service as craft—the professional ethos.',
        duration: '20 min',
      },
      {
        id: 'discovery-patterns',
        title: 'Discovery Patterns',
        description: 'Understanding client needs through the hermeneutic lens.',
        duration: '30 min',
        praxis: 'discovery-session',
      },
      {
        id: 'scoping-discipline',
        title: 'Scoping Discipline',
        description: 'Subtractive scoping—less, but better.',
        duration: '25 min',
      },
      {
        id: 'delivery-rhythm',
        title: 'Delivery Rhythm',
        description: 'Sustainable pace and continuous value.',
        duration: '20 min',
      },
      {
        id: 'client-education',
        title: 'Client Education',
        description: 'Teaching the principles while delivering work.',
        duration: '25 min',
      },
    ],
  },
  {
    id: 'systems',
    title: 'Systems',
    subtitle: 'Templates + Automations',
    description: 'Building systems that multiply capability while maintaining simplicity.',
    principle: 'Weniger, aber besser.',
    color: 'path-systems',
    prerequisites: ['craft', 'infrastructure'],
    lessons: [
      {
        id: 'template-philosophy',
        title: 'Template Philosophy',
        description: 'Templates as compressed understanding.',
        duration: '20 min',
      },
      {
        id: 'template-architecture',
        title: 'Template Architecture',
        description: 'Building templates that adapt without complexity.',
        duration: '35 min',
        praxis: 'template-vertical',
      },
      {
        id: 'automation-patterns',
        title: 'Automation Patterns',
        description: 'Automating without creating fragility.',
        duration: '30 min',
      },
      {
        id: 'platform-integration',
        title: 'Platform Integration',
        description: 'Connecting systems that complement, not complicate.',
        duration: '25 min',
      },
      {
        id: 'holistic-systems',
        title: 'Holistic Systems',
        description: 'The hermeneutic circle of interconnected properties.',
        duration: '40 min',
        praxis: 'system-audit',
      },
    ],
  },
  {
    id: 'partnership',
    title: 'Partnership',
    subtitle: 'Terminal + Claude Code',
    description: 'Learning to work alongside AI agents. The craftsman uses the hammer; the hammer does not use him.',
    principle: 'Gelassenheit—full engagement without capture.',
    color: 'path-partnership',
    prerequisites: ['foundations', 'agents'],
    lessons: [
      {
        id: 'terminal-philosophy',
        title: 'Terminal Philosophy',
        description: 'The command line as dwelling place for creation.',
        duration: '20 min',
      },
      {
        id: 'claude-code-partnership',
        title: 'Claude Code Partnership',
        description: 'Human-agent complementarity—what each does best.',
        duration: '30 min',
        praxis: 'partnership-audit',
      },
      {
        id: 'tool-configuration',
        title: 'Tool Configuration',
        description: 'MCP servers, skills, hooks, and slash commands.',
        duration: '35 min',
        praxis: 'mcp-setup',
      },
      {
        id: 'wezterm-workflow',
        title: 'WezTerm Workflow',
        description: 'Terminal as creative environment.',
        duration: '25 min',
      },
      {
        id: 'system-philosophy',
        title: 'System Philosophy',
        description: 'Gelassenheit and the craft of human-agent partnership.',
        duration: '30 min',
      },
    ],
  },
];

/**
 * Get a path by ID.
 */
export function getPath(id: string): Path | undefined {
  return PATHS.find((p) => p.id === id);
}

/**
 * Get a lesson by path and lesson ID.
 */
export function getLesson(pathId: string, lessonId: string): Lesson | undefined {
  const path = getPath(pathId);
  return path?.lessons.find((l) => l.id === lessonId);
}

/**
 * Get all lessons across all paths.
 */
export function getAllLessons(): Array<Lesson & { pathId: string }> {
  return PATHS.flatMap((path) =>
    path.lessons.map((lesson) => ({ ...lesson, pathId: path.id }))
  );
}

/**
 * Get paths available to a learner (based on completed prerequisites).
 */
export function getAvailablePaths(completedPaths: string[]): Path[] {
  return PATHS.filter((path) => {
    if (!path.prerequisites) return true;
    return path.prerequisites.every((prereq) => completedPaths.includes(prereq));
  });
}
