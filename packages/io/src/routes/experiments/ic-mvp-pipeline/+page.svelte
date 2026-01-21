<script lang="ts">
	import { QuoteBlock } from '@create-something/components';
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
			<span class="separator">/</span>
			<span class="status validated">✓ VALIDATED</span>
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
			We established a systematic pipeline for translating internal MVPs—built by ICs using AI tools 
			like Cursor, Claude Code, and Lovable—into production Webflow Code Components. The first 
			translation (Webflow Marketplace Bundle Scanner) completed in <strong>3.5 hours</strong>, 
			achieving <strong>95%+ design fidelity</strong> and full functionality including AI-powered 
			analysis via Google Gemini.
		</p>
		<p>
			The interesting part wasn't the technology—DevLink's <code>declareComponent</code> API is 
			well-documented. It was discovering that <em>agentic engineering</em> could handle the entire 
			translation: analyzing an unfamiliar codebase, extracting patterns, solving Shadow DOM styling 
			challenges, and exposing meaningful Designer props.
		</p>
	</section>

	<!-- The Problem -->
	<section class="section">
		<h2>The Problem: MVPs That Die in Slack Threads</h2>
		<p>
			An IC has an idea. They spin up Cursor, scaffold something in React, demo it to the team. 
			Everyone's impressed. Then:
		</p>
		<ul>
			<li>"Great work! Can you share the code?"</li>
			<li>"Sure, here's the ZIP..."</li>
			<li><em>ZIP sits in Downloads folder</em></li>
			<li><em>Thread goes cold</em></li>
			<li><em>MVP dies</em></li>
		</ul>
		<QuoteBlock
			quote="The gap between 'working prototype' and 'production component' is wide enough that most MVPs never cross it."
			attribution="Structural observation"
		/>
		<p>
			Webflow has something unique: <strong>Code Components via DevLink</strong>. React components 
			can render directly in Designer, with props exposed as native controls. But that capability 
			sits unused when MVPs never make the jump.
		</p>
	</section>

	<!-- The Test Case -->
	<section class="section">
		<h2>Test Case: Bundle Scanner</h2>
		<p>
			An App Reviewer on the Marketplace team built a security scanner for reviewing app submissions. 
			React + Vite + Tailwind. Runs 18 regex-based rules against ZIP bundles, flags violations, 
			generates rejection emails, and includes AI analysis via Google Gemini.
		</p>
		<p><strong>Useful tool. Great demo. Sitting in a Downloads folder.</strong></p>

		<div class="assessment-grid">
			<div class="assessment-item pass">
				<span class="label">React-based?</span>
				<span class="value">✓ Yes</span>
			</div>
			<div class="assessment-item pass">
				<span class="label">Clear boundaries?</span>
				<span class="value">✓ Yes</span>
			</div>
			<div class="assessment-item pass">
				<span class="label">Defined inputs?</span>
				<span class="value">✓ Yes</span>
			</div>
			<div class="assessment-item pass">
				<span class="label">Compatible deps?</span>
				<span class="value">✓ Yes</span>
			</div>
		</div>
	</section>

	<!-- The Translation -->
	<section class="section">
		<h2>The Translation Process</h2>
		
		<div class="phase-grid">
			<div class="phase">
				<h3>Phase 1: Analysis</h3>
				<span class="time">15 min</span>
				<p>
					Agent read the MVP codebase—entry points, component tree, state management, 
					styling approach (Tailwind), external dependencies (Gemini API, IndexedDB).
				</p>
			</div>

			<div class="phase">
				<h3>Phase 2: Package Creation</h3>
				<span class="time">45 min</span>
				<p>
					Created <code>bundle-scanner-core/</code> (pure logic) and <code>bundle-scanner/</code> 
					(React UI + Webflow integration).
				</p>
			</div>

			<div class="phase">
				<h3>Phase 3: Shadow DOM Challenge</h3>
				<span class="time">90 min</span>
				<p>
					Webflow Code Components render in Shadow DOM for isolation. This breaks external CSS 
					imports, global Tailwind classes, and document-level styles. 
					<strong>Solution:</strong> Direct CSS import in the component file itself.
				</p>
			</div>

			<div class="phase">
				<h3>Phase 4: Props Exposure</h3>
				<span class="time">15 min</span>
				<p>
					<code>declareComponent</code> is clean. Exposed: Gemini API Key (string), 
					Show History (boolean), Max File Size (number).
				</p>
			</div>

			<div class="phase">
				<h3>Phase 5: Debug Cycles</h3>
				<span class="time">60 min</span>
				<p>
					Fixed: Gemini model renamed (<code>gemini-1.5-flash</code> → <code>gemini-2.0-flash</code>), 
					styles not rendering (Shadow DOM), component directory wrong (<code>/src/</code> vs <code>/webflow/</code>).
				</p>
			</div>
		</div>
	</section>

	<!-- Results -->
	<section class="section">
		<h2>Results</h2>
		
		<div class="results-grid">
			<div class="result">
				<span class="metric">3.5 hours</span>
				<span class="label">Total time</span>
			</div>
			<div class="result">
				<span class="metric">95%+</span>
				<span class="label">Design fidelity</span>
			</div>
			<div class="result">
				<span class="metric">100%</span>
				<span class="label">Core functionality</span>
			</div>
			<div class="result">
				<span class="metric">685 lines</span>
				<span class="label">Consolidated component</span>
			</div>
		</div>

		<p>
			From Downloads folder to Designer canvas in 3.5 hours. The component now lives in Webflow 
			Designer—not a ZIP file, not a Slack thread. A real component that does real work.
		</p>
	</section>

	<!-- The Pipeline -->
	<section class="section">
		<h2>The Validated Pipeline</h2>
		<pre class="pipeline-diagram">
