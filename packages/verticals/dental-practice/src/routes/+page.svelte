<script lang="ts">
	/**
	 * Modern Dental Practice - Home Page
	 *
	 * Design: Clean, modern, teal primary with warm white backgrounds
	 * Voice: Professional yet approachable, emphasizing comfort and technology
	 */
	import { siteConfig } from '$lib/config/site';

	// Patient avatars for social proof
	const patientAvatars = [
		'https://lh3.googleusercontent.com/aida-public/AB6AXuDTQmC6RbviVB8AW4krd4zaMgmfZ4Bq9EqmKBLVnRUHRIqzS5fOxfhgYgKwkwvwLidbcZ1Rej4DlkGCXRSU52s-9fIdX4cfCA8Dh6Xb_MNMno5bXsmMNij0uVs1xOxLC0Rac9ic5kEamrimu_3lRJBu3lUteat0W2phakJCqtlD_IlWCS4YtHjeFSrBW_xAblowoh6BzLpZT_YDzRfg8sLIjwJRlhVNOL_LNCb9dgvJ4DrOcd-RL6TFxVZTiW1qZ-fLvLbAqo-BR30_',
		'https://lh3.googleusercontent.com/aida-public/AB6AXuD41rFaNQT1wtOSlDyjRCHptF09uD1qjx_-JFR5ZPlwH8Bih7ypHezumtkOo0OxuKq-BLASTuPFXhTTa-pF0YyHijECCeMWbUIVpUDOhobeWSfsXhtskYEeELcGsQY0VMao2gQMidys9Z2N7sL6kVX1VHtkLUPgfimOgxDu8Rwa011WvLu1kMAQzl1D8LjN065aCXn3YidwP9FXPskh_BPx8lFcuvguoVed_YIt6bMu_fIcB2Xxx8UeVChNJc7Wa69o-ZY5DLhdUioK',
		'https://lh3.googleusercontent.com/aida-public/AB6AXuAqNiD6izPT-npbjQlw-ZoU3nz4GsdD63djYLTKtoSsE54dxfUa2iIRzkqV_T_zkD1zj1HMeVblQonLdP-4Mv71rEV5gJmCy6FgUEoHqbjEcu04dKuZ26Vq9tl1tTSsr8jbLS13ZZQ4isBWxc8VIDhI8gerBiyyw4jPhZ7AsiKt8OUXMPKeJBhnxnXugGhoNSX6IC5cJzSlw5Q6PTpLHSvLirEui56xW2q-fkFmptWX7LHyPygZEtP9thkDcMqCIInGPHj-PHISfBsV'
	];

	const navAvatar =
		'https://lh3.googleusercontent.com/aida-public/AB6AXuA84q7ZnjslPmaXMBqJAGg1n6sV1hvu3lMX7Zxdyeern7VaS97suBjWrMbq8owfu1wxpOiQK8otbNN-e8zhkFW1mV7H9P2L-1VF_9YfrWTqzlBTXpzfhPaB9rXrP2rPuSe1xMO738XuPc9ZD2epO1N0Uh9pjZ1XRAE0G3ATZ8sBG3YIaKZCstRwc50ZPStt0P0c0aOtuMTz0NiI8WBr9G8DP7u7qyaWWCucRMX4W_s4IRXBweTWt3wWmzEIWOlrniTiZrSetCFE5lIh';
</script>

<!-- Navigation -->
<header
	class="sticky top-0 z-50 w-full border-b border-solid border-primary/10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-6 md:px-20 py-4"
>
	<div class="mx-auto flex max-w-[1200px] items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="text-primary">
				<svg class="h-8 w-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
					<path
						clip-rule="evenodd"
						d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
						fill="currentColor"
						fill-rule="evenodd"
					></path>
				</svg>
			</div>
			<h1 class="text-xl font-extrabold tracking-tight dark:text-white">{siteConfig.name}</h1>
		</div>
		<nav class="hidden md:flex items-center gap-10">
			<a class="text-sm font-semibold hover:text-primary transition-colors" href="#services"
				>Services</a
			>
			<a class="text-sm font-semibold hover:text-primary transition-colors" href="#testimonials"
				>Testimonials</a
			>
			<a class="text-sm font-semibold hover:text-primary transition-colors" href="#gallery"
				>Gallery</a
			>
			<button
				class="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all"
			>
				Book Appointment
			</button>
			<div
				class="h-10 w-10 rounded-full border-2 border-primary/20 bg-center bg-cover"
				style="background-image: url('{navAvatar}');"
			></div>
		</nav>
	</div>
