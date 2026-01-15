<script lang="ts">
	/**
	 * Fashion Boutique - The Collection
	 *
	 * Editorial design with asymmetric product grid
	 * Light theme with sage green (#495a4c) primary
	 * Epilogue typography for high-fashion feel
	 */

	import { siteConfig } from '$lib/config/site';

	// Get current year for footer
	const currentYear = new Date().getFullYear();

	// Active category filter
	let activeCategory = $state('new');

	// Cart count (demo)
	let cartCount = $state(2);
</script>

<svelte:head>
	<title>{siteConfig.name} | {siteConfig.tagline}</title>
	<meta name="description" content={siteConfig.description} />
</svelte:head>

<!-- Top Navigation Bar -->
<header
	class="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800"
>
	<div class="max-w-[1440px] mx-auto px-6 lg:px-12 flex h-20 items-center justify-between">
		<div class="flex items-center gap-12">
			<a href="/" class="flex items-center gap-2">
				<span class="material-symbols-outlined text-primary text-3xl">{siteConfig.icon}</span>
				<h2 class="text-xl font-extrabold tracking-tighter uppercase">{siteConfig.name}</h2>
			</a>
			<nav class="hidden md:flex items-center gap-8 uppercase text-[11px] font-bold tracking-[0.2em]">
				{#each siteConfig.navLinks as link}
					<a href={link.href} class="hover:text-primary transition-colors">{link.label}</a>
				{/each}
			</nav>
		</div>
		<div class="flex items-center gap-6">
			<div class="relative hidden sm:block">
				<span
					class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-xl"
					>search</span
				>
				<input
					type="text"
					class="bg-neutral-100 dark:bg-neutral-800 border-none rounded-full py-2 pl-10 pr-4 text-sm w-48 focus:ring-1 focus:ring-primary focus:w-64 transition-all duration-300"
					placeholder="Search..."
				/>
			</div>
			<div class="flex gap-4">
				<button
					class="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
				>
					<span class="material-symbols-outlined">shopping_bag</span>
					{#if cartCount > 0}
						<span
							class="absolute top-1 right-1 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center"
						>
							{cartCount}
						</span>
					{/if}
				</button>
				<button
					class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
				>
					<span class="material-symbols-outlined">person</span>
				</button>
			</div>
		</div>
	</div>
</header>

<main class="max-w-[1440px] mx-auto px-6 lg:px-12 py-12">
	<!-- Hero Title -->
	<div class="mb-16">
		<h1
			class="text-[clamp(3rem,10vw,8rem)] font-extrabold leading-[0.85] tracking-tighter text-center uppercase break-words"
		>
			{siteConfig.hero.title[0]}<br />
			<span class="text-primary italic font-light lowercase px-4">{siteConfig.hero.accent}</span>
			{siteConfig.hero.title[1]}
		</h1>
		<div class="flex justify-center mt-6">
			<div class="h-[1px] w-24 bg-primary/30"></div>
		</div>
	</div>

	<div class="flex flex-col lg:flex-row gap-16">
		<!-- Sidebar Navigation -->
		<aside class="w-full lg:w-64 flex-shrink-0">
			<div class="sticky top-32">
				<div class="mb-12">
					<h3 class="text-xs font-bold tracking-[0.3em] uppercase mb-6 text-neutral-400">
						Filter By
					</h3>
					<nav class="flex flex-col gap-4">
						{#each siteConfig.categories as category}
							<button
								class="group flex items-center justify-between text-sm font-medium transition-colors text-left"
								class:text-primary={activeCategory === category.slug}
								onclick={() => (activeCategory = category.slug)}
							>
								<span class="hover:text-primary">{category.name}</span>
								{#if activeCategory === category.slug}
									<span class="material-symbols-outlined text-sm">check</span>
								{:else if category.count > 0}
									<span class="text-[10px] text-neutral-400 group-hover:text-primary">
										{String(category.count).padStart(2, '0')}
									</span>
								{/if}
							</button>
						{/each}
					</nav>
				</div>
				<div class="mb-12">
					<h3 class="text-xs font-bold tracking-[0.3em] uppercase mb-6 text-neutral-400">Sort</h3>
					<div class="flex flex-wrap gap-3">
						<button
							class="text-[11px] uppercase tracking-widest px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-full hover:border-primary transition-all"
						>
							Latest
						</button>
						<button
							class="text-[11px] uppercase tracking-widest px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-full hover:border-primary transition-all"
						>
							Price: Low
						</button>
						<button
							class="text-[11px] uppercase tracking-widest px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-full hover:border-primary transition-all"
						>
							Price: High
						</button>
					</div>
				</div>
			</div>
		</aside>

		<!-- Asymmetric Product Grid -->
		<div class="flex-1">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24 asymmetric-grid">
				{#each siteConfig.products as product}
					<div class="group cursor-pointer">
						<div
							class="relative overflow-hidden aspect-[3/4] rounded-lg bg-neutral-100 dark:bg-neutral-900 mb-6"
						>
							<div
								class="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
								style="background-image: url('{product.image}');"
							></div>
							<div
								class="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
							></div>
							<button
								class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-widest opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300"
							>
								Quick Add
							</button>
						</div>
						<div class="flex justify-between items-start">
							<div>
								<h3 class="text-xl font-bold uppercase tracking-tight mb-1">{product.name}</h3>
								<p class="text-sm text-neutral-500 uppercase tracking-widest">{product.subtitle}</p>
							</div>
							<p class="text-xl font-light">${product.price.toLocaleString()}</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination -->
			<div class="flex items-center justify-center gap-1 mt-32">
				<button
					class="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
				>
					<span class="material-symbols-outlined">chevron_left</span>
				</button>
				<button
					class="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full font-bold"
				>
					1
				</button>
				<button
					class="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
				>
					2
				</button>
				<button
					class="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
				>
					3
				</button>
				<button
					class="w-12 h-12 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
				>
					<span class="material-symbols-outlined">chevron_right</span>
				</button>
			</div>
		</div>
	</div>
</main>

<!-- Footer -->
<footer
	class="border-t border-neutral-200 dark:border-neutral-800 mt-24 py-16 bg-neutral-50 dark:bg-neutral-900/50"
>
	<div class="max-w-[1440px] mx-auto px-6 lg:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
		<div class="md:col-span-1">
			<a href="/" class="flex items-center gap-2 mb-6">
				<span class="material-symbols-outlined text-primary text-2xl">{siteConfig.icon}</span>
				<h2 class="text-lg font-extrabold tracking-tighter uppercase">{siteConfig.name}</h2>
			</a>
			<p class="text-sm text-neutral-500 leading-relaxed max-w-[200px]">
				{siteConfig.footer.description}
			</p>
		</div>
		<div>
			<h4 class="text-xs font-bold tracking-[0.2em] uppercase mb-6">Navigation</h4>
			<ul class="flex flex-col gap-3 text-sm font-medium">
				{#each siteConfig.footer.navigation as link}
					<li>
						<a href={link.href} class="hover:text-primary transition-colors">{link.label}</a>
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<h4 class="text-xs font-bold tracking-[0.2em] uppercase mb-6">Assistance</h4>
			<ul class="flex flex-col gap-3 text-sm font-medium">
				{#each siteConfig.footer.assistance as link}
					<li>
						<a href={link.href} class="hover:text-primary transition-colors">{link.label}</a>
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<h4 class="text-xs font-bold tracking-[0.2em] uppercase mb-6">
				{siteConfig.newsletter.headline}
			</h4>
			<p class="text-sm text-neutral-500 mb-6">{siteConfig.newsletter.description}</p>
			<div class="flex gap-2">
				<input
					type="email"
					class="bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:border-primary focus:ring-0 text-sm py-2 px-0 w-full transition-all"
					placeholder="Email Address"
				/>
				<button
					class="text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
				>
					Submit
				</button>
			</div>
		</div>
	</div>
	<div
		class="max-w-[1440px] mx-auto px-6 lg:px-12 mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-neutral-400 uppercase tracking-widest"
	>
		<p>© {currentYear} {siteConfig.footer.copyright}. All Rights Reserved.</p>
		<div class="flex gap-6">
			{#each siteConfig.footer.social as social}
				<a href={social.url} class="hover:text-primary transition-colors">{social.name}</a>
			{/each}
		</div>
	</div>
</footer>
