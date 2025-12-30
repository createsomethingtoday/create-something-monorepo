<script lang="ts">
	// Value Grid Section
	// The three core capabilities that make CLEARWAY work
	// Icons: Lucide (Clock, MessageSquare, Users)
</script>

<section class="value">
	<div class="container">
		<h2 class="section-title">How It Works</h2>
		<div class="value-grid">
			<div class="value-card">
				<div class="value-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<circle cx="12" cy="12" r="10"/>
						<polyline points="12 6 12 12 16 14"/>
					</svg>
				</div>
				<h3>Real-time State</h3>
				<p>
					Every court, every slot, every second. Durable Objects guarantee consistency&mdash;no
					double bookings, ever.
				</p>
			</div>

			<div class="value-card">
				<div class="value-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
					</svg>
				</div>
				<h3>Text to Book</h3>
				<p>
					"Reserve court 3 at 6pm tomorrow." AI understands natural language.
					No app needed&mdash;just SMS.
				</p>
			</div>

			<div class="value-card">
				<div class="value-icon">
					<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
						<circle cx="9" cy="7" r="4"/>
						<path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
						<path d="M16 3.13a4 4 0 0 1 0 7.75"/>
					</svg>
				</div>
				<h3>Smart Waitlist</h3>
				<p>
					Cancellations auto-fill. The right member gets notified. Opt-in members
					book instantly.
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	.value {
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

	.value-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
		gap: var(--space-md);
	}

	.value-card {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.value-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.value-icon {
		width: 2.5rem;
		height: 2.5rem;
		margin-bottom: var(--space-sm);
		color: var(--color-fg-secondary);
	}

	.value-icon svg {
		width: 100%;
		height: 100%;
	}

	.value-card h3 {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-primary);
	}

	.value-card p {
		font-size: var(--text-body);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: 0;
	}
</style>
