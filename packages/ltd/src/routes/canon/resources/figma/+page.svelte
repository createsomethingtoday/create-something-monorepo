<script lang="ts">
	import CodeBlock from '$lib/canon/CodeBlock.svelte';
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Figma Integration</h1>
	<p class="page-description">
		Sync Canon design tokens between code and Figma using Tokens Studio. The CSS tokens are the
		source of truth; Figma receives generated exports.
	</p>
</header>

<!-- Architecture Overview -->
<section class="section">
	<h2 class="section-title">Architecture</h2>
	<p class="section-description">
		Design tokens flow from code to Figma, ensuring consistency across engineering and design.
	</p>

	<div class="architecture-diagram">
		<div class="diagram-flow">
			<div class="diagram-node diagram-source">
				<span class="diagram-label">tokens.css</span>
				<span class="diagram-sublabel">Source of Truth</span>
			</div>
			<div class="diagram-arrow">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
			<div class="diagram-node">
				<span class="diagram-label">pnpm tokens:export</span>
				<span class="diagram-sublabel">Generate exports</span>
			</div>
			<div class="diagram-arrow">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
			<div class="diagram-node">
				<span class="diagram-label">tokens.figma.json</span>
				<span class="diagram-sublabel">Tokens Studio format</span>
			</div>
			<div class="diagram-arrow">
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M5 12h14M12 5l7 7-7 7" />
				</svg>
			</div>
			<div class="diagram-node diagram-destination">
				<span class="diagram-label">Figma Variables</span>
				<span class="diagram-sublabel">Via Tokens Studio</span>
			</div>
		</div>
	</div>
</section>

<!-- Quick Start Section -->
<section class="section">
	<h2 class="section-title">Quick Start</h2>
	<p class="section-description">
		Get Canon tokens into Figma in three steps.
	</p>

	<div class="steps-grid">
		<div class="step-item">
			<div class="step-number">1</div>
			<h3>Install Tokens Studio</h3>
			<ol>
				<li>Open Figma</li>
				<li>Go to <strong>Plugins</strong> > <strong>Browse plugins in Community</strong></li>
				<li>Search for "Tokens Studio"</li>
				<li>Click <strong>Install</strong></li>
			</ol>
		</div>

		<div class="step-item">
			<div class="step-number">2</div>
			<h3>Import Canon Tokens</h3>
			<ol>
				<li>Open Tokens Studio plugin</li>
				<li>Click <strong>Settings</strong> (gear icon)</li>
				<li>Under "Token Storage", select <strong>Local document</strong></li>
				<li>Click <strong>Import</strong> > <strong>From file</strong></li>
				<li>Select <code>packages/components/src/lib/styles/tokens.figma.json</code></li>
			</ol>
		</div>

		<div class="step-item">
			<div class="step-number">3</div>
			<h3>Apply to Figma</h3>
			<ol>
				<li>In Tokens Studio, select the "core" token set</li>
				<li>Click <strong>Sync styles</strong> for typography and shadows</li>
				<li>Click <strong>Sync variables</strong> for colors and spacing</li>
			</ol>
		</div>
	</div>
</section>

<!-- Token Sets Section -->
<section class="section">
	<h2 class="section-title">Token Sets</h2>
	<p class="section-description">
		Canon tokens are organized into sets for different themes and use cases.
	</p>

	<div class="token-sets-table">
		<div class="token-sets-header">
			<span>Set</span>
			<span>Description</span>
			<span>Use Case</span>
		</div>
		<div class="token-sets-row">
			<code>core</code>
			<span>Default dark theme tokens</span>
			<span>Base design work</span>
		</div>
		<div class="token-sets-row">
			<code>themes/light</code>
			<span>Light theme overrides</span>
			<span>Light mode designs</span>
		</div>
		<div class="token-sets-row">
			<code>themes/high-contrast</code>
			<span>High contrast overrides</span>
			<span>Accessibility designs</span>
		</div>
	</div>

	<div class="example-group">
		<h3 class="example-title">Applying Themes</h3>
		<p class="example-description">
			Theme sets override core values for the same token paths. Enable multiple sets to compose themes.
		</p>

		<div class="theme-demo">
			<div class="theme-option">
				<div class="theme-option-header">
					<span class="theme-checkbox checked"></span>
					<span>core</span>
				</div>
				<p>Always enabled. Provides base dark theme.</p>
			</div>
			<div class="theme-option">
				<div class="theme-option-header">
					<span class="theme-checkbox"></span>
					<span>themes/light</span>
				</div>
				<p>Enable for light mode. Overrides color tokens.</p>
			</div>
			<div class="theme-option">
				<div class="theme-option-header">
					<span class="theme-checkbox"></span>
					<span>themes/high-contrast</span>
				</div>
				<p>Enable for accessibility. Increases contrast ratios.</p>
			</div>
		</div>
	</div>
