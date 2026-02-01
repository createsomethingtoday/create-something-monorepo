<script lang="ts">
	/**
	 * HeroSection Component
	 *
	 * Full-bleed hero with gradient overlay, headline, and CTA
	 * Includes scroll indicator animation
	 */

	interface Props {
		headline: string;
		subheadline: string;
		ctaText: string;
		ctaHref: string;
		backgroundImage: string;
	}

	let { headline, subheadline, ctaText, ctaHref, backgroundImage }: Props = $props();
</script>

<section class="relative h-screen min-h-[700px] w-full overflow-hidden flex flex-col">
	<!-- Hero Background -->
	<div class="absolute inset-0 z-0">
		<img src={backgroundImage} alt="Hero background" class="w-full h-full object-cover" />
		<div class="hero-overlay absolute inset-0"></div>
	</div>

	<!-- Hero Content -->
	<div
		class="relative z-10 flex-grow flex flex-col justify-center items-center text-center px-4 fade-up"
		style="animation-delay: 0.2s;"
	>
		<h1 class="text-6xl md:text-8xl lg:text-9xl font-bold text-white tracking-tight mb-6">
			{headline}
		</h1>
		<p class="text-lg md:text-2xl text-white/80 max-w-2xl mx-auto font-light leading-relaxed">
			{subheadline}
		</p>
		<div class="mt-10">
			<a href={ctaHref} class="btn-primary">
				{ctaText}
			</a>
		</div>
	</div>

	<!-- Scroll Indicator -->
	<div class="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 text-white animate-bounce">
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			class="w-6 h-6"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
		</svg>
	</div>
</section>
