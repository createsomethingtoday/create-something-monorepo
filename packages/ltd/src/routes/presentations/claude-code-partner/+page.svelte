<script lang="ts">
	/**
	 * CLAUDE CODE: PARTNER
	 *
	 * Setting up Claude Code as an AI development partner.
	 * CLAUDE.md, rules, MCP servers, hooks, and skills.
	 *
	 * Structure follows the Hermeneutic Circle:
	 * 1. Part → Whole (What is this?)
	 * 2. Whole → Part (Why does this matter?)
	 * 3. The Circle Closes (How does it fit?)
	 * 4. Dwelling (What do you do now?)
	 */

	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.meta.title}</title>
	<meta name="description" content={data.meta.description} />
</svelte:head>

<Presentation title="CLAUDE CODE: PARTNER" subtitle="AI-Native Development Environment">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: Part → Whole (What is this?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>CLAUDE CODE: PARTNER</h1>
		<p class="subtitle">AI-native development.</p>
		<p class="subtitle">Not AI-assisted.</p>
		<p class="subtitle">Partnership, not delegation.</p>
	</Slide>

	<!-- Slide 2: The Partnership Model -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>The Partnership Model</h2>
		<p>
			Not <span class="muted">"using AI"</span> — <span class="em">partnering with AI</span>.
		</p>
		<ul>
			<li>You bring: intent, judgment, domain knowledge</li>
			<li>Claude brings: execution, pattern recognition, tirelessness</li>
			<li>Together: systems that neither could build alone</li>
		</ul>
		<p class="muted">
			The goal isn't to replace you. It's to amplify you.
		</p>
	</Slide>

	<!-- Slide 3: Quote - Eames -->
	<Slide type="quote">
		<span class="number">03</span>
		<blockquote>
			"The best for the most for the least."
		</blockquote>
		<cite>— Charles and Ray Eames</cite>
	</Slide>

	<!-- Slide 4: What Claude Code Has Access To -->
	<Slide type="ascii">
		<span class="number">04</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   WHAT CLAUDE CODE HAS ACCESS TO                                        │
│   Philosophy baked into context                                         │
│                                                                         │
│   ┌──────────────────┬──────────────────────────────────────────────┐   │
│   │ CLAUDE.md        │ Project philosophy, conventions, patterns    │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ .claude/rules/   │ Domain-specific patterns and constraints     │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ MCP Servers      │ Cloudflare, Beads, filesystem, browser       │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Hooks            │ Pre-commit, post-edit, validation            │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Skills           │ /audit-canon, /deploy, /harness-spec         │   │
│   └──────────────────┴──────────────────────────────────────────────┘   │
│                                                                         │
│   Claude doesn't just execute. It understands the philosophy.           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Context is everything. Philosophy shapes execution.</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Whole → Part (Why does this matter?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 5: CLAUDE.md -->
	<Slide type="content">
		<span class="number">05</span>
		<h2>CLAUDE.md</h2>
		<p>
			Philosophy baked into context.
		</p>
		<ul>
			<li>The Subtractive Triad (DRY → Rams → Heidegger)</li>
			<li>The Hermeneutic Circle (.ltd → .io → .space → .agency)</li>
			<li>Code Mode preferences (when to use tools vs code)</li>
			<li>Domain commands and conventions</li>
		</ul>
		<p class="muted">
			Claude reads this before every session. It becomes the shared language.
		</p>
	</Slide>

	<!-- Slide 6: CLAUDE.md Structure -->
	<Slide type="code">
		<span class="number">06</span>
		<h2>CLAUDE.md Structure</h2>
		<pre><code>{`# CREATE SOMETHING Monorepo

## Philosophy: The Subtractive Triad

| Level          | Discipline | Question        | Action    |
|----------------|------------|-----------------|-----------|
| Implementation | DRY        | Built before?   | Unify     |
| Artifact       | Rams       | Earns place?    | Remove    |
| System         | Heidegger  | Serves whole?   | Reconnect |

## Architecture
packages/
  space/  → createsomething.space  (Practice)
  io/     → createsomething.io     (Research)
  agency/ → createsomething.agency (Services)
  ltd/    → createsomething.ltd    (Philosophy)`}</code></pre>
		<p class="annotation">This file is the contract between you and Claude.</p>
	</Slide>

	<!-- Slide 7: Rules Directory -->
	<Slide type="content">
		<span class="number">07</span>
		<h2>.claude/rules/</h2>
		<p>
			Breakdowns become patterns.
		</p>
		<ul>
			<li><code>cloudflare-patterns.md</code> — D1, KV, Workers, Pages</li>
			<li><code>css-canon.md</code> — Tailwind for structure, Canon for aesthetics</li>
			<li><code>beads-patterns.md</code> — Task tracking across sessions</li>
			<li><code>sveltekit-conventions.md</code> — Route and component patterns</li>
		</ul>
		<p class="muted">
			Every breakdown you repair becomes a rule Claude follows.
		</p>
	</Slide>

	<!-- Slide 8: Rules Example -->
	<Slide type="code">
		<span class="number">08</span>
		<h2>Rules Example: css-canon.md</h2>
		<pre><code>{`# CSS Canon

**Principle**: Tailwind for structure, Canon for aesthetics.

## Layout Utilities (Keep)
flex, grid, items-*, justify-*, p-*, m-*, gap-*

## Design Utilities (Avoid) → Use Canon
| Tailwind     | Canon Token              |
|--------------|--------------------------|
| rounded-md   | var(--radius-md)         |
| bg-white/10  | var(--color-bg-surface)  |
| text-white/60| var(--color-fg-tertiary) |

## Token Reference
--space-md: 1.618rem  /* Golden ratio */
--duration-micro: 200ms`}</code></pre>
		<p class="annotation">Claude applies these rules automatically.</p>
	</Slide>

	<!-- Slide 9: MCP Servers -->
	<Slide type="ascii">
		<span class="number">09</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   MCP SERVERS                                                           │
│   Direct access to infrastructure                                       │
│                                                                         │
│   ┌──────────────────┬──────────────────────────────────────────────┐   │
│   │ Cloudflare       │ D1 queries, KV operations, R2 storage        │   │
│   │                  │ Workers deployment, Pages deployment         │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Beads            │ bd create, bd ready, bd close, bd sync       │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Filesystem       │ Read, Write, Edit, Glob, Grep                │   │
│   ├──────────────────┼──────────────────────────────────────────────┤   │
│   │ Browser          │ WebFetch, WebSearch                          │   │
│   └──────────────────┴──────────────────────────────────────────────┘   │
│                                                                         │
│   Claude doesn't shell out. It calls APIs directly.                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Infrastructure access without infrastructure commands.</p>
	</Slide>

	<!-- Slide 10: Hooks -->
	<Slide type="content">
		<span class="number">10</span>
		<h2>Hooks</h2>
		<p>
			Automatic validation at key moments.
		</p>
		<ul>
			<li><span class="em">Pre-commit</span>: Type checking, linting, tests</li>
			<li><span class="em">Post-edit</span>: Format, validate, sync</li>
			<li><span class="em">Session start</span>: Prime context, check Beads</li>
		</ul>
		<p class="muted">
			Hooks run automatically. You don't think about them.
		</p>
	</Slide>

	<!-- Slide 11: Hooks Example -->
	<Slide type="code">
		<span class="number">11</span>
		<h2>Hooks Example</h2>
		<pre><code>{`# .claude/settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": ["pnpm exec tsc --noEmit"]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": ["bd sync"]
      }
    ]
  }
}`}</code></pre>
		<p class="annotation">Validation happens automatically. The tool recedes.</p>
	</Slide>

	<!-- Slide 12: Skills -->
	<Slide type="content">
		<span class="number">12</span>
		<h2>Skills</h2>
		<p>
			Reusable workflows invoked by name.
		</p>
		<ul>
			<li><code>/audit-canon</code> — Check CSS for Canon compliance</li>
			<li><code>/deploy</code> — Generate deployment commands</li>
			<li><code>/harness-spec</code> — Create harness specification</li>
			<li><code>/audit-voice</code> — Check content for Voice compliance</li>
		</ul>
		<p class="muted">
			Complex workflows become simple commands.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: The Circle Closes (How does it fit?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 13: The Development Loop -->
	<Slide type="ascii">
		<span class="number">13</span>
		<pre>{`
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   THE DEVELOPMENT LOOP                                                  │
│                                                                         │
│                           ┌─────────┐                                   │
│                           │  READ   │                                   │
│                           │ context │                                   │
│                           └────┬────┘                                   │
│                                │                                        │
│                                ▼                                        │
│       ┌─────────┐         ┌─────────┐         ┌─────────┐               │
│       │ REPAIR  │◀────────│  PLAN   │────────▶│ EXECUTE │               │
│       │ patterns│         │approach │         │ changes │               │
│       └────┬────┘         └─────────┘         └────┬────┘               │
│            │                                       │                    │
│            │              ┌─────────┐              │                    │
│            └─────────────▶│ VERIFY  │◀─────────────┘                    │
│                           │ results │                                   │
│                           └─────────┘                                   │
│                                                                         │
│   Breakdowns loop back to REPAIR. Patterns feed future READs.           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
`}</pre>
		<p class="caption">Read → Plan → Execute → Verify → Repair</p>
	</Slide>

	<!-- Slide 14: Zuhandenheit in Practice -->
	<Slide type="content">
		<span class="number">14</span>
		<h2>Zuhandenheit in Practice</h2>
		<p>
			When Claude Code works, it <span class="em">disappears</span>.
		</p>
		<ul>
			<li>You think about the feature, not the prompts</li>
			<li>You think about the architecture, not the syntax</li>
			<li>You think about the user, not the deployment</li>
		</ul>
		<p class="muted">
			The partner recedes. The work remains.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Dwelling (What do you do now?)
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 15: Installation Steps -->
	<Slide type="code">
		<span class="number">15</span>
		<h2>Installation</h2>
		<pre><code>{`# 1. Clone the monorepo
git clone git@github.com:createsomethingtoday/create-something-monorepo.git

# 2. Install dependencies
pnpm install

# 3. Generate Cloudflare types
pnpm --filter=space exec wrangler types

# 4. Start development
pnpm dev --filter=space

# Claude Code reads CLAUDE.md automatically.
# Rules apply. MCP servers connect. Hooks run.
# The partnership begins.`}</code></pre>
		<p class="annotation">Install once. Partner indefinitely.</p>
	</Slide>

	<!-- Slide 16: Final -->
	<Slide type="title">
		<span class="number">16</span>
		<h1>CLAUDE CODE: PARTNER</h1>
		<p class="subtitle">The partner should disappear.</p>
		<p class="tagline">
			<a href="https://claude.ai/claude-code" class="link">claude.ai/claude-code</a>
		</p>
	</Slide>
</Presentation>

<style>
	:global(.link) {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	:global(.link:hover) {
		color: var(--color-fg-secondary);
	}

	:global(.slide-content code) {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--color-bg-elevated);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm);
	}
</style>
