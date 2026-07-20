<script lang="ts">
	import { QuoteBlock, SEO } from '@create-something/canon';
	import ExperimentOrientation from '$lib/components/ExperimentOrientation.svelte';
	import ProgressiveExperiment from '$lib/components/ProgressiveExperiment.svelte';
	import ExperimentVisualSummary from '$lib/components/ExperimentVisualSummary.svelte';
	import { experimentGuides } from '$lib/config/experimentSharpness';
	import { Spritz } from '@create-something/spritz';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const experiment = $derived(data.experiment);

	// "Nicely Said" content - principles for writing clear, human-friendly content
	const nicelySaidPrinciples = [
		{
			label: 'Principle 1: Be Clear',
			text: 'Use simple words. Short sentences. Active voice. Say what you mean directly. Your readers are busy. Respect their time.'
		},
		{
			label: 'Principle 2: Be Useful',
			text: 'Every word should earn its place. If a sentence adds nothing, remove it. Information without purpose is noise.'
		},
		{
			label: 'Principle 3: Be Human',
			text: 'Write like you talk. Use contractions. Say you and we. Sound like a person, not a press release.'
		},
		{
			label: 'Principle 4: Be Honest',
			text: 'Admit what you do not know. Avoid weasel words. If something is hard, say so. Trust builds through transparency.'
		},
		{
			label: 'Conclusion',
			text: 'Good writing is invisible. When words flow naturally, they disappear. The meaning remains. That is the goal.'
		}
	];

	// Single message for simple demo
	const singleMessage = `Clear writing is not about dumbing things down. It is about respect. You respect your reader's time by removing friction. You respect their intelligence by trusting them with the truth. Every unnecessary word is a small act of disrespect.`;

	// Video-style intro/outro messages
	const videoMessages = [
		{
			label: 'Intro',
			text: 'Welcome to Nicely Said. A guide to writing words that work.'
		},
		{
			label: 'The Problem',
			text: 'Most business writing sounds like it was written by a committee of lawyers who hate their readers.'
		},
		{
			label: 'The Solution',
			text: 'Write for humans. Use words people actually say. Cut everything that does not help.'
		},
		{
			label: 'Outro',
			text: 'Less, but better. That is all there is to it.'
		}
	];
</script>

