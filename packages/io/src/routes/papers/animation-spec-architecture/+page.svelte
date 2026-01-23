<script lang="ts">
	/**
	 * Animation Spec Architecture: One Source, Two Renderers
	 *
	 * Documents the methodology for maintaining visual consistency between
	 * web animations (Svelte) and video exports (Remotion).
	 *
	 * "The spec describes WHAT happens. The renderer decides HOW."
	 */
	import { CanonReveal } from '@create-something/components/motion';
	import { canonRevealStyles } from '$lib/animations/canon-reveals';
	import { SEO } from '@create-something/components';
	import { Play, RotateCcw, ChevronRight } from 'lucide-svelte';

	// Interactive demo state
	let currentRevealIndex = $state(0);
	let revealKey = $state(0);

	const currentReveal = $derived(canonRevealStyles[currentRevealIndex]);

	function nextReveal() {
		currentRevealIndex = (currentRevealIndex + 1) % canonRevealStyles.length;
		revealKey++;
	}

	function resetReveal() {
		revealKey++;
	}
</script>

<SEO
	title="Animation Spec Architecture"
	description="A methodology for maintaining visual consistency between web animations and video exports through shared animation specifications."
	keywords="animation spec, visual consistency, web animations, Remotion, Svelte, video exports"
	ogType="article"
	articleSection="Methodology"
	publishedTime="2026-01-01T00:00:00Z"
	propertyName="io"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.io' },
		{ name: 'Papers', url: 'https://createsomething.io/papers' },
		{ name: 'Animation Spec Architecture', url: 'https://createsomething.io/papers/animation-spec-architecture' }
	]}
/>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-003</div>
			<h1 class="mb-3 paper-title">Animation Spec Architecture</h1>
			<p class="max-w-3xl paper-subtitle">
				One Source, Two Renderers: Shared Specifications for Svelte and Remotion
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Methodology</span>
				<span>•</span>
				<span>8 min read</span>
				<span>•</span>
				<span>Intermediate</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				When building educational content for CREATE SOMETHING, we needed animations for both
				<strong>web interactions</strong> (Svelte) and <strong>video exports</strong> (Remotion).
				Rather than duplicate animation logic across two frameworks, we developed a
				<strong>spec-driven architecture</strong> where shared specifications define
				<em>what</em> happens—timing, phases, keyframes—while each renderer interprets
				<em>how</em> to execute. This paper documents the architecture, its philosophical
				foundations in the Subtractive Triad, and practical implementation patterns.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value">2</div>
				<div class="metric-label">Renderers</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">5</div>
				<div class="metric-label">Canon Reveals</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-success">1</div>
				<div class="metric-label">Source of Truth</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value">3</div>
				<div class="metric-label">Packages Using</div>
			</div>
		</section>

		<!-- The Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">1. The Problem</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					CREATE SOMETHING teaches through multiple modalities: interactive web experiences
					and exportable videos. Both need the same animations—a tool receding into use,
					an IDE dissolving into a terminal, text revealing character by character.
				</p>

				<p>
					The naive approach: duplicate the animation logic in both frameworks.
				</p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// The duplication problem</p>
					<pre class="code-primary">
// Svelte version (LessonRemotion.svelte)
const hammerOpacity = $derived(
  $progress &lt; 0.2 ? 1 :
  $progress &lt; 0.6 ? 1 - (($progress - 0.2) / 0.4) * 0.7 :
  Math.max(0, 0.3 - (($progress - 0.6) / 0.4) * 0.3)
);

