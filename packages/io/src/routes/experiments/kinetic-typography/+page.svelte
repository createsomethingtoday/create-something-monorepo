<script lang="ts">
	import { QuoteBlock, SEO } from '@create-something/canon';
	import { FluidAssembly } from '@create-something/canon/experiments/kinetic-typography';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const { experiment } = data;
</script>

<SEO
	title="{experiment.title} | CREATE SOMETHING"
	description={experiment.description}
	keywords="kinetic typography, animation, fluid assembly, text animation, semantic emphasis"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Kinetic Typography', url: 'https://createsomething.io/experiments/kinetic-typography' }
	]}
/>

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

	<!-- Live Demos -->
	<section class="section demos">
		<h2>Live Demonstrations</h2>
		<p>
			Scroll each phrase into view. Characters scatter then converge. Emphasized words
			gain weight—the animation reveals semantic hierarchy.
		</p>

		<div class="demo-grid">
			<div class="demo-card">
				<div class="demo-label">Wordmark</div>
				<div class="demo-content">
					<FluidAssembly
						text="CREATE SOMETHING"
						emphasis={[0, 1]}
						duration={800}
					/>
				</div>
				<div class="demo-note">Both words carry equal weight</div>
			</div>

			<div class="demo-card">
				<div class="demo-label">Canon Principle</div>
				<div class="demo-content">
					<FluidAssembly
						text="Less, but better"
						emphasis={[2]}
						duration={900}
					/>
				</div>
				<div class="demo-note">Emphasis on "better"—the payoff</div>
			</div>

			<div class="demo-card">
				<div class="demo-label">Zuhandenheit</div>
				<div class="demo-content">
					<FluidAssembly
						text="The tool recedes"
						emphasis={[2]}
						duration={850}
					/>
				</div>
				<div class="demo-note">Emphasis on "recedes"—the action</div>
			</div>

			<div class="demo-card">
				<div class="demo-label">Tufte Tribute</div>
				<div class="demo-content">
					<FluidAssembly
						text="Above all else, show the data"
						emphasis={[5]}
						duration={1000}
					/>
				</div>
				<div class="demo-note">Emphasis on "data"—the object</div>
			</div>
		</div>
	</section>

	<!-- Abstract -->
	<section class="section">
		<h2>Abstract</h2>
		<p>
			Most text animations prioritize spectacle over semantics. Characters fly in, bounce,
			or dissolve—motion that adds nothing to meaning. What if animation could <em>reveal</em>
			information instead?
		</p>
		<p>
			This experiment applies Edward Tufte's data-ink ratio principle to kinetic typography.
			The hypothesis: weight transition as data layer. When emphasized words visibly gain
			weight during animation, the motion itself becomes informative.
		</p>
		<QuoteBlock
			quote="Above all else, show the data."
			attribution="Edward Tufte"
		/>
	</section>

	<!-- The Problem -->
	<section class="section">
		<h2>The Problem</h2>
		<p>
			Kinetic typography falls into three categories (per Barbara Brownie):
		</p>
		<ul>
			<li><strong>Fluid</strong> — Letters morph in place</li>
			<li><strong>Scrolling</strong> — Text moves across a plane</li>
			<li><strong>Dynamic Layout</strong> — Elements respond to each other</li>
		</ul>
		<p>
			All three can be purely decorative. The question: can animation carry semantic load?
			Can motion reveal what static text conceals?
		</p>
	</section>

	<!-- The Approach -->
	<section class="section">
		<h2>The Approach: Fluid Assembly</h2>
		<p>
			We combine Brownie's categories—fluid morphing with assembly dynamics—to create
			animation that discloses hierarchy:
		</p>

		<div class="phases-table">
			<table>
				<thead>
					<tr>
						<th>Phase</th>
						<th>Progress</th>
						<th>Action</th>
						<th>Data Revealed</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Scatter</td>
						<td>0-20%</td>
						<td>Characters at random positions, low opacity</td>
						<td>Chaos before meaning</td>
					</tr>
					<tr>
						<td>Converge</td>
						<td>20-60%</td>
						<td>Characters slide to final positions</td>
						<td>Structure emerges</td>
					</tr>
					<tr>
						<td>Solidify</td>
						<td>60-80%</td>
						<td>Opacity reaches full, positions lock</td>
						<td>Text becomes readable</td>
					</tr>
					<tr>
						<td>Emphasize</td>
						<td>80-100%</td>
						<td>Emphasized words gain weight (400 → 600)</td>
						<td><strong>Hierarchy revealed</strong></td>
					</tr>
				</tbody>
			</table>
		</div>

		<p>
			The weight transition in the final phase is the data layer. Viewers see which words
			carry semantic importance—not through reading comprehension, but through visual
			weight differential.
		</p>
	</section>

	<!-- Implementation -->
	<section class="section">
		<h2>Implementation</h2>

		<h3>Component API</h3>
		<pre class="code-block">{`<FluidAssembly
  text="Less, but better"
  emphasis={[2]}     // Word index to emphasize
  duration={800}     // Animation duration in ms
/>`}</pre>

		<h3>Key Technical Decisions</h3>

		<h4>Deterministic Scatter</h4>
		<p>
			Each character gets a scatter position based on its index, using the golden angle
			approximation. This ensures consistent animation across page loads—no true randomness.
		</p>
		<pre class="code-block">{`const seed = charIndex * 137.5; // Golden angle
const angle = (seed % 360) * (Math.PI / 180);
const distance = 20 + (charIndex % 5) * 10;`}</pre>

		<h4>Variable Font Weight</h4>
		<p>
			Stack Sans Notch is a variable font (200-700 weight range). The emphasis phase
			smoothly interpolates <code>font-weight</code> from 400 to 600, creating a fluid
			transition impossible with static font files.
		</p>
		<pre class="code-block">{`const emphasisProgress = easeOutCubic(
  (progress - 0.8) / 0.2
);
const weight = 400 + (600 - 400) * emphasisProgress;`}</pre>

		<h4>Intersection Observer Trigger</h4>
		<p>
			Animation fires once when 50% of the component enters the viewport. No scroll
			position tracking—just a single observation. The tool recedes.
		</p>
		<pre class="code-block">{`new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) animate();
  },
  { threshold: 0.5 }
);`}</pre>
	</section>

	<!-- Philosophical Alignment -->
	<section class="section">
		<h2>Philosophical Alignment</h2>

		<h3>Tufte: Data-Ink Ratio</h3>
		<p>
			Every pixel of motion should reveal information. The scatter/converge phases
			establish baseline readability. The emphasize phase adds the data layer. No
			bounce, no overshoot, no chartjunk.
		</p>

		<h3>Heidegger: Aletheia (Unconcealment)</h3>
		<p>
			Truth emerges through animation. The hierarchy was always there—latent in the
			text's meaning. The weight transition makes it visible. Animation as disclosure,
			not decoration.
		</p>

		<h3>Rams: As Little Design as Possible</h3>
		<p>
			The component does one thing: reveal semantic weight. Four phases, one easing
			curve, one trigger. The animation <em>is</em> the data; nothing more.
		</p>
	</section>

	<!-- Evaluation -->
	<section class="section">
		<h2>Evaluation</h2>
		<p>Against the experiment's criteria:</p>

		<div class="evaluation-grid">
			<div class="evaluation-item">
				<div class="criterion">Semantic Enhancement</div>
				<div class="result pass">PASS</div>
				<div class="explanation">
					Weight transition reveals which words matter. Viewers see emphasis before
					they consciously parse meaning.
				</div>
			</div>

			<div class="evaluation-item">
				<div class="criterion">Canon Compliance</div>
				<div class="result pass">PASS</div>
				<div class="explanation">
					Uses <code>--duration-*</code>, <code>--ease-standard</code>, and
					<code>--font-*</code> tokens exclusively. Respects <code>prefers-reduced-motion</code>.
				</div>
			</div>

			<div class="evaluation-item">
				<div class="criterion">Reusability</div>
				<div class="result pass">PASS</div>
				<div class="explanation">
					Single component accepts any text and emphasis pattern. Works with any
					variable font. Portable across properties.
				</div>
			</div>

			<div class="evaluation-item">
				<div class="criterion">Performance</div>
				<div class="result pass">PASS</div>
				<div class="explanation">
					Uses <code>transform</code> and <code>opacity</code> only (no layout thrashing).
					Single <code>requestAnimationFrame</code> loop. Intersection Observer for lazy trigger.
				</div>
			</div>

			<div class="evaluation-item">
				<div class="criterion">Philosophy Alignment</div>
				<div class="result pass">PASS</div>
				<div class="explanation">
					Animation embodies subtractive principles. Motion reveals rather than decorates.
					The technique teaches what it describes.
				</div>
			</div>
		</div>
	</section>

	<!-- Conclusion -->
	<section class="section">
		<h2>Conclusion</h2>
		<QuoteBlock
			quote="Weniger, aber besser."
			attribution="Dieter Rams"
		/>
		<p>
			FluidAssembly demonstrates that kinetic typography can carry semantic load.
			The weight transition—visible emphasis gain—adds a data layer to text animation.
			Viewers perceive hierarchy through motion, not just reading.
		</p>
		<p>
			This experiment earns its place. The component is ready for promotion to
			<code>@create-something/canon</code> and documentation as a paper.
		</p>
		<p>
			Next: apply the pattern to other CREATE SOMETHING properties. Test with longer
			texts. Explore whether the technique scales to paragraph-level emphasis.
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
		font-size: 0.55rem;
		line-height: 1.2;
		color: var(--color-fg-muted);
		text-align: center;
		overflow-x: auto;
		margin: var(--space-xl) auto;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		display: block;
		width: fit-content;
		max-width: 100%;
	}

	/* Demos Section */
	.demos {
		margin-bottom: var(--space-2xl);
	}

	.demo-grid {
		display: grid;
		gap: var(--space-lg);
		margin-top: var(--space-lg);
	}

	.demo-card {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.demo-label {
		font-size: var(--text-caption);
		font-weight: var(--font-medium);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-md);
	}

	.demo-content {
		min-height: 4rem;
		display: flex;
		align-items: center;
	}

	.demo-note {
		margin-top: var(--space-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-style: italic;
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

	/* Evaluation Grid */
	.evaluation-grid {
		display: grid;
		gap: var(--space-md);
		margin-top: var(--space-md);
	}

	.evaluation-item {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: auto auto;
		gap: var(--space-xs) var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.criterion {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.result {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		padding: 0.2em 0.6em;
		border-radius: var(--radius-sm);
	}

	.result.pass {
		color: var(--color-success);
		background: var(--color-success-muted);
	}

	.explanation {
		grid-column: 1 / -1;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
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
			font-size: 0.4rem;
		}

		.demo-card {
			padding: var(--space-md);
		}
	}
</style>
