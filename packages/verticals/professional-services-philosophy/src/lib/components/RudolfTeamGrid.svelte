<script lang="ts">
	/**
	 * RudolfTeamGrid - Team section with philosophy statements
	 *
	 * Layout: Grid with hover effects
	 * Content: Philosophy statements instead of bios
	 */

	import { siteConfig } from '$lib/config/context';
</script>

<section id="team" class="section-team">
	<div class="container">
		<div class="section-header">
			<h2 class="section-heading">Team</h2>
			<p class="section-subheading">
				Partnership over automation. Philosophy in practice.
			</p>
		</div>
		<div class="team-grid">
			{#each $siteConfig.team as member}
				<div class="team-card">
					<div class="team-image-wrapper">
						<img src={member.image} alt={member.name} class="team-image" />
						<div class="team-overlay"></div>
					</div>
					<div class="team-content">
						<h3 class="team-name">{member.name}</h3>
						<p class="team-role">{member.role}</p>
						<p class="team-philosophy">{member.philosophy}</p>
						{#if member.linkedin}
							<a
								href={member.linkedin}
								target="_blank"
								rel="noopener noreferrer"
								class="team-link"
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"
									></path>
									<rect x="2" y="9" width="4" height="12"></rect>
									<circle cx="4" cy="4" r="2"></circle>
								</svg>
								<span>LinkedIn</span>
							</a>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.section-team {
		padding: var(--section-padding) 0;
		background: var(--color-bg-elevated);
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 var(--space-lg);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-4xl);
	}

	.section-heading {
		font-size: clamp(2.5rem, 5vw, 4rem);
		font-weight: 700;
		line-height: 1.2;
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-md);
		letter-spacing: -0.02em;
	}

	.section-subheading {
		font-size: var(--text-body-lg);
		line-height: 1.6;
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.team-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
		gap: var(--space-2xl);
	}

	.team-card {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.team-card:hover {
		transform: translateY(-8px);
	}

	.team-image-wrapper {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		overflow: hidden;
		background: var(--color-bg-subtle);
	}

	.team-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform var(--duration-complex) var(--ease-standard);
	}

	.team-card:hover .team-image {
		transform: scale(1.05);
	}

	.team-overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0) 0%,
			rgba(0, 0, 0, 0.3) 100%
		);
	}

	.team-content {
		padding: var(--space-xl);
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.team-name {
		font-size: var(--text-h3);
		font-weight: 700;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.team-role {
		font-size: var(--text-body);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 600;
		margin: 0;
	}

	.team-philosophy {
		font-size: var(--text-body);
		line-height: 1.7;
		color: var(--color-fg-tertiary);
		margin: var(--space-md) 0 0;
	}

	.team-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		text-decoration: none;
		margin-top: var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.team-link:hover {
		color: var(--color-fg-secondary);
	}

	@media (max-width: 768px) {
		.team-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
