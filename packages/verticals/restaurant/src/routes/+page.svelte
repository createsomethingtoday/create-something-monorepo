<script lang="ts">
	/**
	 * Bold Flavors Restaurant - Avant-Garde Design
	 *
	 * Dark theme with teal (#215453) primary and gold (#E9C46A) accent
	 * Split-screen hero, menu highlights, immersive ambiance section
	 * Epilogue typography for bold editorial feel
	 */

	import { SEO } from '@create-something/canon';
	import { siteConfig } from '$lib/config/site';

	// Get current year for footer
	const currentYear = new Date().getFullYear();
</script>

<SEO
	title={siteConfig.tagline}
	description={siteConfig.description}
	propertyName="agency"
	breadcrumbs={[{ name: 'Home', url: '/' }]}
/>

<!-- Sticky Minimalist Nav -->
<nav class="fixed top-0 w-full z-50 border-b border-white/10 bg-background-dark/80 backdrop-blur-md">
	<div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<span class="material-symbols-outlined text-accent text-3xl">flare</span>
			<span class="text-xl font-black tracking-tighter uppercase">
				{siteConfig.name.split(' ')[0]}
				<span class="text-accent">{siteConfig.name.split(' ').slice(1).join(' ')}</span>
			</span>
		</div>
		<div class="hidden md:flex items-center gap-12">
			<a
				href="/menu"
				class="text-sm font-medium tracking-widest uppercase hover:text-accent transition-colors"
			>
				Menu
			</a>
			<a
				href="/about"
				class="text-sm font-medium tracking-widest uppercase hover:text-accent transition-colors"
			>
				Experience
			</a>
			<a
				href="/contact"
				class="text-sm font-medium tracking-widest uppercase hover:text-accent transition-colors"
			>
				Private
			</a>
			<a
				href="/reservations"
				class="text-sm font-medium tracking-widest uppercase hover:text-accent transition-colors"
			>
				Reservations
			</a>
		</div>
		<a
			href="/reservations"
			class="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-[0.2em] transition-all"
		>
			Book a Table
		</a>
	</div>
</nav>

