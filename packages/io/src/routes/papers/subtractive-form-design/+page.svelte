<script lang="ts">
	/**
	 * Subtractive Form Design: When Absence Is Clearer Than Instruction
	 *
	 * Case study applying Heidegger's hermeneutic question to form field design,
	 * demonstrating that hiding inapplicable fields is clearer than documentation.
	 */
</script>

<svelte:head>
	<title>Subtractive Form Design | CREATE SOMETHING.io</title>
	<meta name="description" content="When a field doesn't apply, hiding it is clearer than instructing users to leave it blank. A case study in hermeneutic form architecture." />
</svelte:head>

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-4xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2025-006</div>
			<h1 class="mb-3 paper-title">Subtractive Form Design</h1>
			<p class="max-w-3xl paper-subtitle">
				When Absence Is Clearer Than Instruction—a case study in hermeneutic form architecture
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Case Study</span>
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
				This paper documents the application of Heidegger's system-level hermeneutic question—<em>"Does this serve the whole?"</em>—to
				form field design. Through a case study of Webflow's app submission form, we demonstrate that form fields which don't apply
				to certain contexts create systemic disconnection: developers enter incorrect values, reviewers manually clear them, and
				submissions are delayed. The solution is subtractive: hide fields that don't apply rather than instructing users to leave
				them blank. This reveals a general principle: <strong>absence is clearer than instruction</strong>.
			</p>
		</section>

		<!-- Metrics -->
		<section class="grid grid-cols-2 md:grid-cols-4 gap-4">
			<div class="p-4 metric-card">
				<div class="metric-value metric-neutral">3</div>
				<div class="metric-label">Files Modified</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">0</div>
				<div class="metric-label">Fields for Designer Ext</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">Auto</div>
				<div class="metric-label">Field Clearing</div>
			</div>
			<div class="p-4 metric-card">
				<div class="metric-value metric-positive">None</div>
				<div class="metric-label">Manual Review Needed</div>
			</div>
		</section>

		<!-- Section 1: The Problem -->
		<section class="space-y-6">
			<h2 class="section-heading">I. The Problem: A Field That Shouldn't Be Filled</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Webflow's app marketplace accepts three types of applications:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>Data Client v2</strong>: API-based apps requiring OAuth for installation</li>
					<li><strong>Designer Extension</strong>: Extensions running inside the Webflow Designer</li>
					<li><strong>Hybrid</strong>: Apps combining both capabilities</li>
				</ul>

				<p>
					The submission form included an "App Install URL" field with this description:
				</p>

				<div class="p-4 quote-block">
					<p class="italic">
						"The OAuth Authorization URL used to install the app in Webflow.
						Required if you selected 'Data Client' or 'Both' in the App capabilities.
						<strong>Leave blank for Designer Extensions.</strong>"
					</p>
				</div>

				<p>
					Despite this instruction, developers submitting Designer Extensions consistently entered incorrect URLs:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li>Their <code class="inline-code">webflow-ext.com</code> extension link</li>
					<li>Their marketing website URL</li>
					<li>Other non-OAuth URLs</li>
				</ul>

				<p>
					The review team (specifically Pablo) had to manually clear these fields before processing submissions,
					or request changes and reset expectations—delaying the review cycle.
				</p>
			</div>
		</section>

		<!-- Section 2: The Hermeneutic Analysis -->
		<section class="space-y-6">
			<h2 class="section-heading">II. The Hermeneutic Question</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Applying Heidegger's system-level question from the Subtractive Triad:
				</p>

				<div class="p-6 highlight-box">
					<p class="highlight-text">
						"Does this field serve the whole?"
					</p>
				</div>

				<p>
					<strong>Answer: No.</strong> The Install URL field for Designer Extensions created disconnection at every level:
				</p>

				<div class="overflow-x-auto">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th class="text-left py-2">Stakeholder</th>
								<th class="text-left py-2">Disconnection</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="py-2">Developers</td>
								<td class="py-2">Confusion about what to enter</td>
							</tr>
							<tr>
								<td class="py-2">Review Team</td>
								<td class="py-2">Manual clearing of incorrect values</td>
							</tr>
							<tr>
								<td class="py-2">Submissions</td>
								<td class="py-2">Delayed by rejection/re-submission cycles</td>
							</tr>
							<tr>
								<td class="py-2">Form System</td>
								<td class="py-2">Field meaning didn't match usage</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- Section 3: Why Instructions Fail -->
		<section class="space-y-6">
			<h2 class="section-heading">III. Why "Leave Blank" Fails</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					The instruction to "leave blank for Designer Extensions" failed for predictable reasons:
				</p>

				<ol class="list-decimal list-inside space-y-4 pl-4">
					<li>
						<strong>Ambiguous naming</strong>: "Install URL" could reasonably mean "where users install my extension"
					</li>
					<li>
						<strong>Contradictory mental models</strong>: Developers think "my extension lives at webflow-ext.com, so that's my install URL"
					</li>
					<li>
						<strong>Instruction buried in description</strong>: The "leave blank" text competed with a visible, empty input field—users read labels, not descriptions
					</li>
					<li>
						<strong>No validation feedback</strong>: The form accepted any URL, providing no signal that webflow-ext.com was wrong
					</li>
				</ol>

				<p>
					The fundamental issue: <strong>a visible field implies it should be filled</strong>. Documentation cannot overcome
					this affordance. Users will fill visible fields.
				</p>
			</div>
		</section>

		<!-- Section 4: The Solution -->
		<section class="space-y-6">
			<h2 class="section-heading">IV. The Subtractive Solution</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					Rather than improving the instructions, we removed the field:
				</p>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="p-4 before-card">
						<h4 class="card-heading">Before</h4>
						<div class="space-y-2 font-mono field-example">
							<div class="p-2 field-mock">App Capabilities: [Designer Ext ▼]</div>
							<div class="p-2 field-mock">
								<div>Install URL <span class="muted-text">(leave blank for Designer Ext)</span></div>
								<div class="mt-1 input-mock">[________________]</div>
							</div>
						</div>
						<p class="mt-3 card-caption">Field visible, instruction ignored</p>
					</div>

					<div class="p-4 after-card">
						<h4 class="card-heading">After</h4>
						<div class="space-y-2 font-mono field-example">
							<div class="p-2 field-mock">App Capabilities: [Designer Ext ▼]</div>
							<div class="p-2 muted-text italic">(No Install URL field)</div>
						</div>
						<p class="mt-3 card-caption">Nothing to fill = nothing to fill incorrectly</p>
					</div>
				</div>

				<h3 class="subsection-heading mt-6">Implementation</h3>

				<p>
					The form now conditionally renders the Install URL field based on app capabilities:
				</p>

				<div class="p-4 code-block">
					<pre><code>{`{(formData.appCapabilities === 'Data Client v2' ||
  formData.appCapabilities === 'Hybrid') && (
  <FormField
    label="App install URL"
    description="The URL users are directed to when installing
                 your app. Webflow will redirect here with
                 site_id and state parameters."
    required
  />
)}`}</code></pre>
				</div>

				<p>
					Additionally, when switching to Designer Extension, any previously entered URL is cleared:
				</p>

				<div class="p-4 code-block">
					<pre><code>{`if (name === 'appCapabilities' && value === 'Designer Extension') {
  setFormData(prev => ({
    ...prev,
    appInstallUrl: ''
  }));
}`}</code></pre>
				</div>
			</div>
		</section>

		<!-- Section 5: The Principle -->
		<section class="space-y-6">
			<h2 class="section-heading">V. The General Principle</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="p-6 principle-box">
					<p class="principle-text">
						Absence is clearer than instruction.
					</p>
				</div>

				<p>
					This principle extends beyond form design:
				</p>

				<ul class="list-disc list-inside space-y-2 pl-4">
					<li><strong>UI components</strong>: Hide inapplicable options rather than disabling them with tooltips</li>
					<li><strong>API design</strong>: Omit fields from responses rather than returning null with documentation</li>
					<li><strong>Documentation</strong>: Remove outdated sections rather than marking them deprecated</li>
					<li><strong>Codebase</strong>: Delete unused code rather than commenting it out "for reference"</li>
				</ul>

				<p>
					In each case, the subtractive solution—removing what doesn't apply—creates clarity that documentation
					cannot achieve. The hermeneutic question <em>"Does this serve the whole?"</em> becomes actionable:
					if something doesn't serve the whole, remove it.
				</p>
			</div>
		</section>

		<!-- Section 6: Results -->
		<section class="space-y-6">
			<h2 class="section-heading">VI. Results</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<div class="overflow-x-auto">
					<table class="w-full data-table">
						<thead>
							<tr>
								<th class="text-left py-2">Metric</th>
								<th class="text-left py-2">Before</th>
								<th class="text-left py-2">After</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="py-2">Install URL field for Designer Ext</td>
								<td class="py-2">Visible (with instruction)</td>
								<td class="py-2 result-positive">Hidden</td>
							</tr>
							<tr>
								<td class="py-2">Manual clearing by review team</td>
								<td class="py-2">Required</td>
								<td class="py-2 result-positive">None</td>
							</tr>
							<tr>
								<td class="py-2">Incorrect URL submissions</td>
								<td class="py-2">Recurring</td>
								<td class="py-2 result-positive">Impossible</td>
							</tr>
							<tr>
								<td class="py-2">Field description</td>
								<td class="py-2">"Leave blank for..."</td>
								<td class="py-2 result-positive">OAuth parameters explained</td>
							</tr>
						</tbody>
					</table>
				</div>

				<p>
					The change eliminates an entire category of submission errors by making incorrect input impossible
					rather than discouraged.
				</p>
			</div>
		</section>

		<!-- Conclusion -->
		<section class="space-y-6">
			<h2 class="section-heading">VII. Conclusion</h2>

			<div class="space-y-4 leading-relaxed body-text">
				<p>
					This case study demonstrates the Subtractive Triad's third level—Heidegger's hermeneutic question—applied
					to form design. When a field doesn't serve the whole system, removing it reconnects stakeholders more
					effectively than any amount of documentation.
				</p>

				<p>
					The fix was minimal: conditional rendering based on app type. But the principle is general:
					<strong>if something doesn't apply, don't show it</strong>. Absence communicates inapplicability
					more clearly than instruction ever could.
				</p>

				<div class="p-6 conclusion-box">
					<p class="conclusion-quote">
						"Does this serve the whole?"<br/>
						If not, remove it.
					</p>
					<p class="conclusion-attribution">— The Subtractive Triad, Level 3</p>
				</div>
			</div>
		</section>

		<!-- Footer -->
		<div class="pt-6 paper-footer">
			<p class="footer-text">
				Commit <code class="inline-code">37e91a4</code> in <code class="inline-code">wf-bl-app-form-cloud</code> • December 2025
			</p>
		</div>
	</div>
