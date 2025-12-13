<script lang="ts">
	/**
	 * AccidentTypesSection - Grid of Accident Categories
	 *
	 * Displays accident types with icons, descriptions, and average settlements.
	 * Golden ratio layout: featured card spans 2 rows.
	 */

	import { getSiteConfigFromContext } from '$lib/config/context';
	import { Car, Truck, Bike, PersonStanding, Skull, Stethoscope, ArrowRight } from 'lucide-svelte';

	const siteConfig = getSiteConfigFromContext();

	interface Props {
		title?: string;
		description?: string;
		showAverageSettlement?: boolean;
		maxItems?: number;
	}

	let {
		title = 'Types of Cases We Handle',
		description = 'Our experienced team represents victims across all types of personal injury cases.',
		showAverageSettlement = true,
		maxItems = 6
	}: Props = $props();

	const accidentTypes = siteConfig.accidentTypes.slice(0, maxItems);

	// Icon mapping
	const iconMap: Record<string, typeof Car> = {
		'car-accident': Car,
		'truck-accident': Truck,
		'motorcycle-accident': Bike,
		'slip-and-fall': PersonStanding,
		'wrongful-death': Skull,
		'medical-malpractice': Stethoscope
	};

	function getIcon(slug: string) {
		return iconMap[slug] || Car;
	}
</script>

<section class="accident-types">
	<div class="section-header">
		<h2 class="section-title">{title}</h2>
		<p class="section-description">{description}</p>
	</div>

	<div class="types-grid">
		{#each accidentTypes as type, index}
			{@const Icon = getIcon(type.slug)}
			<a
				href="/accident-types/{type.slug}"
				class="type-card"
				class:featured={index === 0}
				class:wide={index === accidentTypes.length - 1 && accidentTypes.length === 6}
			>
				<div class="card-icon">
					<Icon size={index === 0 ? 32 : 24} />
				</div>
				<div class="card-content">
					<h3 class="card-title">{type.name}</h3>
					<p class="card-description">{type.description}</p>

					{#if showAverageSettlement && type.averageSettlement}
						<div class="settlement-range">
							<span class="settlement-label">Typical Recovery</span>
							<span class="settlement-value">{type.averageSettlement}</span>
						</div>
					{/if}

					<span class="card-link">
						<span>Learn More</span>
						<ArrowRight size={14} />
					</span>
				</div>
			</a>
		{/each}
	</div>

	<div class="section-footer">
		<a href="/accident-types" class="view-all">
			<span>View All Case Types</span>
			<ArrowRight size={16} />
		</a>
	</div>
</section>

<style>
	.accident-types {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
	}

	.section-header {
		text-align: center;
		max-width: 700px;
		margin: 0 auto var(--space-xl);
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-sm);
	}

	.section-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		margin: 0;
	}

	/* Golden Ratio Grid */
	.types-grid {
		display: grid;
		grid-template-columns: 1.618fr 1fr 1fr;
		grid-template-rows: auto auto;
		gap: var(--space-md);
		max-width: var(--container-xl);
		margin: 0 auto;
	}

	.type-card {
		display: flex;
		flex-direction: column;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		text-decoration: none;
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.type-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	/* Featured card spans 2 rows */
	.type-card.featured {
		grid-row: span 2;
		padding: var(--space-xl);
	}

	/* Wide card spans remaining columns to prevent widow */
	.type-card.wide {
		grid-column: span 3;
		flex-direction: row;
		align-items: center;
		gap: var(--space-lg);
	}

	.type-card.wide .card-icon {
		margin-bottom: 0;
	}

	.type-card.wide .card-content {
		flex-direction: row;
		align-items: center;
		gap: var(--space-lg);
	}

	.type-card.wide .card-description {
		flex: 1;
		margin-bottom: 0;
	}

	.type-card.wide .settlement-range {
		margin-bottom: 0;
		min-width: max-content;
	}

	.type-card.wide .card-link {
		margin-top: 0;
	}

	.card-icon {
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-hover);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.type-card.featured .card-icon {
		width: 64px;
		height: 64px;
	}

	.card-content {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.card-title {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 0 var(--space-xs);
	}

	.type-card:not(.featured) .card-title {
		font-size: var(--text-body-lg);
	}

	.card-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin: 0 0 var(--space-md);
		flex: 1;
	}

	.type-card.featured .card-description {
		font-size: var(--text-body);
	}

	.settlement-range {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-bg-elevated);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-md);
	}

	.settlement-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: var(--tracking-wide);
	}

	.settlement-value {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-success);
	}

	.type-card.featured .settlement-value {
		font-size: var(--text-h3);
	}

	.card-link {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		color: var(--color-fg-secondary);
		margin-top: auto;
	}

	.type-card:hover .card-link {
		color: var(--color-fg-primary);
	}

	.section-footer {
		display: flex;
		justify-content: center;
		margin-top: var(--space-xl);
	}

	.view-all {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-lg);
		background: transparent;
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		font-weight: var(--font-medium);
		text-decoration: none;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.view-all:hover {
		background: var(--color-bg-surface);
		border-color: var(--color-border-emphasis);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.types-grid {
			grid-template-columns: 1fr 1fr;
		}

		.type-card.featured,
		.type-card.wide {
			grid-column: span 2;
			grid-row: span 1;
		}
	}

	@media (max-width: 640px) {
		.accident-types {
			padding: var(--space-xl) var(--space-md);
		}

		.types-grid {
			grid-template-columns: 1fr;
		}

		.type-card.featured,
		.type-card.wide {
			grid-column: span 1;
		}
	}
</style>
