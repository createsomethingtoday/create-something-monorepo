<script lang="ts">
	/**
	 * BEADS: CONTINUITY
	 *
	 * Third presentation in the Developer Onboarding Series.
	 * Agent-native task tracking for cross-session memory.
	 *
	 * Structure follows the Hermeneutic Circle:
	 * 1. Part → Whole (The Problem: Context Resets)
	 * 2. Whole → Part (Architecture & Commands)
	 * 3. The Circle Closes (Workflow & Dependencies)
	 * 4. Depth (Robot Mode, Labels, Molecules)
	 */

	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<Presentation title="BEADS: CONTINUITY" subtitle="Memory across context boundaries.">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: Part → Whole (The Problem: Context Resets)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>BEADS: CONTINUITY</h1>
		<p class="subtitle">Agent-native task tracking.</p>
		<p class="subtitle">Memory that persists.</p>
	</Slide>

	<!-- Slide 2: The Problem -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>The Problem</h2>
		<p>
			Every session, context <span class="em">resets</span>.
		</p>
		<ul>
			<li>What was I working on?</li>
			<li>What's blocked by what?</li>
			<li>What did I discover yesterday?</li>
		</ul>
		<p class="muted">
			Humans remember. Agents forget.
		</p>
	</Slide>

	<!-- Slide 3: Quote - Heidegger -->
	<Slide type="quote">
		<span class="number">03</span>
		<blockquote>
			"Understanding is always already moving in a circle."
		</blockquote>
		<cite>— Martin Heidegger, "Being and Time"</cite>
		<p class="muted">
			Memory bridges the gap between sessions.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Whole → Part (Architecture & Commands)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 4: Beads Architecture -->
	<Slide type="ascii">
		<span class="number">04</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   BEADS ARCHITECTURE                                                    │
│   Dual storage for speed and sync                                       │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     .beads/                                     │   │
│   ├───────────────────────┬─────────────────────────────────────────┤   │
│   │ beads.db              │  SQLite cache (gitignored)              │   │
│   │ (fast queries)        │  Local speed                            │   │
│   ├───────────────────────┼─────────────────────────────────────────┤   │
│   │ issues.jsonl          │  Source of truth (git-synced)           │   │
│   │ (append-only log)     │  Cross-session memory                   │   │
│   ├───────────────────────┼─────────────────────────────────────────┤   │
│   │ config.yaml           │  Repository configuration               │   │
│   └───────────────────────┴─────────────────────────────────────────┘   │
│                                                                         │
│   SQLite for speed. JSONL for sync. Git for memory.                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Fast locally. Persistent globally.</p>
	</Slide>

	<!-- Slide 5: Core Commands - Create -->
	<Slide type="code">
		<span class="number">05</span>
		<h2>bd create</h2>
		<pre><code>{`# Create an issue
bd create "Implement user dashboard"

# With priority (P0-P4)
bd create "Fix login bug" --priority P0

# With labels
bd create "Add dark mode" --label feature --label space`}</code></pre>
		<p class="annotation">Capture work as it emerges. Don't lose discovered tasks.</p>
	</Slide>

	<!-- Slide 6: Core Commands - Ready -->
	<Slide type="code">
		<span class="number">06</span>
		<h2>bd ready</h2>
		<pre><code>{`# Show unblocked work
bd ready

# What CAN you start right now?
# - No pending dependencies
# - Status is 'open' or 'in_progress'
# - Ranked by priority

# Start your session here
bv --robot-priority    # AI-optimized output`}</code></pre>
		<p class="annotation">Don't ask "what should I do?" Ask Beads.</p>
	</Slide>

	<!-- Slide 7: Core Commands - Close -->
	<Slide type="code">
		<span class="number">07</span>
		<h2>bd close</h2>
		<pre><code>{`# Mark work complete
bd close cs-abc

# Close with reason
bd close cs-abc --reason "Commit abc123"

# Close multiple at once
bd close cs-abc cs-def cs-ghi`}</code></pre>
		<p class="annotation">Work without closure is work forgotten.</p>
	</Slide>

	<!-- Slide 8: Core Commands - Sync -->
	<Slide type="code">
		<span class="number">08</span>
		<h2>bd sync</h2>
		<pre><code>{`# Sync with Git
bd sync

# Pull from main (ephemeral branches)
bd sync --from-main

# Check sync status
bd sync --status`}</code></pre>
		<p class="annotation">Sync before session ends. Memory persists through Git.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The Circle Closes (Workflow & Dependencies)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 9: Session Workflow -->
	<Slide type="ascii">
		<span class="number">09</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   SESSION WORKFLOW                                                      │