// Remotion version (ToolReceding.tsx)
const hammerOpacity = interpolate(progress, [0, 0.2, 0.6, 1], [1, 1, 0.3, 0]);</pre>
				</div>

				<p>
					This violates <strong>DRY</strong> (Don't Repeat Yourself)—one leg of the
					Subtractive Triad. When we update timing in one place, we must remember to
					update it in another. The animations drift. Consistency erodes.
				</p>

				<div class="p-4 callout-blue">
					<p class="callout-text-blue">
						<strong>The Subtractive Triad:</strong> Heidegger (remove obscurity),
						Rams (remove excess), DRY (remove disconnection). The duplication
						problem violates the third principle.
					</p>
				</div>
			</div>
		</section>

		<!-- The Architecture -->
		<section class="space-y-6">
			<h2 class="section-heading">2. The Architecture</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The solution: <strong>Animation Specs</strong>—TypeScript definitions that describe
					what should happen, without prescribing how.
				</p>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// Architecture Overview</p>
					<pre class="code-primary">
┌─────────────────────────────────────────────────────────────┐
│                    ANIMATION SPECS                          │
│  motion-studio/src/specs/                                   │
│                                                             │
│  • types.ts         Schema for all animations               │
│  • tool-receding.ts Heidegger's ready-to-hand               │
│  • ide-vs-terminal.ts Chrome → Canvas                       │
│  • canon-reveals.ts Text animation styles                   │
└─────────────────────────────────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   SVELTE RENDERERS  │       │  REMOTION RENDERERS │
│                     │       │                     │
│ LessonRemotion.svelte│      │ ToolReceding.tsx    │
│ CanonReveal.svelte   │      │ IDEvsTerminal.tsx   │
│                      │      │ KineticText.tsx     │
│ For: Web             │      │ For: Video export   │
└─────────────────────┘       └─────────────────────┘</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Spec Structure</h3>
				<p>Each animation spec defines:</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Metadata</h4>
						<ul class="space-y-2 card-list">
							<li>• <code class="code-inline">id</code> — Unique identifier</li>
							<li>• <code class="code-inline">name</code> — Human-readable name</li>
							<li>• <code class="code-inline">description</code> — What it demonstrates</li>
							<li>• <code class="code-inline">duration</code> — Total time in ms</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Phases</h4>
						<ul class="space-y-2 card-list">
							<li>• <code class="code-inline">id</code> — Phase identifier</li>
							<li>• <code class="code-inline">label</code> — Display text</li>
							<li>• <code class="code-inline">start</code> — Progress (0-1)</li>
							<li>• <code class="code-inline">end</code> — Progress (0-1)</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Keyframes</h4>
						<ul class="space-y-2 card-list">
							<li>• <code class="code-inline">at</code> — Progress value</li>
							<li>• <code class="code-inline">opacity</code> — 0 to 1</li>
							<li>• <code class="code-inline">scale</code> — Transform scale</li>
							<li>• <code class="code-inline">blur</code> — Filter blur</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Reveal</h4>
						<ul class="space-y-2 card-list">
							<li>• <code class="code-inline">text</code> — Final text</li>
							<li>• <code class="code-inline">style</code> — fade, mask, typewriter</li>
							<li>• <code class="code-inline">startPhase</code> — When to begin</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Canon Reveals -->
		<section class="space-y-6">
			<h2 class="section-heading">3. Canon Reveal Styles</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The five Canon-aligned text reveal styles embody aspects of the Subtractive Triad:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Style</th>
								<th class="text-left py-2 table-header">Philosophy</th>
								<th class="text-left py-2 table-header">Duration</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">DECODE</td>
								<td class="py-2">Signal emerges from noise (DRY)</td>
								<td class="py-2">3000ms</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">UNCONCEALMENT</td>
								<td class="py-2">Truth emerges from concealment (Heidegger)</td>
								<td class="py-2">3000ms</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">TYPEWRITER</td>
								<td class="py-2">Meditative, deliberate (Terminal-first)</td>
								<td class="py-2">3000ms</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">THRESHOLD</td>
								<td class="py-2">Binary presence (Rams)</td>
								<td class="py-2">1500ms</td>
							</tr>
							<tr>
								<td class="py-2 table-cell-emphasis">MASK</td>
								<td class="py-2">The text was always there (Subtractive)</td>
								<td class="py-2">1500ms</td>
							</tr>
						</tbody>
					</table>
				</div>

				<!-- Live Demo -->
				<div class="mt-6 p-6 demo-container">
					<div class="demo-label">
						<span class="label-icon">▶</span>
						<span>LIVE DEMO — {currentReveal.label}</span>
					</div>

					<div class="demo-canvas">
						{#key revealKey}
							<CanonReveal
								text={currentReveal.text}
								reveal={currentReveal.id}
								duration={currentReveal.duration}
								autoplay={true}
							/>
						{/key}
						<p class="demo-philosophy">{currentReveal.philosophy}</p>
					</div>

					<div class="demo-controls">
						<button class="control-btn" onclick={resetReveal}>
							<RotateCcw size={18} />
							<span>Replay</span>
						</button>
						<button class="control-btn" onclick={nextReveal}>
							<span>Next</span>
							<ChevronRight size={18} />
						</button>
					</div>

					<div class="demo-dots">
						{#each canonRevealStyles as _, i}
							<button
								class="demo-dot"
								class:active={i === currentRevealIndex}
								onclick={() => {
									currentRevealIndex = i;
									revealKey++;
								}}
							></button>
						{/each}
					</div>
				</div>
			</div>
		</section>

		<!-- Implementation -->
		<section class="space-y-6">
			<h2 class="section-heading">4. Implementation Pattern</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<h3 class="subsection-heading">Step 1: Define the Spec</h3>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// motion-studio/src/specs/tool-receding.ts</p>
					<pre class="code-primary">
export const toolRrecedingSpec: AnimationSpec = {'{'}
  id: 'tool-receding',
  name: 'Tool Receding',
  description: "The hammer disappears when hammering.",
  duration: 5000,
  
  phases: [
    {'{'} id: 'vorhandenheit', label: 'Present-at-hand', start: 0, end: 0.2 {'}'},
    {'{'} id: 'transition', label: 'Focus shifts', start: 0.2, end: 0.7 {'}'},
    {'{'} id: 'zuhandenheit', label: 'Ready-to-hand', start: 0.7, end: 1 {'}'},
  ],
  
  reveal: {'{'}
    text: 'The hammer disappears when hammering.',
    startPhase: 0.7,
  {'}'},
{'}'};</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Step 2: Import in Svelte</h3>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// LessonRemotion.svelte</p>
					<pre class="code-primary">
import {'{'} animationSpecs, getCurrentPhase {'}'} from '$lib/animations/specs';

const spec = animationSpecs[compositionId];
const duration = spec?.duration ?? 5000;

// Use spec values
const currentPhase = $derived(spec ? getCurrentPhase(spec, $progress) : null);
const revealText = spec?.reveal?.text;</pre>
				</div>

				<h3 class="mt-6 subsection-heading">Step 3: Import in Remotion</h3>

				<div class="p-4 font-mono code-block">
					<p class="code-comment">// ToolReceding.tsx</p>
					<pre class="code-primary">
import {'{'} toolRrecedingSpec {'}'} from '../../specs/tool-receding';

const spec = toolRrecedingSpec;
const totalFrames = (spec.duration / 1000) * (spec.fps ?? 30);

// Use spec phases
const currentPhase = spec.phases.find(p =&gt; 
  progress &gt;= p.start && progress &lt; p.end
);</pre>
				</div>

				<div class="p-4 callout-blue">
					<p class="callout-text-blue">
						<strong>Key Insight:</strong> The spec defines timing as progress (0-1),
						not frames or milliseconds. Each renderer converts to its native unit:
						Svelte uses <code class="code-inline">tweened</code> with duration,
						Remotion uses <code class="code-inline">interpolate</code> with frame counts.
					</p>
				</div>
			</div>
		</section>

		<!-- Benefits -->
		<section class="space-y-6">
			<h2 class="section-heading">5. Benefits</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Dimension</th>
								<th class="text-left py-2 table-header">Without Specs</th>
								<th class="text-left py-2 table-header">With Specs</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2">Consistency</td>
								<td class="py-2 table-error">Manual sync</td>
								<td class="py-2 table-success">Automatic</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Timing Updates</td>
								<td class="py-2 table-warning">2+ files</td>
								<td class="py-2 table-success">1 file</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Phase Labels</td>
								<td class="py-2 table-warning">Hardcoded</td>
								<td class="py-2 table-success">Shared</td>
							</tr>
							<tr class="table-row">
								<td class="py-2">Documentation</td>
								<td class="py-2 table-error">Separate</td>
								<td class="py-2 table-success">In spec</td>
							</tr>
							<tr>
								<td class="py-2">New Animations</td>
								<td class="py-2 table-warning">2 implementations</td>
								<td class="py-2 table-success">Spec + renderers</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Packages Using -->
		<section class="space-y-6">
			<h2 class="section-heading">6. Packages Using This Pattern</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="grid md:grid-cols-3 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">motion-studio</h4>
						<ul class="space-y-2 card-list">
							<li>• Canonical spec definitions</li>
							<li>• Remotion compositions</li>
							<li>• Video export pipeline</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">lms</h4>
						<ul class="space-y-2 card-list">
							<li>• LessonRemotion component</li>
							<li>• Interactive lessons</li>
							<li>• Spec-driven animations</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">io</h4>
						<ul class="space-y-2 card-list">
							<li>• Canon reveal demos</li>
							<li>• Paper visualizations</li>
							<li>• Teaching modalities</li>
						</ul>
					</div>
				</div>
			</div>
		</section>

		<!-- Why Not One Renderer -->
		<section class="space-y-6">
			<h2 class="section-heading">7. Why Not Build One Renderer?</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					A natural question: why not build a unified renderer that works for both web and video?
				</p>

				<div class="grid md:grid-cols-2 gap-4">
					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Web (Svelte)</h4>
						<ul class="space-y-2 card-list">
							<li>• Needs interactivity (play, pause, scrub)</li>
							<li>• Uses reactive primitives ($state, $derived)</li>
							<li>• Renders to DOM continuously</li>
							<li>• Performance: 60fps in browser</li>
						</ul>
					</div>

					<div class="p-4 info-card">
						<h4 class="mb-3 card-heading">Video (Remotion)</h4>
						<ul class="space-y-2 card-list">
							<li>• Frame-perfect rendering</li>
							<li>• Uses React + interpolate()</li>
							<li>• Renders to frames sequentially</li>
							<li>• Output: MP4, WebM, GIF</li>
						</ul>
					</div>
				</div>

				<p class="mt-4">
					<strong>Different constraints, different tools.</strong> Svelte excels at reactive
					web UIs. Remotion excels at programmatic video. Forcing one tool to do both
					would violate Rams: "Good design is as little design as possible."
				</p>

				<div class="p-4 callout-blue">
					<p class="callout-text-blue">
						<strong>The Canon Principle:</strong> Use the right tool for the job.
						Share the specification, not the implementation.
					</p>
				</div>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">8. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The Animation Spec Architecture demonstrates how the Subtractive Triad applies
					to cross-framework development:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>
						<strong>DRY:</strong> Single source of truth for animation timing and phases
					</li>
					<li>
						<strong>Heidegger:</strong> The spec reveals the essence; renderers handle mechanics
					</li>
					<li>
						<strong>Rams:</strong> Right tool for each job—Svelte for web, Remotion for video
					</li>
				</ul>

				<p>
					The result: animations that look identical across web and video, maintained
					from a single specification, with each renderer optimized for its medium.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center card-heading">
						<strong>The Spec-Driven Animation Principle</strong>
					</p>
					<div class="grid md:grid-cols-3 gap-4 mt-4 text-center">
						<div>
							<div class="font-semibold action-blue">Specify</div>
							<div class="card-list">what happens</div>
						</div>
						<div>
							<div class="font-semibold action-yellow">Render</div>
							<div class="card-list">how it looks</div>
						</div>
						<div>
							<div class="font-semibold action-green">Maintain</div>
							<div class="card-list">one source</div>
						</div>
					</div>
				</div>

				<p class="mt-6 text-center italic quote-text">
					"The spec describes what happens. The renderer decides how.
					Both serve the whole."
				</p>
			</div>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This methodology paper is part of the CREATE SOMETHING research program exploring
				animation systems. View the
				<a href="/papers/teaching-modalities-experiment" class="footer-link">
					Teaching Modalities Experiment
				</a>
				or explore the
				<a href="https://learn.createsomething.space" class="footer-link">LMS</a>
				where these animations are used.
			</p>
		</div>
	</div>
</div>

<style>
	/* Structure: Tailwind | Design: Canon */
	.paper-container {
		background: var(--color-bg-pure);
		color: var(--color-fg-primary);
	}

	.paper-header {
		border-bottom: 1px solid var(--color-border-default);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.paper-title {
		font-size: var(--text-h1);
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	.section-heading {
		font-size: var(--text-h2);
	}

	.subsection-heading {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
	}

	.body-text {
		color: var(--color-fg-secondary);
	}

	.text-emphasis {
		color: var(--color-fg-primary);
	}

	/* Metric Cards */
	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-value {
		font-size: var(--text-h2);
		color: var(--color-fg-primary);
	}

	.metric-success {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Data Tables */
	.data-table {
		font-size: var(--text-body-sm);
	}

	.table-header-row {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.table-header {
		color: var(--color-fg-secondary);
	}

	.table-body {
		color: var(--color-fg-tertiary);
	}

	.table-row {
		border-bottom: 1px solid var(--color-border-default);
	}

	.table-cell-emphasis {
		color: var(--color-fg-secondary);
	}

	.table-success {
		color: var(--color-success);
	}

	.table-warning {
		color: var(--color-warning);
	}

	.table-error {
		color: var(--color-error);
	}

	/* Action Colors */
	.action-blue {
		color: var(--color-data-1);
	}

	.action-yellow {
		color: var(--color-data-4);
	}

	.action-green {
		color: var(--color-data-2);
	}

	/* Callouts */
	.callout-blue {
		background: var(--color-data-1-muted);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.callout-text-blue {
		color: var(--color-data-1);
	}

	/* Info Cards */
	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.card-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Code */
	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-primary {
		color: var(--color-fg-primary);
		white-space: pre;
	}

	.code-comment {
		color: var(--color-fg-muted);
	}

	.code-inline {
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		padding: 0.125rem 0.5rem;
		border-radius: var(--radius-sm);
	}

	/* Quote Box */
	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	/* Responsive Tables */
	.responsive-table-scroll {
		overflow-x: auto;
	}

	/* Demo Container */
	.demo-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.demo-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: 1rem;
	}

	.label-icon {
		color: var(--color-success);
	}

	.demo-canvas {
		background: #000;
		border-radius: var(--radius-md);
		padding: 3rem 2rem;
		min-height: 160px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
	}

	.demo-philosophy {
		margin-top: 1.5rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.demo-controls {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.control-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.control-btn:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.demo-dots {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.demo-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-border-default);
		border: none;
		cursor: pointer;
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.demo-dot.active {
		background: var(--color-fg-primary);
	}

	/* Footer */
	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		text-decoration: underline;
		color: var(--color-fg-tertiary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.footer-link:hover {
		color: var(--color-fg-secondary);
	}
</style>
