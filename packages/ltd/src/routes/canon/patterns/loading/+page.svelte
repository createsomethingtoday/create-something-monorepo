<script lang="ts">
	import CodeBlock from '$lib/canon/CodeBlock.svelte';
</script>

<!-- Page Header -->
<header class="page-header">
	<h1 class="page-title">Loading</h1>
	<p class="page-description">
		Loading patterns communicate system status during asynchronous operations. Skeleton screens,
		spinners, and progress indicators keep users informed and reduce perceived wait time.
	</p>
</header>

<!-- Problem Statement -->
<section class="section">
	<h2 class="section-title">The Problem</h2>
	<p class="section-description">
		Unresponsive interfaces feel broken. When users take action and see nothing happen, they
		assume failure and retry, creating duplicate requests and frustration.
	</p>

	<div class="problem-grid">
		<div class="problem-item">
			<h3>Perceived Slowness</h3>
			<p>Without feedback, even fast operations feel slow.</p>
		</div>
		<div class="problem-item">
			<h3>Layout Shift</h3>
			<p>Content that appears suddenly causes jarring jumps.</p>
		</div>
		<div class="problem-item">
			<h3>Uncertainty</h3>
			<p>Users don't know if the system is working or frozen.</p>
		</div>
		<div class="problem-item">
			<h3>Retry Storms</h3>
			<p>Impatient users click repeatedly, overloading systems.</p>
		</div>
	</div>
</section>

<!-- Skeleton Screens Section -->
<section class="section">
	<h2 class="section-title">Skeleton Screens</h2>
	<p class="section-description">
		Skeleton screens show the structure of content before it loads, reducing perceived wait time
		and preventing layout shift.
	</p>

	<div class="example-group">
		<h3 class="example-title">Text Skeleton</h3>
		<p class="example-description">
			Placeholder for text content. Width varies to suggest natural text rhythm.
		</p>

		<div class="preview">
			<div class="demo-skeleton-text-group">
				<div class="demo-skeleton demo-skeleton-text" style="width: 100%"></div>
				<div class="demo-skeleton demo-skeleton-text" style="width: 85%"></div>
				<div class="demo-skeleton demo-skeleton-text" style="width: 92%"></div>
				<div class="demo-skeleton demo-skeleton-text" style="width: 60%"></div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Skeleton } from '@create-something/components';
</script>

<!-- Text paragraph skeleton -->
<div class="skeleton-group">
  <Skeleton variant="text" width="100%" />
  <Skeleton variant="text" width="85%" />
  <Skeleton variant="text" width="92%" />
  <Skeleton variant="text" width="60%" />
</div>

<style>
  .skeleton-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Card Skeleton</h3>
		<p class="example-description">
			Composite skeleton matching a card's structure.
		</p>

		<div class="preview">
			<div class="demo-card-skeleton">
				<div class="demo-skeleton demo-skeleton-rectangular"></div>
				<div class="demo-card-skeleton-content">
					<div class="demo-skeleton demo-skeleton-text" style="width: 70%"></div>
					<div class="demo-skeleton demo-skeleton-text" style="width: 100%"></div>
					<div class="demo-skeleton demo-skeleton-text" style="width: 40%"></div>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<!-- Card skeleton matching PaperCard structure -->
<div class="card-skeleton">
  <Skeleton variant="rectangular" height="160px" />
  <div class="card-skeleton-content">
    <Skeleton variant="text" width="70%" />
    <Skeleton variant="text" width="100%" />
    <Skeleton variant="text" width="40%" />
  </div>
</div>

