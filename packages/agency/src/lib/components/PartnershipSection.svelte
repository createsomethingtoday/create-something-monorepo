<script lang="ts">
	// Partnership with Half Dozen - transparent attribution
</script>

<section class="partnership-section">
	<div class="partnership-content">
		<p class="partnership-label">In partnership with</p>
		<a
			href="https://halfdozen.co"
			target="_blank"
			rel="noopener noreferrer"
			class="partnership-link"
		>
			Half Dozen
			<svg
				class="external-icon"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
				/>
			</svg>
		</a>
		<p class="partnership-context">
			CREATE SOMETHING is the technical partner of Half Dozen, a creative studio
			co-founded by Micah Johnson and Danny Morgan.
		</p>
	</div>
</section>

<style>
	.partnership-section {
		padding: var(--space-xl) var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.partnership-content {
		max-width: 48rem;
		margin: 0 auto;
		text-align: center;
	}

	.partnership-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	.partnership-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--text-h3);
		font-weight: 600;
		color: var(--color-fg-primary);
		text-decoration: none;
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.partnership-link:hover {
		color: var(--color-fg-secondary);
	}

	.partnership-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 4px;
		border-radius: var(--radius-sm);
	}

	.external-icon {
		width: 0.75em;
		height: 0.75em;
		opacity: 0.6;
	}

	.partnership-context {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-top: var(--space-sm);
		max-width: 36rem;
		margin-left: auto;
		margin-right: auto;
	}
</style>
