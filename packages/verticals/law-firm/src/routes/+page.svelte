<script lang="ts">
	/**
	 * Vanguard Law Practice - Modern Editorial Design
	 *
	 * Bold, confident aesthetic with Epilogue typography
	 * Dark green primary with gold accents
	 * Trust through outcomes, ethics visible
	 */

	import { SEO } from '@create-something/components';
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

<!-- Navigation -->
<nav
	class="fixed w-full z-50 mix-blend-difference px-6 py-8 md:px-12 flex justify-between items-center pointer-events-none"
>
	<div class="pointer-events-auto">
		<a href="/" class="text-2xl font-extrabold tracking-tighter text-white">
			{siteConfig.name.toUpperCase()}<span class="text-accent-gold">.</span>
		</a>
	</div>
	<div class="hidden md:flex space-x-12 pointer-events-auto items-center">
		<a
			href="#practice"
			class="text-sm font-semibold uppercase tracking-widest text-white hover:text-accent-gold transition-colors"
		>
			Practice Areas
		</a>
		<a
			href="#wins"
			class="text-sm font-semibold uppercase tracking-widest text-white hover:text-accent-gold transition-colors"
		>
			Recent Wins
		</a>
		<a
			href="#consultation"
			class="bg-white text-primary px-6 py-3 rounded-lg text-sm font-bold hover:bg-accent-gold transition-all duration-300"
		>
			CONSULTATION
		</a>
	</div>
	<div class="md:hidden pointer-events-auto">
		<span class="material-symbols-outlined text-white text-3xl">menu</span>
	</div>
</nav>

<!-- Hero Section -->
<section
	class="relative min-h-screen flex flex-col justify-end px-6 py-20 md:px-12 bg-background-light dark:bg-background-dark"
>
	<div class="absolute top-0 right-0 w-1/2 h-full hidden lg:block overflow-hidden">
		<img
			src={siteConfig.hero.image}
			alt={siteConfig.hero.alt}
			class="w-full h-full object-cover grayscale opacity-20 dark:opacity-10"
		/>
	</div>
	<div class="relative z-10 max-w-6xl">
		<span
			class="inline-block text-accent-gold font-semibold tracking-[0.3em] uppercase mb-6 text-sm"
		>
			{siteConfig.location}
		</span>
		<h1 class="hero-text font-extrabold mb-10 text-primary dark:text-white">
			{siteConfig.hero.headline[0]}<br />
			<span class="text-outline">{siteConfig.hero.headline[1]}</span><br />
			{siteConfig.hero.headline[2]}
		</h1>
		<div class="flex flex-col md:flex-row md:items-end gap-8">
			<p class="max-w-md text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">
				{siteConfig.hero.subtext}
			</p>
			<a
				href="#consultation"
				class="group flex items-center gap-4 text-primary dark:text-white font-bold text-xl"
			>
				<span class="underline decoration-2 underline-offset-8 group-hover:text-accent-gold">
					Start a Conversation
				</span>
				<span class="material-symbols-outlined group-hover:translate-x-2 transition-transform">
					arrow_forward
				</span>
			</a>
		</div>
	</div>
	<!-- Vertical Grid Overlay -->
	<div class="absolute inset-0 pointer-events-none flex justify-between px-6 md:px-12 opacity-10">
		<div class="grid-line h-full"></div>
		<div class="grid-line h-full"></div>
		<div class="grid-line h-full hidden md:block"></div>
		<div class="grid-line h-full hidden md:block"></div>
	</div>
</section>