<SEO
	title={`${experiment.title} | CREATE SOMETHING`}
	description={experiment.description}
	keywords="RSVP, speed reading, Spritz, rapid serial visual presentation, reading optimization"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Experiments', url: 'https://createsomething.io/experiments' },
		{ name: 'Spritz', url: 'https://createsomething.io/experiments/spritz' }
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
	<ExperimentOrientation guide={experimentGuides['experiments/spritz']} />
	<ProgressiveExperiment fallback="The experiment question and comprehension limit remain available above. Enable JavaScript to control the reading speed.">

	<!-- ASCII Art -->
	{#if experiment.ascii_art}
		<pre class="ascii-art">{experiment.ascii_art}</pre>
	{/if}

	<ExperimentVisualSummary visual={experiment.visual_summary} />

	<!-- Live Demo: Nicely Said Principles -->
	<section class="section">
		<h2>Live Demo: Nicely Said Principles</h2>
		<p>
			Experience the five principles of clear writing through RSVP speed reading.
			Use keyboard shortcuts: <code>Space</code> to play/pause, <code>←</code>/<code>→</code> to skip,
			<code>↑</code>/<code>↓</code> to adjust speed.
		</p>
		<div class="demo-container">
			<Spritz content={nicelySaidPrinciples} wpm={300} loop />
		</div>
	</section>

	<!-- Abstract -->
	<section class="section">
		<h2>Abstract</h2>
		<p>
			Traditional reading requires eye movement across lines of text. Each jump between words
			(called a <em>saccade</em>) takes time and cognitive effort. What if we could eliminate
			eye movement entirely?
		</p>
		<p>
			Spritz uses Rapid Serial Visual Presentation (RSVP) to display one word at a time in a
			fixed position. The <strong>Optimal Recognition Point</strong> (ORP)—the letter where your
			eye naturally wants to focus—is highlighted and aligned consistently across all words.
		</p>
		<QuoteBlock
			quote="Reading is not about eye speed. It's about recognition speed. Fix the eye, stream the words."
			attribution="RSVP Research"
		/>
	</section>

	<!-- Video-Style Demo -->
	<section class="section">
		<h2>Video Intro/Transition/Outro</h2>
		<p>
			Use arrays of labeled messages for walkthrough videos. Each segment displays a label
			above the redicle (the word display window).
		</p>
		<div class="demo-container demo-video">
			<Spritz
				content={videoMessages}
				wpm={250}
				loop
				showWpmControl={false}
			/>
		</div>
	</section>

	<!-- How It Works -->
	<section class="section">
		<h2>How It Works</h2>

		<h3>The ORP Algorithm</h3>
		<p>
			The Optimal Recognition Point is calculated based on word length. Research shows the eye
			naturally wants to fixate slightly left of center:
		</p>

		<div class="phases-table">
			<table>
				<thead>
					<tr>
						<th>Word Length</th>
						<th>ORP Position</th>
						<th>Example</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>1 char</td>
						<td>Index 0</td>
						<td><span class="orp-example"><span class="orp">I</span></span></td>
					</tr>
					<tr>
						<td>2-5 chars</td>
						<td>Index 1</td>
						<td><span class="orp-example">w<span class="orp">o</span>rds</span></td>
					</tr>
					<tr>
						<td>6-9 chars</td>
						<td>Index 2</td>
						<td><span class="orp-example">re<span class="orp">a</span>ding</span></td>
					</tr>
					<tr>
						<td>10-13 chars</td>
						<td>Index 3</td>
						<td><span class="orp-example">und<span class="orp">e</span>rstanding</span></td>
					</tr>
					<tr>
						<td>14+ chars</td>
						<td>Index 4</td>
						<td><span class="orp-example">comp<span class="orp">r</span>ehension</span></td>
					</tr>
				</tbody>
			</table>
		</div>

		<h3>Punctuation Pauses</h3>
		<p>
			Words ending with punctuation receive longer display times to preserve natural reading rhythm:
		</p>
		<ul>
			<li><code>,</code> <code>:</code> <code>;</code> — 1.5× base duration</li>
			<li><code>.</code> <code>?</code> <code>!</code> — 2× base duration</li>
		</ul>
	</section>

	<!-- Clean Display Demo -->
	<section class="section">
		<h2>Clean Display for Recording</h2>
		<p>
			Hide controls for clean screen capture. Perfect for video production.
		</p>
		<div class="demo-container demo-clean">
			<Spritz
				content={singleMessage}
				wpm={280}
				showControls={false}
				showProgress={false}
				showWpmControl={false}
				class="spritz--lg"
			/>
		</div>
		<p class="demo-hint">
			Click to focus, then press <code>Space</code> to start.
		</p>
	</section>

	<!-- Implementation -->
	<section class="section">
		<h2>Implementation</h2>

		<h3>Svelte Component</h3>
		<pre class="code-block">{`<script>
  import { Spritz } from '@create-something/spritz';
<\/script>

<Spritz
  content="Your text here"
  wpm={350}
  showControls
/>`}</pre>

		<h3>Multiple Messages</h3>
		<pre class="code-block">{`<Spritz
  content={[
    { label: 'Intro', text: 'Welcome to the demo.' },
    { label: 'Main', text: 'This is the content.' },
    { label: 'Outro', text: 'Thanks for watching.' }
  ]}
  loop
/>`}</pre>

		<h3>Vanilla JavaScript</h3>
		<pre class="code-block">{`import { SpritzEngine } from '@create-something/spritz/vanilla';

const engine = new SpritzEngine({
  onWord: (word, orpIndex) => {
    // Render word with ORP at orpIndex
  },
  wpm: 300
});

engine.setText('Your text here');
engine.play();`}</pre>
	</section>

	<!-- Philosophical Alignment -->
	<section class="section">
		<h2>Philosophical Alignment</h2>

		<h3>Rams Principle 10: As Little Design as Possible</h3>
		<p>
			The interface is minimal: one word, one focal point, essential controls only.
			Everything serves comprehension. Nothing decorates.
		</p>

		<h3>Heidegger: Zuhandenheit (Ready-to-Hand)</h3>
		<p>
			When reading flows, the tool disappears. You don't see the redicle, the ORP marker,
			the progress bar—you see <em>meaning</em>. The interface recedes into transparent use.
		</p>

		<h3>Nicely Said: Words That Work</h3>
		<p>
			RSVP enforces clarity. When every word is isolated, filler becomes obvious.
			Spritz doesn't just display words faster—it reveals which words matter.
		</p>

		<QuoteBlock
			quote="The tool recedes; understanding remains."
			attribution="Heideggerian Design"
		/>
	</section>

	<!-- Use Cases -->
	<section class="section">
		<h2>Use Cases</h2>
		<div class="treatment-grid">
			<div class="treatment">
				<h3>Video Production</h3>
				<p>
					Create intro screens, transitions, and outros for walkthrough videos.
					Screen capture the clean display mode.
				</p>
			</div>

			<div class="treatment">
				<h3>Interactive Documentation</h3>
				<p>
					Embed readers in docs. Users control playback, adjust speed,
					and absorb content without scrolling.
				</p>
			</div>

			<div class="treatment">
				<h3>Speed Reading Training</h3>
				<p>
					Start at 200 WPM, gradually increase. Most users reach 400+ WPM
					within a few sessions.
				</p>
			</div>

			<div class="treatment">
				<h3>Accessibility</h3>
				<p>
					Some users find RSVP easier than tracking lines.
					Reduces cognitive load from eye movement.
				</p>
			</div>
		</div>
	</section>

	<!-- Conclusion -->
	<section class="section">
		<h2>Conclusion</h2>
		<p>
			Spritz applies the Subtractive Triad to reading: remove eye movement (DRY),
			keep only essential interface elements (Rams), serve understanding over features (Heidegger).
		</p>
		<p>
			For video walkthroughs, the same content can be recorded for video and embedded as
			interactive documentation. Single source, multiple uses. The words remain the same;
			the medium adapts.
		</p>
		<QuoteBlock
			quote="Less, but better."
			attribution="Dieter Rams"
		/>
	</section>

	<!-- Tags -->
	<footer class="experiment-footer">
		<div class="tags">
			{#each experiment.tags as tag}
				<span class="tag">{tag}</span>
			{/each}
		</div>
		<p class="principles">
			Tests: {experiment.tests_principles?.join(', ') ?? 'N/A'}
		</p>
	</footer>
	</ProgressiveExperiment>
</article>

<style>
	.experiment-page {
		max-width: var(--width-performance-content);
		margin: 0 auto;
		padding: var(--space-performance-xl) var(--space-performance-md);
	}

	/* Header */
	.experiment-header {
		margin-bottom: var(--space-performance-2xl);
		padding-bottom: var(--space-performance-xl);
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-sm);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.separator {
		color: var(--color-performance-fg-subtle);
	}

	.experiment-header h1 {
		font-size: var(--text-performance-h1);
		font-weight: var(--font-performance-bold);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-sm);
		line-height: var(--leading-performance-tight);
	}

	.subtitle {
		font-size: var(--text-performance-body-lg);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
	}

	/* ASCII Art */
	.ascii-art {
		font-family: var(--font-performance-mono);
		font-size: 0.6rem;
		line-height: 1.2;
		color: var(--color-performance-fg-muted);
		text-align: center;
		overflow-x: auto;
		margin: var(--space-performance-xl) 0;
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	/* Demo Containers */
	.demo-container {
		margin: var(--space-performance-lg) 0;
	}

	.demo-video {
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.demo-clean {
		background: var(--color-performance-bg-pure);
		border-radius: var(--radius-performance-scale-lg);
		padding: var(--space-performance-xl);
	}

	.demo-hint {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		text-align: center;
		margin-top: var(--space-performance-sm);
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-performance-2xl);
	}

	.section h2 {
		font-size: var(--text-performance-h2);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin-bottom: var(--space-performance-md);
	}

	.section h3 {
		font-size: var(--text-performance-h3);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin-top: var(--space-performance-lg);
		margin-bottom: var(--space-performance-sm);
	}

	.section p {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
		margin-bottom: var(--space-performance-sm);
	}

	.section ul {
		margin: var(--space-performance-sm) 0;
		padding-left: var(--space-performance-md);
	}

	.section li {
		font-size: var(--text-performance-body);
		color: var(--color-performance-fg-secondary);
		line-height: var(--leading-performance-relaxed);
		margin-bottom: var(--space-performance-xs);
	}

	:global(.section a) {
		color: var(--color-performance-fg-primary);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}

	:global(.section a:hover) {
		color: var(--color-performance-fg-secondary);
	}

	.section em {
		font-style: italic;
	}

	.section strong {
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
	}

	.section code {
		font-family: var(--font-performance-mono);
		font-size: 0.9em;
		padding: 0.15em 0.4em;
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-sm);
	}

	/* ORP Examples */
	.orp-example {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body);
		letter-spacing: 0.05em;
	}

	.orp {
		color: var(--color-performance-error);
		font-weight: var(--font-performance-bold);
	}

	/* Treatment Grid */
	.treatment-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-performance-md);
		margin: var(--space-performance-md) 0;
	}

	.treatment {
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
	}

	.treatment h3 {
		font-size: var(--text-performance-body);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-primary);
		margin: 0 0 var(--space-performance-xs) 0;
	}

	.treatment p {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-tertiary);
		margin: 0;
		line-height: var(--leading-performance-relaxed);
	}

	/* Phases Table */
	.phases-table {
		margin: var(--space-performance-md) 0;
		width: 100%;
		max-width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.phases-table table {
		width: max-content;
		min-width: 24rem;
		max-width: none;
		border-collapse: collapse;
	}

	.phases-table th,
	.phases-table td {
		padding: var(--space-performance-sm);
		text-align: left;
	}

	.phases-table th {
		font-size: var(--text-performance-body-sm);
		font-weight: var(--font-performance-semibold);
		color: var(--color-performance-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.phases-table td {
		font-size: var(--text-performance-body-sm);
		color: var(--color-performance-fg-secondary);
	}

	.phases-table td:first-child {
		font-family: var(--font-performance-mono);
		color: var(--color-performance-fg-muted);
		white-space: nowrap;
	}

	/* Code Block */
	.code-block {
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-body-sm);
		line-height: 1.6;
		padding: var(--space-performance-md);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-md);
		overflow-x: auto;
		margin: var(--space-performance-sm) 0 var(--space-performance-md) 0;
		color: var(--color-performance-fg-secondary);
	}
	.experiment-footer {
		margin-top: var(--space-performance-2xl);
		padding-top: var(--space-performance-lg);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-performance-xs);
		margin-bottom: var(--space-performance-sm);
	}

	.tag {
		padding: var(--space-performance-xs) var(--space-performance-sm);
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		background: var(--color-performance-bg-surface);
		border-radius: var(--radius-performance-scale-full);
	}

	.principles {
		font-size: var(--text-performance-caption);
		color: var(--color-performance-fg-muted);
		font-family: var(--font-performance-mono);
	}

	/* Large spritz variant */
	:global(.spritz--lg .spritz-word) {
		font-size: var(--text-performance-display);
	}

	:global(.spritz--lg .spritz-redicle) {
		min-height: 5rem;
		padding: var(--space-performance-xl) var(--space-performance-2xl);
	}

	@media (max-width: 768px) {
		.experiment-header h1 {
			font-size: var(--text-performance-h2);
		}

		.ascii-art {
			font-size: 0.45rem;
		}

		.treatment-grid {
			grid-template-columns: 1fr;
		}

		:global(.spritz--lg .spritz-word) {
			font-size: clamp(2.25rem, 16vw, 3.25rem);
		}

		:global(.spritz--lg .spritz-redicle) {
			padding: var(--space-performance-lg) var(--space-performance-md);
		}
	}
</style>
