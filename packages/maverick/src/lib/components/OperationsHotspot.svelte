<script lang="ts">
	/**
	 * OperationsHotspot Component
	 * Interactive illustration with expandable pill buttons
	 * Maverick X Design System
	 */

	import { inview } from '$lib/actions/inview';

	interface Hotspot {
		id: string;
		title: string;
		description: string;
		icon: string;
		position: { top: string; left: string };
	}

	interface Props {
		headline?: string;
		hotspots: Hotspot[];
		imageUrl: string;
		mobileImageUrl?: string;
	}

	let { headline, hotspots, imageUrl, mobileImageUrl }: Props = $props();

	let visible = $state(false);
	let activeHotspot = $state<string | null>(null);
	let mobileSelectedHotspot = $state<Hotspot | null>(null);

	function toggleHotspot(id: string) {
		if (activeHotspot === id) {
			activeHotspot = null;
		} else {
			activeHotspot = id;
		}
	}

	function selectMobileHotspot(hotspot: Hotspot) {
		if (mobileSelectedHotspot?.id === hotspot.id) {
			mobileSelectedHotspot = null;
		} else {
			mobileSelectedHotspot = hotspot;
		}
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.pill-button') && !target.closest('.mobile-card')) {
			activeHotspot = null;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<section
	use:inview
	oninview={() => (visible = true)}
	class="operations-section"
>
	{#if headline}
		<div class="container">
			<h2
				class="operations-heading scroll-reveal"
				class:scroll-reveal-hidden={!visible}
			>
				{headline}
			</h2>
		</div>
	{/if}

	<!-- Desktop Version -->
	<div class="desktop-operations">
		<div
			class="illustration-wrapper scroll-reveal"
			class:scroll-reveal-hidden={!visible}
		>
			<div class="illustration-container">
				<img
					src={imageUrl}
					alt="Operations illustration"
					class="base-image"
				/>

				{#each hotspots as hotspot}
					<div
						class="hotspot"
						style="top: {hotspot.position.top}; left: {hotspot.position.left};"
					>
						<button
							class="pill-button"
							class:expanded={activeHotspot === hotspot.id}
							onclick={(e) => {
								e.stopPropagation();
								toggleHotspot(hotspot.id);
							}}
							aria-expanded={activeHotspot === hotspot.id}
						>
							<img
								src={hotspot.icon}
								alt=""
								class="hotspot-icon"
							/>
							<span class="button-text">{hotspot.title}</span>
							<span class="plus-icon">+</span>

							<div class="expanded-content">
								<div class="desktop-card-layout">
									<div class="desktop-icon-column">
										<img
											src={hotspot.icon}
											alt=""
											class="expanded-icon"
										/>
									</div>
									<div class="desktop-text-column">
										<h4 class="expanded-title">{hotspot.title}</h4>
										<p class="description">{hotspot.description}</p>
									</div>
								</div>
							</div>
						</button>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Mobile Version -->
	<div class="mobile-operations">
		<div
			class="illustration-wrapper scroll-reveal"
			class:scroll-reveal-hidden={!visible}
		>
			<div class="illustration-container">
				<img
					src={mobileImageUrl || imageUrl}
					alt="Operations illustration"
					class="base-image"
				/>

				{#each hotspots as hotspot}
					<div
						class="hotspot"
						style="top: {hotspot.position.top}; left: {hotspot.position.left};"
					>
						<button
							class="pill-button"
							class:active={mobileSelectedHotspot?.id === hotspot.id}
							onclick={(e) => {
								e.stopPropagation();
								selectMobileHotspot(hotspot);
							}}
							aria-expanded={mobileSelectedHotspot?.id === hotspot.id}
						>
							<img
								src={hotspot.icon}
								alt=""
								class="mobile-icon"
							/>
							<span class="plus-icon">+</span>
						</button>
					</div>
				{/each}
			</div>
		</div>

		<!-- Mobile Card (appears below image) -->
		{#if mobileSelectedHotspot}
			<div
				class="mobile-card scroll-reveal"
				class:scroll-reveal-hidden={false}
			>
				<div class="card-content">
					<div class="card-header">
						<div class="card-icon-column">
							<img
								src={mobileSelectedHotspot.icon}
								alt=""
								class="card-icon"
							/>
						</div>
						<div class="card-text-column">
							<h4 class="card-title">{mobileSelectedHotspot.title}</h4>
							<p class="card-description">{mobileSelectedHotspot.description}</p>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.operations-section {
		padding: 6.875rem 0;
		background: #ffffff;
	}

	.operations-heading {
		font-family: 'Inter Tight', 'Inter', system-ui, sans-serif;
		font-size: 2.5rem;
		font-weight: 700;
		text-align: center;
		margin-bottom: 4rem;
		color: #000;
		line-height: 1.2;
	}

	/* Desktop/Mobile toggle */
	.desktop-operations {
		display: block;
	}

	.mobile-operations {
		display: none;
	}

	.illustration-wrapper {
		width: 100%;
		max-width: none;
		margin: 0;
		padding-left: 2.5rem;
		padding-right: 2.5rem;
		box-sizing: border-box;
	}

	.illustration-container {
		position: relative;
		width: 100%;
	}

	.base-image {
		width: 100%;
		height: auto;
		display: block;
		image-rendering: -webkit-optimize-contrast;
		image-rendering: crisp-edges;
	}

	.hotspot {
		position: absolute;
		z-index: 10;
	}

	/* Desktop pill-shaped button */
	.pill-button {
		display: flex;
		align-items: center;
		gap: 8px;
		background: rgba(255, 255, 255, 0.95);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 20px;
		padding: 10px 19px 10px 14px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.05s ease;
		cursor: pointer;
		white-space: nowrap;
		min-height: 43px;
		max-width: 240px;
		position: relative;
		overflow: hidden;
		-webkit-font-smoothing: antialiased;
		transform: translateZ(0);
		will-change: transform;
	}

	.pill-button:hover {
		transform: translateY(-2px) translateZ(0);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
		background: rgba(255, 255, 255, 1);
	}

	.pill-button.expanded {
		white-space: normal;
		max-width: 380px;
		min-height: auto;
		padding: 16px 20px;
		align-items: flex-start;
		gap: 16px;
		transform: translateZ(0);
		z-index: 100;
		position: relative;
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
		background: rgba(255, 255, 255, 1);
	}

	.pill-button.expanded .hotspot-icon {
		display: none;
	}

	.pill-button.expanded .description {
		font-size: 14px;
	}

	.expanded-content {
		display: none;
		width: 100%;
		flex: 1;
	}

	.pill-button.expanded .expanded-content {
		display: block;
	}

	.pill-button.expanded .button-text,
	.pill-button.expanded .plus-icon {
		display: none;
	}

	.desktop-card-layout {
		display: flex;
		gap: 16px;
		align-items: center;
		width: 100%;
	}

	.desktop-icon-column {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-shrink: 0;
		width: 64px;
		min-height: 64px;
	}

	.desktop-text-column {
		flex: 1;
		text-align: left;
	}

	.expanded-icon {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		object-fit: cover;
		object-position: center;
	}

	.expanded-title {
		font-size: 13px;
		font-weight: 700;
		color: #dd6b2b;
		margin: 0 0 8px 0;
		letter-spacing: 0.5px;
		line-height: 1.2;
		text-transform: uppercase;
	}

	.description {
		font-size: 11px;
		color: #666;
		line-height: 1.4;
		display: block;
		margin-top: 0;
	}

	.hotspot-icon {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		border-radius: 50%;
		object-fit: cover;
		object-position: center;
	}

	.button-text {
		font-size: 12px;
		font-weight: 700;
		color: #333;
		letter-spacing: 0.5px;
		flex: 1;
		display: flex;
		align-items: center;
		text-transform: uppercase;
		line-height: 1;
	}

	.plus-icon {
		font-size: 16px;
		font-weight: bold;
		color: #dd6b2b;
		margin-left: 4px;
		transition: transform 0.3s ease;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		line-height: 1;
	}

	.mobile-icon {
		display: none;
	}

	/* Desktop larger sizing */
	@media only screen and (min-width: 992px) {
		.pill-button {
			padding: 12px 22px 12px 17px;
			min-height: 48px;
			border-radius: 22px;
			max-width: 288px;
			justify-content: center;
		}

		.pill-button.expanded {
			max-width: 400px;
			padding: 20px 24px;
			gap: 18px;
			box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
		}

		.pill-button.expanded .description {
			font-size: 15px;
		}

		.hotspot-icon {
			width: 29px;
			height: 29px;
		}

		.button-text {
			font-size: 13px;
			font-weight: 700;
		}

		.plus-icon {
			font-size: 18px;
		}

		.description {
			font-size: 12px;
		}

		.expanded-title {
			font-size: 16px;
			margin: 0 0 8px 0;
		}

		.desktop-icon-column {
			width: 72px;
			min-height: 72px;
		}

		.expanded-icon {
			width: 72px;
			height: 72px;
		}

		.desktop-card-layout {
			gap: 20px;
		}
	}

	/* Tablet and Mobile */
	@media screen and (max-width: 1024px) {
		.desktop-operations {
			display: none;
		}

		.mobile-operations {
			display: block;
		}

		.operations-heading {
			font-size: 1.75rem;
			margin-bottom: 2rem;
		}

		.illustration-wrapper {
			width: 120%;
			max-width: none;
			margin: 0 auto;
			padding: 0;
			position: relative;
			left: 50%;
			transform: translateX(-50%);
		}

		.pill-button {
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(255, 255, 255, 0.95);
			border: 1px solid rgba(255, 255, 255, 0.2);
			border-radius: 50%;
			padding: 0;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
			transition: all 0.3s ease;
			cursor: pointer;
			width: 38px;
			height: 38px;
			position: relative;
			overflow: hidden;
			gap: 0;
			min-height: auto;
			max-width: none;
		}

		.pill-button:hover {
			transform: translateY(-1px) translateZ(0);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		}

		.pill-button.active {
			background: rgba(255, 255, 255, 0.95);
			transform: translateY(-1px) translateZ(0);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		}

		.pill-button.active .plus-icon {
			display: none;
		}

		.pill-button.active .mobile-icon {
			display: block !important;
		}

		.mobile-icon {
			width: 24px;
			height: 24px;
			display: none;
			border-radius: 50%;
			object-fit: cover;
			object-position: center;
		}

		.plus-icon {
			font-size: 19px;
			font-weight: bold;
			color: #ac4425;
			margin: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			transform: translateY(-1px);
		}

		.hotspot-icon,
		.button-text,
		.expanded-content {
			display: none;
		}

		.mobile-card {
			width: 100%;
			max-width: 340px;
			background: white;
			border-radius: 16px;
			box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
			margin: 16px auto;
			overflow: hidden;
			border: 1px solid rgba(0, 0, 0, 0.05);
		}

		.card-content {
			padding: 20px;
		}

		.card-header {
			display: flex;
			align-items: center;
			gap: 16px;
		}

		.card-icon-column {
			display: flex;
			justify-content: center;
			align-items: center;
			flex-shrink: 0;
			width: 64px;
			min-height: 48px;
		}

		.card-text-column {
			flex: 1;
			text-align: left;
		}

		.card-icon {
			width: 58px;
			height: 58px;
			flex-shrink: 0;
			border-radius: 50%;
			object-fit: cover;
			object-position: center;
		}

		.card-title {
			font-size: 16px;
			font-weight: 700;
			color: #dd6b2b;
			margin: 0;
			letter-spacing: 0.5px;
			line-height: 1.1;
			text-transform: uppercase;
		}

		.card-description {
			font-size: 14px;
			color: #666;
			line-height: 1.4;
			margin: 8px 0 0 0;
		}
	}

	@media screen and (max-width: 768px) {
		.operations-section {
			padding: 4rem 0;
		}

		.operations-heading {
			font-size: 1.5rem;
			margin-bottom: 1.5rem;
			padding: 0 1rem;
		}
	}
</style>
