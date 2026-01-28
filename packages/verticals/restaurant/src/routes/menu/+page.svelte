<script lang="ts">
	/**
	 * Menu Page - Bold Flavors Restaurant
	 *
	 * Showcases chef's choice and full menu in bold editorial style.
	 */

	import { SEO } from '@create-something/canon';
	import { siteConfig } from '$lib/config/site';
</script>

<SEO
	title="Menu"
	description="Explore our seasonal menu featuring artisan dishes and bold flavors."
	propertyName="agency"
	breadcrumbs={[
		{ name: 'Home', url: '/' },
		{ name: 'Menu', url: '/menu' }
	]}
/>

<!-- Nav -->
<nav class="fixed top-0 w-full z-50 border-b border-white/10 bg-background-dark/80 backdrop-blur-md">
	<div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
		<a href="/" class="flex items-center gap-3">
			<span class="material-symbols-outlined text-accent text-3xl">flare</span>
			<span class="text-xl font-black tracking-tighter uppercase">
				{siteConfig.name.split(' ')[0]}
				<span class="text-accent">{siteConfig.name.split(' ').slice(1).join(' ')}</span>
			</span>
		</a>
		<a
			href="/reservations"
			class="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg text-xs font-bold uppercase tracking-[0.2em] transition-all"
		>
			Book a Table
		</a>
	</div>
</nav>

<main class="bg-background-dark text-white min-h-screen pt-20">
	<!-- Page Header -->
	<section class="py-24 px-6 text-center border-b border-white/10">
		<div class="max-w-3xl mx-auto">
			<span class="text-accent text-sm font-bold tracking-[0.4em] uppercase mb-6 block">
				Culinary Excellence
			</span>
			<h1 class="text-5xl md:text-7xl font-black tracking-tight mb-6">THE MENU</h1>
			<p class="text-white/50 text-lg max-w-xl mx-auto">
				Seasonal ingredients, smoke-infused techniques, and artistic plating. Our menu evolves with
				the finest offerings each season brings.
			</p>
		</div>
	</section>

	<!-- Chef's Choice -->
	<section class="py-24 px-6 max-w-7xl mx-auto">
		<h2 class="text-3xl md:text-4xl font-black tracking-tight mb-16 text-center">Chef's Choice</h2>

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

	<!-- Menu Categories -->
	<section class="py-24 px-6 bg-surface-dark/30">
		<div class="max-w-4xl mx-auto">
			<h2 class="text-3xl md:text-4xl font-black tracking-tight mb-16 text-center">Full Menu</h2>

			<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
				{#each siteConfig.menuCategories as category}
					<a
						href="/menu/{category.slug}"
						class="p-8 bg-surface-dark border border-white/10 rounded-xl text-center hover:border-accent transition-colors group"
					>
						<h3 class="text-xl font-bold group-hover:text-accent transition-colors">
							{category.title}
						</h3>
					</a>
				{/each}
			</div>

			<p class="text-white/30 text-center mt-12 text-sm">
				Please inform your server of any dietary restrictions or allergies.
			</p>
		</div>
	</section>

	<!-- Reservation CTA -->
	<section class="py-24 text-center px-6 bg-primary/10">
		<div class="max-w-3xl mx-auto">
			<h2 class="text-4xl md:text-5xl font-black tracking-tighter mb-6 uppercase italic">
				Ready to taste?
			</h2>
			<p class="text-white/60 text-xl mb-10 max-w-lg mx-auto">
				Reserve your table and experience these bold flavors yourself.
			</p>
			<a
				href="/reservations"
				class="bg-primary text-white px-12 py-6 rounded-lg text-sm font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-2xl shadow-primary/40 inline-block"
			>
				Make a Reservation
			</a>
		</div>
	</section>
</main>

<!-- Footer -->
<footer class="bg-background-dark border-t border-white/5 py-12 px-6">
	<div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
		<a href="/" class="flex items-center gap-3">
			<span class="material-symbols-outlined text-accent text-2xl">flare</span>
			<span class="text-lg font-black tracking-tighter uppercase">
				{siteConfig.name.split(' ')[0]}
				<span class="text-accent">{siteConfig.name.split(' ').slice(1).join(' ')}</span>
			</span>
		</a>
		<div class="flex gap-10 text-xs font-bold uppercase tracking-widest text-white/20">
			{#each siteConfig.footer.links as link}
				<a href={link.href} class="hover:text-white transition-colors">{link.label}</a>
			{/each}
		</div>
	</div>
</footer>
