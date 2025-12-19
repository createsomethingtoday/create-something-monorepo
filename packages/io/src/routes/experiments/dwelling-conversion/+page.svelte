<script lang="ts">
	/**
	 * Dwelling as Conversion Experiment
	 *
	 * Documents the evolution from assessment-based to TextRevelation-based
	 * conversion strategy on createsomething.agency.
	 *
	 * Philosophical Framing:
	 * - Phase 1 (Active Dwelling): Assessment questions invite reflection
	 * - Phase 2 (Contemplative Dwelling): Scroll-driven erasure demonstrates subtraction
	 *
	 * Both achieve Zuhandenheit—the tool recedes. The evolution represents
	 * a shift from *asking* to *showing*.
	 */
	import { QuoteBlock } from '@create-something/components';
</script>

<svelte:head>
	<title>Dwelling as Conversion: From Assessment to Progressive Erasure | CREATE SOMETHING.io</title>
	<meta name="description" content="Documenting the evolution from interactive assessment to scroll-driven TextRevelation—two modes of dwelling that transform conversion into experience." />
</svelte:head>

<div class="page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<p class="category-label">Experiment</p>
			<h1 class="title">Dwelling as Conversion</h1>
			<p class="subtitle">From Assessment to Progressive Erasure</p>
			<p class="meta">
				December 2025 · SvelteKit + Cloudflare · Heidegger, Rams
			</p>
		</header>

		<!-- ASCII Art -->
		<div class="flex justify-center">
			<pre class="ascii-art">