IC MVP → Analysis → Package Creation → Translation → Styling → Props → Bundle → Share
   ↓         ↓            ↓               ↓           ↓        ↓        ↓       ↓
 ZIP     Understand   Monorepo      .webflow.tsx   Shadow   Designer  Webflow  Test
 file    structure    packages      component       DOM      controls   CLI     
		</pre>
		
		<h3>Key Decisions</h3>
		<ul>
			<li><strong>When to extract core logic:</strong> If the MVP has reusable business logic, 
			if you might need the logic in other contexts, if complexity benefits from separate testing.</li>
			<li><strong>When to consolidate components:</strong> If the original had fine-grained 
			components for code organization only, if props exposure is simpler with a single component.</li>
			<li><strong>What to expose as props:</strong> Configuration that non-developers should control, 
			theming options, feature flags. NOT internal state, NOT implementation details.</li>
		</ul>
	</section>

	<!-- Implications -->
	<section class="section">
		<h2>Implications</h2>
		
		<h3>For IC Work</h3>
		<p>
			Build whatever you want, however you want. The pipeline doesn't require MVPs to follow 
			specific patterns—it adapts to what exists. If translation is cheap, prototyping is free.
		</p>

		<h3>For Component Libraries</h3>
		<p>
			Every translated MVP becomes a potential library addition. Bundle Scanner isn't just a 
			one-off tool—it's now a reusable component any Webflow site can install.
		</p>

		<h3>For Agentic Engineering</h3>
		<p>
			This wasn't a human-led translation with AI assistance. It was an <em>agent-led translation</em> 
			with human oversight. The agent analyzed unfamiliar code, made architectural decisions, 
			solved novel problems (Shadow DOM), and debugged production issues.
		</p>
		<QuoteBlock
			quote="Human role: provide context, approve decisions, test results. AI handles execution, humans handle judgment."
			attribution="Emergent pattern"
		/>
	</section>

	<!-- Starting Prompt -->
	<section class="section">
		<h2>Reproducibility</h2>
		<p>To translate your next IC MVP:</p>
		<pre class="code-block">
I have an IC-built MVP that needs to be translated to a Webflow Code Component.

MVP location: [path]
MVP stack: [React + Tailwind, etc.]

Please:
1. Analyze structure and identify components
2. Create packages/[name]/ in monorepo
3. Translate to *.webflow.tsx using declareComponent
4. Handle Shadow DOM styling
5. Expose meaningful props
6. Bundle and share

Follow patterns from packages/bundle-scanner/.
		</pre>
	</section>

</article>

<style>
	.experiment-page {
		max-width: 48rem;
		margin: 0 auto;
		padding: 4rem 1.5rem;
		color: var(--color-fg-primary);
	}

	.experiment-header {
		margin-bottom: 3rem;
		text-align: center;
	}

	.header-meta {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: 1rem;
	}

	.category {
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.status.validated {
		color: var(--color-success, #22c55e);
		font-weight: 600;
	}

	h1 {
		font-size: var(--text-display);
		font-weight: 700;
		line-height: 1.2;
		margin-bottom: 1rem;
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.ascii-art {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		font-size: var(--text-caption);
		line-height: 1.4;
		margin-bottom: 3rem;
		border: 1px solid var(--color-border);
	}

	.section {
		margin-bottom: 3rem;
	}

	.section h2 {
		font-size: var(--text-h1);
		font-weight: 600;
		margin-bottom: 1rem;
		color: var(--color-fg-primary);
	}

	.section h3 {
		font-size: var(--text-body-lg);
		font-weight: 600;
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
	}

	.section p {
		line-height: 1.7;
		margin-bottom: 1rem;
		color: var(--color-fg-secondary);
	}

	.section ul {
		padding-left: 1.5rem;
		margin-bottom: 1rem;
	}

	.section li {
		line-height: 1.7;
		margin-bottom: 0.5rem;
		color: var(--color-fg-secondary);
	}

	code {
		background: var(--color-bg-secondary);
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	.assessment-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.assessment-item {
		display: flex;
		justify-content: space-between;
		padding: 0.75rem 1rem;
		background: var(--color-bg-secondary);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.assessment-item.pass .value {
		color: var(--color-success, #22c55e);
		font-weight: 600;
	}

	.phase-grid {
		display: grid;
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.phase {
		padding: 1.5rem;
		background: var(--color-bg-secondary);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.phase h3 {
		margin-top: 0;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.phase .time {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-weight: 400;
	}

	.phase p {
		margin-bottom: 0;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin: 1.5rem 0;
	}

	.result {
		text-align: center;
		padding: 1.5rem;
		background: var(--color-bg-secondary);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border);
	}

	.result .metric {
		display: block;
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
	}

	.result .label {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: 0.25rem;
	}

	.pipeline-diagram {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		font-size: var(--text-caption);
		line-height: 1.4;
		margin: 1.5rem 0;
		border: 1px solid var(--color-border);
	}

	.code-block {
		background: var(--color-bg-secondary);
		padding: 1.5rem;
		border-radius: 0.5rem;
		overflow-x: auto;
		font-size: var(--text-body-sm);
		line-height: 1.6;
		margin-top: 1rem;
		border: 1px solid var(--color-border);
		white-space: pre-wrap;
	}

	@media (max-width: 640px) {
		.assessment-grid,
		.results-grid {
			grid-template-columns: 1fr;
		}

		h1 {
			font-size: var(--text-h1);
		}
	}
</style>
