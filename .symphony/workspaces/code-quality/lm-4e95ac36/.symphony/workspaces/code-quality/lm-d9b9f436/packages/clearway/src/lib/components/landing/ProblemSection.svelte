<script lang="ts">
	// Problem Section - "The Broken Promise"
	// A narrative that exposes the friction in traditional scheduling
	// Transforms from Vorhandenheit (visible, demanding) to invitation for Zuhandenheit
</script>

<section class="problem">
	<div class="container">
		<h2 class="section-title">The Broken Promise</h2>

		<div class="narrative">
			<p class="narrative-lead">
				Every scheduling system promises to save time.
			</p>

			<p class="narrative-body">
				But watch what happens:
			</p>

			<div class="journey">
				<p class="journey-setup">
					A member wants to play pickleball tomorrow at 6pm.
				</p>

				<ol class="journey-steps">
					<li>Open the app</li>
					<li>Find the calendar</li>
					<li>Navigate to tomorrow</li>
					<li>Check 6pm&mdash;<span class="strike">taken</span></li>
					<li>Check 7pm&mdash;available</li>
					<li>But wait, they need a partner</li>
					<li>Back out to member directory</li>
					<li>Search for available players</li>
					<li>Message a friend</li>
					<li>Wait for response</li>
					<li>Return to calendar</li>
					<li>Is 7pm still available?</li>
					<li>Book the slot</li>
					<li>Confirmation email</li>
					<li>Done.</li>
				</ol>

				<p class="journey-verdict">
					<span class="stat">Fifteen steps.</span>
					<span class="stat">Four minutes.</span>
				</p>
			</div>

			<p class="narrative-insight">
				The "time-saving" system just created four minutes of friction.
			</p>

			<div class="reframe">
				<p class="reframe-explanation">
					<strong>This is what we mean by visible scheduling.</strong><br />
					You see every step. You feel every click. The infrastructure announces itself constantly.
				</p>

				<p class="reframe-question">
					What if booking a court felt like walking through an open door?
				</p>
			</div>
		</div>
	</div>
</section>

<style>
	.problem {
		padding: var(--space-2xl) var(--space-md);
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		text-align: center;
		margin: 0 0 var(--space-xl);
		color: var(--color-fg-primary);
	}

	.narrative {
		text-align: center;
	}

	.narrative-lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
	}

	.narrative-body {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-lg);
	}

	.journey {
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		margin: 0 0 var(--space-lg);
		text-align: left;
	}

	.journey-setup {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
		font-style: italic;
	}

	.journey-steps {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.journey-steps li {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		padding-left: var(--space-md);
		position: relative;
	}

	.journey-steps li::before {
		content: counter(list-item) ".";
		position: absolute;
		left: 0;
		color: var(--color-fg-subtle);
		font-variant-numeric: tabular-nums;
	}

	.strike {
		text-decoration: line-through;
		color: var(--color-error);
	}

	.journey-verdict {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		margin: 0;
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.stat {
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.narrative-insight {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		font-style: italic;
		margin: 0 0 var(--space-xl);
	}

	.reframe {
		padding: var(--space-lg);
		border-left: 2px solid var(--color-border-emphasis);
		text-align: left;
	}

	.reframe-explanation {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-md);
		line-height: 1.7;
	}

	.reframe-explanation strong {
		color: var(--color-fg-primary);
	}

	.reframe-question {
		font-size: var(--text-h3);
		color: var(--color-fg-primary);
		margin: 0;
		font-weight: 500;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.journey-steps li {
			transition: none;
		}
	}
</style>
