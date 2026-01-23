<script lang="ts">
	import { SEO } from '@create-something/components';
	import { siteConfig } from '$lib/config/site';
</script>

<SEO
	title="About"
	description="Learn about our medical practice and our commitment to your health."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'About', url: '/about' }
	]}
/>

<div class="max-w-[1200px] mx-auto px-6 py-24">
	<h1 class="text-5xl text-primary mb-8">About {siteConfig.name}</h1>
	<p class="text-lg text-tufte-gray max-w-2xl italic font-serif leading-relaxed">
		{siteConfig.hero.subheadline}
	</p>
</div>
