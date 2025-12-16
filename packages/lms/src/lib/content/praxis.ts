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
  /**
   * Claude Code prompt to guide building YOUR OWN version.
   * Copy-paste into Claude Code to start the exercise.
   */
  claudeCodePrompt?: string;
}

export const PRAXIS_EXERCISES: PraxisExercise[] = [
  // ============ GETTING STARTED ============
  {
    id: 'claude-code-first-session',
    lessonId: 'install-claude-code',
    pathId: 'getting-started',
    title: 'First Claude Code Session',
    description: 'Install the CLI and run your first agentic session.',
    type: 'code',
    difficulty: 'beginner',
    duration: '15 min',
    objectives: [
      'Install Claude Code CLI',
      'Authenticate with Anthropic',
      'Run first prompt in a codebase',
      'Understand the partnership model'
    ],
    beadsTasks: [
      { title: 'Install Claude Code CLI', type: 'task', labels: ['learn', 'getting-started'] },
      { title: 'Authenticate with Anthropic API', type: 'task', labels: ['learn'] },
      { title: 'Run first prompt in a project', type: 'task', labels: ['learn'] },
      { title: 'Explore slash commands (/help, /status)', type: 'task', labels: ['learn'] }
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Install Claude Code CLI" --type=task --labels=learn,getting-started
bd create "Authenticate with Anthropic API" --type=task --labels=learn
bd create "Run first prompt in a project" --type=task --labels=learn
bd create "Explore slash commands" --type=task --labels=learn
\`\`\`

---

Help me set up Claude Code CLI on my system.

Walk me through:
1. Installing the claude CLI (npm install -g @anthropic-ai/claude-code)
2. Authenticating—I'll use [Claude Max plan / API key]
   - Max plan: authenticate via claude.ai account (recommended)
   - API key: get from console.anthropic.com
3. Running my first prompt in an existing project
4. Understanding key slash commands (/help, /status, /clear)

After setup, explain the partnership model:
- What Claude Code handles well (code generation, exploration, multi-file changes)
- What I should handle (judgment calls, creative direction, domain expertise)
- How to calibrate trust over time

My operating system: [macOS/Linux/Windows]
My auth method: [Claude Max / API key]`
  },
  {
    id: 'wezterm-setup',
    lessonId: 'configure-wezterm',
    pathId: 'getting-started',
    title: 'Configure WezTerm',
    description: 'Use Claude Code to apply Canon colors and vim-native keybindings.',
    type: 'code',
    difficulty: 'beginner',
    duration: '20 min',
    objectives: [
      'Apply Canon color palette',
      'Configure vim-native keybindings',
      'Set up splits and tabs',
      'Verify terminal recedes into use'
    ],
    beadsTasks: [
      { title: 'Clone/symlink dotfiles config', type: 'task', labels: ['learn', 'getting-started'] },
      { title: 'Verify Canon colors applied', type: 'task', labels: ['learn'] },
      { title: 'Test keybindings (splits, tabs, navigation)', type: 'task', labels: ['learn'] },
      { title: 'Restart WezTerm and verify', type: 'task', labels: ['learn'] }
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Clone/symlink dotfiles config" --type=task --labels=learn,getting-started
bd create "Verify Canon colors applied" --type=task --labels=learn
bd create "Test keybindings (splits, tabs, navigation)" --type=task --labels=learn
bd create "Restart WezTerm and verify" --type=task --labels=learn
\`\`\`

---

Help me configure WezTerm with the CREATE SOMETHING Canon theme.

WezTerm is already installed. Now I need:
1. Canon color palette (pure black background, white/opacity foreground hierarchy)
2. Vim-native keybindings matching my other tools
3. Fast startup, minimal UI chrome

Walk me through:
- Creating or symlinking the WezTerm config file
- Canon color tokens to apply
- Key keybindings I should learn (Ctrl-based for splits/tabs)
- How to verify it's working (the terminal should "disappear" into use)

My operating system: [macOS/Linux/Windows]
Config location: ~/.wezterm.lua or ~/.config/wezterm/wezterm.lua`
  },
  {
    id: 'beads-setup',
    lessonId: 'install-beads',
    pathId: 'getting-started',
    title: 'Set Up Beads',
    description: 'Use Claude Code to install Beads and create your first task.',
    type: 'code',
    difficulty: 'beginner',
    duration: '15 min',
    objectives: [
      'Install Beads CLI',
      'Initialize .beads/ in a project',
      'Create and complete a task',
      'Learn the workflow: create → work → close → sync'
    ],
    beadsTasks: [
      { title: 'Install Beads CLI', type: 'task', labels: ['learn', 'getting-started'] },
      { title: 'Run bd init in a project', type: 'task', labels: ['learn'] },
      { title: 'Create first task with bd create', type: 'task', labels: ['learn'] },
      { title: 'Complete task with bd close', type: 'task', labels: ['learn'] }
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Install Beads CLI" --type=task --labels=learn,getting-started
bd create "Run bd init in a project" --type=task --labels=learn
bd create "Create first task with bd create" --type=task --labels=learn
bd create "Complete task with bd close" --type=task --labels=learn
\`\`\`

---

Help me install Beads and set up agent-native task tracking.

I want to:
1. Install the Beads CLI (bd command)
2. Initialize Beads in my current project
3. Create a few test tasks
4. Learn the core workflow: create → work → close → sync

Walk me through each step. After installation, help me understand:
- How bd ready surfaces unblocked work
- How bd dep add creates dependencies
- How bd sync integrates with git

My operating system: [macOS/Linux]
My project directory: [YOUR_PROJECT_PATH]`
  },
  {
    id: 'neomutt-setup',
    lessonId: 'configure-neomutt',
    pathId: 'getting-started',
    title: 'Configure Neomutt',
    description: 'Set up terminal email with Canon colors and vim keybindings.',
    type: 'code',
    difficulty: 'intermediate',
    duration: '25 min',
    objectives: [
      'Install Neomutt',
      'Configure first email account (Gmail/Google Workspace)',
      'Apply Canon color scheme',
      'Learn core navigation and actions'
    ],
    beadsTasks: [
      { title: 'Install Neomutt', type: 'task', labels: ['learn', 'getting-started'] },
      { title: 'Create Google App Password', type: 'task', labels: ['learn'] },
      { title: 'Configure first account', type: 'task', labels: ['learn'] },
      { title: 'Apply dotfiles config (colors, bindings)', type: 'task', labels: ['learn'] },
      { title: 'Send test email', type: 'task', labels: ['learn'] }
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Install Neomutt" --type=task --labels=learn,getting-started
bd create "Create Google App Password" --type=task --labels=learn
bd create "Configure first account" --type=task --labels=learn
bd create "Apply dotfiles config" --type=task --labels=learn
bd create "Send test email" --type=task --labels=learn
\`\`\`

---

Help me set up Neomutt for terminal-based email.

I want:
1. Neomutt installed
2. My Gmail/Google Workspace account configured
3. Canon color scheme applied
4. Vim-native keybindings

Walk me through:
- Installation for my OS
- Creating a Google App Password (for IMAP/SMTP auth)
- Setting up my first account config
- Symlinking the dotfiles config for colors and keybindings
- Core keybindings: navigation (j/k), actions (r/f/d), go-to (gi/gs/gd)

My email: [YOUR_EMAIL]
My operating system: [macOS/Linux]`
  },

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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Identify duplication in [target]" --type=task --labels=learn,foundations
bd create "Document 3+ duplication patterns found" --type=task --labels=learn
bd create "Propose unified abstraction" --type=task --labels=learn
\`\`\`

---

Help me identify duplication patterns in my codebase and create MY unification strategy.

I'm building my own DRY discipline. Analyze [FILE_OR_DIRECTORY] for:

1. **Structural duplication**: Similar component patterns, repeated prop interfaces
2. **Logic duplication**: Copy-pasted conditionals, repeated data transforms
3. **Essential vs. coincidental**: Which similarities are fundamental vs. accidental?

For each pattern found:
- Show me the duplicated code
- Explain why it's duplication (or why it's not)
- Propose a unified abstraction

End with MY DRY principle: a one-sentence rule I can apply to future code.

The target I want to analyze: [YOUR_FILE_OR_DIRECTORY]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Audit [component] with Rams principles" --type=task --labels=learn,foundations
bd create "List elements that fail 'earns existence' test" --type=task --labels=learn
bd create "Propose removal strategy with rationale" --type=task --labels=learn
\`\`\`

---

Help me audit [COMPONENT_OR_PAGE] using Rams' "Weniger, aber besser" principle.

I'm defining MY standard for what "earns its existence." For each element, ask:

1. **Does this element serve a function?** (If not, it's decorative)
2. **Is the function essential?** (Could the user accomplish their goal without it?)
3. **Is this the simplest way to serve that function?**

Analyze [COMPONENT_OR_PAGE] and create a table:
| Element | Function | Essential? | Simplest? | Verdict |
|---------|----------|------------|-----------|---------|

For elements that fail: propose removal or simplification.

End with MY Rams principle: a one-sentence test I'll apply to every element I create.

The artifact I want to audit: [YOUR_COMPONENT_OR_PAGE]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Trace connections for [module]" --type=research --labels=learn,foundations
bd create "Map upstream dependencies" --type=task --labels=learn
bd create "Map downstream dependents" --type=task --labels=learn
bd create "Evaluate system coherence—does it serve the whole?" --type=task --labels=learn
\`\`\`

---

Help me trace connections for [MODULE] and evaluate its role in MY system.

I'm learning to think at the Heidegger level: "Does this serve the whole?"

Map [MODULE]'s connections:

1. **Upstream dependencies**: What does this module import/depend on?
2. **Downstream dependents**: What imports/uses this module?
3. **Data flow**: How does data enter and leave this module?
4. **System role**: What would break if this module didn't exist?

Create a dependency diagram (ASCII or mermaid).

Then evaluate:
- Does this module have a clear, singular purpose?
- Are its boundaries well-defined?
- Does it serve the larger system, or does it create coupling?

End with MY Heidegger principle: a one-sentence rule about system coherence.

The module I want to trace: [YOUR_MODULE_PATH]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Complete Triad Audit of [target]" --type=feature --labels=learn,foundations
bd create "Level 1: DRY analysis—identify duplication" --type=task --labels=learn
bd create "Level 2: Rams analysis—question existence" --type=task --labels=learn
bd create "Level 3: Heidegger analysis—verify coherence" --type=task --labels=learn
bd create "Synthesize findings into recommendations" --type=task --labels=learn
\`\`\`

---

Help me apply the complete Subtractive Triad to [TARGET] and create MY audit framework.

Walk me through all three levels:

## Level 1: DRY (Implementation)
- "Have I built this before?"
- Find duplicated patterns, propose unification

## Level 2: Rams (Artifact)
- "Does this earn its existence?"
- Question every element, propose removals

## Level 3: Heidegger (System)
- "Does this serve the whole?"
- Trace connections, evaluate coherence

For [TARGET], create:

1. **DRY findings**: List of duplication with severity
2. **Rams findings**: Elements that fail the existence test
3. **Heidegger findings**: System-level issues

4. **Synthesis**: Prioritized recommendations
   - What to unify (DRY)
   - What to remove (Rams)
   - What to reconnect (Heidegger)

End by helping me write MY Subtractive Triad principles document.

The target for my audit: [YOUR_FILE_COMPONENT_OR_SYSTEM]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Migrate [file] from Tailwind to Canon" --type=task --labels=learn,craft
bd create "Audit file for design utilities (colors, shadows, radii)" --type=task --labels=learn
bd create "Create mapping: Tailwind → Canon tokens" --type=task --labels=learn
bd create "Apply migration, preserve layout utilities" --type=task --labels=learn
\`\`\`

---

Help me create MY design token system (my own "Canon CSS").

I'm building a semantic design token system for my project. Guide me through:

1. **Audit [FILE]** for Tailwind design utilities:
   - Colors (bg-*, text-*, border-*)
   - Shadows (shadow-*)
   - Border radii (rounded-*)
   - Typography (text-sm, text-lg, font-*)

2. **Define MY tokens**:
   - Background colors: --color-bg-*
   - Foreground colors: --color-fg-*
   - Border colors: --color-border-*
   - Shadows: --shadow-*
   - Radii: --radius-*
   - Typography: --text-*

3. **Create the migration**:
   - Map each Tailwind utility to my semantic token
   - Preserve Tailwind layout utilities (flex, grid, p-*, m-*, etc.)
   - Apply the changes

4. **Document MY Canon**:
   - Create a CSS file with my token definitions
   - Include comments explaining each token's purpose

The file to migrate: [YOUR_FILE_PATH]
My brand colors/preferences: [YOUR_BRAND_INFO]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Build [component] with Canon principles" --type=feature --labels=learn,craft
bd create "Design minimal prop interface" --type=task --labels=learn
bd create "Implement with Svelte 5 runes" --type=task --labels=learn
bd create "Apply Canon CSS tokens (no Tailwind design utilities)" --type=task --labels=learn
bd create "Verify component recedes into use—test with real usage" --type=task --labels=learn
\`\`\`

---

Help me build [COMPONENT_NAME] following MY Canon design principles.

I want a component that "recedes into use"—invisible when working, noticed only when broken.

1. **Design the prop interface**:
   - What's the minimum API needed?
   - What can be inferred vs. explicitly passed?
   - Are there sensible defaults?

2. **Implement with Svelte 5 runes**:
   - Use $props() for inputs
   - Use $state() only when needed
   - Keep reactivity minimal and obvious

3. **Apply MY design tokens**:
   - Use semantic tokens (--color-bg-*, --radius-*, etc.)
   - No raw Tailwind design utilities
   - Keep layout utilities (flex, grid, etc.)

4. **Verify it "recedes"**:
   - Is the API obvious without documentation?
   - Does it compose well with other components?
   - Would a new developer understand it immediately?

Component to build: [YOUR_COMPONENT_NAME]
Purpose: [WHAT_IT_DOES]
My design tokens file: [PATH_TO_YOUR_TOKENS]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Motion audit of [URL/page]" --type=research --labels=learn,craft
bd create "Catalog all animations on page" --type=task --labels=learn
bd create "Categorize each as functional or decorative" --type=task --labels=learn
bd create "Test with prefers-reduced-motion" --type=task --labels=learn
bd create "Propose restraint-based alternatives for decorative animations" --type=task --labels=learn
\`\`\`

---

Help me audit animations on [URL_OR_PAGE] and define MY motion philosophy.

I'm building MY animation guidelines. For each animation found:

1. **Catalog all motion**:
   - CSS transitions
   - CSS animations
   - JavaScript animations
   - Scroll-triggered effects

2. **Classify each**:
   | Animation | Type | Functional or Decorative? | Duration | Easing |
   |-----------|------|---------------------------|----------|--------|

   Functional = reveals state, guides attention, provides feedback
   Decorative = exists for visual interest only

3. **Test accessibility**:
   - Does it respect prefers-reduced-motion?
   - Is timing appropriate (< 500ms for micro, < 1s for transitions)?
   - Does motion cause vestibular issues?

4. **Define MY motion tokens**:
   - --duration-micro: [for hovers, toggles]
   - --duration-standard: [for state changes]
   - --ease-standard: [consistent easing]

5. **Write MY motion philosophy**: When do I animate? When don't I?

Target to audit: [YOUR_URL_OR_PAGE_PATH]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: D1 migration for [feature]" --type=task --labels=learn,infrastructure
bd create "Design minimal schema (question every column)" --type=task --labels=learn
bd create "Write up migration" --type=task --labels=learn
bd create "Write down migration (reversible)" --type=task --labels=learn
bd create "Add indexes with justification" --type=task --labels=learn
\`\`\`

---

Help me design a D1 database schema for [FEATURE] following MY minimal data philosophy.

I'm building MY approach to database design. For [FEATURE]:

1. **Question every column**:
   - What data is truly required?
   - What can be derived instead of stored?
   - What's the minimal viable schema?

2. **Design the schema**:
   - Create table definitions
   - Apply proper types (TEXT, INTEGER, REAL, BLOB)
   - Add NOT NULL only where essential
   - Use sensible defaults

3. **Write migrations**:
   - UP migration (creates the schema)
   - DOWN migration (reverts cleanly)

4. **Index strategy**:
   - Which queries will be common?
   - Create indexes with clear justification
   - Avoid over-indexing

5. **Document MY data principles**:
   - When do I store vs. derive?
   - What's my naming convention?
   - How do I handle relationships?

Feature to model: [YOUR_FEATURE]
Expected queries: [YOUR_COMMON_QUERIES]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Build [service] Worker" --type=feature --labels=learn,infrastructure
bd create "Design service interface (inputs, outputs, errors)" --type=task --labels=learn
bd create "Implement core handler logic" --type=task --labels=learn
bd create "Add error handling with proper HTTP semantics" --type=task --labels=learn
bd create "Configure service bindings for composition" --type=task --labels=learn
bd create "Test end-to-end with wrangler dev" --type=task --labels=learn
\`\`\`

---

Help me build a Cloudflare Worker for [SERVICE_NAME] following MY service composition patterns.

I'm defining MY approach to edge services. For [SERVICE_NAME]:

1. **Design the service interface**:
   - What are the inputs (request shape, query params, headers)?
   - What are the outputs (response shape, status codes)?
   - What errors can occur and how are they represented?
   - Create a TypeScript interface for Request/Response

2. **Implement the handler**:
   - Parse and validate inputs
   - Execute core logic
   - Return structured responses
   - Use proper HTTP semantics (GET for reads, POST for mutations)

3. **Error handling strategy**:
   - Map internal errors to HTTP status codes
   - Return consistent error response shape
   - Log appropriately for observability

4. **Composition with bindings**:
   - What other services does this need? (D1, KV, R2, other Workers)
   - Configure wrangler.toml bindings
   - Use service bindings for Worker-to-Worker calls

5. **Document MY service patterns**:
   - Naming conventions for Workers
   - Standard response envelope shape
   - Error handling philosophy

Service to build: [YOUR_SERVICE_NAME]
Purpose: [WHAT_IT_DOES]
Bindings needed: [D1/KV/R2/OTHER_WORKERS]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Set up Beads coordination for [project]" --type=feature --labels=learn,agents
bd create "Initialize .beads/ directory with bd init" --type=task --labels=learn
bd create "Create 3+ issues with proper labels and priority" --type=task --labels=learn
bd create "Establish dependency graph with bd dep add" --type=task --labels=learn
bd create "Test bd ready to verify unblocked work surfaces" --type=task --labels=learn
bd create "Document claim pattern for your workflow" --type=task --labels=learn
\`\`\`

---

Help me set up MY work coordination system using Beads for [PROJECT_NAME].

I'm building MY approach to agent-native task management. Guide me through:

1. **Initialize Beads**:
   - Run \`bd init\` to create .beads/ directory
   - Configure labels for MY domains and types
   - Set up priority model (P0-P4 or custom)

2. **Create initial issues**:
   Create 3-5 issues that represent real work in [PROJECT_NAME]:
   \`\`\`bash
   bd create "[task title]" --type=task|feature|bug --priority=P2 --labels=[domain]
   \`\`\`

3. **Establish dependencies**:
   - Which issues block others?
   - Create the dependency graph:
   \`\`\`bash
   bd dep add [blocker-id] blocks [blocked-id]
   \`\`\`

4. **Test the workflow**:
   - Run \`bd ready\` to see unblocked work
   - Run \`bd blocked\` to verify dependencies work
   - Claim an issue: \`bd update [id] --status=in_progress\`

5. **Document MY coordination patterns**:
   - What labels do I use and why?
   - When do I create dependencies vs. leave issues independent?
   - What's my claim-and-complete workflow?

Project: [YOUR_PROJECT_NAME]
Domains/labels I use: [YOUR_LABELS]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Configure ethos for [project/domain]" --type=feature --labels=learn,agents
bd create "Define 1+ DRY-level principle with learn_ethos" --type=task --labels=learn
bd create "Define 1+ Rams-level principle with learn_ethos" --type=task --labels=learn
bd create "Define 1+ Heidegger-level principle with learn_ethos" --type=task --labels=learn
bd create "Add constraint to enforce a principle" --type=task --labels=learn
bd create "Add health check with measurable threshold" --type=task --labels=learn
bd create "Export ethos and commit to repository" --type=task --labels=learn
\`\`\`

---

Help me create MY ethos—a living document of principles that guide my work.

I'm building my own version of CREATE SOMETHING's ethos layer. Guide me through:

1. **Define 3 principles** (one at each Triad level):

   **DRY level** (Implementation):
   - What implementation pattern do I always follow?
   - Example: "Single source of truth for configuration"

   **Rams level** (Artifact):
   - What standard determines if something "earns its existence"?
   - Example: "Every UI element must serve a user task"

   **Heidegger level** (System):
   - How do I ensure things serve the larger system?
   - Example: "Components must be usable in isolation"

2. **Add constraints** that enforce my principles:
   - File patterns they apply to (e.g., "src/components/**/*.svelte")
   - Rules to check (e.g., "no inline styles")
   - Severity (error/warning/info)

3. **Add health checks** with measurable thresholds:
   - Metrics I care about (bundle size, test coverage, complexity)
   - Acceptable thresholds
   - Commands to measure them

4. **Export and persist**:
   - Create .ethos/ directory in my project
   - Save principles.json, constraints.json, health.json

Use learn_ethos to save each principle. Show me what I'm creating as we go.

My domain is: [YOUR_DOMAIN - e.g., "React component library", "API services", "content site"]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Discovery session for [client/project]" --type=research --labels=learn,method
bd create "Prepare hermeneutic questions (what, why, for whom)" --type=task --labels=learn
bd create "Conduct session—document stated needs" --type=task --labels=learn
bd create "Analyze gap between stated and real needs" --type=task --labels=learn
bd create "Create problem statement artifact" --type=task --labels=learn
bd create "Create stakeholder map artifact" --type=task --labels=learn
\`\`\`

---

Help me practice hermeneutic discovery for [PROJECT_OR_CLIENT].

I'm developing MY discovery methodology. Simulate a discovery session where you play the client and I ask questions.

1. **Prepare hermeneutic questions**:
   Help me draft questions that reveal, not assume:
   - "What problem are you trying to solve?" (not "What features do you want?")
   - "Who experiences this problem most acutely?"
   - "What happens if this problem isn't solved?"
   - "What have you tried before?"

2. **Conduct the session**:
   You play the client for [PROJECT_OR_CLIENT]. Give realistic responses that:
   - Start with surface-level stated needs
   - Reveal deeper needs when questioned well
   - Include contradictions I should notice

3. **Analyze the gap**:
   After the session, help me identify:
   - Stated needs (what they said they want)
   - Real needs (what would actually solve their problem)
   - The gap between them

4. **Create discovery artifacts**:

   **Problem Statement**:
   "[WHO] needs [WHAT] because [WHY], but currently [OBSTACLE]."

   **Stakeholder Map**:
   | Stakeholder | Relationship to Problem | Influence | Interest |
   |-------------|------------------------|-----------|----------|

5. **Reflect on MY discovery approach**:
   - What questions worked best?
   - What patterns do I see in stated vs. real needs?
   - How will I structure future discovery sessions?

Client/Project context: [DESCRIBE_THE_SCENARIO]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Design template for [vertical]" --type=feature --labels=learn,systems
bd create "Research vertical—identify common patterns" --type=research --labels=learn
bd create "Define structure (what cannot change)" --type=task --labels=learn
bd create "Define configuration schema (what can change)" --type=task --labels=learn
bd create "Identify extension points with constraints" --type=task --labels=learn
bd create "Document rationale for each constraint" --type=task --labels=learn
\`\`\`

---

Help me design MY template architecture for [VERTICAL].

I'm building a template system for [VERTICAL] (e.g., law firms, architecture studios, restaurants). Guide me through:

1. **Research the vertical**:
   - What pages does every [VERTICAL] website need?
   - What content types are universal vs. optional?
   - What industry conventions exist (terminology, navigation patterns)?

2. **Define structure** (what CANNOT change):
   These are the bones—the parts every instance shares:
   - Required pages (Home, About, Contact, ...)
   - Navigation patterns
   - SEO requirements
   - Accessibility standards

3. **Define configuration schema** (what CAN change):
   Create a JSON schema for customization:
   \`\`\`typescript
   interface SiteConfig {
     name: string;
     tagline?: string;
     // What else?
   }
   \`\`\`

4. **Identify extension points**:
   Where can users add custom content without breaking the system?
   - Custom pages?
   - Custom sections on standard pages?
   - Theme overrides?
   - List constraints for each extension point.

5. **Document constraints with rationale**:
   For each constraint, explain WHY:
   | Constraint | Rationale |
   |------------|-----------|
   | Max 6 nav items | Cognitive load research |

6. **Write MY template philosophy**:
   - What is structure vs. configuration in my system?
   - How do I balance flexibility with coherence?

Vertical: [YOUR_VERTICAL - e.g., "law firms", "restaurants", "portfolios"]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: System audit of [system/organization]" --type=research --labels=learn,systems
bd create "Map all properties and their relationships" --type=task --labels=learn
bd create "Trace hermeneutic circle—does each serve the whole?" --type=task --labels=learn
bd create "Identify gaps where circle breaks" --type=task --labels=learn
bd create "Apply Subtractive Triad to each property" --type=task --labels=learn
bd create "Propose structural improvements with rationale" --type=task --labels=learn
\`\`\`

---

Help me evaluate MY system as a coherent whole.

I'm auditing [SYSTEM_OR_ORGANIZATION] to see if it forms a true hermeneutic circle. Guide me through:

1. **Map all properties/components**:
   List every part of my system:
   | Property | Purpose | Inputs | Outputs |
   |----------|---------|--------|---------|

2. **Draw the relationships**:
   Create a diagram showing how parts relate:
   - What does each part depend on?
   - What depends on each part?
   - Where does value flow?

3. **Trace the hermeneutic circle**:
   Does the system form a complete circle?
   - Philosophy → defines criteria for →
   - Research → validates →
   - Practice → applies to →
   - Services → tests and evolves →
   - Philosophy (back to start)

   Where does MY circle break?

4. **Apply Subtractive Triad to each property**:
   For each component:
   - **DRY**: Is this duplicated elsewhere in the system?
   - **Rams**: Does this earn its existence?
   - **Heidegger**: Does this serve the whole?

5. **Identify gaps and redundancies**:
   - What's missing from the circle?
   - What exists but doesn't serve the whole?
   - What could be merged or removed?

6. **Propose improvements**:
   | Issue | Type | Proposed Fix | Rationale |
   |-------|------|--------------|-----------|

7. **Write MY system philosophy**:
   - How do parts relate to whole in my system?
   - What makes my system coherent (or not)?

System to audit: [YOUR_SYSTEM - packages, services, products, teams, etc.]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Partnership audit of [recent session]" --type=research --labels=learn,partnership
bd create "Review session transcript for delegation moments" --type=task --labels=learn
bd create "Identify collaboration vs. handoff patterns" --type=task --labels=learn
bd create "Assess trust calibration—over/under-trusted?" --type=task --labels=learn
bd create "Map complementary contributions (human vs. agent)" --type=task --labels=learn
bd create "Propose workflow improvements" --type=task --labels=learn
\`\`\`

---

Help me audit MY human-agent partnership to improve how we work together.

I want to analyze a recent Claude Code session and develop MY partnership patterns. Guide me through:

1. **Review session patterns**:
   Think about your recent work with Claude Code. Identify:
   - When did you delegate (hand off completely)?
   - When did you collaborate (work together)?
   - When did you take over (do it yourself)?

2. **Assess trust calibration**:
   | Task Type | Your Trust Level | Actual Outcome | Calibration |
   |-----------|------------------|----------------|-------------|
   | Code generation | High/Med/Low | Success/Failure | Over/Under/Correct |

   Where did you over-trust? Under-trust?

3. **Map complementary contributions**:
   What did each partner contribute best?

   **Human strengths** (your contributions):
   - Context about the project
   - Judgment calls
   - Creative direction
   - Domain expertise

   **Agent strengths** (Claude's contributions):
   - Code generation
   - Pattern recognition
   - Consistency
   - Speed

4. **Identify friction points**:
   - Where did miscommunication happen?
   - Where did you wait when you could have worked in parallel?
   - Where did you interrupt when you should have let Claude finish?

5. **Define MY partnership principles**:
   Write 3-5 rules for how you'll work with Claude Code:
   - "I delegate [X] completely"
   - "I collaborate on [Y]"
   - "I always handle [Z] myself"

6. **Create workflow improvements**:
   | Current Pattern | Problem | New Pattern |
   |-----------------|---------|-------------|

Recent session context: [DESCRIBE_WHAT_YOU_WORKED_ON]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Configure MCP for [project]" --type=feature --labels=learn,partnership
bd create "Create .mcp.json configuration" --type=task --labels=learn
bd create "Define a domain-specific skill" --type=task --labels=learn
bd create "Set up pre-commit or validation hook" --type=task --labels=learn
bd create "Test tool integration end-to-end" --type=task --labels=learn
\`\`\`

---

Help me configure MCP for MY project to extend Claude Code's capabilities.

I'm setting up MY tool ecosystem. Guide me through:

1. **Identify needed capabilities**:
   What operations do I frequently perform that could be automated?
   - Database queries?
   - API calls?
   - File transformations?
   - External service integrations?

2. **Configure MCP servers**:
   Edit my Claude Code settings to add MCP servers:
   \`\`\`json
   {
     "mcpServers": {
       "[my-server]": {
         "command": "npx",
         "args": ["-y", "@my-org/my-mcp-server"]
       }
     }
   }
   \`\`\`

   What servers would help MY workflow?

3. **Create a custom skill**:
   Write a skill file for a domain-specific operation:
   \`\`\`markdown
   # .claude/skills/[my-skill].md

   Use this skill when [TRIGGER_CONDITION].

   ## Steps
   1. [First step]
   2. [Second step]
   \`\`\`

4. **Set up hooks**:
   Create hooks that enforce MY standards:
   \`\`\`json
   {
     "hooks": {
       "pre-commit": [
         { "command": "npm run lint" },
         { "command": "npm run typecheck" }
       ]
     }
   }
   \`\`\`

5. **Test the integration**:
   - Verify MCP servers connect
   - Test skill invocation
   - Validate hooks run correctly

6. **Document MY tool configuration**:
   - What tools did I add and why?
   - What skills are available?
   - What hooks enforce my standards?

Project: [YOUR_PROJECT]
Repetitive operations I want to automate: [YOUR_OPERATIONS]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Set up Learn MCP in Claude Code" --type=task --labels=learn,partnership
bd create "Add MCP server to settings.json" --type=task --labels=learn
bd create "Complete magic link authentication" --type=task --labels=learn
bd create "Test learn_status and learn_lesson" --type=task --labels=learn
bd create "Define first ethos principle using learn_ethos" --type=task --labels=learn
bd create "Reflect: How does the recursive structure feel?" --type=task --labels=learn
\`\`\`

---

Help me set up Learn MCP so I can learn the Subtractive Triad through Claude Code.

This is recursive: I'm using Claude Code to learn how to use Claude Code better. Guide me through:

1. **Install Learn MCP**:
   Add to my Claude Code settings (VS Code: settings.json, CLI: ~/.claude.json):
   \`\`\`json
   {
     "mcpServers": {
       "learn": {
         "command": "npx",
         "args": ["-y", "@createsomething/learn"]
       }
     }
   }
   \`\`\`

2. **Authenticate**:
   - Use learn_auth to get a magic link
   - Click the link to authenticate
   - Verify with learn_status

3. **Explore the curriculum**:
   - Use learn_status to see available paths
   - Use learn_lesson to fetch a lesson
   - Browse the learning paths

4. **Define MY first ethos principle**:
   Use learn_ethos to save a principle:
   \`\`\`
   learn_ethos action="add_principle" level="dry" content="[MY_PRINCIPLE]"
   \`\`\`

   What implementation pattern do I always follow?

5. **Reflect on the recursion**:
   - I'm learning about Claude Code partnership... through Claude Code
   - I'm defining my ethos... using a tool that teaches ethos
   - How does this recursive structure feel?

This is meta-learning: understanding by doing, not just reading.`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Build MCP server for [domain]" --type=feature --labels=learn,advanced
bd create "Design tool composition—what operations merge?" --type=task --labels=learn
bd create "Define JSON schema for tool inputs" --type=task --labels=learn
bd create "Implement stdio transport handler" --type=task --labels=learn
bd create "Implement tool execution logic" --type=task --labels=learn
bd create "Test with Claude Code integration" --type=task --labels=learn
\`\`\`

---

Help me build MY own MCP server for [DOMAIN].

I'm creating a custom MCP server that extends Claude Code for my specific use case. Guide me through:

1. **Identify composed operations**:
   What operations do I frequently chain together?
   - Read config → validate → apply?
   - Query database → transform → cache?
   - Fetch API → parse → update local state?

   List 2-3 operations that should become single tools.

2. **Design tool schemas**:
   For each tool, define:
   \`\`\`typescript
   {
     name: "my_tool",
     description: "What this tool does",
     inputSchema: {
       type: "object",
       properties: {
         // Define inputs
       },
       required: ["..."]
     }
   }
   \`\`\`

3. **Set up the project**:
   \`\`\`bash
   mkdir my-mcp-server && cd my-mcp-server
   npm init -y
   npm install @modelcontextprotocol/sdk
   \`\`\`

4. **Implement the server**:
   Create src/index.ts with:
   - Server initialization
   - Tool registration
   - stdio transport handler
   - Tool execution logic

5. **Handle the protocol**:
   - Parse JSON-RPC requests
   - Return properly formatted responses
   - Handle errors gracefully

6. **Test locally**:
   - Add to Claude Code settings
   - Invoke tools and verify output
   - Debug any issues

7. **Document MY MCP server**:
   - What problem does it solve?
   - How do I use each tool?
   - What are the gotchas?

Domain: [YOUR_DOMAIN - e.g., "project management", "data pipeline", "content publishing"]
Operations to compose: [YOUR_OPERATIONS]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Build hook suite for [project]" --type=feature --labels=learn,advanced
bd create "Design hook architecture (which events, what actions)" --type=task --labels=learn
bd create "Implement validation hook (exit code 0/1/2)" --type=task --labels=learn
bd create "Implement session lifecycle hook" --type=task --labels=learn
bd create "Test hooks with simulated inputs" --type=task --labels=learn
bd create "Document hook behavior for team" --type=task --labels=learn
\`\`\`

---

Help me build MY hook suite that enforces my project standards automatically.

I'm creating hooks that make Claude Code enforce MY rules. Guide me through:

1. **Identify standards to enforce**:
   What rules do I want automatically checked?
   - Code formatting?
   - Type safety?
   - Test coverage?
   - Commit message format?
   - File naming conventions?

2. **Design hook architecture**:
   | Event | Hook Purpose | Exit Behavior |
   |-------|--------------|---------------|
   | pre-commit | Lint & format | Block if fails |
   | post-edit | Type check | Warn only |
   | session-start | Load context | Always continue |

3. **Implement validation hooks**:
   Create scripts that use exit codes correctly:
   - **Exit 0**: Success, continue
   - **Exit 1**: Failure, block and show message
   - **Exit 2**: Failure, block and stop

   Example pre-commit hook:
   \`\`\`bash
   #!/bin/bash
   npm run lint || exit 1
   npm run typecheck || exit 1
   exit 0
   \`\`\`

4. **Implement lifecycle hooks**:
   - Session start: Load project context, run bd prime
   - Session end: Sync work, remind about uncommitted changes

5. **Configure in Claude Code**:
   \`\`\`json
   {
     "hooks": {
       "PreToolUse": [{ "matcher": "Edit|Write", "hooks": ["./hooks/pre-edit.sh"] }],
       "PostToolUse": [{ "matcher": "Edit|Write", "hooks": ["./hooks/post-edit.sh"] }]
     }
   }
   \`\`\`

6. **Test thoroughly**:
   - Simulate passing conditions
   - Simulate failing conditions
   - Verify exit codes work correctly

7. **Document MY hook suite**:
   - What does each hook do?
   - When do they run?
   - How do I bypass them if needed?

Project: [YOUR_PROJECT]
Standards to enforce: [YOUR_STANDARDS]`
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
    ],
    claudeCodePrompt: `## Setup: Track this exercise with Beads

\`\`\`bash
bd create "Praxis: Design multi-agent system for [task]" --type=feature --labels=learn,advanced
bd create "Choose orchestration pattern (parallel, sequential, swarm)" --type=task --labels=learn
bd create "Define agent specializations and boundaries" --type=task --labels=learn
bd create "Design communication mechanism" --type=task --labels=learn
bd create "Implement coordination logic" --type=task --labels=learn
bd create "Handle error recovery and graceful degradation" --type=task --labels=learn
\`\`\`

---

Help me design MY multi-agent system for [COMPLEX_TASK].

I'm building a system where multiple agents work together. Guide me through:

1. **Analyze the task**:
   What is [COMPLEX_TASK]?
   - What sub-tasks can be parallelized?
   - What must happen sequentially?
   - What requires coordination between agents?

2. **Choose orchestration pattern**:

   **Parallel** (independent work):
   - Tasks don't depend on each other
   - Speed is the priority
   - Example: Reviewing multiple files simultaneously

   **Sequential** (pipeline):
   - Each stage feeds the next
   - Order matters
   - Example: Parse → Transform → Validate → Deploy

   **Swarm** (collaborative):
   - Agents share context
   - Dynamic task assignment
   - Example: Exploring a codebase together

   Which pattern fits MY task?

3. **Define agent specializations**:
   | Agent | Specialization | Tools | Boundaries |
   |-------|----------------|-------|------------|
   | Research | Information gathering | Web, Read | No writes |
   | Implement | Code changes | Edit, Write | No deploys |
   | Review | Quality assurance | Read, Grep | No edits |

4. **Design communication**:
   How do agents share information?
   - Shared file system?
   - Message passing?
   - Shared database (D1)?

5. **Implement coordination**:
   Using Claude Code's Task tool:
   \`\`\`
   Task: "Research the authentication patterns in this codebase"
   subagent_type: "Explore"
   run_in_background: true
   \`\`\`

6. **Handle errors**:
   - What if an agent fails?
   - How do we retry vs. skip?
   - What's the graceful degradation path?

7. **Document MY multi-agent patterns**:
   - When do I use multi-agent vs. single agent?
   - What specializations are reusable?
   - What coordination patterns work for my domain?

Complex task: [YOUR_COMPLEX_TASK]
Sub-tasks: [LIST_THE_PARTS]`
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
