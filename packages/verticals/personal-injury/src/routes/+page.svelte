<script lang="ts">
	/**
	 * Personal Injury Law Firm - Conversion-Focused Hero
	 *
	 * High-impact design with intake form front and center
	 * Trust signals, stats, and credibility badges
	 * 24/7 availability emphasis
	 */

	import { SEO } from '@create-something/canon';
	import { siteConfig } from '$lib/config/site';

	// Get current year for footer
	const currentYear = new Date().getFullYear();

	// Case type options for the form
	const caseTypes = [
		'Car Accident',
		'Truck Accident',
		'Motorcycle Accident',
		'Medical Malpractice',
		'Slip & Fall',
		'Wrongful Death',
		'Other'
	];
</script>

<SEO
	title={siteConfig.tagline}
	description={siteConfig.description}
	propertyName="agency"
	breadcrumbs={[{ name: 'Home', url: '/' }]}
/>

<!-- Top Navigation Bar -->
<header
	class="absolute top-0 w-full z-50 border-b border-white/10 px-6 lg:px-20 py-4 flex items-center justify-between backdrop-blur-sm bg-background-dark/20"
>
	<div class="flex items-center gap-3">
		<div class="text-primary size-8">
			<svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
				<path
					clip-rule="evenodd"
					d="M24 4H42V17.3333V30.6667H24V44H6V30.6667V17.3333H24V4Z"
					fill-rule="evenodd"
				></path>
			</svg>
		</div>
		<h2 class="text-white text-xl font-extrabold tracking-tight">
			{siteConfig.name.split(' ')[0].toUpperCase()}<span class="text-primary"
				>{siteConfig.name.split(' ').slice(1).join(' ').toUpperCase()}</span
			>
		</h2>
	</div>
	<nav class="hidden md:flex items-center gap-10">
		<a
			href="/accident-types"
			class="text-white/80 hover:text-white text-sm font-semibold uppercase tracking-widest transition-colors"
		>
			Practice Areas
		</a>
		<a
			href="/attorneys"
			class="text-white/80 hover:text-white text-sm font-semibold uppercase tracking-widest transition-colors"
		>
			Attorneys
		</a>
		<a
			href="/results"
			class="text-white/80 hover:text-white text-sm font-semibold uppercase tracking-widest transition-colors"
		>
			Results
		</a>
	</nav>
	<div class="flex items-center gap-4">
		<a
			href="/free-case-review"
			class="hidden sm:flex bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20 items-center gap-2"
		>
			<span class="material-symbols-outlined text-sm">event_available</span>
			Free Consultation
		</a>
		<button
			class="flex items-center justify-center p-2 rounded-lg bg-white/10 text-white sm:hidden"
		>
			<span class="material-symbols-outlined">menu</span>
		</button>
	</div>
</header>