╔═══════════════════════════════════════════════════════════════════╗
║   DWELLING AS CONVERSION: EVOLUTION                               ║
║                                                                   ║
║   Phase 1: Active Dwelling          Phase 2: Contemplative       ║
║   ┌─────────────────────────┐       ┌───────────────────────────┐ ║
║   │ Q1: Accumulating?       │       │ "We help businesses..."   │ ║
║   │ Q2: Would remove?       │  ──►  │         ↓ scroll          │ ║
║   │ Q3: What's stopping?    │       │ "We remove what obscures" │ ║
║   └─────────────────────────┘       └───────────────────────────┘ ║
║                                                                   ║
║   User reflects on questions        User observes erasure         ║
║   Insight from their answers        Message distills through      ║
║                                     subtraction                   ║
║                                                                   ║
║   Both achieve Zuhandenheit: the tool recedes                     ║
╚═══════════════════════════════════════════════════════════════════╝
			</pre>
		</div>

		<!-- Abstract -->
		<section class="abstract">
			<h2 class="section-title">Evolution</h2>
			<p class="lead">
				This experiment documents two approaches to the same insight: <strong>conversion is dwelling continued</strong>.
				Phase 1 used interactive assessment—questions that invited reflection. Phase 2 uses progressive erasure—a
				scroll-driven animation where the medium embodies the message. Both achieve Zuhandenheit through different
				modes of engagement.
			</p>
		</section>

		<!-- Problem Section -->
		<section class="section">
			<h2 class="section-title">The Problem: Conversion as Interruption</h2>

			<p>
				The data told a clear story. Of 174 visitors to the agency homepage, only 21 clicked through to the
				contact page (5.6%). Of those, only 3 submitted the form. Meanwhile, experiments on .space and .io
				held attention—users explored, scrolled, engaged.
			</p>

			<div class="metrics-grid">
				<div class="metric">
					<span class="metric-value">174</span>
					<span class="metric-label">Homepage Views</span>
				</div>
				<div class="metric metric-arrow">→</div>
				<div class="metric">
					<span class="metric-value">21</span>
					<span class="metric-label">Contact Page</span>
				</div>
				<div class="metric metric-arrow">→</div>
				<div class="metric">
					<span class="metric-value">3</span>
					<span class="metric-label">Submissions</span>
				</div>
			</div>

			<p>
				The pattern was revealing: users who arrived at .agency from experiments didn't convert—they navigated
				to .ltd seeking philosophical grounding. They wanted to <em>understand</em> before they bought.
				The sales page interrupted their dwelling.
			</p>
		</section>

		<!-- Diagnosis Section -->
		<section class="section">
			<h2 class="section-title">Heideggerian Diagnosis: Vorhandenheit</h2>

			<p>
				In Heidegger's terms, the agency homepage was <em>present-at-hand</em> (Vorhandenheit)—it announced
				itself as a sales mechanism rather than receding into transparent use. The visitor became aware of
				being sold to. The tool became conspicuous.
			</p>

			<QuoteBlock
				quote="When equipment becomes unusable, the context of the work breaks down. The entire workshop becomes conspicuous."
				author="Martin Heidegger"
				source="Being and Time, §16"
			/>

			<p>
				The experiments on .space embody the opposite: <em>ready-to-hand</em> (Zuhandenheit). Users explore
				the Threshold Dwelling visualization, test the Motion Ontology tools, run the Triad Audit—and in
				doing so, they're already experiencing what CREATE SOMETHING builds. The tool recedes; insight emerges.
			</p>

			<p>
				The agency homepage broke this pattern. Instead of continuing the dwelling experience, it demanded
				a mode switch: stop exploring, start deciding. The result? Users bounced to .ltd for more
				exploration rather than converting.
			</p>
		</section>

		<!-- Phase 1: Assessment -->
		<section class="section">
			<h2 class="section-title">Phase 1: Assessment as Active Dwelling</h2>

			<p>
				Our first insight: the fix wasn't better copy—it was recognizing that <strong>conversion is dwelling continued</strong>.
				Instead of asking users to switch from exploration to transaction, we built an interactive assessment
				that applies the Subtractive Triad to the visitor's own business. The user reflects; insight emerges from their answers.
			</p>

			<div class="assessment-preview">
				<div class="preview-header">
					<span class="preview-eyebrow">Weniger, aber besser</span>
					<h3 class="preview-title">What's obscuring your business?</h3>
				</div>
				<div class="preview-questions">
					<div class="preview-question">
						<span class="question-number">Q1</span>
						<span class="question-text">"What are you accumulating?"</span>
						<span class="question-maps">→ Identifies triad level</span>
					</div>
					<div class="preview-question">
						<span class="question-number">Q2</span>
						<span class="question-text">"What would you remove if there were no consequences?"</span>
						<span class="question-maps">→ Reveals true constraint</span>
					</div>
					<div class="preview-question">
						<span class="question-number">Q3</span>
						<span class="question-text">"What's stopping you from removing it?"</span>
						<span class="question-maps">→ Maps to service need</span>
					</div>
				</div>
			</div>

			<p>
				The three questions mirror the three levels of the Subtractive Triad. Q1 identifies <em>what</em>
				is accumulating (implementation, artifact, or system-level). Q2 applies Rams' test: "What would you
				remove if there were no consequences?" Q3 connects back to the whole: "What's stopping you?"
			</p>
		</section>

		<!-- Implementation Section -->
		<section class="section">
			<h2 class="section-title">Implementation: The Hermeneutic Circle in Code</h2>

			<p>
				The assessment is itself an application of the Subtractive Triad. We adapted patterns from the
				experiment runtime components on .space, applying DRY at the implementation level.
			</p>

			<div class="code-section">
				<h3>The Recommendation Engine</h3>
				<pre class="code-block"><code>// Q1 options map to triad levels
const accumulatingOptions = [
  &#123; id: 'tech_debt', label: 'Technical debt', triad: 'implementation' &#125;,
  &#123; id: 'process_sprawl', label: 'Process sprawl', triad: 'artifact' &#125;,
  &#123; id: 'feature_creep', label: 'Feature creep', triad: 'artifact' &#125;,
  &#123; id: 'decision_paralysis', label: 'Decision paralysis', triad: 'system' &#125;,
  &#123; id: 'disconnected_systems', label: 'Disconnected systems', triad: 'system' &#125;,
  &#123; id: 'manual_tasks', label: 'Manual repetitive tasks', triad: 'implementation' &#125;
];