<style>
  .card-skeleton {
    background: var(--color-bg-surface);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .card-skeleton-content {
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }
</style>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Avatar and Circular</h3>
		<p class="example-description">
			Circular skeletons for avatars and icons.
		</p>

		<div class="preview">
			<div class="demo-avatar-skeleton-row">
				<div class="demo-skeleton demo-skeleton-circular demo-skeleton-sm"></div>
				<div class="demo-skeleton demo-skeleton-circular"></div>
				<div class="demo-skeleton demo-skeleton-circular demo-skeleton-lg"></div>
			</div>
		</div>

		<CodeBlock
			code={`<Skeleton variant="circular" width="32px" height="32px" />
<Skeleton variant="circular" width="40px" height="40px" />
<Skeleton variant="circular" width="56px" height="56px" />`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">List Skeleton</h3>
		<p class="example-description">
			Multiple items with avatar and text for list views.
		</p>

		<div class="preview">
			<div class="demo-list-skeleton">
				{#each [1, 2, 3] as _}
					<div class="demo-list-item-skeleton">
						<div class="demo-skeleton demo-skeleton-circular"></div>
						<div class="demo-list-item-text">
							<div class="demo-skeleton demo-skeleton-text" style="width: 50%"></div>
							<div class="demo-skeleton demo-skeleton-text" style="width: 80%"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { LoadingSkeleton } from '@create-something/components';
</script>

<!-- Pre-composed list skeleton pattern -->
<LoadingSkeleton variant="list" count={3} />

<!-- Or compose manually -->
{#each Array(3) as _}
  <div class="list-item">
    <Skeleton variant="circular" />
    <div class="list-item-text">
      <Skeleton variant="text" width="50%" />
      <Skeleton variant="text" width="80%" />
    </div>
  </div>
{/each}`}
			language="svelte"
		/>
	</div>
</section>

<!-- Spinner Section -->
<section class="section">
	<h2 class="section-title">Spinners</h2>
	<p class="section-description">
		Spinners indicate indeterminate loading when the duration is unknown. Use sparingly, as
		skeleton screens are generally preferred.
	</p>

	<div class="example-group">
		<h3 class="example-title">Size Variants</h3>
		<p class="example-description">
			Four sizes for different contexts: inline (sm), button (md), section (lg), page (xl).
		</p>

		<div class="preview">
			<div class="demo-spinner-row">
				<div class="demo-spinner-item">
					<div class="demo-spinner demo-spinner-sm"></div>
					<span>Small (16px)</span>
				</div>
				<div class="demo-spinner-item">
					<div class="demo-spinner demo-spinner-md"></div>
					<span>Medium (24px)</span>
				</div>
				<div class="demo-spinner-item">
					<div class="demo-spinner demo-spinner-lg"></div>
					<span>Large (32px)</span>
				</div>
				<div class="demo-spinner-item">
					<div class="demo-spinner demo-spinner-xl"></div>
					<span>XL (48px)</span>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Spinner } from '@create-something/components';
</script>

<Spinner size="sm" label="Loading..." />
<Spinner size="md" label="Loading..." />
<Spinner size="lg" label="Loading..." />
<Spinner size="xl" label="Loading..." />`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Button Loading State</h3>
		<p class="example-description">
			Replace button text with spinner during submission.
		</p>

		<div class="preview">
			<div class="demo-button-row">
				<button class="demo-btn demo-btn-primary">Submit</button>
				<button class="demo-btn demo-btn-primary demo-btn-loading" disabled>
					<div class="demo-spinner demo-spinner-btn"></div>
					<span>Submitting...</span>
				</button>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  let loading = $state(false);

  async function handleSubmit() {
    loading = true;
    try {
      await submitForm();
    } finally {
      loading = false;
    }
  }
</script>

<button onclick={handleSubmit} disabled={loading}>
  {#if loading}
    <Spinner size="sm" />
    <span>Submitting...</span>
  {:else}
    Submit
  {/if}
</button>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Centered Spinner</h3>
		<p class="example-description">
			Full-width centered spinner for section or page loading.
		</p>

		<div class="preview" style="min-height: 200px;">
			<div class="demo-spinner-centered">
				<div class="demo-spinner demo-spinner-lg"></div>
			</div>
		</div>

		<CodeBlock
			code={`<Spinner size="lg" centered label="Loading content..." />`}
			language="svelte"
		/>
	</div>
</section>

<!-- Progress Indicators Section -->
<section class="section">
	<h2 class="section-title">Progress Indicators</h2>
	<p class="section-description">
		Progress bars show determinate progress when the completion percentage is known.
	</p>

	<div class="example-group">
		<h3 class="example-title">Linear Progress</h3>
		<p class="example-description">
			Horizontal bar showing percentage complete.
		</p>

		<div class="preview">
			<div class="demo-progress-group">
				<div class="demo-progress-item">
					<div class="demo-progress-header">
						<span>Uploading files...</span>
						<span>45%</span>
					</div>
					<div class="demo-progress-bar">
						<div class="demo-progress-fill" style="width: 45%"></div>
					</div>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { Progress } from '@create-something/components';

  let progress = $state(45);
</script>

<Progress
  value={progress}
  max={100}
  label="Uploading files..."
  showValue
/>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Indeterminate Progress</h3>
		<p class="example-description">
			Animated bar for operations with unknown duration.
		</p>

		<div class="preview">
			<div class="demo-progress-bar demo-progress-indeterminate">
				<div class="demo-progress-fill-indeterminate"></div>
			</div>
		</div>

		<CodeBlock
			code={`<Progress indeterminate label="Processing..." />`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Step Progress</h3>
		<p class="example-description">
			For multi-step processes like forms or wizards.
		</p>

		<div class="preview">
			<div class="demo-step-progress">
				<div class="demo-step-progress-bar">
					<div class="demo-step-progress-fill" style="width: 50%"></div>
				</div>
				<div class="demo-step-progress-label">Step 2 of 4</div>
			</div>
		</div>

		<CodeBlock
			code={`<Progress
  value={2}
  max={4}
  label="Step 2 of 4"
  variant="steps"
/>`}
			language="svelte"
		/>
	</div>
</section>

<!-- Loading Overlay Section -->
<section class="section">
	<h2 class="section-title">Loading Overlay</h2>
	<p class="section-description">
		Overlay patterns block interaction during critical operations.
	</p>

	<div class="example-group">
		<h3 class="example-title">Full Page Overlay</h3>
		<p class="example-description">
			Blocks entire page during authentication or initial data load.
		</p>

		<div class="preview preview-overlay">
			<div class="demo-page-content">
				<p>Page content appears here...</p>
			</div>
			<div class="demo-overlay">
				<div class="demo-overlay-content">
					<div class="demo-spinner demo-spinner-lg"></div>
					<p>Loading application...</p>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<script lang="ts">
  import { LoadingOverlay } from '@create-something/components';

  let loading = $state(true);
</script>

{#if loading}
  <LoadingOverlay message="Loading application..." />
{/if}

<main>
  <!-- Page content -->
</main>`}
			language="svelte"
		/>
	</div>

	<div class="example-group">
		<h3 class="example-title">Section Overlay</h3>
		<p class="example-description">
			Blocks only a portion of the page while content loads.
		</p>

		<div class="preview">
			<div class="demo-section-with-overlay">
				<div class="demo-section-content">
					<div class="demo-skeleton demo-skeleton-text" style="width: 80%"></div>
					<div class="demo-skeleton demo-skeleton-text" style="width: 60%"></div>
				</div>
				<div class="demo-section-overlay">
					<div class="demo-spinner demo-spinner-md"></div>
				</div>
			</div>
		</div>

		<CodeBlock
			code={`<div class="section-container">
  <LoadingOverlay
    variant="section"
    visible={loading}
  />
  <div class="section-content">
    {#if data}
      <!-- Render data -->
    {/if}
  </div>
</div>`}
			language="svelte"
		/>
	</div>
</section>

<!-- When to Use Section -->
<section class="section">
	<h2 class="section-title">Choosing a Pattern</h2>
	<p class="section-description">
		Different loading states require different feedback patterns.
	</p>

	<div class="choice-grid">
		<div class="choice-item">
			<h3>Skeleton Screens</h3>
			<p class="choice-when">When:</p>
			<ul>
				<li>Loading page content or lists</li>
				<li>Layout structure is known in advance</li>
				<li>Duration is typically under 3 seconds</li>
			</ul>
			<p class="choice-why">
				Reduces perceived wait time by showing structure immediately.
			</p>
		</div>

		<div class="choice-item">
			<h3>Spinners</h3>
			<p class="choice-when">When:</p>
			<ul>
				<li>Button or inline loading states</li>
				<li>Brief operations (under 2 seconds)</li>
				<li>Unknown or variable layout</li>
			</ul>
			<p class="choice-why">
				Simple feedback for short, contained operations.
			</p>
		</div>

		<div class="choice-item">
			<h3>Progress Bars</h3>
			<p class="choice-when">When:</p>
			<ul>
				<li>File uploads or downloads</li>
				<li>Multi-step processes</li>
				<li>Progress percentage is calculable</li>
			</ul>
			<p class="choice-why">
				Shows actual progress, sets expectations for wait time.
			</p>
		</div>

		<div class="choice-item">
			<h3>Overlays</h3>
			<p class="choice-when">When:</p>
			<ul>
				<li>Critical operations that must complete</li>
				<li>Preventing user interaction is necessary</li>
				<li>Authentication or checkout flows</li>
			</ul>
			<p class="choice-why">
				Prevents conflicting actions during important operations.
			</p>
		</div>
	</div>
</section>

<!-- Reduced Motion Section -->
<section class="section">
	<h2 class="section-title">Reduced Motion</h2>
	<p class="section-description">
		All loading animations must respect <code>prefers-reduced-motion</code>.
	</p>

	<div class="example-group">
		<h3 class="example-title">Motion Alternatives</h3>
		<p class="example-description">
			When motion is reduced, provide static alternatives that still communicate loading.
		</p>

		<CodeBlock
			code={`/* Spinner - stops animation, shows static indicator */
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-color: var(--color-fg-muted);
    border-top-color: var(--color-fg-primary);
  }
}

/* Skeleton - stops pulse, shows static gray */
@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
    opacity: 0.7;
  }
}

/* Progress indeterminate - shows static bar */
@media (prefers-reduced-motion: reduce) {
  .progress-indeterminate .progress-fill {
    animation: none;
    width: 30%;
    left: 35%;
  }
}`}
			language="css"
		/>
	</div>
</section>

<!-- Token Reference -->
<section class="section">
	<h2 class="section-title">Token Reference</h2>
	<p class="section-description">Loading patterns use these Canon design tokens.</p>

	<div class="token-table">
		<div class="token-row">
			<code>--color-bg-subtle</code>
			<span>Skeleton background color (#1a1a1a)</span>
		</div>
		<div class="token-row">
			<code>--color-border-default</code>
			<span>Spinner track color</span>
		</div>
		<div class="token-row">
			<code>--color-fg-primary</code>
			<span>Spinner accent, progress fill</span>
		</div>
		<div class="token-row">
			<code>--color-overlay</code>
			<span>Overlay backdrop (rgba(0,0,0,0.5))</span>
		</div>
		<div class="token-row">
			<code>--radius-sm / --radius-md</code>
			<span>Skeleton border radius</span>
		</div>
		<div class="token-row">
			<code>--radius-full</code>
			<span>Spinner and circular skeleton</span>
		</div>
		<div class="token-row">
			<code>--z-modal</code>
			<span>Loading overlay z-index (100)</span>
		</div>
	</div>
</section>

<!-- Anti-Patterns Section -->
<section class="section">
	<h2 class="section-title">Anti-Patterns</h2>
	<p class="section-description">Common loading mistakes to avoid.</p>

	<div class="anti-patterns">
		<div class="anti-pattern">
			<h4>Spinner for Everything</h4>
			<p>
				Don't use spinners when you can show structure. Skeleton screens reduce perceived
				wait time more effectively.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>No Loading State</h4>
			<p>
				Any operation over 100ms needs feedback. Users assume broken UI without response.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Layout Shift</h4>
			<p>
				Match skeleton dimensions to final content. Jumping layouts frustrate users.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Ignoring Reduced Motion</h4>
			<p>
				Animated loaders can cause discomfort. Always provide static alternatives.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Overlong Spinners</h4>
			<p>
				If loading takes more than 10 seconds, show progress or allow cancellation.
			</p>
		</div>

		<div class="anti-pattern">
			<h4>Blocking Non-Critical</h4>
			<p>
				Don't overlay the entire page for a single component. Load progressively.
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

	.section-description code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		background: var(--color-bg-subtle);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
	}

	/* Problem Grid */
	.problem-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-md);
	}

	.problem-item {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.problem-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.problem-item p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
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

	/* Preview Area */
	.preview {
		padding: var(--space-xl);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-md);
	}

	.preview-overlay {
		position: relative;
		min-height: 200px;
		overflow: hidden;
	}

	/* Skeleton Demos */
	.demo-skeleton {
		background: var(--color-bg-subtle);
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.demo-skeleton-text {
		height: 1em;
		border-radius: var(--radius-sm);
	}

	.demo-skeleton-text-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		max-width: 400px;
	}

	.demo-skeleton-rectangular {
		width: 100%;
		height: 160px;
		border-radius: 0;
	}

	.demo-skeleton-circular {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-full);
	}

	.demo-skeleton-sm {
		width: 32px;
		height: 32px;
	}

	.demo-skeleton-lg {
		width: 56px;
		height: 56px;
	}

	.demo-card-skeleton {
		max-width: 300px;
		background: var(--color-bg-elevated);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.demo-card-skeleton-content {
		padding: var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.demo-avatar-skeleton-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.demo-list-skeleton {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
		max-width: 400px;
	}

	.demo-list-item-skeleton {
		display: flex;
		align-items: center;
		gap: var(--space-md);
	}

	.demo-list-item-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	/* Spinner Demos */
	.demo-spinner {
		border-radius: var(--radius-full);
		border-style: solid;
		border-color: var(--color-border-default);
		border-top-color: var(--color-fg-primary);
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.demo-spinner-sm {
		width: 16px;
		height: 16px;
		border-width: 2px;
	}

	.demo-spinner-md {
		width: 24px;
		height: 24px;
		border-width: 2px;
	}

	.demo-spinner-lg {
		width: 32px;
		height: 32px;
		border-width: 3px;
	}

	.demo-spinner-xl {
		width: 48px;
		height: 48px;
		border-width: 4px;
	}

	.demo-spinner-btn {
		width: 16px;
		height: 16px;
		border-width: 2px;
		border-color: rgba(0, 0, 0, 0.2);
		border-top-color: var(--color-bg-pure);
	}

	.demo-spinner-row {
		display: flex;
		align-items: center;
		gap: var(--space-xl);
	}

	.demo-spinner-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.demo-spinner-item span {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
	}

	.demo-spinner-centered {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		min-height: 150px;
	}

	/* Button Demos */
	.demo-button-row {
		display: flex;
		gap: var(--space-md);
		align-items: center;
	}

	.demo-btn {
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		border-radius: var(--radius-md);
		cursor: pointer;
		border: none;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.demo-btn-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
	}

	.demo-btn-loading {
		opacity: 0.8;
		cursor: not-allowed;
	}

	/* Progress Bar Demos */
	.demo-progress-group {
		max-width: 400px;
	}

	.demo-progress-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.demo-progress-header {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.demo-progress-bar {
		height: 8px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.demo-progress-fill {
		height: 100%;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		transition: width var(--duration-standard) var(--ease-standard);
	}

	.demo-progress-indeterminate {
		position: relative;
	}

	.demo-progress-fill-indeterminate {
		position: absolute;
		height: 100%;
		width: 30%;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
		animation: indeterminate 1.5s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0% {
			left: -30%;
		}
		100% {
			left: 100%;
		}
	}

	.demo-step-progress {
		max-width: 300px;
	}

	.demo-step-progress-bar {
		height: 4px;
		background: var(--color-bg-subtle);
		border-radius: var(--radius-full);
		overflow: hidden;
		margin-bottom: var(--space-xs);
	}

	.demo-step-progress-fill {
		height: 100%;
		background: var(--color-fg-primary);
		border-radius: var(--radius-full);
	}

	.demo-step-progress-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
	}

	/* Overlay Demos */
	.demo-page-content {
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
	}

	.demo-page-content p {
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.demo-overlay {
		position: absolute;
		inset: 0;
		background: var(--color-overlay);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-lg);
	}

	.demo-overlay-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-md);
	}

	.demo-overlay-content p {
		color: var(--color-fg-primary);
		font-size: var(--text-body-sm);
		margin: 0;
	}

	.demo-section-with-overlay {
		position: relative;
		padding: var(--space-lg);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		min-height: 100px;
	}

	.demo-section-content {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.demo-section-overlay {
		position: absolute;
		inset: 0;
		background: rgba(10, 10, 10, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-md);
	}

	/* Choice Grid */
	.choice-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-md);
	}

	.choice-item {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
	}

	.choice-item h3 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.choice-when {
		font-size: var(--text-caption);
		font-weight: var(--font-semibold);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wider);
		margin-bottom: var(--space-xs);
	}

	.choice-item ul {
		margin: 0 0 var(--space-sm) 0;
		padding-left: var(--space-md);
	}

	.choice-item li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.choice-why {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		font-style: italic;
		margin: 0;
		padding-top: var(--space-sm);
		border-top: 1px solid var(--color-border-default);
	}

	/* Token Table */
	.token-table {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.token-row {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: var(--space-md);
		padding: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.token-row:last-child {
		border-bottom: none;
	}

	.token-row code {
		font-family: var(--font-mono);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.token-row span {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Anti-Patterns */
	.anti-patterns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.anti-pattern {
		padding: var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-lg);
	}

	.anti-pattern h4 {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-error);
		margin-bottom: var(--space-xs);
	}

	.anti-pattern p {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.demo-skeleton {
			animation: none;
			opacity: 0.7;
		}

		.demo-spinner {
			animation: none;
		}

		.demo-progress-fill-indeterminate {
			animation: none;
			left: 35%;
		}
	}
</style>
