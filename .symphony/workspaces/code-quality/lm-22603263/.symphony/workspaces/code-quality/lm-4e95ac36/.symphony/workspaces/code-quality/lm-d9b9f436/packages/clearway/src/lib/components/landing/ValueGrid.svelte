<script lang="ts">
	// Value Grid Section - "How Invisibility Works"
	// Four principles that enable tool recession
	// Philosophy over features
</script>

<section class="value">
	<div class="container">
		<h2 class="section-title">How Invisibility Works</h2>
		<p class="section-subtitle">
			Four principles that make scheduling disappear.
		</p>

		<div class="value-grid">
			<div class="value-card">
				<div class="value-number">01</div>
				<h3>Anticipation</h3>
				<p class="value-principle">We suggest before you search.</p>
				<p class="value-detail">
					CLEARWAY knows Tuesday 6pm is your time. When you open the app,
					your court is already suggested.
				</p>
			</div>

			<div class="value-card">
				<div class="value-number">02</div>
				<h3>Elimination</h3>
				<p class="value-principle">We remove steps, not hide them.</p>
				<p class="value-detail">
					Most software hides complexity behind menus.
					We delete it entirely. Fewer decisions means less friction.
				</p>
			</div>

			<div class="value-card">
				<div class="value-number">03</div>
				<h3>Adaptation</h3>
				<p class="value-principle">We learn your patterns silently.</p>
				<p class="value-detail">
					Who you play with, when you play, which courts you prefer.
					CLEARWAY remembers so you don't have to.
				</p>
			</div>

			<div class="value-card">
				<div class="value-number">04</div>
				<h3>Recession</h3>
				<p class="value-principle">We disappear when we work.</p>
				<p class="value-detail">
					The goal isn't a better booking system.
					It's no system at all&mdash;just courts that are ready when you are.
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
		margin: 0 0 var(--space-sm);
		color: var(--color-fg-primary);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		text-align: center;
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-xl);
	}

	.value-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
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

	.value-number {
		font-size: var(--text-body-sm);
		font-weight: 600;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
		font-variant-numeric: tabular-nums;
	}

	.value-card h3 {
		font-size: var(--text-h3);
		font-weight: 600;
		margin: 0 0 var(--space-xs);
		color: var(--color-fg-primary);
	}

	.value-principle {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		margin: 0 0 var(--space-sm);
		font-style: italic;
	}

	.value-detail {
		font-size: var(--text-body-sm);
		line-height: 1.6;
		color: var(--color-fg-tertiary);
		margin: 0;
	}
</style>
