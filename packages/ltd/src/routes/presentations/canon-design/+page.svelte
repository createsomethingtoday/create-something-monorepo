<script lang="ts">
	/**
	 * CANON: DESIGN
	 *
	 * How design tokens emerge from philosophy and guide aesthetic coherence.
	 *
	 * The three levels of design:
	 * 1. Philosophy → Principles (Rams, Subtractive Triad)
	 * 2. Tokens → Artifacts (Canon CSS variables)
	 * 3. Implementation → Coherence (Tailwind for structure, Canon for aesthetics)
	 *
	 * NOTE: This presentation uses live TokenSwatch components to display tokens.
	 * "Components can BE the documentation" — when tokens change, docs update automatically.
	 */

	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';
	import { TokenSwatch, TokenGrid } from '$lib/components/docs';
	import { SEO } from '@create-something/components';

	let { data } = $props();
</script>

<SEO
	title={data.meta.title}
	description={data.meta.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Presentations', url: 'https://createsomething.ltd/presentations' },
		{ name: 'Canon Design', url: 'https://createsomething.ltd/presentations/canon-design' }
	]}
/>

<Presentation title="CANON: DESIGN" subtitle="Philosophy → Tokens → Coherence" scriptUrl="/presentations/canon-design/script">
	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 1: The Principle
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 1: Title -->
	<Slide type="title">
		<span class="number">01</span>
		<h1>CANON: DESIGN</h1>
		<p class="subtitle">Design tokens from philosophy</p>
		<p class="subtitle">Aesthetic coherence across the monorepo</p>
	</Slide>

	<!-- Slide 2: The Principle -->
	<Slide type="content">
		<span class="number">02</span>
		<h2>The Principle</h2>
		<p>
			<span class="em">Tailwind for structure, Canon for aesthetics.</span>
		</p>
		<ul>
			<li><strong>Tailwind</strong> handles composition and layout</li>
			<li><strong>Canon</strong> handles color, typography, motion</li>
			<li>Coherence emerges through tokens, not through mixing utility classes</li>
		</ul>
		<p class="muted">
			Design tokens are design philosophy made visible.
		</p>
	</Slide>

	<!-- Slide 3: The Subtractive Triad -->
	<Slide type="content">
		<span class="number">03</span>
		<h2>The Subtractive Triad</h2>
		<p>
			Every design decision passes through three filters:
		</p>
		<ul>
			<li><strong>DRY</strong> (Implementation) — Eliminate duplication in code</li>
			<li><strong>Rams</strong> (Artifact) — Eliminate excess in design</li>
			<li><strong>Heidegger</strong> (System) — Eliminate disconnection in meaning</li>
		</ul>
		<p class="muted">
			Creation is the discipline of removing what obscures.
		</p>
	</Slide>

	<!-- Slide 4: Design Philosophy Foundation -->
	<Slide type="quote">
		<span class="number">04</span>
		<blockquote>
			"Weniger, aber besser."
		</blockquote>
		<cite>— Dieter Rams</cite>
		<p class="muted spaced">
			Fewer things, but better things.<br />
			This is the essence of Canon design.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 2: Token Categories
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 5: Token Categories -->
	<Slide type="content">
		<span class="number">05</span>
		<h2>Token Categories</h2>
		<p>
			Design tokens organize into five categories:
		</p>
		<ul>
			<li><strong>Colors</strong> — Foreground, background, semantic, data</li>
			<li><strong>Typography</strong> — Display, heading, body, caption</li>
			<li><strong>Spacing</strong> — Golden ratio proportions</li>
			<li><strong>Radius</strong> — Border radius scale</li>
			<li><strong>Motion</strong> — Duration, easing, timing</li>
		</ul>
	</Slide>

	<!-- Slide 6: Colors - The Hierarchy (LIVE TOKENS) -->
	<Slide type="content">
		<span class="number">06</span>
		<h2>Color Hierarchy</h2>
		<div class="token-columns">
			<TokenGrid title="Background" columns={1} compact>
				<TokenSwatch token="--color-bg-pure" label="pure" size="sm" />
				<TokenSwatch token="--color-bg-elevated" label="elevated" size="sm" />
				<TokenSwatch token="--color-bg-surface" label="surface" size="sm" />
				<TokenSwatch token="--color-bg-subtle" label="subtle" size="sm" />
			</TokenGrid>
			<TokenGrid title="Foreground" columns={1} compact>
				<TokenSwatch token="--color-fg-primary" label="primary" size="sm" />
				<TokenSwatch token="--color-fg-secondary" label="secondary" size="sm" />
				<TokenSwatch token="--color-fg-tertiary" label="tertiary" size="sm" />
				<TokenSwatch token="--color-fg-muted" label="muted (AA)" size="sm" />
			</TokenGrid>
			<TokenGrid title="Border" columns={1} compact>
				<TokenSwatch token="--color-border-default" label="default" size="sm" />
				<TokenSwatch token="--color-border-emphasis" label="emphasis" size="sm" />
				<TokenSwatch token="--color-border-strong" label="strong" size="sm" />
			</TokenGrid>
		</div>
		<p class="muted">Live tokens — when Canon changes, this presentation updates automatically.</p>
	</Slide>

	<!-- Slide 7: Semantic Colors (LIVE TOKENS) -->
	<Slide type="content">
		<span class="number">07</span>
		<h2>Semantic Colors</h2>
		<p>Beyond neutral grays, semantic colors carry meaning:</p>
		<TokenGrid columns={2}>
			<TokenSwatch token="--color-success" label="success (7.08:1)" />
			<TokenSwatch token="--color-error" label="error (4.97:1)" />
			<TokenSwatch token="--color-warning" label="warning (6.31:1)" />
			<TokenSwatch token="--color-info" label="info (5.23:1)" />
		</TokenGrid>
		<p class="muted">
			All WCAG AA compliant on pure black. Each includes muted and border variants.
		</p>
	</Slide>

	<!-- Slide 8: Spacing and Golden Ratio -->
	<Slide type="content">
		<span class="number">08</span>
		<h2>Spacing — Golden Ratio φ = 1.618</h2>
		<p>
			Spacing tokens follow the golden ratio, creating harmonic proportions:
		</p>
		<ul>
			<li><code>--space-xs</code> = 0.5rem</li>
			<li><code>--space-sm</code> = 1rem</li>
			<li><code>--space-md</code> = 1.618rem</li>
			<li><code>--space-lg</code> = 2.618rem</li>
			<li><code>--space-xl</code> = 4.236rem</li>
			<li><code>--space-2xl</code> = 6.854rem</li>
		</ul>
		<p class="muted">
			Natural proportions create visual rhythm without thinking about it.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 3: Typography and Motion
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 9: Typography Scale -->
	<Slide type="ascii">
		<span class="number">09</span>
		<pre>{`
TYPOGRAPHY SCALE

Display (Large)
├── --text-display-xl: clamp(3.5rem, 5vw + 2rem, 7rem)
└── --text-display: clamp(2.5rem, 4vw + 1.5rem, 5rem)

Heading
├── --text-h1: clamp(2rem, 3vw + 1rem, 3.5rem)
├── --text-h2: clamp(1.5rem, 2vw + 0.75rem, 2.25rem)
└── --text-h3: clamp(1.25rem, 1.5vw + 0.5rem, 1.75rem)

Body (Reading)
├── --text-body-lg: 1.125rem
├── --text-body: 1rem
└── --text-body-sm: 0.875rem

Small
└── --text-caption: 0.75rem
`}</pre>
	</Slide>

	<!-- Slide 10: Motion Timing -->
	<Slide type="content">
		<span class="number">10</span>
		<h2>Motion — Purposeful, Not Decorative</h2>
		<p>
			Motion should reveal state changes, not seek attention:
		</p>
		<ul>
			<li><code>--duration-micro</code> = 200ms — Hover states, toggles</li>
			<li><code>--duration-standard</code> = 300ms — Page transitions, modals</li>
			<li><code>--duration-complex</code> = 500ms — Orchestrated sequences</li>
		</ul>
		<p class="muted">
			<code>--ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)</code> for all animations.
		</p>
	</Slide>

	<!-- Slide 11: Anti-Patterns in Motion -->
	<Slide type="content">
		<span class="number">11</span>
		<h2>Motion Anti-Patterns</h2>
		<p>
			What NOT to do:
		</p>
		<ul>
			<li>❌ Animation for decoration (bouncing icons, pulsing elements)</li>
			<li>❌ Duration > 500ms (feels sluggish)</li>
			<li>❌ Custom easing curves (breaks coherence)</li>
			<li>❌ Animating layout properties (use transform instead)</li>
			<li>❌ Auto-playing animations without user trigger</li>
		</ul>
		<p class="muted">
			When in doubt, don't animate. The tool recedes when it's transparent.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 4: Tailwind vs Canon Split
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 12: Tailwind vs Canon Decision Tree -->
	<Slide type="ascii">
		<span class="number">12</span>
		<pre>{`
DECISION TREE

Is the value dynamic/computed at runtime?
├── Yes → Use inline style with CSS custom property
│         style="--value: {computed}"
│
└── No → Is it a layout/structure concern?
         ├── Yes → Use Tailwind utility
         │         class="flex items-center gap-4"
         │
         └── No → Is it a design/aesthetic concern?
                  ├── Yes → Use Canon token in scoped styles
                  │         color: var(--color-fg-primary)
                  │
                  └── No → Reconsider if needed at all
`}</pre>
	</Slide>

	<!-- Slide 13: The Hybrid Pattern -->
	<Slide type="content">
		<span class="number">13</span>
		<h2>The Hybrid Pattern</h2>
		<p>
			Most components use all three approaches together:
		</p>
		<ul>
			<li><strong>Tailwind</strong> for composition: <code>flex items-center gap-4 p-6</code></li>
			<li><strong>Canon</strong> for design: <code>background: var(--color-bg-surface)</code></li>
			<li><strong>Inline styles</strong> for dynamic values: <code>style="--delay: {index * 100}ms"</code></li>
		</ul>
		<p class="muted">
			Structure, aesthetics, and dynamics in harmony.
		</p>
	</Slide>

	<!-- Slide 14: Common Violations -->
	<Slide type="content">
		<span class="number">14</span>
		<h2>Common Violations</h2>
		<p>
			What breaks Canon coherence:
		</p>
		<ul>
			<li>❌ Hardcoded colors: <code>bg-white/10</code> instead of <code>var(--color-bg-surface)</code></li>
			<li>❌ Inline styles for static values: <code>style="border-radius: 12px"</code></li>
			<li>❌ Arbitrary typography: <code>text-3xl</code> instead of <code>var(--text-h2)</code></li>
			<li>❌ Utility classes for motion: <code>transition: all 0.2s</code> instead of Canon tokens</li>
		</ul>
		<p class="muted">
			Use the <code>/audit-canon</code> skill to detect violations automatically.
		</p>
	</Slide>

	<!-- ═══════════════════════════════════════════════════════════════════
	     PART 5: The Audit Skill and Closing
	     ═══════════════════════════════════════════════════════════════════ -->

	<!-- Slide 15: The Audit Skill -->
	<Slide type="content">
		<span class="number">15</span>
		<h2>The Audit Skill: /audit-canon</h2>
		<p>
			Before merging, run the Canon audit:
		</p>
		<ul>
			<li><code>/audit-canon packages/io/src/routes/experiment</code></li>
			<li>Detects hardcoded colors, improper typography, missing tokens</li>
			<li>Ensures "Tailwind for structure, Canon for aesthetics" principle</li>
			<li>Returns structured feedback on violations</li>
		</ul>
		<p class="muted spaced">
			Design tokens are philosophy made executable.<br />
			The audit ensures philosophy persists through implementation.
		</p>
	</Slide>
</Presentation>

<style>
	.token-columns {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
	}
</style>
