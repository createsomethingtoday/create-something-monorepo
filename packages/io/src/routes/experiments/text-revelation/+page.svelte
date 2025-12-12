<script lang="ts">
	import { Footer, QuoteBlock } from '@create-something/components';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;
</script>

<svelte:head>
	<title>{experiment.title} | CREATE SOMETHING</title>
	<meta name="description" content={experiment.description} />
</svelte:head>

<article class="experiment-page">
	<!-- Header -->
	<header class="experiment-header">
		<div class="header-meta">
			<span class="category">{experiment.category}</span>
			<span class="separator">/</span>
			<span class="reading-time">{experiment.reading_time_minutes} min read</span>
		</div>
		<h1>{experiment.title}</h1>
		<p class="subtitle">{experiment.description}</p>
	</header>

	<!-- ASCII Art -->
	{#if experiment.ascii_art}
		<pre class="ascii-art">{experiment.ascii_art}</pre>
	{/if}

	<!-- Abstract -->
	<section class="section">
		<h2>Abstract</h2>
		<p>
			Most web animations <em>add</em> movement. What if animation was <em>removal</em>?
			This experiment documents a scroll-driven Progressive Erasure animation for the
			<a href="https://createsomething.agency">createsomething.agency</a> homepage.
		</p>
		<p>
			The hypothesis: the most CREATE SOMETHING way to tell the subtraction story is through
			text that subtracts itself. No decorative elements—the medium embodies the message.
		</p>
	</section>

	<!-- The Problem -->
	<section class="section">
		<h2>The Problem</h2>
		<p>
			Hero animations typically follow additive patterns: fade in, slide up, scale from zero.
			They announce presence. They demand attention. They say "look at me."
		</p>
		<p>
			But CREATE SOMETHING's philosophy is subtractive. We remove what obscures.
			How do you animate <em>that</em>?
		</p>
		<QuoteBlock
			quote="Creation is the discipline of removing what obscures."
			attribution="CREATE SOMETHING Canon"
		/>
	</section>

	<!-- Treatments Explored -->
	<section class="section">
		<h2>Treatments Explored</h2>
		<p>We evaluated five approaches before selecting Progressive Erasure:</p>

		<div class="treatment-grid">
			<div class="treatment">
				<h3>1. Progressive Erasure</h3>
				<p>
					Text appears complete, then words strike through and fade, revealing the essence.
					<strong>Selected.</strong>
				</p>
			</div>

			<div class="treatment">
				<h3>2. Density Collapse</h3>
				<p>
					A wall of text compresses vertically, lines merging until only one remains.
					Visually interesting but less semantically clear.
				</p>
			</div>

			<div class="treatment">
				<h3>3. Typewriter Backspace</h3>
				<p>
					Text types out corporate-speak, then backspaces to reveal truth.
					Too linear, loses the comparative before/after.
				</p>
			</div>

			<div class="treatment">
				<h3>4. Word Gravity</h3>
				<p>
					Words fall away like leaves, essential ones remain anchored.
					Playful but not minimal enough.
				</p>
			</div>

			<div class="treatment">
				<h3>5. Redaction Reveal</h3>
				<p>
					Document-style black bars that lift to reveal text beneath.
					Strong visual, but hides the "before" state.
				</p>
			</div>
		</div>
	</section>

	<!-- Why Progressive Erasure -->
	<section class="section">
		<h2>Why Progressive Erasure Won</h2>
		<p>The strikethrough treatment is semantically honest:</p>
		<ul>
			<li><strong>Shows the "before"</strong> — Corporate fluff in full view</li>
			<li><strong>Makes removal visible</strong> — Strikethrough as editorial act</li>
			<li><strong>Reveals the essence</strong> — What remains after subtraction</li>
		</ul>
		<p>
			The user watches subtraction happen. They see what was removed and why.
			The technique teaches the philosophy it describes.
		</p>
	</section>

	<!-- Implementation -->
	<section class="section">
		<h2>Implementation</h2>
		<p>The component uses scroll position to drive four distinct phases:</p>

		<div class="phases-table">
			<table>
				<thead>
					<tr>
						<th>Scroll %</th>
						<th>Phase</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>0-10%</td>
						<td>Reading</td>
						<td>Full text visible, user reads the corporate copy</td>
					</tr>
					<tr>
						<td>10-35%</td>
						<td>Striking</td>
						<td>Strikethrough animates across non-essential words</td>
					</tr>
					<tr>
						<td>35-50%</td>
						<td>Fading</td>
						<td>Struck words fade to transparent</td>
					</tr>
					<tr>
						<td>50-85%</td>
						<td>Coalescing</td>
						<td>Kept words collapse inward, gaps close</td>
					</tr>
					<tr>
						<td>85-100%</td>
						<td>Complete</td>
						<td>Final state: "We remove what obscures." + CTA</td>
					</tr>
				</tbody>
			</table>
		</div>

		<h3>Key Technical Decisions</h3>

		<h4>Word-Level State</h4>
		<p>Each word carries a <code>keep</code> boolean. Essential words remain; others subtract.</p>
		<pre class="code-block">{`const words = [
  { text: 'We', keep: true },
  { text: 'help', keep: false },
  { text: 'businesses', keep: false },
  // ...
  { text: 'remove', keep: true },
  { text: 'what', keep: true },
  { text: 'obscures.', keep: true }
];`}</pre>

		<h4>CSS-Driven Strikethrough</h4>
		<p>
			The strikethrough is a pseudo-element with <code>width</code> driven by scroll progress.
			No JavaScript animation library needed.
		</p>
		<pre class="code-block">{`.strike {
  position: absolute;
  left: 0;
  top: 55%;
  height: 0.12em;
  width: calc(var(--strike, 0) * 100%);
  background: var(--color-fg-primary);
}`}</pre>

		<h4>Coalescing via max-width</h4>
		<p>
			Removed words collapse by transitioning <code>max-width</code> to 0.
			This creates smooth horizontal compression without layout jumps.
		</p>
		<pre class="code-block">{`.word.hidden {
  max-width: 0;
  margin-right: 0;
  opacity: 0;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}`}</pre>
	</section>

	<!-- Philosophical Alignment -->
	<section class="section">
		<h2>Philosophical Alignment</h2>

		<h3>Rams Principle 10: As Little Design as Possible</h3>
		<p>
			The animation <em>is</em> the content. There are no decorative elements, no
			particles, no background effects. Text alone carries the entire experience.
		</p>

		<h3>Heidegger: Aletheia (Unconcealment)</h3>
		<p>
			Truth emerges through removal. The essence was always there—hidden by corporate fluff.
			The animation doesn't create meaning; it reveals what was obscured.
		</p>

		<h3>The Subtractive Triad</h3>
		<p>The technique demonstrates what it describes:</p>
		<ul>
			<li><strong>DRY</strong> — One scroll handler, one state object, one render loop</li>
			<li><strong>Rams</strong> — Every word earns its place or gets removed</li>
			<li><strong>Heidegger</strong> — The animation serves the hermeneutic whole</li>
		</ul>
	</section>

	<!-- Results -->
	<section class="section">
		<h2>Results</h2>
		<p>
			The component is live on <a href="https://createsomething.agency">createsomething.agency</a>.
			Qualitative observations:
		</p>
		<ul>
			<li>Users scroll slowly through the animation, watching the transformation</li>
			<li>The final phrase lands with weight—it's earned through the subtraction</li>
			<li>The CTA ("See how") appears only after the philosophy is demonstrated</li>
		</ul>
		<p>
			The medium became the message. Visitors don't read about subtraction—they experience it.
		</p>
	</section>

	<!-- Conclusion -->
	<section class="section">
		<h2>Conclusion</h2>
		<QuoteBlock
			quote="Less, but better."
			attribution="Dieter Rams"
		/>
		<p>
			Progressive Erasure proves that animation can embody philosophy.
			By making removal the animation itself, we create an experience that teaches
			through doing rather than telling.
		</p>
		<p>
			The strikethrough is honest: it shows what was there and what remains.
			The coalescing is satisfying: gaps close, essentials gather.
			The final state is earned: you watched the subtraction happen.
		</p>
		<p>
			This is subtractive design applied to motion. The technique <em>is</em> the message.
		</p>
	</section>

	<!-- Tags -->
	<footer class="experiment-footer">
		<div class="tags">
			{#each experiment.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>
		<p class="principles">
			Tests: {experiment.tests_principles.join(', ')}
		</p>
	</footer>
</article>

<Footer />

<style>
	.experiment-page {
		max-width: var(--width-content);
		margin: 0 auto;
		padding: var(--space-xl) var(--gutter);
	}

	/* Header */
	.experiment-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.separator {
		color: var(--color-fg-subtle);
	}

	.experiment-header h1 {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		line-height: var(--leading-tight);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		line-height: 1.2;
		color: var(--color-fg-muted);
		overflow-x: auto;
		margin: var(--space-xl) 0;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.section h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-lg);
		margin-bottom: var(--space-sm);
	}

	.section h4 {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-top: var(--space-md);
		margin-bottom: var(--space-xs);
	}

	.section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-sm);
	}

	.section ul {
		margin: var(--space-sm) 0;
		padding-left: var(--space-md);
	}

	.section li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-xs);
	}

	.section a {
		color: var(--color-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	.section a:hover {
		color: var(--color-fg-secondary);
	}

	.section em {
		font-style: italic;
	}

	.section strong {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.section code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		padding: 0.15em 0.4em;
		background: var(--color-bg-surface);
		border-radius: var(--radius-sm);
	}

	/* Treatment Grid */
	.treatment-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
		margin: var(--space-md) 0;
	}

	.treatment {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.treatment h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs) 0;
	}

	.treatment p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0;
		line-height: var(--leading-relaxed);
	}

	/* Phases Table */
	.phases-table {
		margin: var(--space-md) 0;
		overflow-x: auto;
	}

	.phases-table table {
		width: 100%;
		border-collapse: collapse;
	}

	.phases-table th,
	.phases-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.phases-table th {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.phases-table td {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.phases-table td:first-child {
		font-family: var(--font-mono);
		color: var(--color-fg-muted);
		white-space: nowrap;
	}

	/* Code Block */
	.code-block {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		line-height: 1.6;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow-x: auto;
		margin: var(--space-sm) 0 var(--space-md) 0;
		color: var(--color-fg-secondary);
	}

	/* Footer */
	.experiment-footer {
		margin-top: var(--space-2xl);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-border-default);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		margin-bottom: var(--space-sm);
	}

	.tag {
		padding: var(--space-xs) var(--space-sm);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.principles {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		font-family: var(--font-mono);
	}

	@media (max-width: 768px) {
		.experiment-header h1 {
			font-size: var(--text-h2);
		}

		.ascii-art {
			font-size: 0.5rem;
		}

		.treatment-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
