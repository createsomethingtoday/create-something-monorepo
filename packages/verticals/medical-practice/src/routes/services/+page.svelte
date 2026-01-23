<script lang="ts">
	import { SEO } from '@create-something/components';
	import { siteConfig } from '$lib/config/site';
</script>

<SEO
	title="Services"
	description="Our medical capabilities and services for your healthcare needs."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Services', url: '/services' }
	]}
/>

<div class="max-w-[1200px] mx-auto px-6 py-24">
	<h1 class="text-5xl text-primary mb-4">Our Capabilities</h1>
	<p class="text-sm text-tufte-gray leading-relaxed mb-12 max-w-2xl">
		We've organized our practice around four primary needs, ensuring a seamless bridge between
		acute care and long-term health.
	</p>
	
	<div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-primary/10 border border-primary/10">
		{#each siteConfig.capabilities as capability}
			<div class="bg-background-light p-8">
				<span class="material-symbols-outlined text-accent text-2xl mb-4">{capability.icon}</span>
				<h3 class="font-bold text-lg mb-2">{capability.name}</h3>
				<p class="text-[13px] text-tufte-gray mb-6">{capability.description}</p>
				{#if capability.metric}
					<div class="flex items-center gap-2">
						<span class="text-xl font-serif italic">{capability.metric}</span>
						<span class="text-[10px] text-tufte-gray">{capability.metricLabel}</span>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>