// Q3 options map to services
const blockerOptions = [
  &#123; id: 'uncertainty', label: "Uncertain about impact", service: 'advisory' &#125;,
  &#123; id: 'resistance', label: 'Organizational resistance', service: 'transformation' &#125;,
  &#123; id: 'where_to_start', label: "Don't know where to start", service: 'automation' &#125;,
  &#123; id: 'bandwidth', label: 'No internal bandwidth', service: 'partnership' &#125;,
  &#123; id: 'complexity', label: 'Technical complexity', service: 'agentic-systems' &#125;,
  &#123; id: 'web_first', label: 'Need web presence first', service: 'web-development' &#125;
];</code></pre>
			</div>

			<p>
				Each question's options encode domain knowledge. The recommendation isn't random—it emerges from
				the intersection of what's accumulating (the problem domain) and what's blocking removal (the
				intervention type).
			</p>

			<div class="code-section">
				<h3>Linking Assessment to Contact</h3>
				<pre class="code-block"><code>// When user completes assessment, they're directed to contact
// with assessment context preserved
const contactUrl = `/contact?service=$&#123;result.recommendation.service&#125;&assessment=$&#123;sessionId&#125;`;

// Contact form shows:
// "Based on your assessment, we recommend &#123;service&#125;"

// On contact submission, assessment is marked as converted
await db.prepare(
  `UPDATE assessment_responses SET converted_to_contact = 1 WHERE session_id = ?`
).bind(assessmentId).run();</code></pre>
			</div>
		</section>

		<!-- Phase 1 Insight Section -->
		<section class="section">
			<h2 class="section-title">Phase 1 Insight: Dwelling Through Questions</h2>

			<p>
				The crucial insight behind the assessment was that asking questions <em>is</em> dwelling. When a user answers "What are
				you accumulating?" they're not being interrogated—they're being invited to reflect. The assessment
				becomes a mirror, and in that mirror, the user sees their own situation more clearly.
			</p>

			<QuoteBlock
				quote="The question is not what we do but how our being is affected by what we do."
				author="Martin Heidegger"
				source="What Is Called Thinking?"
			/>

			<p>
				This is why the assessment works where static copy failed. Static copy <em>tells</em> the user
				what they should want. The assessment <em>asks</em> what they're experiencing. The difference is
				the difference between Vorhandenheit (object to be convinced) and Zuhandenheit (tool for
				self-understanding).
			</p>

			<p>
				The assessment components (<code>AssessmentRuntime</code>, <code>AssessmentStep</code>, <code>InsightReveal</code>)
				remain in the codebase for potential future use—particularly for visitors who enter via specific service pages
				and want a deeper engagement. But for the homepage, we discovered something even more aligned with our philosophy.
			</p>
		</section>

		<!-- Analytics Section (Phase 1) -->
		<section class="section">
			<h2 class="section-title">Phase 1 Analytics</h2>

			<p>
				The assessment implementation tracked timing and conversion without interrupting the experience:
			</p>

			<div class="code-section">
				<pre class="code-block"><code>CREATE TABLE assessment_responses (
  session_id TEXT NOT NULL,
  accumulating JSON,        -- Q1 selections
  removal_insight TEXT,     -- Q2 free text
  blockers JSON,            -- Q3 selections
  recommended_service TEXT,
  triad_level TEXT,
  time_on_q1_ms INTEGER,
  time_on_q2_ms INTEGER,
  time_on_q3_ms INTEGER,
  total_time_ms INTEGER,
  converted_to_contact INTEGER DEFAULT 0
);</code></pre>
			</div>

			<p>
				This allowed us to measure not just <em>if</em> users converted, but <em>how</em> they dwelt. Which
				questions took longest? Which answers correlated with conversion? The assessment generated data
				for refinement.
			</p>
		</section>

		<!-- Phase 2: Progressive Erasure -->
		<section class="section phase-divider">
			<h2 class="section-title">Phase 2: Progressive Erasure</h2>

			<p>
				While building the assessment, we realized something: we were <em>asking</em> users about subtraction
				when we could <em>show</em> them. The most CREATE SOMETHING way to tell the subtraction story is
				through text that subtracts itself.
			</p>

			<div class="revelation-demo">
				<div class="demo-label">Scroll-driven animation</div>
				<div class="demo-stages">
					<div class="demo-stage">
						<span class="stage-progress">0%</span>
						<span class="stage-text">We help businesses identify operational inefficiencies and implement AI-powered automation solutions that streamline workflows and remove what obscures.</span>
					</div>
					<div class="demo-stage">
						<span class="stage-progress">35%</span>
						<span class="stage-text">We <s>help</s> <s>businesses</s> <s>identify</s> <s>operational</s> <s>inefficiencies</s> <s>and</s> <s>implement</s> <s>AI-powered</s> <s>automation</s> <s>solutions</s> <s>that</s> <s>streamline</s> <s>workflows</s> <s>and</s> remove what obscures.</span>
					</div>
					<div class="demo-stage">
						<span class="stage-progress">85%</span>
						<span class="stage-text emphasized">We remove what obscures.</span>
					</div>
				</div>
			</div>

			<p>
				The TextRevelation component implements this in five phases:
			</p>

			<div class="phases-list">
				<div class="phase-item">
					<span class="phase-range">0–10%</span>
					<span class="phase-name">Reading</span>
					<span class="phase-desc">Full text visible</span>
				</div>
				<div class="phase-item">
					<span class="phase-range">10–35%</span>
					<span class="phase-name">Striking</span>
					<span class="phase-desc">Strikethrough progressively appears on non-essential words</span>
				</div>
				<div class="phase-item">
					<span class="phase-range">35–50%</span>
					<span class="phase-name">Fading</span>
					<span class="phase-desc">Struck words fade to transparent</span>
				</div>
				<div class="phase-item">
					<span class="phase-range">50–85%</span>
					<span class="phase-name">Coalescing</span>
					<span class="phase-desc">Essential words collapse together, text grows bolder</span>
				</div>
				<div class="phase-item">
					<span class="phase-range">85–100%</span>
					<span class="phase-name">Complete</span>
					<span class="phase-desc">"We remove what obscures." + CTA appears</span>
				</div>
			</div>
		</section>

		<!-- TextRevelation Implementation -->
		<section class="section">
			<h2 class="section-title">Implementation: Words as Data</h2>

			<p>
				The key insight was treating words as data with a <code>keep</code> property:
			</p>

			<div class="code-section">
				<h3>Word Configuration</h3>
				<pre class="code-block"><code>const words = [
  &#123; text: 'We', keep: true &#125;,
  &#123; text: 'help', keep: false &#125;,
  &#123; text: 'businesses', keep: false &#125;,
  &#123; text: 'identify', keep: false &#125;,
  // ...corporate fluff marked keep: false...
  &#123; text: 'remove', keep: true &#125;,
  &#123; text: 'what', keep: true &#125;,
  &#123; text: 'obscures.', keep: true &#125;
];