</section>

<!-- Sync Workflow Section -->
<section class="section">
	<h2 class="section-title">Sync Workflow</h2>
	<p class="section-description">
		Keep tokens synchronized between code and Figma.
	</p>

	<div class="example-group">
		<h3 class="example-title">Code to Figma (Most Common)</h3>
		<p class="example-description">
			When CSS tokens change, regenerate the Figma export and re-import.
		</p>

		<CodeBlock
			code={`# 1. Regenerate Figma tokens
pnpm --filter=components tokens:export

# 2. Commit updated token files
git add packages/components/src/lib/styles/tokens.figma.json
git commit -m "chore(tokens): sync design tokens"

# 3. In Figma, re-import tokens.figma.json via Tokens Studio`}
			language="bash"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Figma to Code (Design Exploration)</h3>
		<p class="example-description">
			When exploring new tokens in Figma, the process is manual to maintain source of truth.
		</p>

		<div class="workflow-steps">
			<div class="workflow-step">
				<span class="workflow-step-number">1</span>
				<p>Export tokens from Tokens Studio as JSON</p>
			</div>
			<div class="workflow-step">
				<span class="workflow-step-number">2</span>
				<p>Review changes with designer</p>
			</div>
			<div class="workflow-step">
				<span class="workflow-step-number">3</span>
				<p>Manually update <code>tokens.css</code> (source of truth)</p>
			</div>
			<div class="workflow-step">
				<span class="workflow-step-number">4</span>
				<p>Run <code>pnpm tokens:export</code> to regenerate all formats</p>
			</div>
		</div>

		<div class="warning-box">
			<strong>Important:</strong> <code>tokens.css</code> is always the source of truth. Figma exports are for reference only. Never edit generated files directly.
		</div>
	</div>
</section>

<!-- Token Types Section -->
<section class="section">
	<h2 class="section-title">Token Type Mapping</h2>
	<p class="section-description">
		CSS token prefixes map to specific Tokens Studio types.
	</p>

	<div class="type-mapping-table">
		<div class="type-mapping-header">
			<span>CSS Token Prefix</span>
			<span>Tokens Studio Type</span>
		</div>
		<div class="type-mapping-row">
			<code>color-*</code>
			<code>color</code>
		</div>
		<div class="type-mapping-row">
			<code>text-*</code>
			<code>fontSizes</code>
		</div>
		<div class="type-mapping-row">
			<code>font-sans/mono/serif</code>
			<code>fontFamilies</code>
		</div>
		<div class="type-mapping-row">
			<code>font-light/regular/...</code>
			<code>fontWeights</code>
		</div>
		<div class="type-mapping-row">
			<code>leading-*</code>
			<code>lineHeights</code>
		</div>
		<div class="type-mapping-row">
			<code>tracking-*</code>
			<code>letterSpacing</code>
		</div>
		<div class="type-mapping-row">
			<code>space-*</code>
			<code>spacing</code>
		</div>
		<div class="type-mapping-row">
			<code>radius-*</code>
			<code>borderRadius</code>
		</div>
		<div class="type-mapping-row">
			<code>shadow-*</code>
			<code>boxShadow</code>
		</div>
		<div class="type-mapping-row">
			<code>duration-*</code>
			<code>duration</code>
		</div>
	</div>
</section>

<!-- Variables vs Styles Section -->
<section class="section">
	<h2 class="section-title">Figma Variables vs Styles</h2>
	<p class="section-description">
		Tokens Studio can create both Figma Variables and Figma Styles. Use the right one for each token type.
	</p>

	<div class="comparison-grid">
		<div class="comparison-card">
			<h3>Variables</h3>
			<p class="comparison-subtitle">Recommended for colors, spacing</p>
			<ul>
				<li>Support mode switching (dark/light)</li>
				<li>Can be used in Auto Layout</li>
				<li>Native Figma feature</li>
				<li>Best for: <code>color-*</code>, <code>space-*</code>, <code>radius-*</code></li>
			</ul>
		</div>

		<div class="comparison-card">
			<h3>Styles</h3>
			<p class="comparison-subtitle">Required for shadows, typography</p>
			<ul>
				<li>Support complex composite values</li>
				<li>Required for multi-layer shadows</li>
				<li>Better for typography presets</li>
				<li>Best for: <code>shadow-*</code>, <code>text-*</code></li>
			</ul>
		</div>
	</div>

	<p class="comparison-note">
		Use <strong>Sync variables</strong> for primitive values and <strong>Sync styles</strong> for composite values.
	</p>