<main>
	<!-- Hero Split-Section -->
	<section class="min-h-screen flex flex-col md:flex-row pt-20">
		<div class="w-full md:w-1/2 flex flex-col justify-center px-10 md:px-24 py-20 bg-background-dark">
			<div class="max-w-xl">
				<span class="text-accent text-sm font-bold tracking-[0.4em] uppercase mb-6 block">
					{siteConfig.hero.badge}
				</span>
				<h1
					class="text-6xl md:text-8xl font-black leading-[0.9] tracking-tighter mb-8 text-white"
				>
					{siteConfig.hero.headline[0]}<br />
					<span class="text-outline">{siteConfig.hero.headline[1]}</span>
				</h1>
				<p class="text-white/60 text-lg md:text-xl font-light leading-relaxed mb-10 max-w-md">
					{siteConfig.hero.subtext}
				</p>
				<div class="flex items-center gap-6">
					<a
						href="/menu"
						class="bg-white text-background-dark px-10 py-5 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-accent transition-all"
					>
						View Menu
					</a>
					<a
						href="/about"
						class="flex items-center gap-2 group text-sm font-bold uppercase tracking-widest"
					>
						Our Story
						<span
							class="material-symbols-outlined group-hover:translate-x-1 transition-transform"
						>
							arrow_forward
						</span>
					</a>
				</div>
			</div>
		</div>
		<div class="w-full md:w-1/2 h-[60vh] md:h-auto relative overflow-hidden">
			<div
				class="absolute inset-0 bg-gradient-to-r from-background-dark to-transparent z-10 md:block hidden"
			></div>
			<div
				class="w-full h-full bg-center bg-no-repeat bg-cover grayscale hover:grayscale-0 transition-all duration-700"
				style="background-image: url('{siteConfig.hero.image}');"
			></div>
		</div>
	</section>

	<!-- Menu Highlight Section -->
	<section class="py-32 px-6 max-w-7xl mx-auto">
		<div class="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
			<div class="max-w-2xl">
				<h2 class="text-4xl md:text-6xl font-black tracking-tight mb-6">Chef's Choice</h2>
				<p class="text-white/50 text-lg">
					Curated selections highlighting the finest seasonal ingredients, smoke-infused
					techniques, and artistic plating.
				</p>
			</div>
			<div class="flex gap-4">
				<button
					class="size-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all"
				>
					<span class="material-symbols-outlined">west</span>
				</button>
				<button
					class="size-12 rounded-full border border-white/20 flex items-center justify-center hover:bg-white hover:text-black transition-all"
				>
					<span class="material-symbols-outlined">east</span>
				</button>
			</div>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-10">
			{#each siteConfig.chefChoice as item}
				<div class="group">
					<div
						class="aspect-[4/5] w-full overflow-hidden rounded-xl mb-6 bg-surface-dark relative"
					>
						{#if item.badge}
							<div class="absolute top-4 right-4 z-20">
								<span
									class="bg-accent text-background-dark px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest leading-none"
								>
									{item.badge}
								</span>
							</div>
						{/if}
						<div
							class="w-full h-full bg-center bg-no-repeat bg-cover group-hover:scale-110 transition-transform duration-500"
							style="background-image: url('{item.image}');"
						></div>
					</div>
					<div class="flex justify-between items-start mb-2">
						<h3 class="text-2xl font-bold">{item.name}</h3>
						<span class="text-accent font-bold">${item.price}</span>
					</div>
					<p class="text-white/40 font-light leading-relaxed">{item.description}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- The Ambiance - Asymmetric Feature -->
	<section class="py-32 bg-surface-dark/30">
		<div class="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 items-center gap-16">
			<div class="md:col-span-7 grid grid-cols-2 gap-4">
				<div class="space-y-4">
					<div
						class="h-80 rounded-xl bg-center bg-cover bg-no-repeat"
						style="background-image: url('{siteConfig.ambiance.images[0]?.src}');"
					></div>
					<div
						class="h-60 rounded-xl bg-center bg-cover bg-no-repeat"
						style="background-image: url('{siteConfig.ambiance.images[1]?.src}');"
					></div>
				</div>
				<div class="pt-12">
					<div
						class="h-[30rem] rounded-xl bg-center bg-cover bg-no-repeat"
						style="background-image: url('{siteConfig.ambiance.images[2]?.src}');"
					></div>
				</div>
			</div>
			<div class="md:col-span-5">
				<span class="text-accent text-sm font-bold tracking-[0.4em] uppercase mb-4 block">
					Immersive Experience
				</span>
				<h2 class="text-5xl font-black mb-8 leading-tight">{siteConfig.ambiance.headline}</h2>
				<p class="text-white/60 text-lg mb-8 leading-relaxed">
					{siteConfig.ambiance.description}
				</p>
				<ul class="space-y-6 mb-10">
					{#each siteConfig.ambiance.features as feature}
						<li class="flex items-center gap-4">
							<span class="material-symbols-outlined text-accent">{feature.icon}</span>
							<span class="font-medium tracking-wide">{feature.text}</span>
						</li>
					{/each}
				</ul>
				<a
					href="/about"
					class="border border-white/20 hover:border-accent hover:text-accent px-10 py-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all inline-block"
				>
					Tour the Space
				</a>
			</div>
		</div>
	</section>

	<!-- Reservation CTA Block -->
	<section class="py-40 text-center px-6 bg-primary/10">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-5xl md:text-7xl font-black tracking-tighter mb-8 uppercase italic">
				{siteConfig.reservations.headline}
			</h2>
			<p class="text-white/60 text-xl mb-12 max-w-lg mx-auto leading-relaxed">
				{siteConfig.reservations.subtext}
			</p>
			<div class="flex flex-col md:flex-row items-center justify-center gap-4">
				<a
					href="/reservations"
					class="w-full md:w-auto bg-primary text-white px-12 py-6 rounded-lg text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl shadow-primary/40"
				>
					Make a Reservation
				</a>
				<a
					href="/contact"
					class="w-full md:w-auto bg-white/5 text-white border border-white/10 px-12 py-6 rounded-lg text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all"
				>
					Contact Events
				</a>
			</div>
		</div>
	</section>
</main>

<!-- Typographic Footer -->
<footer class="bg-background-dark border-t border-white/5 pt-24 pb-12 px-6">
	<div class="max-w-7xl mx-auto">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-20 mb-24">
			<div class="md:col-span-2">
				<h4 class="text-accent text-xs font-bold uppercase tracking-[0.4em] mb-10">Location</h4>
				<address
					class="not-italic text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none"
				>
					{siteConfig.address.street}<br />
					{siteConfig.address.district}<br />
					<span class="text-white/20">{siteConfig.address.city}</span>
				</address>
			</div>
			<div>
				<h4 class="text-accent text-xs font-bold uppercase tracking-[0.4em] mb-10">Hours</h4>
				<div class="space-y-4 text-lg font-medium">
					{#each siteConfig.hours as entry, i}
						{@const isNotLast = i < siteConfig.hours.length - 1}
						<div class="flex justify-between pb-2 {isNotLast ? 'border-b border-white/10' : ''}">
							<span>{entry.days}</span>
							<span class="text-white/40">{entry.hours}</span>
						</div>
					{/each}
				</div>
			</div>
			<div>
				<h4 class="text-accent text-xs font-bold uppercase tracking-[0.4em] mb-10">Follow</h4>
				<div class="flex flex-col gap-4 text-lg font-medium">
					{#each Object.entries(siteConfig.social).filter(([_, url]) => url) as [name, url]}
						<a href={url} class="hover:text-accent transition-colors">{name.charAt(0).toUpperCase() + name.slice(1)}</a>
					{/each}
				</div>
			</div>
		</div>
		<div
			class="flex flex-col md:flex-row justify-between items-center gap-8 pt-12 border-t border-white/5 text-xs font-bold uppercase tracking-widest text-white/20"
		>
			<p>© {currentYear} {siteConfig.footer.copyright}.</p>
			<div class="flex gap-10">
				{#each siteConfig.footer.links as link}
					<a href={link.href} class="hover:text-white transition-colors">{link.label}</a>
				{/each}
			</div>
		</div>
	</div>
</footer>