// Scroll progress drives phase transitions
let phase = $derived(
  scrollProgress &lt; 0.1 ? 'reading' :
  scrollProgress &lt; 0.35 ? 'striking' :
  scrollProgress &lt; 0.5 ? 'fading' :
  scrollProgress &lt; 0.85 ? 'coalescing' : 'complete'
);</code></pre>
			</div>

			<p>
				Each word calculates its own strike and fade progress based on scroll position. Words marked
				<code>keep: false</code> get a strikethrough that grows from left to right, then fade out entirely.
				The kept words remain, growing bolder as the message distills.
			</p>

			<div class="code-section">
				<h3>Per-Word Animation</h3>
				<pre class="code-block"><code>&#123;#each words as word, i&#125;
  &#123;@const wordStrike = (strikeProgress - i * 0.03) / 0.3&#125;
  &#123;@const wordFade = word.keep ? 1 : 1 - fadeProgress&#125;
  &lt;span
    class="word"
    class:keep=&#123;word.keep&#125;
    class:hidden=&#123;!word.keep && phase === 'complete'&#125;
    style="--strike: &#123;wordStrike&#125;; --fade: &#123;wordFade&#125;;"
  &gt;
    &#123;word.text&#125;
    &#123;#if !word.keep&#125;
      &lt;span class="strike"&gt;&lt;/span&gt;  // CSS width: calc(var(--strike) * 100%)
    &#123;/if&#125;
  &lt;/span&gt;
