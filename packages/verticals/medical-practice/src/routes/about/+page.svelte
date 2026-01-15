<script lang="ts">
	import { siteConfig } from '$lib/config/site';
</script>

<svelte:head>
	<title>About | {siteConfig.name}</title>
</svelte:head>

<div class="max-w-[1200px] mx-auto px-6 py-24">
	<h1 class="text-5xl text-primary mb-8">About {siteConfig.name}</h1>
	<p class="text-lg text-tufte-gray max-w-2xl italic font-serif leading-relaxed">
		{siteConfig.hero.subheadline}
	</p>
</div>