</div>

<style>
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
		font-weight: bold;
	}

	.paper-subtitle {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.paper-meta {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.abstract-section {
		border-left: 4px solid var(--color-border-emphasis);
	}

	.section-heading {
		font-size: var(--text-h2);
		font-weight: bold;
	}

	.subsection-heading {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-secondary);
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
		font-weight: bold;
	}

	.metric-neutral {
		color: var(--color-fg-primary);
	}

	.metric-positive {
		color: var(--color-success);
	}

	.metric-label {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.quote-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
	}

	.inline-code {
		background: var(--color-bg-surface);
		padding: 0.125rem 0.375rem;
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-family: monospace;
	}

	.highlight-box {
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-emphasis);
		border-radius: var(--radius-lg);
	}

	.highlight-text {
		font-size: var(--text-body-lg);
		font-weight: 600;
		text-align: center;
		color: var(--color-fg-primary);
	}

	.data-table {
		font-size: var(--text-body-sm);
	}

	.data-table thead tr {
		border-bottom: 1px solid var(--color-border-emphasis);
	}

	.data-table th {
		color: var(--color-fg-secondary);
	}

	.data-table tbody tr {
		border-bottom: 1px solid var(--color-border-default);
	}

	.data-table td {
		color: var(--color-fg-tertiary);
	}

	.result-positive {
		color: var(--color-success);
	}

	.before-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.after-card {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-lg);
	}

	.card-heading {
		font-weight: 600;
		margin-bottom: var(--space-sm);
	}

	.card-caption {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	.field-example {
		font-size: var(--text-body-sm);
	}

	.field-mock {
		background: var(--color-bg-subtle);
		border-radius: var(--radius-sm);
	}

	.input-mock {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.5rem;
	}

	.muted-text {
		color: var(--color-fg-muted);
	}

	.code-block {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		overflow-x: auto;
	}

	.code-block code {
		color: var(--color-fg-secondary);
		font-family: monospace;
		font-size: var(--text-body-sm);
	}

	.principle-box {
		background: var(--color-bg-subtle);
		border: 2px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
	}

	.principle-text {
		font-size: var(--text-h3);
		font-weight: 600;
		text-align: center;
		color: var(--color-fg-primary);
	}

	.conclusion-box {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.conclusion-quote {
		text-align: center;
		font-style: italic;
		color: var(--color-fg-secondary);
	}

	.conclusion-attribution {
		text-align: center;
		font-size: var(--text-body-sm);
		margin-top: var(--space-sm);
		color: var(--color-fg-tertiary);
	}

	.paper-footer {
		border-top: 1px solid var(--color-border-default);
	}

	.footer-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}
</style>
