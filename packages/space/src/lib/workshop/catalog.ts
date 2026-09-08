export const projectKinds = [
  'System',
  'Workflow',
  'Skill',
  'Plugin',
  'Tool',
  'Building block'
] as const;
export type ProjectKind = (typeof projectKinds)[number];
export interface WorkshopProject {
  slug: string;
  name: string;
  kind: ProjectKind;
  summary: string;
  source: string;
  usage: string;
  limit: string;
  related: string[];
  image: string;
  featured: boolean;
  distribution: 'Package' | 'Source' | 'Plugin';
  install?: string;
}
/** Curated public destinations; this is not the private discovery inventory. */
export const projects: WorkshopProject[] = [
  {
    slug: 'ground',
    name: 'Ground',
    kind: 'System',
    summary: 'Check the code before trusting the claim.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ground',
    usage:
      'Use code verification to inspect duplicate, dead-code, and orphan findings with evidence from your codebase. Use the CLI, MCP server, or GitHub Action.',
    limit:
      'Analysis is advisory. Review findings before changing code. Check the package documentation for supported platforms.',
    related: ['policy-os', 'triad-review'],
    image: '/images/workshop/ground-instrument.webp',
    featured: true,
    distribution: 'Package',
    install: 'https://www.npmjs.com/package/@createsomething/ground-mcp'
  },
  {
    slug: 'workflow-compiler',
    name: 'Workflow Compiler',
    kind: 'Workflow',
    summary: 'Turn one workflow definition into plans you can inspect and verify.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/workflow-compiler',
    usage:
      'Define a recurring task, compile its boundaries and run deterministic checks before connecting execution. Includes a paired Codex skill.',
    limit: 'The compiler does not call providers or grant access to the systems in your workflow.',
    related: ['workflow-runtime', 'policy-os'],
    image: '/images/workshop/workflow-instrument.webp',
    featured: true,
    distribution: 'Package',
    install: 'https://www.npmjs.com/package/@createsomething/workflow-compiler'
  },
  {
    slug: 'three-tier-framework',
    name: 'Three-Tier Framework',
    kind: 'Skill',
    summary: 'Understand what stores state, what acts, and who decides.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/pi-three-tier-framework',
    usage:
      'Install the Pi package to classify a system through Database, Automation, and Judgment. Includes deep-module-design.',
    limit: 'A design method and agent guidance; it does not operate your systems.',
    related: ['deep-module-design', 'policy-os'],
    image: '/images/workshop/open-workshop.webp',
    featured: true,
    distribution: 'Package',
    install: 'https://www.npmjs.com/package/@createsomething/pi-three-tier-framework'
  },
  {
    slug: 'policy-os',
    name: 'Policy OS starter',
    kind: 'Skill',
    summary: 'Give agent work a clear scope, feedback loop, and finish line.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/pi-policy-os',
    usage:
      'Start with intent mapping, test-first slices, and debugging guidance packaged for Pi agents.',
    limit:
      'The starter supplies guidance and quality gates. Hosting and managed operation are separate.',
    related: ['intent-mapping', 'debug-feedback-loop', 'tdd-vertical-slice'],
    image: '/images/workshop/workflow-instrument.webp',
    featured: true,
    distribution: 'Package',
    install: 'https://www.npmjs.com/package/@createsomething/pi-policy-os'
  },
  {
    slug: 'template-preflight',
    name: 'Webflow Template Preflight',
    kind: 'Tool',
    summary: 'Check a template before sending it for review.',
    source: 'https://github.com/createsomethingtoday/webflow-template-preflight',
    usage:
      'Use the creator checklist, Claude skill, and structural HTML checks to prepare a template submission.',
    limit: 'Preflight helps preparation; it does not guarantee Marketplace acceptance.',
    related: [],
    image: '/images/workshop/ground-instrument.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'app-preflight',
    name: 'Webflow App Preflight',
    kind: 'Tool',
    summary: 'Prepare an app bundle and inspect its production runtime.',
    source: 'https://github.com/createsomethingtoday/webflow-app-preflight',
    usage:
      'Follow the public app preflight instructions for bundle checks and server-owned runtime validation.',
    limit:
      'Requires the app and its configuration. Final review and acceptance remain with Webflow.',
    related: ['template-preflight'],
    image: '/images/workshop/ground-instrument.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'canon-plugin',
    name: 'Canon',
    kind: 'Plugin',
    summary: 'Keep design decisions consistent with the system.',
    source: 'https://github.com/createsomethingtoday/claude-plugins',
    usage: 'Audit CSS and design-token use with the Canon methodology plugin.',
    limit:
      'Claude Code plugin. Follow the repository installation instructions; review the guidance for your project.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Plugin'
  },
  {
    slug: 'triad-review',
    name: 'Hermeneutic Review',
    kind: 'Plugin',
    summary: 'Review code through reuse, subtraction, and context.',
    source: 'https://github.com/createsomethingtoday/claude-plugins',
    usage:
      'Use a three-pass review: identify duplication, question additions, and check how the change fits the system.',
    limit:
      'Claude Code plugin. Follow the repository installation instructions; review the guidance for your project.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Plugin'
  },
  {
    slug: 'voice-validator',
    name: 'Voice Validator',
    kind: 'Plugin',
    summary: 'Make writing clear, specific, and grounded.',
    source: 'https://github.com/createsomethingtoday/claude-plugins',
    usage: 'Review prose for vague claims, needless jargon, and missing evidence.',
    limit:
      'Claude Code plugin. Follow the repository installation instructions; review the guidance for your project.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Plugin'
  },
  {
    slug: 'understanding-graphs',
    name: 'Understanding Graphs',
    kind: 'Plugin',
    summary: 'Document the dependencies that explain a codebase.',
    source: 'https://github.com/createsomethingtoday/claude-plugins',
    usage: 'Build a small map of relationships that matter for understanding and changing code.',
    limit:
      'Claude Code plugin. Follow the repository installation instructions; review the guidance for your project.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Plugin'
  },
  {
    slug: 'intent-mapping',
    name: 'Intent Mapping',
    kind: 'Skill',
    summary: 'Resolve the decisions that change the work.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/pi-policy-os/skills/intent-mapping',
    usage: 'Turn a fuzzy request into a concrete goal, scope, verification plan, and handoff.',
    limit:
      'Included in a Pi package. Review its repository-specific instructions before adapting it to another environment.',
    related: ['policy-os'],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'debug-feedback-loop',
    name: 'Debug Feedback Loop',
    kind: 'Skill',
    summary: 'Reproduce a failure, then follow the evidence.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/pi-policy-os/skills/debug-feedback-loop',
    usage: 'Give an agent a repeatable debugging loop with an observable failing case.',
    limit:
      'Included in a Pi package. Review its repository-specific instructions before adapting it to another environment.',
    related: ['policy-os'],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'tdd-vertical-slice',
    name: 'TDD Vertical Slice',
    kind: 'Skill',
    summary: 'Prove one behavior before expanding the change.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/pi-policy-os/skills/tdd-vertical-slice',
    usage: 'Work through a thin user-visible behavior with a test-first feedback loop.',
    limit:
      'Included in a Pi package. Review its repository-specific instructions before adapting it to another environment.',
    related: ['policy-os'],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'deep-module-design',
    name: 'Deep Module Design',
    kind: 'Skill',
    summary: 'Make useful behavior easier to understand and change.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/pi-three-tier-framework/skills/deep-module-design',
    usage: 'Review module boundaries, interfaces, locality, and testability.',
    limit:
      'Included in a Pi package. Review its repository-specific instructions before adapting it to another environment.',
    related: ['three-tier-framework'],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'ascii-renderer',
    name: 'ASCII Renderer',
    kind: 'Building block',
    summary: 'Render images with character shape, not brightness alone.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/ascii-renderer',
    usage: 'Explore six-dimensional character matching and contrast enhancement.',
    limit: 'Source library. Review attribution, dependencies, and examples before integrating.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'simulation',
    name: 'Simulation',
    kind: 'Building block',
    summary: 'Make a demo repeatable with seeded, time-aware behavior.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/simulation',
    usage: 'Use the Rust/WASM simulation engine to generate consistent demo states.',
    limit: 'Synthetic demo behavior is not production evidence.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'spritz',
    name: 'Spritz',
    kind: 'Building block',
    summary: 'Present text one word at a time.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/spritz',
    usage: 'Explore a reusable RSVP text component for reading interfaces and video sequences.',
    limit:
      'Choose this presentation for your audience; it does not establish reading or accessibility benefits.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'canon-tokens',
    name: 'Canon Tokens',
    kind: 'Building block',
    summary: 'Bring a consistent set of design values into your interface.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/canon-tokens',
    usage: 'Inspect framework-independent CSS tokens for spacing, color, and surfaces.',
    limit:
      'Source reference. Check contrast in the rendered context and verify packaging before installation.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'tufte',
    name: 'Tufte',
    kind: 'Building block',
    summary: 'Build displays that put quantitative information first.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/tufte',
    usage: 'Explore data-visualization components and their examples.',
    limit: 'Source library; review its workspace dependencies before reuse.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'render-pipeline',
    name: 'Render Pipeline',
    kind: 'Building block',
    summary: 'Bind a rendered artifact to its recipe and source.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/render-pipeline',
    usage: 'Inspect render recipes, asset hashes, GLB analysis, and output receipts.',
    limit: 'Local rendering needs the documented tools and assets you have permission to use.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'workflow-runtime',
    name: 'Workflow Runtime',
    kind: 'Building block',
    summary: 'Execute verified workflow artifacts through a deterministic core.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/workflow-runtime',
    usage: 'Inspect the provider-neutral runtime beneath compiled workflows.',
    limit:
      'Source module; external systems require their own adapters and access. Reference fixtures are not live results.',
    related: [],
    image: '/images/workshop/workflow-instrument.webp',
    featured: false,
    distribution: 'Source'
  },
  {
    slug: 'mcp-core',
    name: 'MCP Core',
    kind: 'Building block',
    summary: 'Keep tools and resources scoped to an account.',
    source:
      'https://github.com/createsomethingtoday/create-something-monorepo/tree/main/packages/mcp-core',
    usage:
      'Explore account context, authorization providers, scoped servers, and token-store adapters.',
    limit:
      'Source module. Integration requires an explicit access policy and configured credentials; none are supplied.',
    related: [],
    image: '/images/workshop/open-workshop.webp',
    featured: false,
    distribution: 'Source'
  }
];
export function filterProjects(query = '', kind = ''): WorkshopProject[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return projects.filter(
    (project) =>
      (!kind || project.kind === kind) &&
      terms.every((term) =>
        `${project.name} ${project.kind} ${project.summary} ${project.usage}`
          .toLowerCase()
          .includes(term)
      )
  );
}
export const workbenchTools = [
  {
    name: 'Code Playground',
    href: '/playground',
    description: 'Run JavaScript and inspect the output.'
  },
  {
    name: 'Praxis',
    href: '/praxis',
    description: 'Practice integration patterns through guided challenges.'
  },
  {
    name: 'Motion Lab',
    href: '/motion',
    description: 'Inspect animation timing and motion patterns.'
  },
  { name: 'Data Studio', href: '/data', description: 'Explore datasets and basketball analysis.' },
  { name: 'Discover', href: '/discover', description: 'Follow connections between concepts.' }
];
