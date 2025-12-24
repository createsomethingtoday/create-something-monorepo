/**
 * Learning Module Catalog Configuration
 *
 * Modeled after the plugin catalog pattern from packages/io.
 * Each module is an installable learning unit that users can enable/disable.
 * This is the single source of truth for the module marketplace.
 */

export interface Module {
  slug: string;                    // URL-safe unique identifier
  name: string;                    // Display name
  description: string;             // One-line summary
  category: string;                // Learning Style | Certification | Specialization
  tags: string[];                  // Searchable tags (e.g., "advanced", "sveltekit")
  features: string[];              // Bullet-point learning outcomes
  duration?: string;               // Total time (e.g., "4 hours")
  difficulty?: string;             // beginner | intermediate | advanced
  version?: string;                // Semantic version
  lastUpdated?: string;            // ISO date string
  relatedModules?: string[];       // Array of related module slugs
  examples?: ModuleExample[];       // Example lesson snippets
}

export interface ModuleExample {
  title: string;
  description: string;
  lessonId?: string;              // Link to actual lesson if exists
}

/**
 * All modules in the catalog.
 * Order here becomes display order (though later we'll support custom sorting).
 */
export const MODULES: Module[] = [
  {
    slug: 'subtractive-foundation',
    name: 'Subtractive Foundation',
    description: 'Master the core philosophy—DRY, Rams, and Heidegger at every scale.',
    category: 'Learning Style',
    tags: ['philosophy', 'foundations', 'beginner', 'core'],
    features: [
      'Understand the Subtractive Triad framework',
      'Apply DRY at implementation level',
      'Apply Rams at artifact level',
      'Apply Heidegger at system level',
      'Use the three-question decision framework',
    ],
    duration: '3 hours',
    difficulty: 'beginner',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['canon-design', 'system-thinking'],
    examples: [
      {
        title: 'The Three Questions',
        description: 'Learning how to apply DRY, Rams, and Heidegger to every decision',
        lessonId: 'triad-application',
      },
      {
        title: 'Weniger, aber besser',
        description: 'Understanding Dieter Rams principle as artifact discipline',
      },
    ],
  },
  {
    slug: 'canon-design',
    name: 'Canon Design System',
    description: 'Learn to build interfaces that recede into use through semantic tokens and Canon aesthetics.',
    category: 'Specialization',
    tags: ['design', 'css', 'tokens', 'sveltekit', 'intermediate'],
    features: [
      'Understand token architecture and semantic design',
      'Use Canon CSS tokens for colors, typography, and motion',
      'Implement Tailwind for structure, Canon for aesthetics',
      'Build accessible interfaces with WCAG AA compliance',
      'Respect user preferences: prefers-reduced-motion, prefers-contrast',
    ],
    duration: '5 hours',
    difficulty: 'intermediate',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['sveltekit-craft', 'animation-restraint'],
    examples: [
      {
        title: 'Design Tokens',
        description: 'Working with --color-fg-primary and semantic colors',
        lessonId: 'canon-tokens',
      },
      {
        title: 'Component Patterns',
        description: 'Building components using Canon + Tailwind hybrid approach',
        lessonId: 'component-patterns',
      },
    ],
  },
  {
    slug: 'sveltekit-craft',
    name: 'SvelteKit Craft',
    description: 'Build applications the CREATE SOMETHING way—interfaces that disappear into capability.',
    category: 'Specialization',
    tags: ['sveltekit', 'craft', 'intermediate', 'web-dev'],
    features: [
      'Master SvelteKit route patterns and server load functions',
      'Implement server-side rendering for performance',
      'Work with Cloudflare D1 and KV bindings',
      'Build progressive components with Svelte 5 runes',
      'Deploy to Cloudflare Pages with zero config friction',
    ],
    duration: '6 hours',
    difficulty: 'intermediate',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['edge-infrastructure', 'canvas-responsive'],
    examples: [
      {
        title: 'SvelteKit Philosophy',
        description: 'Why SvelteKit aligns with subtractive design principles',
        lessonId: 'sveltekit-philosophy',
      },
      {
        title: 'Layout Architecture',
        description: 'Route structures that serve the content',
        lessonId: 'layout-architecture',
      },
    ],
  },
  {
    slug: 'edge-infrastructure',
    name: 'Edge Infrastructure',
    description: 'Deploy at the edge where infrastructure recedes—D1, KV, Workers, and Pages in concert.',
    category: 'Specialization',
    tags: ['infrastructure', 'cloudflare', 'advanced', 'devops'],
    features: [
      'Understand edge-first philosophy and performance benefits',
      'Design D1 schemas for serverless SQLite',
      'Implement KV caching strategies for consistency',
      'Compose Workers services that work together',
      'Deploy to Cloudflare Pages with custom domains',
    ],
    duration: '7 hours',
    difficulty: 'advanced',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['sveltekit-craft', 'agent-coordination'],
    examples: [
      {
        title: 'Edge Philosophy',
        description: 'Why edge-first matters for subtractive design',
        lessonId: 'edge-philosophy',
      },
      {
        title: 'D1 Patterns',
        description: 'SQLite at the edge—simplicity as feature',
        lessonId: 'd1-patterns',
      },
    ],
  },
  {
    slug: 'agent-coordination',
    name: 'Agent Coordination',
    description: 'Build multi-agent systems using Beads, Ethos, and coordination primitives.',
    category: 'Specialization',
    tags: ['agents', 'beads', 'advanced', 'orchestration'],
    features: [
      'Master Beads issue tracking for human-agent collaboration',
      'Use priority algorithms: PageRank, Critical Path, impact scoring',
      'Implement the Ethos Layer for self-correction',
      'Design hierarchical telos: Ethos → Projects → Issues',
      'Orchestrate harness sessions with checkpoints and failure recovery',
    ],
    duration: '8 hours',
    difficulty: 'advanced',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['subtractive-foundation', 'system-thinking'],
    examples: [
      {
        title: 'Agent Philosophy',
        description: 'Zuhandenheit for AI—tools that disappear into use',
        lessonId: 'agent-philosophy',
      },
      {
        title: 'Coordination Primitives',
        description: 'Issues, claims, dependencies—the graph of work',
        lessonId: 'coordination-primitives',
      },
    ],
  },
  {
    slug: 'animation-restraint',
    name: 'Animation with Restraint',
    description: 'Use motion that reveals state, not decorates—purposeful animation aligned with Canon.',
    category: 'Learning Style',
    tags: ['animation', 'design', 'motion', 'intermediate'],
    features: [
      'Understand purposeful vs decorative motion',
      'Master Canon timing tokens: --duration-micro/standard/complex',
      'Implement consistent easing with --ease-standard',
      'Respect prefers-reduced-motion for accessibility',
      'Build motion language that guides rather than distracts',
    ],
    duration: '3 hours',
    difficulty: 'intermediate',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['canon-design'],
    examples: [
      {
        title: 'Animation Audit',
        description: 'Analyzing existing animations for restraint and purpose',
        lessonId: 'motion-audit',
      },
    ],
  },
  {
    slug: 'system-thinking',
    name: 'System Thinking',
    description: 'View CREATE SOMETHING as an interconnected whole—the hermeneutic circle from .ltd to .agency.',
    category: 'Learning Style',
    tags: ['systems', 'philosophy', 'hermeneutics', 'advanced'],
    features: [
      'Understand the hermeneutic circle across properties',
      'See how .ltd (philosophy) informs all others',
      'Recognize feedback loops: practice discovers, research validates, services test',
      'Apply system-level thinking to architecture decisions',
      'Contribute to the whole rather than siloing work',
    ],
    duration: '4 hours',
    difficulty: 'advanced',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['subtractive-foundation', 'agent-coordination'],
    examples: [
      {
        title: 'Holistic Systems',
        description: 'The hermeneutic circle of interconnected properties',
        lessonId: 'holistic-systems',
      },
    ],
  },
  {
    slug: 'canvas-responsive',
    name: 'Canvas & Responsive Design',
    description: 'Master responsive layouts using Tailwind utilities and Canon semantics.',
    category: 'Specialization',
    tags: ['responsive', 'design', 'tailwind', 'beginner'],
    features: [
      'Use Tailwind responsive prefixes: sm:, md:, lg:, xl:',
      'Implement mobile-first design with CSS Grid and Flexbox',
      'Respect content-driven breakpoints over device breakpoints',
      'Balance utility classes with semantic CSS',
      'Test accessibility at different viewport sizes',
    ],
    duration: '3 hours',
    difficulty: 'beginner',
    version: '1.0.0',
    lastUpdated: '2025-12-20T00:00:00Z',
    relatedModules: ['canon-design'],
    examples: [
      {
        title: 'Responsive Patterns',
        description: 'Common responsive layouts with Tailwind',
      },
    ],
  },
];

/**
 * Get a module by slug.
 */
export function getModule(slug: string): Module | undefined {
  return MODULES.find((m) => m.slug === slug);
}

/**
 * Get modules by category.
 */
export function getModulesByCategory(category: string): Module[] {
  return MODULES.filter((m) => m.category === category);
}

/**
 * Get all unique categories from modules.
 */
export function getModuleCategories(): string[] {
  return Array.from(new Set(MODULES.map((m) => m.category))).sort();
}

/**
 * Get related modules for a given module.
 */
export function getRelatedModules(slug: string): Module[] {
  const module = getModule(slug);
  if (!module || !module.relatedModules) return [];

  return module.relatedModules
    .map((relatedSlug) => getModule(relatedSlug))
    .filter((m) => m !== undefined) as Module[];
}

/**
 * Search modules by tag.
 */
export function getModulesByTag(tag: string): Module[] {
  return MODULES.filter((m) => m.tags.includes(tag.toLowerCase()));
}
