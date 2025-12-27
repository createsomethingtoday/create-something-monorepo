<script lang="ts">
	import { CodeBlock } from '$lib/canon';

	const componentDocExample = `/**
 * Button
 *
 * Primary action trigger. Use sparingly—each screen
 * should have one clear primary action.
 *
 * @example
 * <Button variant="primary">Submit</Button>
 *
 * @see https://createsomething.ltd/canon/components/button
 */`;

	const errorMessageExample = `<!-- Vague: tells user nothing useful -->
<p class="error">An error occurred.</p>

<!-- Clear: explains problem and solution -->
<p class="error">
  Email address is required. Please enter your email to continue.
</p>

<!-- Even better: specific and actionable -->
<p class="error">
  We couldn't find an account with that email.
  <a href="/signup">Create an account</a> or
  <a href="/forgot-password">reset your password</a>.
</p>`;

	const voiceExamples = [
		{
			wrong: "The system has encountered an error processing your request.",
			right: "Something went wrong. Please try again.",
			why: "Speak like a human, not a machine"
		},
		{
			wrong: "Click here to learn more about our amazing features!",
			right: "Learn about features",
			why: "Be direct, avoid marketing speak"
		},
		{
			wrong: "Are you absolutely sure you want to delete this?",
			right: "Delete this item? This cannot be undone.",
			why: "State consequences clearly without drama"
		},
		{
			wrong: "Oops! Something went wrong :(",
			right: "Something went wrong. Try refreshing the page.",
			why: "Be helpful without being cute"
		}
	];

	const toneGuide = [
		{
			context: "Success states",
			tone: "Confident, minimal",
			example: "Saved.",
			avoid: "Awesome! Your changes have been successfully saved!"
		},
		{
			context: "Error states",
			tone: "Clear, helpful",
			example: "Invalid email format. Check and try again.",
			avoid: "Oops! That email doesn't look right :("
		},
		{
			context: "Empty states",
			tone: "Encouraging, actionable",
			example: "No projects yet. Create your first project.",
			avoid: "Nothing to see here!"
		},
		{
			context: "Confirmations",
			tone: "Direct, consequence-focused",
			example: "Delete project? This removes all files.",
			avoid: "Are you really sure you want to delete this?"
		}
	];
</script>

<svelte:head>
	<title>Content Guidelines — Canon Design System</title>
	<meta name="description" content="Voice and tone guidelines for writing clear, purposeful content in the Canon design system." />
</svelte:head>

<header class="page-header">
	<p class="eyebrow">Guidelines</p>
	<h1>Content</h1>
	<p class="lead">
		Words are interface elements. Every word must earn its place,
		serving user understanding rather than filling space.
	</p>
</header>

<section class="section">
	<h2>Philosophy</h2>
	<p>
		The Subtractive Triad applies to content as much as design. Remove words that
		don't serve comprehension. What remains should be clear, helpful, and human.
	</p>
	<blockquote class="philosophy-quote">
		"Vigorous writing is concise. A sentence should contain no unnecessary words,
		a paragraph no unnecessary sentences, for the same reason that a drawing should
		have no unnecessary lines."
		<cite>— Strunk & White, The Elements of Style</cite>
	</blockquote>
</section>

<section class="section">
	<h2>Voice Principles</h2>
	<p class="section-description">
		Canon's voice is calm, direct, and respectful of the user's intelligence.
	</p>

	<div class="principles-grid">
		<div class="principle-card">
			<h3>Clear over clever</h3>
			<p>
				Clarity always wins. Puns, jargon, and marketing speak create friction.
				Say what you mean in the simplest terms possible.
			</p>
		</div>

		<div class="principle-card">
			<h3>Brief over verbose</h3>
			<p>
				Respect user attention. Cut filler words, redundant phrases,
				and obvious statements. Every word should carry weight.
			</p>
		</div>

		<div class="principle-card">
			<h3>Helpful over positive</h3>
			<p>
				Forced positivity feels hollow. Instead of "Great job!", provide
				useful information: "Saved" or "3 items updated."
			</p>
		</div>

		<div class="principle-card">
			<h3>Human over corporate</h3>
			<p>
				Write like you speak. Avoid passive voice, formal jargon,
				and phrases that no human would actually say aloud.
			</p>
		</div>
	</div>
</section>

