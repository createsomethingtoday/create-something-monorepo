<script lang="ts">
	import { slide } from 'svelte/transition';

	let isMenuOpen = $state(false);
</script>

<nav class="fixed top-0 left-0 right-0 z-50 bg-black border-b border-white/10">
	<div class="max-w-7xl mx-auto px-6">
		<div class="flex items-center justify-between py-4">
			<!-- Logo -->
			<a href="/" class="flex items-center">
				<div class="text-2xl font-bold text-white hover:text-white/80 transition-colors">
					CREATE SOMETHING AGENCY
				</div>
			</a>

			<!-- Desktop Navigation -->
			<div class="hidden md:flex items-center gap-8">
				<a
					href="/"
					class="text-white/80 hover:text-white transition-colors text-sm font-medium"
				>
					Home
				</a>
				<a
					href="/services"
					class="text-white/80 hover:text-white transition-colors text-sm font-medium"
				>
					Services
				</a>
				<a
					href="/work"
					class="text-white/80 hover:text-white transition-colors text-sm font-medium"
				>
					Our Work
				</a>
				<a
					href="/about"
					class="text-white/80 hover:text-white transition-colors text-sm font-medium"
				>
					About
				</a>

				<!-- Contact Button -->
				<a
					href="/contact"
					class="group relative px-6 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all overflow-hidden"
				>
					<span class="relative z-10">Contact</span>
					<div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
				</a>
			</div>

			<!-- Mobile Menu Button -->
			<button
				onclick={() => isMenuOpen = !isMenuOpen}
				class="md:hidden w-11 h-11 flex items-center justify-center text-white hover:text-white/80 transition-colors duration-150"
				aria-label={isMenuOpen ? "Close menu" : "Open menu"}
			>
				{#if isMenuOpen}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Mobile Menu -->
		{#if isMenuOpen}
			<div transition:slide={{ duration: 200 }} class="md:hidden py-4 border-t border-white/10">
				<div class="flex flex-col gap-4">
					<a
						href="/"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium py-2"
						onclick={() => isMenuOpen = false}
					>
						Home
					</a>
					<a
						href="/services"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium py-2"
						onclick={() => isMenuOpen = false}
					>
						Services
					</a>
					<a
						href="/work"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium py-2"
						onclick={() => isMenuOpen = false}
					>
						Our Work
					</a>
					<a
						href="/about"
						class="text-white/80 hover:text-white transition-colors text-sm font-medium py-2"
						onclick={() => isMenuOpen = false}
					>
						About
					</a>
					<a
						href="/contact"
						class="px-6 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-colors text-center"
						onclick={() => isMenuOpen = false}
					>
						Contact
					</a>
				</div>
			</div>
		{/if}
	</div>
</nav>
