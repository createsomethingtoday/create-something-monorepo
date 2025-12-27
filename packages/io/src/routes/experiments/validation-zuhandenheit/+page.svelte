<script lang="ts">
	/**
	 * Validation as Zuhandenheit Experiment
	 *
	 * Hypothesis: Client-side validation maintains tool transparency (Zuhandenheit)
	 * while server-side errors cause tool breakdown (Vorhandenheit).
	 */
</script>

<svelte:head>
	<title>Validation as Zuhandenheit | CREATE SOMETHING.io</title>
	<meta name="description" content="When validation occurs at the point of input, tools remain ready-to-hand. When errors surface downstream, tools break down into present-at-hand obstruction." />
</svelte:head>

<div class="page">
	<div class="container">
		<!-- Header -->
		<header class="header">
			<p class="category-label">Experiment</p>
			<h1 class="title">Validation as Zuhandenheit</h1>
			<p class="subtitle">Preventing Tool Breakdown Through Proximity</p>
			<p class="meta">
				December 2025 · Next.js Forms · Heidegger, Rams
			</p>
		</header>

		<!-- ASCII Art -->
		<div class="flex justify-center">
			<pre class="ascii-art">
╔═══════════════════════════════════════════════════════════════════════╗
║  VALIDATION AS ZUHANDENHEIT                                           ║
║                                                                       ║
║  Before (Vorhandenheit):                                              ║
║  ┌────────────┐      ┌────────────┐      ┌────────────┐               ║
║  │   INPUT    │  ──► │   SERVER   │  ──► │   ADMIN    │  ──► ???      ║
║  │    (ok)    │      │    (ok)    │      │   (FAIL)   │               ║
║  └────────────┘      └────────────┘      └────────────┘               ║
║                                              ↑                        ║
║                                       "failed to upload image"        ║
║                                                                       ║
║  After (Zuhandenheit):                                                ║
║  ┌────────────┐                                                       ║
║  │   INPUT    │  ──► ✓ proceeds to server                             ║
║  │  ⚠ 142     │      or                                               ║
║  │   chars    │  ──► ✗ "Filename too long. Please rename."            ║
║  └────────────┘                                                       ║
║                                                                       ║
║  The tool recedes; the work continues.                                ║
╚═══════════════════════════════════════════════════════════════════════╝
			</pre>
		</div>

		<!-- Hypothesis -->
		<section class="abstract">
			<h2 class="section-title">Hypothesis</h2>
			<p class="lead">
				Validation that occurs at the <em>point of input</em> maintains tool transparency
				(Zuhandenheit). Validation that surfaces as errors <em>downstream</em> causes tool
				breakdown (Vorhandenheit)—the moment when tools stop serving and start obstructing.
			</p>
		</section>

		<!-- The Problem -->
		<section class="section">
			<h2 class="section-title">The Problem</h2>
			<div class="content">
				<p class="body-text">
					Reviewers processing Webflow Marketplace app submissions were encountering a mysterious error:
					<strong>"failed to upload image"</strong>. The app developer had submitted their listing
					successfully. The form accepted the upload. The server processed it. Everything worked—until
					the Reviewer tried to add the submission to the Marketplace.
				</p>
				<p class="body-text">
					Two different systems, built at different times, with different constraints. The submission
					form (external, developer-facing) had no filename length limit. The Admin tool (internal,
					Reviewer-facing) had a 100-character limit.
				</p>
				<p class="body-text">
					Files like <code>Ensure%20Cookie%20Compliance%20for%20%20your%20Webflow%20Website-MxS729ZpZzSHBhckkQ6CGP2ugg9xok.png</code>
					(142 characters) passed through the submission form without issue, but failed silently
					when Reviewers attempted to process the submission in Admin.
				</p>

				<div class="breakdown-box">
					<h4 class="breakdown-title">Vorhandenheit: Tool Breakdown Across System Boundaries</h4>
					<p class="breakdown-text">
						In Heidegger's terms, this is a particularly insidious case of <em>Vorhandenheit</em>—the tool becoming
						"present-at-hand." When a hammer works, we don't see it; we see the nail going in.
						When it breaks, suddenly we're staring at the hammer, not the work.
					</p>
					<p class="breakdown-text">
						Here, the breakdown creates friction for <em>both</em> parties. The Reviewer encounters an
						opaque error in Admin. The developer's submission is blocked for reasons they can't see.
						Neither party can identify the root cause—a filename constraint in a system one has never
						used and the other doesn't control.
					</p>
					<p class="breakdown-text">
						This is Vorhandenheit compounded: the tool breaks in the space <em>between</em> systems,
						visible to neither side.
					</p>
				</div>
			</div>
		</section>

		<!-- The Solution -->
		<section class="section">
			<h2 class="section-title">The Solution</h2>
			<div class="content">
				<p class="body-text">
					Move validation to the input boundary. When a user selects a file, check immediately:
				</p>

				<div class="code-comparison">
					<div class="code-block">
						<h4 class="code-title">Added Validation</h4>
						<pre><code>{`// Filename length validation (100 char limit per Admin)
const MAX_FILENAME_LENGTH = 100;
if (file.name.length > MAX_FILENAME_LENGTH) {
  const errorMsg = \`Filename is too long (\${file.name.length} characters).
    Maximum is \${MAX_FILENAME_LENGTH} characters.
    Please rename the file and try again.\`;

  setValidationState(prev => ({
    ...prev,
    avatarFileError: errorMsg
  }));
  return;
}`}</code></pre>
					</div>
				</div>

				<p class="body-text">
					The fix is 15 lines of code. But its effect is philosophical: it transforms a
					<em>Vorhandenheit</em> (tool breakdown) into <em>Zuhandenheit</em> (tool transparency).
					The user sees the error where they can act on it—at the file input, not in a
					downstream system they may not even have access to.
				</p>
			</div>
		</section>

		<!-- Validation Order -->
		<section class="section">
			<h2 class="section-title">Validation Order</h2>
			<div class="content">
				<p class="body-text">
					The existing validation pattern—file size, then dimensions, then type—was
					already embodying Zuhandenheit. Filename length simply joins this chain:
				</p>

				<div class="validation-chain">
					<div class="validation-step new">
						<span class="step-number">1</span>
						<div class="step-content">
							<strong>Filename length</strong>
							<span class="step-limit">≤ 100 characters</span>
							<span class="step-tag">NEW</span>
						</div>
					</div>
					<div class="validation-step">
						<span class="step-number">2</span>
						<div class="step-content">
							<strong>File size</strong>
							<span class="step-limit">≤ 2MB</span>
						</div>
					</div>
					<div class="validation-step">
						<span class="step-number">3</span>
						<div class="step-content">
							<strong>Image dimensions</strong>
							<span class="step-limit">900×900 or 1280×846</span>
						</div>
					</div>
					<div class="validation-step">
						<span class="step-number">4</span>
						<div class="step-content">
							<strong>File type</strong>
							<span class="step-limit">PNG, JPG, WebP, GIF, SVG</span>
						</div>
					</div>
				</div>

				<p class="body-text">
					Each check follows the same pattern: validate, show error inline, prevent continuation.
					The user fixes the issue at the source. The tool recedes back into transparent use.
				</p>
			</div>
		</section>

		<!-- Philosophical Foundation -->
		<section class="section">
			<h2 class="section-title">Philosophical Foundation</h2>
			<div class="content">
				<h3 class="subsection-title">Zuhandenheit vs. Vorhandenheit</h3>
				<div class="comparison-grid">
					<div class="comparison-item zuhandenheit">
						<h4>Zuhandenheit</h4>
						<p class="subtitle">Ready-to-hand</p>
						<ul class="comparison-list">
							<li>Tool recedes into use</li>
							<li>We see the work, not the tool</li>
							<li>Errors appear where fixable</li>
							<li>Flow continues unbroken</li>
						</ul>
						<p class="comparison-example">
							<strong>Example:</strong> "Filename too long" appears at the file input.
							User renames file. Continues.
						</p>
					</div>
					<div class="comparison-item vorhandenheit">
						<h4>Vorhandenheit</h4>
						<p class="subtitle">Present-at-hand</p>
						<ul class="comparison-list">
							<li>Tool becomes conspicuous</li>
							<li>We stare at the broken tool</li>
							<li>Errors appear disconnected</li>
							<li>Flow interrupted, context lost</li>
						</ul>
						<p class="comparison-example">
							<strong>Example:</strong> "Failed to upload image" appears in Admin, days later.
							User has no idea which file or why.
						</p>
					</div>
				</div>

				<blockquote class="quote">
					<p>
						"The less we just stare at the hammer-thing, and the more we seize hold of it
						and use it, the more primordial does our relationship to it become."
					</p>
					<cite>— Martin Heidegger, Being and Time</cite>
				</blockquote>

				<h3 class="subsection-title">Rams Principles Applied</h3>
				<div class="principles-grid">
					<div class="principle">
						<span class="principle-number">#4</span>
						<div>
							<strong>Good design makes a product understandable</strong>
							<p>Errors appear where they're made, with clear instructions to fix them.</p>
						</div>
					</div>
					<div class="principle">
						<span class="principle-number">#5</span>
						<div>
							<strong>Good design is unobtrusive</strong>
							<p>Validation disappears when input is valid. No ceremony for correct behavior.</p>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- The Pattern -->
		<section class="section">
			<h2 class="section-title">The Pattern</h2>
			<div class="content">
				<p class="body-text">
					This experiment reveals a generalizable pattern for form validation:
				</p>

				<div class="pattern-box">
					<h4 class="pattern-title">Validation Proximity Principle</h4>
					<p class="pattern-text">
						<strong>Validate at the boundary closest to user action.</strong>
					</p>
					<ul class="pattern-list">
						<li>Client-side validation &gt; Server-side validation &gt; Downstream system validation</li>
						<li>Inline errors &gt; Form-level errors &gt; Page-level errors &gt; Email errors</li>
						<li>Immediate feedback &gt; Delayed feedback &gt; No feedback</li>
					</ul>
					<p class="pattern-text">
						Each step away from the input adds cognitive load and reduces the user's
						ability to understand and fix the problem.
					</p>
				</div>

				<p class="body-text">
					The constraint isn't new. The 100-character limit existed in the Admin tool all along.
					What changed is <em>where</em> we enforce it. By surfacing the downstream system's constraint
					at the upstream input boundary, we bridge the gap between two separate applications.
					The user never needs to know the Admin tool exists—they just see actionable feedback
					at the moment they can act on it.
				</p>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="section">
			<h2 class="section-title">Conclusion</h2>
			<div class="content">
				<p class="body-text">
					The hypothesis is <strong>validated</strong>. A 15-line change moved validation from
					a downstream system (Admin) to the input boundary (form), transforming an opaque
					failure into actionable feedback.
				</p>
				<p class="body-text">
					The philosophical insight: validation isn't just about preventing bad data. It's about
					maintaining <em>Zuhandenheit</em>—keeping tools transparent so users can focus on their
					work, not on debugging systems they don't control.
				</p>
				<blockquote class="quote featured">
					<p>"The tool recedes; the work continues."</p>
					<cite>— CREATE SOMETHING Canon</cite>
				</blockquote>
			</div>
		</section>

		<!-- Footer -->
		<footer class="footer">
			<div class="grid md:grid-cols-2 gap-8">
				<div>
					<h4 class="footer-heading">Principles Applied</h4>
					<ul class="footer-list">
						<li><a href="https://createsomething.ltd/masters/heidegger">Heidegger: Zuhandenheit</a></li>
						<li><a href="https://createsomething.ltd/masters/dieter-rams">Rams #4: Understandable</a></li>
						<li><a href="https://createsomething.ltd/masters/dieter-rams">Rams #5: Unobtrusive</a></li>
					</ul>
				</div>
				<div>
					<h4 class="footer-heading">Related</h4>
					<ul class="footer-list">
						<li><a href="/experiments/meeting-capture">Meeting Capture: Tools Recede</a></li>
						<li><a href="/papers/subtractive-form-design">Subtractive Form Design</a></li>
						<li><a href="/experiments">All Experiments</a></li>
					</ul>
				</div>
			</div>
		</footer>
	</div>