</section>

<!-- File Structure Section -->
<section class="section">
	<h2 class="section-title">File Structure</h2>
	<p class="section-description">
		Token files are organized in the components package.
	</p>

	<CodeBlock
		code={`packages/components/
├── figma/
│   ├── README.md                    # Figma integration docs
│   └── tokens-studio.config.json    # Tokens Studio configuration
├── scripts/
│   └── generate-exports.mjs         # Token export generator
└── src/lib/styles/
    ├── tokens.css                   # Source of truth
    ├── tokens.figma.json            # Tokens Studio format
    ├── tokens.dtcg.json             # W3C DTCG format
    ├── tokens.scss                  # SCSS variables
    └── canon.json                   # Categorized format`}
		language="text"
	/>
</section>

<!-- Remote Sync Section -->
<section class="section">
	<h2 class="section-title">Remote Sync (Team Collaboration)</h2>
	<p class="section-description">
		For team collaboration, configure remote storage to sync tokens automatically.
	</p>

	<div class="example-group">
		<h3 class="example-title">GitHub Sync</h3>
		<p class="example-description">
			Tokens Studio can sync directly with the GitHub repository.
		</p>

		<div class="sync-steps">
			<ol>
				<li>In Tokens Studio settings, select <strong>GitHub</strong> storage</li>
				<li>Enter repository: <code>createsomethingtoday/create-something-monorepo</code></li>
				<li>File path: <code>packages/components/src/lib/styles/tokens.figma.json</code></li>
				<li>Branch: <code>main</code></li>
				<li>Generate a GitHub personal access token with <code>repo</code> scope</li>
			</ol>
		</div>
	</div>
</section>

<!-- Troubleshooting Section -->
<section class="section">
	<h2 class="section-title">Troubleshooting</h2>
	<p class="section-description">
		Common issues and their solutions.
	</p>

	<div class="troubleshooting-grid">
		<div class="troubleshooting-item">
			<h4>Tokens not appearing in Figma</h4>
			<ol>
				<li>Ensure correct token set is enabled</li>
				<li>Click <strong>Refresh</strong> in Tokens Studio</li>
				<li>Try re-importing the JSON file</li>
			</ol>
		</div>

		<div class="troubleshooting-item">
			<h4>Colors look wrong</h4>
			<ol>
				<li>Check if rgba values are supported</li>
				<li>Verify the correct theme set is applied</li>
				<li>Check for token reference errors</li>
			</ol>
		</div>

		<div class="troubleshooting-item">
			<h4>Typography not applying</h4>
			<ol>
				<li>Ensure the font is installed in Figma</li>
				<li>Check font family name matches exactly</li>
				<li>Use <strong>Sync styles</strong> for typography</li>
			</ol>
		</div>

		<div class="troubleshooting-item">
			<h4>Shadows missing</h4>
			<ol>
				<li>Shadows require <strong>Sync styles</strong>, not variables</li>
				<li>Multi-layer shadows may need manual adjustment</li>
				<li>Check rgba opacity values</li>
			</ol>
		</div>
	</div>
</section>

<!-- Philosophy Section -->
<section class="section philosophy-section">
	<h2 class="section-title">Philosophy</h2>

	<div class="philosophy-grid">
		<div class="philosophy-item">
			<h4>Single Source of Truth</h4>
			<p>
				<code>tokens.css</code> defines all values. All other formats (Figma, SCSS, DTCG) are
				generated outputs. Never edit generated files directly.
			</p>
		</div>

		<div class="philosophy-item">
			<h4>Weniger, aber besser</h4>
			<p>
				Only tokens that earn their existence. No decorative variations, no unused semantic
				tokens.
			</p>
		</div>

		<div class="philosophy-item">
			<h4>Tool Transparency</h4>
			<p>
				The sync process should recede into use. Designers see tokens; engineers see CSS
				variables. The bridge is invisible.
			</p>
		</div>
	</div>
</section>