<section class="section">
	<h2>Voice Examples</h2>
	<p class="section-description">
		Compare approaches to find the Canon voice.
	</p>

	<div class="examples-list">
		{#each voiceExamples as example}
			<div class="example-row">
				<div class="example-wrong">
					<span class="example-label">Avoid</span>
					<p>{example.wrong}</p>
				</div>
				<div class="example-right">
					<span class="example-label">Prefer</span>
					<p>{example.right}</p>
				</div>
				<p class="example-why">{example.why}</p>
			</div>
		{/each}
	</div>
</section>

<section class="section">
	<h2>Tone by Context</h2>
	<p class="section-description">
		Voice stays consistent; tone adapts to situation.
	</p>

	<div class="tone-table-wrapper">
		<table class="tone-table">
			<thead>
				<tr>
					<th>Context</th>
					<th>Tone</th>
					<th>Example</th>
					<th>Avoid</th>
				</tr>
			</thead>
			<tbody>
				{#each toneGuide as row}
					<tr>
						<td>{row.context}</td>
						<td>{row.tone}</td>
						<td class="example-cell good">{row.example}</td>
						<td class="example-cell bad">{row.avoid}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="section">
	<h2>Error Messages</h2>
	<p class="section-description">
		Error messages are where content quality matters most. Users are already
		frustrated—don't make it worse with vague or unhelpful text.
	</p>

	<CodeBlock code={errorMessageExample} language="html" title="error-messages.html" />

	<h3>Error Message Checklist</h3>
	<ul class="checklist">
		<li>States what went wrong (briefly)</li>
		<li>Explains why (if helpful)</li>
		<li>Provides a path forward</li>
		<li>Avoids technical jargon</li>
		<li>Doesn't blame the user</li>
	</ul>
</section>

<section class="section">
	<h2>UI Text Patterns</h2>
	<p class="section-description">
		Common UI text elements and their Canon-compliant patterns.
	</p>

	<div class="patterns-grid">
		<div class="pattern-card">
			<h3>Buttons</h3>
			<dl class="pattern-list">
				<dt>Primary actions</dt>
				<dd>Use verbs: "Save", "Create", "Send"</dd>

				<dt>Destructive actions</dt>
				<dd>State consequence: "Delete project"</dd>

				<dt>Navigation</dt>
				<dd>Use destination: "Settings", "Dashboard"</dd>
			</dl>
		</div>

		<div class="pattern-card">
			<h3>Labels</h3>
			<dl class="pattern-list">
				<dt>Form fields</dt>
				<dd>Noun phrases: "Email address", "Password"</dd>

				<dt>Toggles</dt>
				<dd>State what's enabled: "Email notifications"</dd>

				<dt>Checkboxes</dt>
				<dd>Full statements: "Remember my login"</dd>
			</dl>
		</div>

		<div class="pattern-card">
			<h3>Headings</h3>
			<dl class="pattern-list">
				<dt>Page titles</dt>
				<dd>Simple nouns: "Settings", "Projects"</dd>

				<dt>Section headers</dt>
				<dd>Descriptive: "Account preferences"</dd>

				<dt>Empty states</dt>
				<dd>State + action: "No results. Try different filters."</dd>
			</dl>
		</div>

		<div class="pattern-card">
			<h3>Feedback</h3>
			<dl class="pattern-list">
				<dt>Success</dt>
				<dd>Brief confirmation: "Saved", "Sent"</dd>

				<dt>Progress</dt>
				<dd>Action + status: "Uploading...", "Saving..."</dd>

				<dt>Loading</dt>
				<dd>What's happening: "Loading projects"</dd>
			</dl>
		</div>
	</div>
</section>

<section class="section">
	<h2>Documentation</h2>
	<p class="section-description">
		Code documentation follows the same principles: clear, brief, and useful.
	</p>

	<CodeBlock code={componentDocExample} language="javascript" title="documentation.js" />

	<div class="doc-guidelines">
		<h3>Documentation Guidelines</h3>
		<ul class="guidelines-list">
			<li>Start with what, not how</li>
			<li>Include practical examples</li>
			<li>Link to related resources</li>
			<li>Update when behavior changes</li>
			<li>Delete when no longer accurate</li>
		</ul>
	</div>
</section>

<section class="section">
	<h2>Capitalization</h2>
	<p class="section-description">
		Consistent capitalization creates visual calm.
	</p>

	<div class="cap-grid">
		<div class="cap-card">
			<h3>Sentence case</h3>
			<p class="cap-use">Use for most UI text</p>
			<ul class="cap-examples">
				<li>Page titles: "Account settings"</li>
				<li>Button labels: "Create project"</li>
				<li>Error messages: "Email is required"</li>
			</ul>
		</div>

		<div class="cap-card">
			<h3>Title case</h3>
			<p class="cap-use">Use sparingly</p>
			<ul class="cap-examples">
				<li>Product names: "Canon Design System"</li>
				<li>Feature names: "Quick Start"</li>
				<li>Marketing headlines only</li>
			</ul>
		</div>

		<div class="cap-card">
			<h3>All caps</h3>
			<p class="cap-use">Use rarely</p>
			<ul class="cap-examples">
				<li>Eyebrow labels: "GUIDELINES"</li>
				<li>Abbreviations: "API", "URL"</li>
				<li>Never for emphasis</li>
			</ul>
		</div>
	</div>
</section>

<style>
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.eyebrow {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: var(--tracking-widest);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-xs);
	}

	h1 {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 65ch;
	}

	.section {
		margin-bottom: var(--space-2xl);
	}

	h2 {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		max-width: 65ch;
	}

	.philosophy-quote {
		font-size: var(--text-h3);
		font-style: italic;
		color: var(--color-fg-secondary);
		border-left: 2px solid var(--color-border-emphasis);
		padding-left: var(--space-md);
		margin: var(--space-lg) 0;
	}

	.philosophy-quote cite {
		display: block;
		font-size: var(--text-body-sm);
		font-style: normal;
		color: var(--color-fg-muted);
		margin-top: var(--space-xs);
	}

	/* Principles grid */
	.principles-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.principles-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.principle-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.principle-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-xs);
	}

	.principle-card p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Voice examples */
	.examples-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.example-row {
		display: grid;
		gap: var(--space-sm);
	}

	@media (min-width: 640px) {
		.example-row {
			grid-template-columns: 1fr 1fr;
		}
	}

	.example-wrong,
	.example-right {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		padding: var(--space-sm);
	}

	.example-wrong {
		border-left: 3px solid var(--color-error);
	}

	.example-right {
		border-left: 3px solid var(--color-success);
	}

	.example-label {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: var(--space-xs);
		display: block;
	}

	.example-wrong .example-label {
		color: var(--color-error);
	}

	.example-right .example-label {
		color: var(--color-success);
	}

	.example-row p {
		margin: 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.example-why {
		grid-column: 1 / -1;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
	}

	/* Tone table */
	.tone-table-wrapper {
		overflow-x: auto;
	}

	.tone-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	.tone-table th,
	.tone-table td {
		padding: var(--space-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border-default);
	}

	.tone-table th {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
	}

	.tone-table td {
		color: var(--color-fg-secondary);
	}

	.example-cell {
		font-style: italic;
	}

	.example-cell.good {
		color: var(--color-success);
	}

	.example-cell.bad {
		color: var(--color-fg-muted);
	}

	/* Checklist */
	.checklist {
		list-style: none;
		padding: 0;
		margin: var(--space-md) 0;
	}

	.checklist li {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.checklist li::before {
		content: '';
		width: 16px;
		height: 16px;
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	/* Patterns grid */
	.patterns-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 640px) {
		.patterns-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.pattern-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.pattern-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-sm);
	}

	.pattern-list {
		margin: 0;
	}

	.pattern-list dt {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		margin-top: var(--space-xs);
	}

	.pattern-list dt:first-child {
		margin-top: 0;
	}

	.pattern-list dd {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Doc guidelines */
	.doc-guidelines {
		margin-top: var(--space-lg);
	}

	.guidelines-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.guidelines-list li {
		padding: var(--space-xs) 0;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		border-bottom: 1px solid var(--color-border-default);
	}

	.guidelines-list li:last-child {
		border-bottom: none;
	}

	/* Capitalization grid */
	.cap-grid {
		display: grid;
		gap: var(--space-md);
	}

	@media (min-width: 768px) {
		.cap-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.cap-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		padding: var(--space-md);
	}

	.cap-card h3 {
		font-size: var(--text-body);
		margin-bottom: var(--space-xs);
	}

	.cap-use {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0 0 var(--space-sm) 0;
	}

	.cap-examples {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.cap-examples li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		padding: var(--space-xs) 0;
		border-top: 1px solid var(--color-border-default);
	}
</style>