&#123;/each&#125;</code></pre>
			</div>
		</section>

		<!-- Philosophical Analysis -->
		<section class="section">
			<h2 class="section-title">From Asking to Showing</h2>

			<p>
				The evolution from assessment to TextRevelation represents a deeper understanding of the principle:
			</p>

			<div class="comparison-table">
				<div class="comparison-row header">
					<span></span>
					<span>Phase 1: Assessment</span>
					<span>Phase 2: TextRevelation</span>
				</div>
				<div class="comparison-row">
					<span class="row-label">Mode</span>
					<span>Active dwelling</span>
					<span>Contemplative dwelling</span>
				</div>
				<div class="comparison-row">
					<span class="row-label">Mechanism</span>
					<span>"What would you remove?"</span>
					<span>Words disappear as you scroll</span>
				</div>
				<div class="comparison-row">
					<span class="row-label">User role</span>
					<span>Reflect on questions</span>
					<span>Witness the work being done</span>
				</div>
				<div class="comparison-row">
					<span class="row-label">Form/Content</span>
					<span>Form asks about content</span>
					<span>Form <em>is</em> content</span>
				</div>
				<div class="comparison-row">
					<span class="row-label">Cognitive load</span>
					<span>User does the work</span>
					<span>User observes the work</span>
				</div>
			</div>

			<QuoteBlock
				quote="Good design makes a product understandable. It clarifies the product's structure. Better still, it can make the product talk."
				author="Dieter Rams"
				source="Ten Principles for Good Design"
			/>

			<p>
				The assessment <em>asked</em> about subtraction. The TextRevelation <em>demonstrates</em> it.
				The medium becomes the message—not as decoration but as meaning. Understanding comes through
				observation, not interrogation.
			</p>
		</section>

		<!-- Meta-Application Section -->
		<section class="section">
			<h2 class="section-title">The Meta-Application</h2>

			<p>
				There's a recursive elegance here. The Subtractive Triad was developed to guide our work. Now it's
				being used as the <em>content</em> of a conversion tool. The framework that helps us build things
				is the same framework that helps prospective clients understand what they need.
			</p>

			<div class="triad-application">
				<div class="triad-level">
					<span class="level-name">DRY (Implementation)</span>
					<span class="level-app">Reused ExperimentRuntime patterns from .space</span>
				</div>
				<div class="triad-level">
					<span class="level-name">Rams (Artifact)</span>
					<span class="level-app">Three questions, no more. Each earns its existence.</span>
				</div>
				<div class="triad-level">
					<span class="level-name">Heidegger (System)</span>
					<span class="level-app">Assessment serves the whole: user insight → right service → mutual benefit</span>
				</div>
			</div>

			<p>
				This is what it means for the hermeneutic circle to complete: the philosophy (.ltd) informs the
				research (.io), which validates the practice (.space), which applies to service delivery (.agency),
				which tests and evolves the philosophy.
			</p>
		</section>

		<!-- Conclusion -->
		<section class="section conclusion-section">
			<h2 class="section-title">Conclusion: The Journey of Subtraction</h2>

			<p>
				The evolution from assessment to TextRevelation is itself an application of the Subtractive Triad.
				We started with a full assessment—three questions, recommendation engine, analytics schema.
				We ended with a single scroll experience that <em>shows</em> what we do by <em>doing</em> it.
			</p>

			<p>
				Both approaches achieve Zuhandenheit. The assessment invites active reflection—users think about
				their own situation. The TextRevelation invites contemplative observation—users witness subtraction
				in action. Both cause the conversion mechanism to recede; both reveal something static copy never could.
			</p>

			<p>
				The lesson: "Less, but better" applies not just to artifacts, but to how we communicate.
				Sometimes asking is the right mode. Sometimes showing is. The hermeneutic circle completes when
				we let research inform implementation, implementation inform refinement, and refinement deepen research.
			</p>

			<div class="experiment-link">
				<a href="https://createsomething.agency" class="primary-link">
					Experience the TextRevelation →
				</a>
			</div>
		</section>
	</div>
</div>

