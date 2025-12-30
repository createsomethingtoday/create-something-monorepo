<script lang="ts">
	// Problem Section
	// The pain points that CLEARWAY solves
	// Icons: Lucide (Phone, X, Clock)
</script>

<section class="problem">
	<div class="container">
		<h2 class="section-title">The Real Problem</h2>
		<div class="problem-grid">
			<div class="problem-card">
				<div class="problem-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
					</svg>
				</div>
				<h3>Phone Tag</h3>
				<p>Staff spend hours managing calls. Members wait on hold. Everyone loses.</p>
			</div>
			<div class="problem-card">
				<div class="problem-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 6 6 18"/>
						<path d="m6 6 12 12"/>
					</svg>
				</div>
				<h3>Double Bookings</h3>
				<p>The spreadsheet said it was free. It wasn't. Now two members are upset.</p>
			</div>
			<div class="problem-card">
				<div class="problem-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12 6 12 12 16 14"/>
					</svg>
				</div>
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

	.problem-icon {
		width: 3rem;
		height: 3rem;
		margin: 0 auto var(--space-sm);
		color: var(--color-fg-tertiary);
	}

	.problem-icon svg {
		width: 100%;
		height: 100%;
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