│   Three phases of continuity                                            │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  SESSION START                                                   │  │
│   │  ─────────────                                                   │  │
│   │  bv --robot-priority        # What's highest impact?             │  │
│   │  bd show <id>               # Review the issue                   │  │
│   │  bd update <id> --status in_progress                             │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                           ↓                                             │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  DURING WORK                                                     │  │
│   │  ───────────                                                     │  │
│   │  bd create "Discovered task"     # Capture emergent work         │  │
│   │  bd dep add <id> blocks <other>  # Record dependencies           │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                           ↓                                             │
│   ┌──────────────────────────────────────────────────────────────────┐  │
│   │  SESSION END                                                     │  │
│   │  ───────────                                                     │  │
│   │  bd close <id>              # Mark complete                      │  │
│   │  bd sync --from-main        # Pull updates                       │  │
│   │  git commit                 # Commit your work                   │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Start with context. End with closure.</p>
	</Slide>

	<!-- Slide 10: Dependencies -->
	<Slide type="code">
		<span class="number">10</span>
		<h2>Dependencies</h2>
		<pre><code>{`# X blocks Y (Y cannot start until X completes)
bd dep add cs-auth blocks cs-dashboard

# Parent-child (hierarchical)
bd dep add cs-subtask parent cs-epic

# Related (informational)
bd dep add cs-login related cs-auth

# Discovered-from (audit trail)
bd dep add cs-bugfix discovered-from cs-feature`}</code></pre>
		<p class="annotation">Dependencies are relationships. Relationships are memory.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Depth (Robot Mode, Labels, Molecules)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 11: Robot Mode -->
	<Slide type="ascii">
		<span class="number">11</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   ROBOT MODE                                                            │
│   Machine-readable output for agents                                    │
│                                                                         │
│   ┌─────────────────────────┬───────────────────────────────────────┐   │
│   │ Flag                    │ Output                                │   │
│   ├─────────────────────────┼───────────────────────────────────────┤   │
│   │ --robot-priority        │ PageRank + Critical Path ranking     │   │
│   │ --robot-insights        │ Bottleneck and keystone detection    │   │
│   │ --robot-plan            │ Suggested execution sequence         │   │
│   └─────────────────────────┴───────────────────────────────────────┘   │
│                                                                         │
│   bv --robot-priority                                                   │
│   # Returns JSON that agents can parse                                  │
│                                                                         │
│   Beads was designed for AI agents. Not adapted—designed.               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Agent-native from the start.</p>
	</Slide>

	<!-- Slide 12: Labels -->
	<Slide type="ascii">
		<span class="number">12</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   LABEL CONVENTIONS                                                     │
│   Two dimensions: scope and type                                        │
│                                                                         │
│   PROPERTIES (where)          │   TYPES (what)                          │
│   ─────────────────────────── │ ────────────────────────────────────    │
│   agency  → Client work       │   feature  → New capability             │
│   io      → Research, docs    │   bug      → Something broken           │
│   space   → Practice, learn   │   research → Investigation              │
│   ltd     → Canon, philosophy │   refactor → Structural improvement     │
│                                                                         │
│   PRIORITY                                                              │
│   ──────────────────────────────────────────────────────────────────    │
│   P0: Drop everything   P1: This week   P2: This month                  │
│   P3: Someday           P4: Maybe never                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Scope + Type + Priority = Complete context.</p>
	</Slide>

	<!-- Slide 13: Molecules -->
	<Slide type="ascii">
		<span class="number">13</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   MOLECULES & CHEMISTRY                                                 │
│   Work templates using phase metaphor                                   │
│                                                                         │
│   ┌────────────┬────────────┬───────────────┬───────────────────────┐   │
│   │ Phase      │ Type       │ Persistence   │ Use Case              │   │
│   ├────────────┼────────────┼───────────────┼───────────────────────┤   │
│   │ SOLID      │ Proto      │ Template      │ Reusable workflows    │   │
│   │ LIQUID     │ Mol        │ Git-synced    │ Feature work          │   │
│   │ VAPOR      │ Wisp       │ Gitignored    │ Scratch, experiments  │   │
│   └────────────┴────────────┴───────────────┴───────────────────────┘   │
│                                                                         │
│   bd pour <proto> --var name=auth    # Solid → Liquid                   │
│   bd wisp create <proto>             # Solid → Vapor                    │
│   bd mol squash <wisp>               # Vapor → Permanent                │
│   bd mol burn <wisp>                 # Vapor → Gone                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Protos are templates. Mols persist. Wisps evaporate.</p>
	</Slide>

	<!-- Slide 14: Hermeneutic Continuity -->
	<Slide type="title">
		<span class="number">14</span>
		<h1>Hermeneutic Continuity</h1>
		<p class="subtitle">Memory bridges sessions.</p>
		<p class="subtitle">Understanding accumulates.</p>
		<p class="tagline">
			<code>bv --robot-priority</code> — Start every session here.
		</p>
	</Slide>
</Presentation>

<style>
	:global(.slide-content code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--color-bg-elevated);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm);
	}
</style>