<style>
	.page {
		background: var(--color-bg-pure);
		min-height: 100vh;
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
		padding: var(--space-xl) var(--space-md);
	}

	.header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.category-label {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.ascii-art {
		font-family: monospace;
		font-size: clamp(0.5rem, 1.2vw, 0.75rem);
		line-height: 1.2;
		color: var(--color-fg-secondary);
		background: var(--color-bg-surface);
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		overflow-x: auto;
		margin-bottom: var(--space-xl);
	}

	.abstract {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-border-default);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: 1.8;
	}

	.section {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.section p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.8;
		margin-bottom: var(--space-md);
	}

	/* Metrics Grid */
	.metrics-grid {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin: var(--space-lg) 0;
	}

	.metric {
		text-align: center;
	}

	.metric-value {
		display: block;
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		font-family: monospace;
	}

	.metric-label {
		display: block;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.metric-arrow {
		font-size: var(--text-h2);
		color: var(--color-fg-muted);
	}

	/* Assessment Preview */
	.assessment-preview {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin: var(--space-lg) 0;
	}

	.preview-header {
		text-align: center;
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.preview-eyebrow {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.preview-title {
		font-size: var(--text-h3);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-top: var(--space-xs);
	}

	.preview-questions {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.preview-question {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: var(--space-md);
		align-items: center;
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.question-number {
		font-family: monospace;
		font-weight: var(--font-bold);
		color: var(--color-fg-muted);
		width: 2rem;
	}

	.question-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		font-style: italic;
	}

	.question-maps {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* Code Sections */
	.code-section {
		margin: var(--space-lg) 0;
	}

	.code-section h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-sm);
	}

	.code-block {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-md);
		overflow-x: auto;
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	/* Triad Application */
	.triad-application {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin: var(--space-lg) 0;
	}

	.triad-level {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.level-name {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-family: monospace;
	}

	.level-app {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		text-align: right;
	}

	/* Phase Divider */
	.phase-divider {
		border-top: 2px solid var(--color-border-emphasis);
		padding-top: var(--space-xl);
		margin-top: var(--space-xl);
	}

	/* Revelation Demo */
	.revelation-demo {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		margin: var(--space-lg) 0;
	}

	.demo-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.demo-stages {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.demo-stage {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.stage-progress {
		flex-shrink: 0;
		width: 3rem;
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.stage-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.stage-text s {
		color: var(--color-fg-muted);
	}

	.stage-text.emphasized {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	/* Phases List */
	.phases-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		margin: var(--space-lg) 0;
	}

	.phase-item {
		display: grid;
		grid-template-columns: 5rem 6rem 1fr;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.phase-range {
		font-family: monospace;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.phase-name {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.phase-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	/* Comparison Table */
	.comparison-table {
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: var(--color-border-default);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		margin: var(--space-lg) 0;
	}

	.comparison-row {
		display: grid;
		grid-template-columns: 6rem 1fr 1fr;
		gap: 1px;
		background: var(--color-border-default);
	}

	.comparison-row span {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.comparison-row.header span {
		background: var(--color-bg-elevated);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-size: var(--text-caption);
	}

	.row-label {
		font-weight: var(--font-medium);
		color: var(--color-fg-tertiary) !important;
	}

	/* Conclusion */
	.conclusion-section {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-xl);
	}

	.experiment-link {
		margin-top: var(--space-xl);
		text-align: center;
	}

	.primary-link {
		display: inline-block;
		padding: var(--space-sm) var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-weight: var(--font-semibold);
		border-radius: var(--radius-full);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.primary-link:hover {
		opacity: 0.9;
	}

	@media (max-width: 640px) {
		.metrics-grid {
			flex-direction: column;
		}

		.metric-arrow {
			transform: rotate(90deg);
		}

		.preview-question {
			grid-template-columns: 1fr;
			gap: var(--space-xs);
		}

		.question-maps {
			display: none;
		}

		.triad-level {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-xs);
		}

		.level-app {
			text-align: left;
		}

		.phase-item {
			grid-template-columns: 1fr;
			gap: var(--space-xs);
		}

		.phase-range {
			font-weight: var(--font-semibold);
		}

		.comparison-row {
			grid-template-columns: 1fr;
		}

		.comparison-row.header span:first-child {
			display: none;
		}

		.demo-stage {
			flex-direction: column;
			gap: var(--space-xs);
		}
	}
</style>
