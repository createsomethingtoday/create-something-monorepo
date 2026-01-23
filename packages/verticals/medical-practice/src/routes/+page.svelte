<script lang="ts">
	/**
	 * Modern Med - Home Page (Tufte Edition)
	 *
	 * Design: Data-forward, serif headings, muted palette
	 * Voice: Clinical precision meets human warmth
	 */
	import { SEO } from '@create-something/components';
	import { siteConfig } from '$lib/config/site';

	// Location image
	const locationImage =
		'https://lh3.googleusercontent.com/aida-public/AB6AXuAtOCguORafOYU8ryJLbK0E5AnLWg3tqMjoG2yPk411Hv5Ecad3KcIKyDLxACp1cEXquAUhFYj5bUGhmg0AFdcKhMCnSNebLYQ_dXRD3ZbJaHy5UPpkLCcgwBx3QdEECfyU2wZTpcAszqoqG5z7pXIWBj3GaZkftqYZhbfgoqP23JwBd_nkY3KH0X9Ss4Svpc3KOUxYTl3Rc-TtGj11fTU8Ov7FWI4WZix6NPlm4EEOVE8r9xsr57vIp-LGqZ-bjr14sxGS2NYCnNo';
</script>

<SEO
	title={siteConfig.tagline}
	description={siteConfig.description}
	propertyName="agency"
	breadcrumbs={[{ name: 'Home', url: '/' }]}
/>

<!-- Header -->
<header
	class="sticky top-0 z-50 w-full bg-background-light/90 backdrop-blur-sm border-b border-primary/5"
>
	<div class="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
		<div class="flex items-center gap-6">
			<h2 class="text-lg font-bold tracking-tight">{siteConfig.name}</h2>
			<nav class="hidden md:flex items-center gap-8 border-l border-primary/10 pl-8">
				<a
					class="text-[13px] font-medium text-tufte-gray hover:text-primary transition-colors"
					href="#faculty">Physicians</a
				>
				<a
					class="text-[13px] font-medium text-tufte-gray hover:text-primary transition-colors"
					href="#capabilities">Capabilities</a
				>
				<a
					class="text-[13px] font-medium text-tufte-gray hover:text-primary transition-colors"
					href="#contact">Contact</a
				>
			</nav>
		</div>
		<div class="flex items-center gap-4">
			<span class="text-[11px] font-semibold text-accent uppercase tracking-wider hidden lg:block"
				>Wait Time: {siteConfig.hero.waitTime}</span
			>
			<button
				class="bg-primary text-white px-5 py-2 text-[13px] font-semibold rounded hover:bg-primary/90 transition-all"
			>
				Book a Visit
			</button>
		</div>
	</div>
</header>

