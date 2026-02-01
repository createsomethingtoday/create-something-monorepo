<script lang="ts">
	/**
	 * Homepage - Automotive EV Template
	 *
	 * Combines all sections:
	 * - Hero with headline and CTA
	 * - Product showcase with specs
	 * - Smart features gallery
	 * - Brand values
	 * - Community CTA
	 * - Footer with watermark
	 */

	import { siteConfig, getVehicleBySlug, type ModelLine } from '$lib/config/site';
	import {
		Navigation,
		HeroSection,
		ProductShowcase,
		FeatureGallery,
		ValuesGrid,
		CommunitySection,
		Footer
	} from '$lib/components';

	// Get featured vehicle for showcase
	const featuredVehicle = getVehicleBySlug(siteConfig.productShowcase.featuredVehicle);

	// Active filter for product showcase
	let activeFilter = $state<ModelLine | 'all'>('all');

	// Get unique model lines from vehicles
	const modelLines = [
		...new Set(siteConfig.vehicles.map((v) => v.modelLine))
	] as ModelLine[];
</script>

<svelte:head>
	<title>{siteConfig.brand.name} - {siteConfig.brand.tagline}</title>
	<meta name="description" content={siteConfig.brand.description} />
</svelte:head>

<!-- Navigation (overlays hero) -->
<Navigation brandName={siteConfig.brand.name} navLinks={siteConfig.navLinks} />

<!-- Hero Section -->
<HeroSection
	headline={siteConfig.hero.headline}
	subheadline={siteConfig.hero.subheadline}
	ctaText={siteConfig.hero.ctaText}
	ctaHref={siteConfig.hero.ctaHref}
	backgroundImage={siteConfig.hero.backgroundImage}
/>

<!-- Product Showcase -->
{#if featuredVehicle}
	<ProductShowcase
		headline={siteConfig.productShowcase.headline}
		subheadline={siteConfig.productShowcase.subheadline}
		vehicle={featuredVehicle}
		{modelLines}
		modelLineLabels={siteConfig.modelLineLabels}
		{activeFilter}
		onFilterChange={(filter) => (activeFilter = filter)}
	/>
{/if}

<!-- Smart Features / AI Experience -->
<FeatureGallery
	badge={siteConfig.smartFeatures.badge}
	headline={siteConfig.smartFeatures.headline}
	mainFeature={siteConfig.smartFeatures.mainFeature}
	subFeatures={siteConfig.smartFeatures.subFeatures}
	description={siteConfig.smartFeatures.description}
/>

<!-- Brand Values -->
<ValuesGrid headline={siteConfig.values.headline} values={siteConfig.values.items} />

<!-- Community CTA -->
<CommunitySection
	headline={siteConfig.community.headline}
	description={siteConfig.community.description}
	ctaText={siteConfig.community.ctaText}
	ctaHref={siteConfig.community.ctaHref}
/>

<!-- Footer -->
<Footer
	brandName={siteConfig.brand.name}
	sections={siteConfig.footer.sections}
	social={siteConfig.footer.social}
	copyright={siteConfig.footer.copyright}
	watermark={siteConfig.footer.watermark}
/>
