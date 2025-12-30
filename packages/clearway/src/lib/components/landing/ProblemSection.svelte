<script lang="ts">
	// Problem Section
	// The pain points that CLEARWAY solves
</script>

<section class="problem">
	<div class="container">
		<h2 class="section-title">The Real Problem</h2>
		<div class="problem-grid">
			<div class="problem-card">
				<span class="problem-emoji">&#x1F4DE;</span>
				<h3>Phone Tag</h3>
				<p>Staff spend hours managing calls. Members wait on hold. Everyone loses.</p>
			</div>
			<div class="problem-card">
				<span class="problem-emoji">&#x274C;</span>
				<h3>Double Bookings</h3>
				<p>The spreadsheet said it was free. It wasn't. Now two members are upset.</p>
			</div>
			<div class="problem-card">
				<span class="problem-emoji">&#x1F573;&#xFE0F;</span>
				<h3>Empty Prime Slots</h3>
				<p>6pm Tuesday sits empty while you have a waitlist. Nobody connected the dots.</p>
			</div>
		</div>
		<p class="problem-insight">
			The problem isn't scheduling&mdash;it's that scheduling demands attention.
		</p>
	</div>
</section>

<style>
	.problem {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 72rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-xl);
		color: var(--color-fg-primary);
	}

	.problem-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
		gap: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	.problem-card {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		text-align: center;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.problem-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.problem-emoji {
		font-size: 2.5rem;
		display: block;
		margin-bottom: var(--space-sm);
	}

	.problem-card h3 {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-primary);
	}

	.problem-card p {
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.problem-insight {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-tertiary);
		font-style: italic;
		margin: 0;
	}
</style>