<style>
	/* Page Header */
	.page-header {
		margin-bottom: var(--space-2xl);
		padding-bottom: var(--space-xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.page-title {
		font-size: var(--text-display);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
		letter-spacing: var(--tracking-tight);
	}

	.page-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 700px;
		margin: 0;
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-lg);
		line-height: var(--leading-relaxed);
	}

	/* Architecture Diagram */
	.architecture-diagram {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow-x: auto;
	}

	.diagram-flow {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		min-width: 800px;
	}

	.diagram-node {
		flex: 1;
		padding: var(--space-md);
		background: var(--color-bg-subtle);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.diagram-source {
		background: var(--color-success-muted);
		border-color: var(--color-success-border);
	}

	.diagram-destination {
		background: var(--color-info-muted);
		border-color: var(--color-info-border);
	}

	.diagram-label {
		display: block;
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-primary);
	}

	.diagram-sublabel {
		display: block;
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		margin-top: 4px;
	}

	.diagram-arrow {
		color: var(--color-fg-muted);
		flex-shrink: 0;
	}

	/* Steps Grid */
	.steps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.step-item {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.step-number {
		width: 32px;
		height: 32px;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-bold);
		margin-bottom: var(--space-sm);
	}

	.step-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.step-item ol {
		margin: 0;
		padding-left: var(--space-md);
	}

	.step-item li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.step-item code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}

	/* Token Sets Table */
	.token-sets-table {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
		margin-bottom: var(--space-lg);
	}

	.token-sets-header,
	.token-sets-row {
		display: grid;
		grid-template-columns: 1fr 2fr 1.5fr;
		gap: var(--space-md);
		padding: var(--space-md);
	}

	.token-sets-header {
		background: var(--color-bg-subtle);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
	}

	.token-sets-row {
		border-top: 1px solid var(--color-border-default);
	}

	.token-sets-row code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.token-sets-row span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Example Groups */
	.example-group {
		margin-bottom: var(--space-xl);
	}

	.example-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.example-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	/* Theme Demo */
	.theme-demo {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.theme-option {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	.theme-option-header {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.theme-checkbox {
		width: 16px;
		height: 16px;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-sm);
		background: var(--color-bg-elevated);
	}

	.theme-checkbox.checked {
		background: var(--color-fg-primary);
		border-color: var(--color-fg-primary);
	}

	.theme-checkbox.checked::after {
		content: '';
		display: block;
		width: 5px;
		height: 9px;
		margin: 1px auto;
		border: solid var(--color-bg-pure);
		border-width: 0 2px 2px 0;
		transform: rotate(45deg);
	}

	.theme-option-header span {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	.theme-option p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin: 0;
	}

	/* Workflow Steps */
	.workflow-steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.workflow-step {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.workflow-step-number {
		width: 24px;
		height: 24px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		flex-shrink: 0;
	}

	.workflow-step p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.workflow-step code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}

	/* Warning Box */
	.warning-box {
		padding: var(--space-md);
		background: var(--color-warning-muted);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.warning-box strong {
		color: var(--color-warning);
	}

	.warning-box code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}

	/* Type Mapping Table */
	.type-mapping-table {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.type-mapping-header,
	.type-mapping-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-md);
		padding: var(--space-md);
	}

	.type-mapping-header {
		background: var(--color-bg-subtle);
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
	}

	.type-mapping-row {
		border-top: 1px solid var(--color-border-default);
	}

	.type-mapping-row code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
	}

	/* Comparison Grid */
	.comparison-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.comparison-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.comparison-card h3 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.comparison-subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-md);
	}

	.comparison-card ul {
		margin: 0;
		padding-left: var(--space-md);
	}

	.comparison-card li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.comparison-card code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.comparison-note {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		margin: 0;
	}

	/* Sync Steps */
	.sync-steps ol {
		margin: 0;
		padding-left: var(--space-md);
	}

	.sync-steps li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
	}

	.sync-steps code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}

	/* Troubleshooting Grid */
	.troubleshooting-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.troubleshooting-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.troubleshooting-item h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.troubleshooting-item ol {
		margin: 0;
		padding-left: var(--space-md);
	}

	.troubleshooting-item li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	/* Philosophy Section */
	.philosophy-section {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.philosophy-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-lg);
	}

	.philosophy-item h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.philosophy-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin: 0;
	}

	.philosophy-item code {
		font-family: var(--font-mono);
		font-size: var(--text-caption);
		background: var(--color-bg-subtle);
		padding: 2px 4px;
		border-radius: var(--radius-sm);
	}
</style>