<!-- Partners / Credibility Section -->
<section class="border-y border-slate-200 dark:border-slate-800 py-12 px-6 md:px-12">
	<div
		class="flex flex-wrap items-center justify-between gap-8 grayscale opacity-50 contrast-125"
	>
		{#each siteConfig.partners as partner}
			<span class="text-xl font-bold tracking-widest uppercase">{partner.name}</span>
		{/each}
	</div>
</section>

<!-- Practice Areas -->
<section
	id="practice"
	class="px-6 py-24 md:px-12 bg-white dark:bg-background-dark/50 overflow-hidden"
>
	<div class="max-w-7xl mx-auto">
		<div class="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
			<h2 class="text-5xl md:text-7xl font-extrabold text-primary dark:text-white">
				CORE<br />AREAS
			</h2>
			<p class="max-w-sm text-slate-500 font-light">
				Specialized expertise across critical legal sectors, delivered with a focus on long-term
				institutional value.
			</p>
		</div>
		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xl"
		>
			{#each siteConfig.practiceAreas as area}
				<div
					class="bg-background-light dark:bg-background-dark p-10 hover:bg-primary group transition-all duration-500 cursor-pointer"
				>
					<span class="text-accent-gold text-4xl mb-8 block font-light">{area.number}</span>
					<h3
						class="text-2xl font-bold mb-4 dark:text-white group-hover:text-white transition-colors"
					>
						{area.name}
					</h3>
					<p
						class="text-slate-600 dark:text-slate-400 group-hover:text-white/70 transition-colors"
					>
						{area.description}
					</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Recent Wins Section -->
<section id="wins" class="py-24 bg-primary text-white overflow-hidden relative">
	<div class="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
		<span class="material-symbols-outlined text-[20rem]">gavel</span>
	</div>
	<div class="px-6 md:px-12 max-w-7xl mx-auto relative z-10">
		<h2 class="text-sm font-semibold tracking-[0.4em] uppercase text-accent-gold mb-12">
			Provable Outcomes
		</h2>
		<div class="space-y-12">
			{#each siteConfig.results as result, i}
				{@const isNotLast = i < siteConfig.results.length - 1}
				<div
					class="pb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 {isNotLast ? 'border-b border-white/10' : ''}"
				>
					<div>
						<span class="text-accent-gold text-xs font-bold uppercase tracking-widest">
							{result.date}
						</span>
						<h4 class="text-3xl md:text-5xl font-bold mt-2">{result.title}</h4>
					</div>
					<div class="md:text-right">
						<p class="text-white/60 mb-2">{result.client}</p>
						<span
							class="bg-white/10 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase"
						>
							{result.tag}
						</span>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Leadership Section -->
<section class="px-6 py-24 md:px-12 max-w-7xl mx-auto">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
		<div class="relative">
			<div class="aspect-[4/5] rounded-xl overflow-hidden">
				<img
					src={siteConfig.managingPartner.image}
					alt={siteConfig.managingPartner.name}
					class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
				/>
			</div>
			{#if siteConfig.managingPartner.quote}
				<div class="absolute -bottom-8 -right-8 bg-accent-gold p-8 rounded-xl hidden md:block">
					<p class="text-white font-bold text-4xl italic">
						"{siteConfig.managingPartner.quote.split(' ').slice(0, 3).join(' ')}<br />{siteConfig.managingPartner.quote.split(' ').slice(3, 6).join(' ')}<br />{siteConfig.managingPartner.quote.split(' ').slice(6).join(' ')}"
					</p>
				</div>
			{/if}
		</div>
		<div class="lg:pl-12">
			<span
				class="text-primary dark:text-white font-bold uppercase tracking-widest text-sm mb-4 block underline decoration-accent-gold decoration-4 underline-offset-8"
			>
				{siteConfig.managingPartner.title}
			</span>
			<h2 class="text-5xl md:text-6xl font-extrabold text-primary dark:text-white mb-8">
				{siteConfig.managingPartner.name.split(' ')[0].toUpperCase()}<br />
				{siteConfig.managingPartner.name.split(' ').slice(1).join(' ').toUpperCase()}
			</h2>
			<p class="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-8">
				{siteConfig.managingPartner.bio}
			</p>
			<div class="flex gap-4">
				<a
					href={siteConfig.social.linkedin}
					class="p-3 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-primary hover:text-white transition-colors"
				>
					<span class="material-symbols-outlined">share</span>
				</a>
				<a
					href="mailto:{siteConfig.email}"
					class="p-3 border border-slate-200 dark:border-slate-800 rounded-full hover:bg-primary hover:text-white transition-colors"
				>
					<span class="material-symbols-outlined">mail</span>
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Consultation CTA -->
<section id="consultation" class="px-6 py-24 md:px-12 bg-background-light dark:bg-background-dark">
	<div
		class="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-10 md:p-20 shadow-2xl border border-slate-100 dark:border-slate-800"
	>
		<div class="text-center mb-12">
			<h2 class="text-4xl md:text-5xl font-extrabold mb-4 text-primary dark:text-white">
				Secure Your Future.
			</h2>
			<p class="text-slate-500">
				Every legal journey starts with a single, strategic conversation.
			</p>
		</div>
		<form action="/api/consultation" method="POST" class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div>
				<label
					for="name"
					class="block text-xs font-bold uppercase tracking-widest text-primary dark:text-slate-400 mb-2"
				>
					Full Name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					placeholder="John Doe"
					class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-4 focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
				/>
			</div>
			<div>
				<label
					for="email"
					class="block text-xs font-bold uppercase tracking-widest text-primary dark:text-slate-400 mb-2"
				>
					Email Address
				</label>
				<input
					id="email"
					name="email"
					type="email"
					placeholder="john@example.com"
					class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-4 focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
				/>
			</div>
			<div class="md:col-span-2">
				<label
					for="message"
					class="block text-xs font-bold uppercase tracking-widest text-primary dark:text-slate-400 mb-2"
				>
					Case Overview
				</label>
				<textarea
					id="message"
					name="message"
					placeholder="Briefly describe your legal needs..."
					rows="4"
					class="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-4 focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
				></textarea>
			</div>
			<div class="md:col-span-2">
				<button
					type="submit"
					class="w-full bg-primary py-5 rounded-lg text-white font-bold text-lg hover:bg-opacity-90 transition-all shadow-xl flex items-center justify-center gap-3"
				>
					REQUEST EVALUATION
					<span class="material-symbols-outlined">send</span>
				</button>
			</div>
		</form>
	</div>
</section>

<!-- Footer -->
<footer
	class="px-6 py-12 md:px-12 border-t border-slate-200 dark:border-slate-800 bg-background-light dark:bg-background-dark"
>
	<div
		class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8"
	>
		<div>
			<a href="/" class="text-2xl font-extrabold tracking-tighter text-primary dark:text-white">
				{siteConfig.name.toUpperCase()}<span class="text-accent-gold">.</span>
			</a>
			<p class="text-slate-400 mt-2 text-sm">
				© {currentYear} {siteConfig.name} Law Practice LLP. All Rights Reserved.
			</p>
		</div>
		<div
			class="flex flex-wrap gap-8 text-xs font-bold uppercase tracking-widest text-primary dark:text-slate-400"
		>
			{#each siteConfig.footerLinks as link}
				<a href={link.href} class="hover:text-accent-gold transition-colors">{link.label}</a>
			{/each}
		</div>
		<div>
			<p class="text-right text-sm text-slate-500 dark:text-slate-400">
				{siteConfig.address.street}, {siteConfig.address.city}, {siteConfig.address.state}
				{siteConfig.address.zip}<br />
				{siteConfig.phone}
			</p>
		</div>
	</div>
</footer>