</header>

<main class="flex-grow">
	<!-- Hero Section -->
	<section class="mx-auto max-w-[1200px] px-6 py-16 md:py-24">
		<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
			<div class="space-y-8 order-2 lg:order-1">
				<div class="space-y-4">
					<span class="text-primary font-bold uppercase tracking-widest text-xs"
						>{siteConfig.hero.eyebrow}</span
					>
					<h2
						class="text-6xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight text-[#101818] dark:text-white"
					>
						{siteConfig.hero.headline}
						<span class="text-primary">{siteConfig.hero.highlightWord}</span>, Reimagined.
					</h2>
					<p class="max-w-[500px] text-lg text-gray-600 dark:text-gray-400 font-medium">
						{siteConfig.hero.subheadline}
					</p>
				</div>
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						class="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-xl shadow-primary/30 transition-all flex items-center justify-center gap-2"
					>
						<span class="material-symbols-outlined">calendar_today</span>
						Book Appointment
					</button>
					<button
						class="border border-primary/20 hover:bg-primary/5 dark:hover:bg-primary/10 px-8 py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2"
					>
						View Gallery
					</button>
				</div>
				<div class="flex items-center gap-6 pt-4 border-t border-primary/10">
					<div class="flex -space-x-3">
						{#each patientAvatars as avatar}
							<div
								class="h-10 w-10 rounded-full border-2 border-white dark:border-background-dark bg-cover"
								style="background-image: url('{avatar}');"
							></div>
						{/each}
					</div>
					<div class="text-sm">
						<div class="font-bold">{siteConfig.hero.stats.rating}</div>
						<div class="text-gray-500">{siteConfig.hero.stats.count}</div>
					</div>
				</div>
			</div>
			<div class="relative order-1 lg:order-2">
				<div class="absolute -inset-4 bg-primary/10 rounded-[2.5rem] rotate-3 blur-2xl"></div>
				<div class="relative overflow-hidden rounded-[2rem] aspect-[4/5] bg-gray-100 shadow-2xl">
					<img
						class="h-full w-full object-cover"
						alt={siteConfig.hero.imageAlt}
						src={siteConfig.hero.image}
					/>
					<div
						class="absolute bottom-6 left-6 right-6 p-6 backdrop-blur-md bg-white/70 dark:bg-background-dark/70 rounded-2xl border border-white/20"
					>
						<p class="italic text-sm font-medium">"{siteConfig.hero.testimonial.quote}"</p>
						<p class="mt-2 font-bold text-primary">— {siteConfig.hero.testimonial.author}</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Services Section -->
	<section id="services" class="bg-white dark:bg-[#152a2d] py-24 transition-colors">
		<div class="mx-auto max-w-[1200px] px-6">
			<div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
				<div class="space-y-4">
					<span class="text-primary font-bold uppercase tracking-widest text-xs">Our Expertise</span
					>
					<h2 class="text-4xl md:text-5xl font-extrabold tracking-tight">Comprehensive Care</h2>
				</div>
				<p class="max-w-[400px] text-gray-500 dark:text-gray-400">
					We offer a full range of dental services using the latest technology to ensure the best
					results.
				</p>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{#each siteConfig.services as service}
					<div
						class="group relative p-8 rounded-2xl bg-background-light dark:bg-background-dark hover:bg-primary dark:hover:bg-primary transition-all duration-300"
					>
						<div
							class="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-white group-hover:text-primary transition-colors"
						>
							<span class="material-symbols-outlined !text-3xl">{service.icon}</span>
						</div>
						<h3 class="text-xl font-bold mb-3 group-hover:text-white transition-colors">
							{service.name}
						</h3>
						<p
							class="text-gray-500 dark:text-gray-400 group-hover:text-white/80 transition-colors text-sm leading-relaxed"
						>
							{service.description}
						</p>
					<button
						class="mt-6 flex items-center gap-2 font-bold text-primary group-hover:text-white text-sm"
					>
						Learn More <span class="material-symbols-outlined text-sm">arrow_forward</span>
					</button>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Testimonials Section -->
	<section id="testimonials" class="py-24 px-6 bg-background-light dark:bg-background-dark">
		<div class="mx-auto max-w-[1200px]">
			<div class="text-center mb-16">
				<h2 class="text-4xl md:text-5xl font-black mb-4">Patient Experiences</h2>
				<p class="text-gray-600 dark:text-gray-400 max-w-[600px] mx-auto">
					Don't just take our word for it—see what our community has to say about their journey to a
					better smile.
				</p>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				{#each siteConfig.testimonials as testimonial}
					<div
						class="bg-white dark:bg-[#1a2e31] p-10 rounded-[2rem] shadow-sm border border-primary/5"
					>
						<div class="flex text-primary mb-4">
							{#each Array(testimonial.rating) as _}
								<span class="material-symbols-outlined">star</span>
							{/each}
						</div>
						<p class="text-lg font-medium leading-relaxed mb-8 italic">"{testimonial.quote}"</p>
						<div class="flex items-center gap-4">
							<div
								class="h-12 w-12 rounded-full bg-cover"
								style="background-image: url('{testimonial.image}');"
							></div>
							<div>
								<h4 class="font-bold">{testimonial.author}</h4>
								<p class="text-xs text-gray-500 font-semibold uppercase">{testimonial.title}</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- Final CTA Section -->
	<section class="py-24 px-6">
		<div
			class="mx-auto max-w-[1200px] bg-primary rounded-[3rem] p-12 md:p-20 text-center text-white relative overflow-hidden"
		>
			<div
				class="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white to-transparent"
			></div>
			<div class="relative z-10 max-w-[700px] mx-auto space-y-8">
				<h2 class="text-4xl md:text-6xl font-black">{siteConfig.cta.headline}</h2>
				<p class="text-xl text-white/80">{siteConfig.cta.subheadline}</p>
				<div class="flex flex-col sm:flex-row justify-center gap-4">
					<button
						class="bg-white text-primary hover:bg-gray-100 px-10 py-5 rounded-2xl text-xl font-bold transition-all shadow-xl"
					>
						Book Now
					</button>
					<button
						class="bg-primary-dark/20 border-2 border-white/20 hover:bg-white/10 px-10 py-5 rounded-2xl text-xl font-bold transition-all"
					>
						Call Us: {siteConfig.phone}
					</button>
				</div>
			</div>
		</div>
	</section>
</main>

<!-- Footer -->
<footer class="bg-white dark:bg-background-dark border-t border-primary/5 py-16 px-6">
	<div class="mx-auto max-w-[1200px] grid grid-cols-1 md:grid-cols-4 gap-12">
		<div class="col-span-1 md:col-span-1 space-y-6">
			<div class="flex items-center gap-3">
				<div class="text-primary">
					<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 48 48">
						<path
							d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z"
							fill="currentColor"
						></path>
					</svg>
				</div>
				<span class="text-xl font-black">{siteConfig.name}</span>
			</div>
			<p class="text-gray-500 text-sm">{siteConfig.footer.tagline}</p>
		</div>
		<div>
			<h5 class="font-bold mb-6">Explore</h5>
			<ul class="space-y-4 text-sm text-gray-500">
				{#each siteConfig.footer.links.explore as link}
					<li><a class="hover:text-primary" href={link.href}>{link.label}</a></li>
				{/each}
			</ul>
		</div>
		<div>
			<h5 class="font-bold mb-6">Contact</h5>
			<ul class="space-y-4 text-sm text-gray-500">
				{#each siteConfig.footer.links.contact as contact}
					<li class="flex items-start gap-3">
						<span class="material-symbols-outlined text-primary text-lg">{contact.icon}</span>
						<span class="whitespace-pre-line">{contact.text}</span>
					</li>
				{/each}
			</ul>
		</div>
		<div>
			<h5 class="font-bold mb-6">{siteConfig.footer.newsletter.headline}</h5>
			<p class="text-sm text-gray-500 mb-4">{siteConfig.footer.newsletter.description}</p>
			<div class="flex gap-2">
				<input
					class="bg-gray-100 dark:bg-[#1a2e31] border-none rounded-lg text-sm flex-grow px-4 py-2"
					placeholder="Email address"
					type="email"
				/>
				<button class="bg-primary text-white p-2 rounded-lg"
					><span class="material-symbols-outlined">send</span></button
				>
			</div>
		</div>
	</div>
	<div
		class="mx-auto max-w-[1200px] mt-16 pt-8 border-t border-primary/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400"
	>
		<p>© 2024 {siteConfig.name}. All rights reserved.</p>
		<div class="flex gap-8">
			<a class="hover:text-primary" href="/privacy">Privacy Policy</a>
			<a class="hover:text-primary" href="/terms">Terms of Service</a>
		</div>
	</div>
</footer>
