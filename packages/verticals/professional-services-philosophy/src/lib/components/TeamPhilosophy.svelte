<script lang="ts">
	/**
	 * Team Philosophy
	 *
	 * Team grid with philosophy statements (not just bios).
	 * Demonstrates "Partnership over automation" principle.
	 *
	 * Image Treatment:
	 * - Circular (border-radius: --radius-full)
	 * - Grayscale (filter: grayscale(100%))
	 * - Border (--color-border-emphasis)
	 *
	 * Content: Not just job titles—philosophical stance
	 */

	export interface TeamMember {
		name: string;
		role: string;
		philosophy: string;
		image: string;
		linkedin?: string;
	}

	interface Props {
		team?: TeamMember[];
		headline?: string;
	}

	let {
		headline = 'Practitioners',
		team = [
			{
				name: 'Principal Name',
				role: 'Founding Partner',
				philosophy:
					"Partnership over automation. Claude Code serves judgment, doesn't replace it.",
				image: '/headshot-architect.jpg',
				linkedin: 'https://linkedin.com/in/example'
			},
			{
				name: 'Technical Lead',
				role: 'Partner',
				philosophy:
					'Tools recede when chosen correctly. Architecture emerges from domain understanding.',
				image: '/headshot-architect.jpg'
			},
			{
				name: 'Systems Architect',
				role: 'Partner',
				philosophy:
					'Dwelling over enframing. Build systems that serve human judgment, not replace it.',
				image: '/headshot-architect.jpg',
				linkedin: 'https://linkedin.com/in/example'
			}
		]
	}: Props = $props();
</script>

<section class="team-philosophy-section">
	<div class="team-container">
		<div class="section-header">
			<h2 class="section-title">{headline}</h2>
		</div>

		<div class="team-grid">
			{#each team as member}
				<div class="team-member">
					<div class="member-image-wrapper">
						<img src={member.image} alt={member.name} class="member-image" />
					</div>

					<h3 class="member-name">{member.name}</h3>
					<p class="member-role">{member.role}</p>
					<p class="member-philosophy">{member.philosophy}</p>

					{#if member.linkedin}
						<a href={member.linkedin} class="member-link" target="_blank" rel="noopener noreferrer">
							LinkedIn →
						</a>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	/*
	 * Team Philosophy Layout
	 * Philosophy statements, not just bios. "Partnership over automation."
	 */

	.team-philosophy-section {
		padding: var(--space-3xl) 0;
		background: var(--color-bg-pure);
	}

	.team-container {
		max-width: 90rem;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	.section-header {
		margin-bottom: var(--space-2xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-fg-primary);
	}

	/*
	 * Team Grid - Responsive 3-column
	 */

	.team-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-xl);
	}

	@media (min-width: 640px) {
		.team-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.team-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/*
	 * Team Member Card
	 */

	.team-member {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: var(--space-sm);
	}

	/*
	 * Member Image - Circular, Grayscale, Canon Border
	 */

	.member-image-wrapper {
		width: var(--width-avatar);
		height: var(--width-avatar);
		margin-bottom: var(--space-sm);
	}

	.member-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-full); /* Circular */
		filter: grayscale(100%); /* Monochrome constraint */
		border: 1px solid var(--color-border-emphasis);
		transition: filter var(--duration-micro) var(--ease-standard);
	}

	.team-member:hover .member-image {
		filter: grayscale(0%); /* Reveal color on hover */
	}

	/*
	 * Member Info
	 */

	.member-name {
		font-size: var(--text-h3);
		font-weight: 600;
		line-height: 1.3;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.member-role {
		font-size: var(--text-body);
		font-weight: 500;
		line-height: 1.4;
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	.member-philosophy {
		font-size: var(--text-body-sm);
		font-weight: 400;
		line-height: 1.6;
		color: var(--color-fg-secondary);
		margin: var(--space-sm) 0 0;
		font-style: italic; /* Subtle emphasis for philosophy statement */
	}

	/*
	 * LinkedIn Link
	 */

	.member-link {
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-info); /* Semantic: link */
		text-decoration: none;
		margin-top: var(--space-sm);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.member-link:hover {
		color: var(--color-fg-primary);
		text-decoration: underline;
	}

	.member-link:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}

	/*
	 * Reduced Motion Support
	 */

	@media (prefers-reduced-motion: reduce) {
		.member-image,
		.member-link {
			transition: none;
		}
	}
</style>