<main class="relative min-h-screen flex items-center pt-20">
	<!-- Background Image with Overlay -->
	<div
		class="absolute inset-0 z-0 bg-center bg-cover"
		style="background-image: url('{siteConfig.hero.image}');"
	>
		<div class="absolute inset-0 hero-gradient-overlay"></div>
	</div>

	<!-- Hero Content Container -->
	<div class="container mx-auto px-6 lg:px-20 relative z-10">
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
			<!-- Left Content: Headline & Credibility -->
			<div class="lg:col-span-7 flex flex-col gap-8">
				<div class="space-y-4">
					<div
						class="inline-flex items-center gap-2 bg-primary/20 border border-primary/30 px-3 py-1 rounded-full"
					>
						<span class="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
						<span class="text-primary text-xs font-bold uppercase tracking-widest">
							Nationally Recognized Expertise
						</span>
					</div>
					<h1 class="text-white text-5xl md:text-7xl font-extrabold leading-[1.05] tracking-tight">
						EXPERIENCE <br />
						<span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
							YOU CAN TRUST.
						</span>
					</h1>
					<p class="text-white/70 text-lg md:text-xl max-w-xl leading-relaxed font-light">
						{siteConfig.description}
					</p>
				</div>

				<!-- Credibility Highlight Component -->
				<div class="flex flex-col sm:flex-row items-start sm:items-center gap-8 py-6 border-y border-white/10">
					<div class="flex flex-col">
						<span class="text-primary text-4xl md:text-5xl font-extrabold tracking-tight">
							{siteConfig.firm.totalRecovered || 'OVER $500M'}
						</span>
						<span class="text-white/50 text-sm font-semibold uppercase tracking-widest mt-1">
							Recovered for clients
						</span>
					</div>
					<div class="h-12 w-[1px] bg-white/10 hidden sm:block"></div>
					<div class="flex flex-col">
						<span class="text-white text-4xl md:text-5xl font-extrabold tracking-tight">
							{siteConfig.statistics.find((s) => s.label === 'Success Rate')?.value || 99}%
						</span>
						<span class="text-white/50 text-sm font-semibold uppercase tracking-widest mt-1">
							Success Rate
						</span>
					</div>
				</div>

				<!-- Trust Logos -->
				<div
					class="flex flex-wrap gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500"
				>
					{#each siteConfig.barAssociations.slice(0, 3) as assoc}
						<div
							class="h-8 w-24 bg-white/20 rounded flex items-center justify-center font-bold text-[10px] text-white"
						>
							{assoc.split(' ').slice(0, 2).join(' ').toUpperCase()}
						</div>
					{/each}
				</div>
			</div>

			<!-- Right Content: Contact Form Card -->
			<div class="lg:col-span-5">
				<div
					class="bg-white dark:bg-zinc-900 rounded-xl p-8 shadow-2xl shadow-black/50 border border-white/10 relative overflow-hidden"
				>
					<!-- Decorative element -->
					<div class="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12">
					</div>

					<div class="relative z-10">
						<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
							Tell us about your case
						</h2>
						<p class="text-gray-500 dark:text-gray-400 text-sm mb-6">
							Complete the form below for a confidential, no-obligation case review.
						</p>

						<form action="/api/intake" method="POST" class="space-y-4">
							<div>
								<label
									for="name"
									class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1"
								>
									Full Name
								</label>
								<input
									id="name"
									name="name"
									type="text"
									placeholder="John Doe"
									class="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-lg h-14 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary transition-all"
								/>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<label
										for="phone"
										class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1"
									>
										Phone Number
									</label>
									<input
										id="phone"
										name="phone"
										type="tel"
										placeholder="(555) 000-0000"
										class="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-lg h-14 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary transition-all"
									/>
								</div>
								<div>
									<label
										for="caseType"
										class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1"
									>
										Case Type
									</label>
									<select
										id="caseType"
										name="caseType"
										class="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-lg h-14 px-4 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary transition-all appearance-none"
									>
										{#each caseTypes as caseType}
											<option>{caseType}</option>
										{/each}
									</select>
								</div>
							</div>

							<div>
								<label
									for="email"
									class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1"
								>
									Email Address
								</label>
								<input
									id="email"
									name="email"
									type="email"
									placeholder="john@example.com"
									class="w-full bg-gray-50 dark:bg-zinc-800 border-none rounded-lg h-14 px-4 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary transition-all"
								/>
							</div>

							<button
								type="submit"
								class="w-full bg-primary hover:bg-primary/90 text-white h-16 rounded-lg font-bold text-lg transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3 mt-4"
							>
								Request Your Free Case Review
								<span class="material-symbols-outlined">arrow_forward</span>
							</button>

							<p class="text-[10px] text-center text-gray-400 mt-4 leading-relaxed">
								By clicking above, you agree to our terms of service and privacy policy. No legal
								fees unless we win your case.
							</p>
						</form>
					</div>
				</div>

				<!-- Floating Stat Badge for Desktop -->
				<div
					class="hidden lg:flex items-center gap-4 bg-zinc-900/80 backdrop-blur-md border border-white/10 p-4 rounded-xl mt-6 ml-12 -mr-12 relative z-20"
				>
					<div
						class="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"
					>
						<span class="material-symbols-outlined">verified</span>
					</div>
					<div>
						<p class="text-white text-sm font-bold">
							Trusted by {(siteConfig.firm.casesWon || 10000).toLocaleString()}+ Clients
						</p>
						<p class="text-white/50 text-xs">National Leader in Personal Injury Law</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<!-- Simple Footer Strip -->
<footer class="bg-zinc-950 border-t border-white/5 py-8">
	<div
		class="container mx-auto px-6 lg:px-20 flex flex-col md:flex-row items-center justify-between gap-6"
	>
		<div class="flex items-center gap-2">
			<span class="text-white/30 text-xs uppercase font-bold tracking-tighter">
				{siteConfig.available24_7 ? 'Available 24/7 for you' : `© ${currentYear} ${siteConfig.name}`}
			</span>
		</div>
		<div class="flex items-center gap-6">
			<a href="/terms" class="text-white/40 hover:text-white text-xs font-medium transition-colors">
				Legal Disclaimer
			</a>
			<a
				href="/privacy"
				class="text-white/40 hover:text-white text-xs font-medium transition-colors"
			>
				Privacy Policy
			</a>
			<a href="tel:{siteConfig.phone}" class="flex items-center gap-2 text-primary font-bold">
				<span class="material-symbols-outlined text-lg">call</span>
				<span>{siteConfig.phone}</span>
			</a>
		</div>
	</div>
</footer>
