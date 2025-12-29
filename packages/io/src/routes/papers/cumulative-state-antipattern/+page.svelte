<script lang="ts">
	/**
	 * The Cumulative State Anti-Pattern
	 *
	 * How ambiguous field semantics in database design create invisible bugs
	 * that punish users for legitimate actions.
	 */

	import { KeyInsight, createInsight, createBugFixComparison, parseStatement } from '@create-something/components';

	const insight = createInsight(
		'cumulative-state-antipattern',
		'Name fields for their semantics, not their content.',
		{
			statement: parseStatement(
				'"Published" implied cumulative. It meant current. **Name** **fields** **for** **their** **semantics,** **not** **their** **content.**'
			),
			comparison: createBugFixComparison(
				'published >= 5',
				'Penalizes curation',
				'published + delisted >= 5',
				'Preserves achievement'
			),
			source: {
				title: 'The Cumulative State Anti-Pattern',
				url: '/papers/cumulative-state-antipattern',
				property: 'io'
			},
			paperId: 'PAPER-2025-012',
			category: 'Database Design'
		}
	);
</script>

<svelte:head>
	<title>The Cumulative State Anti-Pattern | CREATE SOMETHING.io</title>
	<meta name="description" content="How ambiguous field semantics create invisible bugs. A case study from Webflow template validation where 'published' didn't mean what we thought." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-012</div>
			<h1 class="mb-3 paper-title">The Cumulative State Anti-Pattern</h1>
			<p class="max-w-3xl paper-subtitle">
				When "Current" Masquerades as "Ever"—how ambiguous field semantics create
				invisible bugs that punish users for legitimate actions.
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
				A template creator delisted several of their published templates to maintain quality standards.
				The system responded by revoking their "established creator" privileges—blocking new submissions.
				The bug wasn't in the logic; it was in the <em>semantics</em>. A field named "Templates Published"
				tracked current state, not cumulative achievement. This paper examines how ambiguous field
				naming creates invisible bugs, proposes a naming convention that prevents them, and reflects
				on the Heideggerian notion that tools should recede into use—not punish users for using them correctly.
			</p>
		</section>

		<!-- Key Insight - Embedded Interactive Visual (100vw breakout) -->
		<section class="key-insight-section">
			<KeyInsight
				{insight}
				property="io"
				animation={{ enabled: true, trigger: 'click' }}
				showExport={true}
				variant="fullscreen"
			/>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value metric-neutral">6</div>
				<div class="metric-label">Templates Delisted</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-negative">Lost</div>
				<div class="metric-label">Creator Status</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-neutral">1</div>
				<div class="metric-label">Line Changed</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">Restored</div>
				<div class="metric-label">After Fix</div>
			</div>
		</section>

		<!-- Section 1: The Incident -->
		<section class="space-y-6">
			<h2 class="section-heading">I. The Incident</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Izhaan, a prolific Webflow template creator, noticed something wrong. After delisting
					several templates that no longer matched their quality standards, they could no longer
					submit new templates. The system reported they had "an active review in progress"—but
					they didn't.
				</p>

				<div class="p-4 font-mono code-block">
					<p class="mb-2 code-comment">// The error message:</p>
					<p class="code-primary">"You already have an active review in progress.</p>
					<p class="code-primary">Please wait for the review to complete before</p>
					<p class="code-primary">submitting another template."</p>
				</div>

				<p>
					The creator had done nothing wrong. They had curated their portfolio—a responsible
					action that benefits the marketplace. Yet the system punished them for it.
				</p>
			</div>
		</section>

		<!-- Section 2: The Investigation -->
		<section class="space-y-6">
			<h2 class="section-heading">II. The Investigation</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The validation system determined "established creator" status using a simple check:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`if (publishedTemplates >= 5) {
  // Established creator: unlimited concurrent submissions
} else {
  // New creator: limited to 1 active review
}`}</pre>
				</div>

				<p>
					The field <code>publishedTemplates</code> came from Airtable: <code>#️⃣👛Templates Published</code>.
					The assumption was clear: this counts how many templates a creator has ever published.
					With 10+ published templates, Izhaan should qualify as established.
				</p>

				<p>
					But querying the API revealed the truth:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-muted">{`{
  "publishedTemplates": 4,
  "submittedTemplates": 11,
  "rejectedTemplates": 1,
  "delistedTemplates": 6
}`}</pre>
				</div>

				<p>
					<strong>4 + 6 = 10</strong>. Izhaan had published 10 templates. But after delisting 6,
					the <code>publishedTemplates</code> field showed only 4—the <em>currently</em> published count.
				</p>

				<div class="p-4 callout-warning">
					<h4 class="mb-2 callout-heading">The Semantic Trap</h4>
					<p class="body-text">
						"Templates Published" sounds cumulative. It reads as achievement, history, record.
						But it tracked <em>current state</em>—a live count that decrements when templates
						are removed. The name lied.
					</p>
				</div>
			</div>
		</section>

		<!-- Section 3: The Arithmetic -->
		<section class="space-y-6">
			<h2 class="section-heading">III. The Arithmetic of Ambiguity</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The system calculated "active reviews" using this formula:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`activeReviews = submitted - published - rejected - delisted`}</pre>
				</div>

				<p>
					With the correct semantics:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Field</th>
								<th class="text-left py-2 table-header">Value</th>
								<th class="text-left py-2 table-header">Meaning</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">submitted</td>
								<td class="py-2">11</td>
								<td class="py-2">Cumulative: ever submitted</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">published</td>
								<td class="py-2">4</td>
								<td class="py-2">Current: now published</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">rejected</td>
								<td class="py-2">1</td>
								<td class="py-2">Cumulative: ever rejected</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">delisted</td>
								<td class="py-2">6</td>
								<td class="py-2">Cumulative: ever delisted</td>
							</tr>
							<tr>
								<td class="py-2 table-cell-emphasis">activeReviews</td>
								<td class="py-2">0</td>
								<td class="py-2">11 - 4 - 1 - 6 = 0 ✓</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The formula was correct. But the "established creator" check wasn't accounting for
					the semantic mismatch:
				</p>

				<div class="p-4 font-mono code-block">
					<p class="mb-2 code-comment">// Bug: uses current count, not cumulative achievement</p>
					<pre class="code-primary">{`publishedTemplates >= 5  // 4 >= 5 = false ✗`}</pre>
					<p class="mt-4 mb-2 code-comment">// Fix: include delisted to recover true achievement</p>
					<pre class="code-primary">{`publishedTemplates + delistedTemplates >= 5  // 4 + 6 = 10 >= 5 = true ✓`}</pre>
				</div>
			</div>
		</section>

		<!-- Section 4: The Anti-Pattern -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. The Anti-Pattern Defined</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The <strong>Cumulative State Anti-Pattern</strong> occurs when:
				</p>

				<ol class="list-decimal list-inside space-y-2 pl-4">
					<li>A field name implies cumulative history ("Templates Published")</li>
					<li>The field actually tracks current state (live count)</li>
					<li>Business logic assumes cumulative semantics</li>
					<li>State transitions (like delisting) break the assumption</li>
				</ol>

				<p>
					The pattern is insidious because it works correctly until it doesn't. For creators
					who never delist, the bug never manifests. The field appears to work. Only when
					a user exercises a legitimate action does the semantic mismatch surface.
				</p>

				<h3 class="mt-6 subsection-heading">Related Anti-Patterns</h3>

				<div class="grid md:grid-cols-2 gap-4 mt-4">
					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Soft Delete Confusion</h4>
						<p class="card-text">
							"Users" table includes soft-deleted records. Count queries return wrong totals
							depending on whether filters are applied.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Status vs. History</h4>
						<p class="card-text">
							"OrderStatus" stores current state but business needs order history.
							Overwrites destroy audit trail.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Counter Cache Drift</h4>
						<p class="card-text">
							Denormalized count field drifts from reality due to edge cases
							in increment/decrement logic.
						</p>
					</div>

					<div class="p-4 info-card">
						<h4 class="font-semibold mb-2 card-heading">Implicit Semantics</h4>
						<p class="card-text">
							Field meaning lives in tribal knowledge, not schema. New developers
							make incorrect assumptions.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Section 5: The Fix -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The Fix</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The immediate fix was surgical—one line:
				</p>

				<div class="p-4 font-mono code-block">
					<p class="mb-2 code-comment">// Before: current state only</p>
					<pre class="code-muted">{`} else if (publishedTemplates >= 5 || isWhitelisted) {`}</pre>
					<p class="mt-4 mb-2 code-comment">// After: cumulative achievement</p>
					<pre class="code-primary">{`} else if (publishedTemplates + delistedTemplates >= 5 || isWhitelisted) {`}</pre>
				</div>

				<p>
					But this is a patch, not a cure. The underlying issue—ambiguous field semantics—remains
					in the database schema. A proper fix would involve:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Current Name</th>
								<th class="text-left py-2 table-header">Semantic</th>
								<th class="text-left py-2 table-header">Proposed Name</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Templates Published</td>
								<td class="py-2">Current</td>
								<td class="py-2">Templates Currently Published</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Templates Submitted</td>
								<td class="py-2">Cumulative</td>
								<td class="py-2">Templates Ever Submitted</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Templates Rejected</td>
								<td class="py-2">Cumulative</td>
								<td class="py-2">Templates Ever Rejected</td>
							</tr>
							<tr>
								<td class="py-2 table-cell-emphasis">Templates Delisted</td>
								<td class="py-2">Cumulative</td>
								<td class="py-2">Templates Ever Delisted</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					Or, introduce a new field: <code>Templates Ever Published</code> (cumulative) distinct
					from <code>Templates Currently Published</code> (current state).
				</p>
			</div>
		</section>

		<!-- Section 6: Philosophical Reflection -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Tools That Punish</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Heidegger distinguishes between tools that are <em>ready-to-hand</em> (zuhanden)—receding
					into transparent use—and tools that become <em>present-at-hand</em> (vorhanden)—forcing
					themselves into conscious attention through breakdown.
				</p>

				<blockquote class="pl-4 italic my-4 blockquote">
					"The peculiarity of what is proximally ready-to-hand is that, in its readiness-to-hand,
					it must, as it were, withdraw in order to be ready-to-hand quite authentically."
					<br />— Heidegger, <em>Being and Time</em>
				</blockquote>

				<p>
					Izhaan's experience was worse than breakdown—it was <em>betrayal</em>. The system
					didn't just fail; it punished a correct action. Delisting low-quality templates
					is responsible curation. The tool should have supported this. Instead, it revoked
					privileges earned through legitimate achievement.
				</p>

				<div class="p-4 callout-info">
					<h4 class="mb-2 callout-heading">The Canon Principle</h4>
					<p class="body-text">
						"The infrastructure disappears; only the work remains." When infrastructure
						punishes users for using it correctly, it has violated its fundamental purpose.
						Tools exist to enable, not to entrap.
					</p>
				</div>

				<p>
					The fix restores the tool to its proper mode: invisible, supportive, enabling.
					Established creators remain established regardless of how they curate their portfolios.
					The system recedes; the creative work continues.
				</p>
			</div>
		</section>

		<!-- Section 7: Prevention -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Prevention: Naming Conventions</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The anti-pattern can be prevented through explicit naming conventions:
				</p>

				<div class="responsive-table-scroll">
					<table class="w-full data-table">
						<thead>
							<tr class="table-header-row">
								<th class="text-left py-2 table-header">Semantic</th>
								<th class="text-left py-2 table-header">Prefix/Suffix</th>
								<th class="text-left py-2 table-header">Example</th>
							</tr>
						</thead>
						<tbody class="table-body">
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Current state</td>
								<td class="py-2">"Current", "Active", "Now"</td>
								<td class="py-2">current_published_count</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Cumulative total</td>
								<td class="py-2">"Total", "Ever", "Lifetime"</td>
								<td class="py-2">total_published_count</td>
							</tr>
							<tr class="table-row">
								<td class="py-2 table-cell-emphasis">Point-in-time</td>
								<td class="py-2">"At", "As of", timestamp</td>
								<td class="py-2">published_at_signup</td>
							</tr>
							<tr>
								<td class="py-2 table-cell-emphasis">Derived/calculated</td>
								<td class="py-2">"Computed", "Derived"</td>
								<td class="py-2">computed_active_reviews</td>
							</tr>
						</tbody>
					</table>
				</div>

				<h3 class="mt-6 subsection-heading">Schema Documentation</h3>

				<p>
					Beyond naming, document the semantics explicitly:
				</p>

				<div class="p-4 font-mono code-block">
					<pre class="code-muted">{`/**
 * templates_published: INTEGER
 *
 * Semantic: CURRENT STATE (not cumulative)
 * Behavior: Increments on publish, DECREMENTS on delist
 * Use for: Display of currently visible templates
 * NOT for: Achievement checks, historical queries
 *
 * Related: templates_ever_published (cumulative)
 */`}</pre>
				</div>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">VIII. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The Cumulative State Anti-Pattern is a naming problem that manifests as a logic bug.
					When field names imply cumulative semantics but track current state, business logic
					built on those fields will eventually betray users who exercise legitimate state transitions.
				</p>

				<p>
					The fix for Izhaan was simple: include delisted templates in the achievement calculation.
					The lesson is broader: <strong>name fields for their semantics, not their content</strong>.
					"Templates Published" tells you what's stored. "Templates Currently Published" tells you
					how it behaves.
				</p>

				<div class="p-6 mt-6 quote-box">
					<p class="text-center italic quote-text">
						"The difference between the right word and the almost right word is the difference
						between lightning and a lightning bug."
					</p>
					<p class="text-center mt-2 quote-attribution">— Mark Twain</p>
				</div>

				<p class="mt-6">
					In database design, the difference between "published" and "currently published" is the
					difference between a system that supports its users and one that punishes them for success.
				</p>
			</div>
		</section>

		<!-- Technical Appendix -->
		<section class="space-y-6">
			<h2 class="section-heading">Appendix: The Complete Fix</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-4 font-mono code-block">
					<pre class="code-primary">{`// packages/io/workers/webflow-validation/src/routes/template.ts

// Extract user stats
const publishedTemplates = user.fields['#️⃣👛Templates Published'] ?? 0;
const rejectedTemplates = user.fields['#️⃣👛Templates Rejected'] ?? 0;
const submittedTemplates = user.fields['#️⃣👛Templates Submitted'] ?? 0;
const delistedTemplates = user.fields['#️⃣👛Templates Delisted'] ?? 0;

// Established creator check: include delisted to preserve earned status
if (publishedTemplates + delistedTemplates >= 5 || isWhitelisted) {
  // Unlimited concurrent submissions
  message = "You can have unlimited concurrent submissions for review.";
  hasError = false;
} else {
  // New creator: check active reviews
  // Formula accounts for all terminal states
  const activeReviews = submittedTemplates - publishedTemplates
                       - rejectedTemplates - delistedTemplates;

  if (activeReviews >= 1) {
    message = "You already have an active review in progress.";
    hasError = true;
  } else {
    message = "You can have 1 template submitted for review at a time.";
    hasError = false;
  }
}`}</pre>
				</div>
			</div>
		</section>

		<!-- References -->
		<section class="space-y-4">
			<h2 class="section-heading">References</h2>
			<ol class="space-y-2 pl-6 list-decimal references-list">
				<li>Heidegger, M. (1927). <em>Being and Time</em>. Trans. Macquarrie & Robinson.</li>
				<li>Fowler, M. (2002). <em>Patterns of Enterprise Application Architecture</em>. Addison-Wesley.</li>
				<li>Kleppmann, M. (2017). <em>Designing Data-Intensive Applications</em>. O'Reilly Media.</li>
				<li>CREATE SOMETHING. (2025). "CLAUDE.md: The Subtractive Triad."</li>
			</ol>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				This paper documents a real bug fix from December 29, 2025. The Webflow validation
				system now correctly preserves established creator status after delisting.
				Izhaan can submit templates again.
			</p>
			<div class="flex justify-between mt-4">
				<a href="/papers" class="footer-link">&larr; All Papers</a>
				<a href="/experiments" class="footer-link">View Experiments &rarr;</a>
			</div>
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

	.metric-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.metric-value {
		font-size: var(--text-h2);
	}

	.metric-positive {
		color: var(--color-success);
	}

	.metric-negative {
		color: var(--color-error);
	}

	.metric-neutral {
		color: var(--color-fg-primary);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		font-size: var(--text-body-sm);
		overflow-x: auto;
	}

	.code-comment {
		color: var(--color-fg-muted);
	}

	.code-primary {
		color: var(--color-fg-primary);
	}

	.code-muted {
		color: var(--color-fg-tertiary);
	}

	.blockquote {
		border-left: 4px solid var(--color-border-emphasis);
		color: var(--color-fg-tertiary);
	}

	.callout-warning {
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-lg);
	}

	.callout-warning .callout-heading {
		color: var(--color-warning);
	}

	.callout-info {
		background: var(--color-info-muted);
		border: 1px solid var(--color-info-border);
		border-radius: var(--radius-lg);
	}

	.callout-info .callout-heading {
		color: var(--color-info);
	}

	.callout-heading {
		font-size: var(--text-h3);
	}

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

	.info-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		color: var(--color-fg-secondary);
	}

	.card-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.quote-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.quote-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.quote-attribution {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.references-list {
		color: var(--color-fg-tertiary);
	}

	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.footer-link {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.footer-link:hover {
		color: var(--color-fg-primary);
	}

	.responsive-table-scroll {
		overflow-x: auto;
	}

	/* Key Insight Section */
	.key-insight-section {
		margin: var(--space-xl) 0;
		display: flex;
		justify-content: center;
	}
</style>