<main>
	<!-- Hero Section -->
	<section class="max-w-[1200px] mx-auto px-6 py-24 md:py-32">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-16">
			<div class="lg:col-span-7">
				<h1 class="text-5xl md:text-6xl text-primary leading-[1.1] mb-8">
					{siteConfig.hero.headline}
				</h1>
				<p
					class="max-w-xl text-lg md:text-xl text-tufte-gray leading-relaxed mb-10 italic font-serif"
				>
					{siteConfig.hero.subheadline}
				</p>
				<div class="flex items-center gap-8">
					<button
						class="border-b-2 border-primary pb-1 font-bold text-sm tracking-wide hover:text-accent hover:border-accent transition-all"
					>
						{siteConfig.hero.ctaText}
					</button>
					<span class="text-xs text-tufte-gray/60 max-w-[180px]">{siteConfig.hero.ctaSubtext}</span>
				</div>
			</div>
			<div class="lg:col-span-5 flex flex-col justify-end pb-4">
				<div class="border-t border-primary/20 pt-6">
					<div class="flex justify-between items-end mb-4">
						<span class="text-xs font-bold uppercase tracking-widest text-primary/40"
							>Patient Satisfaction Score</span
						>
						<span class="text-2xl font-serif italic text-primary"
							>{siteConfig.hero.satisfactionScore}</span
						>
					</div>
					<svg class="w-full h-12" preserveAspectRatio="none" viewBox="0 0 100 20">
						<path
							class="sparkline"
							d="M0,18 L10,17 L20,18 L30,15 L40,16 L50,12 L60,14 L70,8 L80,10 L90,4 L100,5"
						></path>
						<circle cx="100" cy="5" fill="#c2410c" r="2"></circle>
					</svg>
					<p class="text-[11px] text-tufte-gray mt-2 leading-tight">
						{siteConfig.hero.satisfactionNote}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- Faculty Section -->
	<section id="faculty" class="bg-white py-24 border-y border-primary/5">
		<div class="max-w-[1200px] mx-auto px-6 mb-12">
			<h2 class="text-3xl mb-2">Our Faculty</h2>
			<p class="text-sm text-tufte-gray max-w-2xl">
				Board-certified specialists focused on longitudinal care. Availability is updated in
				real-time.
			</p>
		</div>
		<div class="max-w-[1200px] mx-auto px-6">
			<div class="data-grid text-[13px]">
				{#each siteConfig.physicians as physician}
					<div>
						<div class="flex items-start justify-between mb-4">
							<img
								alt={physician.name}
								class="w-12 h-12 rounded-sm grayscale object-cover"
								src={physician.image}
							/>
							<span
								class="px-2 py-0.5 text-[10px] font-bold uppercase {physician.availability ===
									'Today' || physician.availability === 'Tomorrow'
									? 'bg-emerald-50 text-emerald-700'
									: 'bg-gray-100 text-gray-500'}"
							>
								{physician.availability}
							</span>
						</div>
						<h3 class="font-bold text-[15px] mb-1">
							{physician.name}, {physician.credentials}
						</h3>
						<p class="text-tufte-gray mb-3 italic font-serif">
							{physician.specialty} • {physician.affiliation}
						</p>
						<div class="space-y-1 text-[11px] text-tufte-gray/80">
							<div class="flex justify-between border-b border-primary/5 pb-1">
								<span>Clinical Focus</span>
								<span class="font-medium">{physician.focus}</span>
							</div>
							<div class="flex justify-between border-b border-primary/5 pb-1">
								<span>Experience</span>
								<span class="font-medium">{physician.experience} Years</span>
							</div>
							<div class="flex justify-between">
								<span>Consultation Fee</span>
								<span class="font-medium">${physician.fee}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Capabilities Section -->
	<section id="capabilities" class="max-w-[1200px] mx-auto px-6 py-24">
		<div class="grid grid-cols-1 lg:grid-cols-4 gap-12">
			<div class="lg:col-span-1">
				<h2 class="text-3xl mb-6">Our Capabilities</h2>
				<p class="text-sm text-tufte-gray leading-relaxed mb-8">
					We've organized our practice around four primary needs, ensuring a seamless bridge between
					acute care and long-term health.
				</p>
				<div class="text-[11px] uppercase tracking-widest font-bold text-accent">
					Evidence-Based Pathways
				</div>
			</div>
			<div class="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-px bg-primary/10 border border-primary/10">
				{#each siteConfig.capabilities as capability}
					<div class="bg-background-light p-8">
						<span class="material-symbols-outlined text-accent text-2xl mb-4">{capability.icon}</span
						>
						<h3 class="font-bold text-lg mb-2">{capability.name}</h3>
						<p class="text-[13px] text-tufte-gray mb-6">{capability.description}</p>
						{#if capability.metric}
							<div class="flex items-center gap-2">
								<span class="text-xl font-serif italic">{capability.metric}</span>
								<span class="text-[10px] text-tufte-gray">{capability.metricLabel}</span>
							</div>
						{:else}
							<div class="flex gap-2">
								<div class="h-1 w-12 bg-primary"></div>
								<div class="h-1 w-8 bg-primary/20"></div>
								<div class="h-1 w-10 bg-primary/40"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer id="contact" class="bg-background-light border-t border-primary/10 pt-24 pb-12 px-6">
		<div class="max-w-[1200px] mx-auto">
			<div class="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
				<div class="lg:col-span-5">
					<h3 class="text-2xl mb-6 font-serif">{siteConfig.footer.contactHeadline}</h3>
					<p class="text-[15px] text-tufte-gray mb-8 leading-relaxed">
						{siteConfig.footer.contactDescription}
					</p>
					<form class="space-y-4">
						<input
							class="w-full bg-transparent border-0 border-b border-primary/20 py-3 text-sm focus:ring-0 focus:border-accent transition-all placeholder:text-primary/30"
							placeholder="Your email address"
							type="email"
						/>
						<textarea
							class="w-full bg-transparent border-0 border-b border-primary/20 py-3 text-sm focus:ring-0 focus:border-accent transition-all placeholder:text-primary/30"
							placeholder="Brief description of your needs"
							rows="3"
						></textarea>
						<button
							type="submit"
							class="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-2 mt-4 hover:gap-4 transition-all"
						>
							Submit Inquiry <span class="material-symbols-outlined text-sm">arrow_forward</span>
						</button>
					</form>
				</div>
				<div class="lg:col-span-7">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-[13px]">
						<div>
							<h4 class="font-bold mb-4 uppercase text-[11px] tracking-widest text-primary/40">
								{siteConfig.address.city}
							</h4>
							<p class="text-tufte-gray leading-relaxed mb-4">
								{siteConfig.address.street}<br />
								{siteConfig.address.suite}, {siteConfig.address.city}, {siteConfig.address.state}<br
								/>
								{siteConfig.phone}
							</p>
							<div
								class="aspect-video bg-gray-100 rounded grayscale relative overflow-hidden group"
							>
								<div
									class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
									style="background-image: url('{locationImage}')"
								></div>
								<div class="absolute inset-0 bg-primary/10"></div>
							</div>
						</div>
						<div>
							<h4 class="font-bold mb-4 uppercase text-[11px] tracking-widest text-primary/40">
								Operations
							</h4>
							<p class="text-tufte-gray leading-relaxed mb-6">
								{siteConfig.hours.weekday}<br />
								{siteConfig.hours.saturday}<br />
								<span class="text-accent italic">{siteConfig.hours.urgent}</span>
							</p>
							<ul class="space-y-2 text-primary/60">
								{#each siteConfig.footer.links.slice(0, 3) as link}
									<li><a class="hover:text-primary transition-colors" href={link.href}>{link.label}</a></li>
								{/each}
							</ul>
						</div>
					</div>
				</div>
			</div>
			<div
				class="pt-12 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center text-[11px] font-medium text-tufte-gray"
			>
				<div class="flex items-center gap-2 mb-4 md:mb-0">
					<span class="font-bold text-primary uppercase">{siteConfig.name}</span>
					<span class="opacity-30">/</span>
					<span>EST. {new Date().getFullYear()}</span>
				</div>
				<div class="flex gap-8">
					{#each siteConfig.footer.links.slice(3) as link}
						<a class="hover:text-primary transition-colors" href={link.href}>{link.label}</a>
					{/each}
				</div>
			</div>
		</div>
	</footer>
</main>
