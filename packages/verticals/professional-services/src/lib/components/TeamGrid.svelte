<script lang="ts">
	import { siteConfig } from '$lib/config/context';

	interface TeamMember {
		name: string;
		role: string;
		bio: string;
		image?: string;
	}

	interface Props {
		team?: TeamMember[];
	}

	// Helper to generate initials from name
	function getInitials(name: string): string {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	let { team }: Props = $props();

	// Reactive defaults from store
	const effectiveTeam = $derived(team ?? $siteConfig.team);
</script>

<section class="team-section">
	<!-- Title: 2 words, Subtitle: 8 words (Fibonacci) -->
	<div class="container">
		<div class="section-header">
			<h2 class="section-title">Our Team</h2>
			<p class="section-subtitle">Experienced partners invested in your lasting success</p>
		</div>

		<div class="team-grid stagger-children">
			{#each effectiveTeam as member}
				<div class="team-card card-interactive stagger-item">
					<div class="team-avatar">
						<span class="team-initials">{getInitials(member.name)}</span>
					</div>
					<h3 class="team-name">{member.name}</h3>
					<p class="team-role">{member.role}</p>
					<p class="team-bio">{member.bio}</p>
				</div>
			{/each}
		</div>

		<div class="team-cta">
			<a href="/team" class="cta-secondary btn-canon">Meet the Full Team</a>
		</div>
	</div>
</section>

<style>
	.team-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.container {
		max-width: var(--container-xl);
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.section-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.team-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-lg);
	}

	@media (min-width: 768px) {
		.team-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.team-card {
		text-align: center;
		padding: var(--space-lg);
	}

	.team-avatar {
		width: var(--width-avatar);
		height: var(--width-avatar);
		border-radius: var(--radius-full);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 auto var(--space-md);
	}

	.team-initials {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-tertiary);
	}

	.team-name {
		font-size: var(--text-h4);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.team-role {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-sm);
	}

	.team-bio {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.team-cta {
		text-align: center;
		margin-top: var(--space-xl);
	}
</style>