</div>

<style>
	@import '$lib/styles/experiment-page.css';

	/* Page-specific overrides */
	.ascii-art {
		font-size: 0.6rem; /* Narrower than default 0.65rem for tighter diagram */
		text-align: center;
	}

	code {
		word-break: break-all; /* Allow breaking long filenames */
	}

	/* Breakdown Box */
	.breakdown-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-left: 4px solid var(--color-error);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.breakdown-title {
		font-weight: 600;
		color: var(--color-error);
		margin-bottom: var(--space-sm);
	}

	.breakdown-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.breakdown-text:last-child {
		margin-bottom: 0;
	}

	/* Code Block */
	.code-comparison {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.code-title {
		font-size: var(--text-body-sm);
		font-weight: 600;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-elevated);
		border-bottom: 1px solid var(--color-border-default);
		margin: 0;
	}

	.code-block pre {
		margin: 0;
		padding: var(--space-md);
		overflow-x: auto;
		font-size: var(--text-body-sm);
		line-height: 1.5;
	}

	.code-block code {
		background: none;
		padding: 0;
	}

	/* Validation Chain */
	.validation-chain {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.validation-step {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.validation-step.new {
		border-color: var(--color-success);
		background: var(--color-success-muted);
	}

	.step-number {
		width: 2rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-full);
		font-weight: 600;
		font-size: var(--text-body-sm);
		flex-shrink: 0;
	}

	.validation-step.new .step-number {
		background: var(--color-success);
		color: #000;
	}

	.step-content {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.step-content strong {
		color: var(--color-fg-primary);
	}

	.step-limit {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.step-tag {
		font-size: var(--text-caption);
		font-weight: 600;
		padding: 0.15em 0.5em;
		background: var(--color-success);
		color: #000;
		border-radius: var(--radius-sm);
	}

	/* Comparison Grid - page-specific component */
	.comparison-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
	}

	@media (max-width: 640px) {
		.comparison-grid {
			grid-template-columns: 1fr;
		}
	}

	.comparison-item {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.comparison-item.zuhandenheit {
		border-color: var(--color-success);
	}

	.comparison-item.vorhandenheit {
		border-color: var(--color-error);
	}

	.comparison-item h4 {
		font-size: var(--text-body-lg);
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.comparison-item.zuhandenheit h4 {
		color: var(--color-success);
	}

	.comparison-item.vorhandenheit h4 {
		color: var(--color-error);
	}

	.comparison-item .subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		margin-bottom: var(--space-sm);
	}

	.comparison-list {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-sm);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.comparison-list li::before {
		content: "→ ";
		color: var(--color-fg-muted);
	}

	.comparison-example {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	/* Principles Grid - page-specific component */
	.principles-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.principle {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.principle-number {
		font-weight: 700;
		color: var(--color-fg-muted);
		font-size: var(--text-body-lg);
		flex-shrink: 0;
	}

	.principle strong {
		display: block;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.principle p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Pattern Box - page-specific component */
	.pattern-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
	}

	.pattern-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.pattern-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: 1.6;
		margin-bottom: var(--space-sm);
	}

	.pattern-list {
		list-style: none;
		padding: 0;
		margin: var(--space-sm) 0;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		font-family: monospace;
	}
</style>
