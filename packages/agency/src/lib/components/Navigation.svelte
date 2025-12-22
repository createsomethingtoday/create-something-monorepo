<script lang="ts">
	let isMenuOpen = $state(false);
</script>

<nav class="nav fixed top-0 left-0 right-0 z-50">
	<div class="max-w-7xl mx-auto px-6">
		<div class="flex items-center justify-between py-4">
			<!-- Logo -->
			<a href="/" class="flex items-center">
				<div class="logo">
					CREATE SOMETHING AGENCY
				</div>
			</a>

			<!-- Desktop Navigation -->
			<ul class="nav-list hidden md:flex items-center gap-8">
				<li>
					<a href="/" class="nav-link">
						Home
					</a>
				</li>
				<li>
					<a href="/services" class="nav-link">
						Services
					</a>
				</li>
				<li>
					<a href="/work" class="nav-link">
						Our Work
					</a>
				</li>
				<li>
					<a href="/about" class="nav-link">
						About
					</a>
				</li>
				<li>
					<!-- Contact Button -->
					<a href="/contact" class="contact-btn group relative px-6 py-2 overflow-hidden">
						<span class="relative z-10">Contact</span>
						<div class="contact-btn-overlay absolute inset-0 translate-y-full group-hover:translate-y-0"></div>
					</a>
				</li>
			</ul>

			<!-- Mobile Menu Button -->
			<button
				onclick={() => isMenuOpen = !isMenuOpen}
				class="menu-btn md:hidden w-11 h-11 flex items-center justify-center"
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
			<div class="mobile-menu animate-slide-down md:hidden py-4">
				<ul class="mobile-nav-list flex flex-col gap-4">
					<li>
						<a href="/" class="mobile-link py-2" onclick={() => isMenuOpen = false}>
							Home
						</a>
					</li>
					<li>
						<a href="/services" class="mobile-link py-2" onclick={() => isMenuOpen = false}>
							Services
						</a>
					</li>
					<li>
						<a href="/work" class="mobile-link py-2" onclick={() => isMenuOpen = false}>
							Our Work
						</a>
					</li>
					<li>
						<a href="/about" class="mobile-link py-2" onclick={() => isMenuOpen = false}>
							About
						</a>
					</li>
					<li>
						<a href="/contact" class="mobile-contact-btn px-6 py-2 text-center" onclick={() => isMenuOpen = false}>
							Contact
						</a>
					</li>
				</ul>
			</div>
		{/if}
	</div>
</nav>

<style>
	.nav {
		background: var(--color-bg-pure);
		border-bottom: 1px solid var(--color-border-default);
	}

	.nav-list,
	.mobile-nav-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.logo {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-fg-primary);
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.logo:hover {
		color: var(--color-fg-secondary);
	}

	.nav-link {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: 500;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.nav-link:hover {
		color: var(--color-fg-primary);
	}

	.contact-btn {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: background var(--duration-standard) var(--ease-standard);
	}

	.contact-btn:hover {
		background: var(--color-fg-primary);
	}

	.contact-btn-overlay {
		background: var(--color-border-emphasis);
		transition: transform var(--duration-standard) var(--ease-standard);
	}

	.menu-btn {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.menu-btn:hover {
		color: var(--color-fg-secondary);
	}

	.mobile-menu {
		border-top: 1px solid var(--color-border-default);
	}

	.mobile-link {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		font-weight: 500;
		transition: color var(--duration-standard) var(--ease-standard);
	}

	.mobile-link:hover {
		color: var(--color-fg-primary);
	}

	.mobile-contact-btn {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-body-sm);
		font-weight: 600;
		border-radius: var(--radius-full);
		transition: all var(--duration-standard) var(--ease-standard);
	}

	.mobile-contact-btn:hover {
		background: var(--color-fg-primary);
	}

	/* Slide down animation for mobile menu */
	.animate-slide-down {
		animation: slide-down 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-slide-down {
			animation: none;
		}
	}
</style>
