<script lang="ts">
	/**
	 * Navigation Component
	 *
	 * Animated navbar with:
	 * - Slide-in animation on load
	 * - Hamburger menu on tablet/mobile
	 * - Link underline animations
	 */

	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let isMenuOpen = $state(false);
	let isVisible = $state(false);

	const navLinks = [
		{ href: '/locations', label: 'book a court' },
		{ href: '/team', label: 'meet our team' },
		{ href: '/about', label: 'become a member' },
		{ href: '/contact', label: 'Contact' }
	];

	onMount(() => {
		// Trigger slide-in animation after mount
		setTimeout(() => {
			isVisible = true;
		}, 100);
	});

	function toggleMenu() {
		isMenuOpen = !isMenuOpen;
	}
</script>

{#if isVisible}
	<div class="nav_wrapper" transition:fly={{ y: -100, duration: 600 }}>
		<nav class="navbar" role="navigation">
			<div class="nav_wrap">
				<!-- Logo -->
				<a href="/" class="nav_brand">
					<img src="/images/logo.png" alt="The Stack" class="nav_logo" loading="lazy" />
					<div class="link_line"></div>
				</a>

				<!-- Desktop Navigation -->
				<div class="nav_menu-items" class:is-open={isMenuOpen}>
					<div class="nav_menu-items-inner">
						<div class="nav_menu-link-wrap is-left">
							{#each navLinks.slice(0, 2) as link}
								<a href={link.href} class="nav_link">
									<span class="z-index-2">{link.label}</span>
									<div class="link_line"></div>
								</a>
							{/each}
						</div>
						<div class="nav_menu-link-wrap">
							{#each navLinks.slice(2) as link}
								<a href={link.href} class="nav_link">
									<span class="z-index-2">{link.label}</span>
									<div class="link_line"></div>
								</a>
							{/each}
						</div>
					</div>
				</div>

				<!-- Hamburger Button -->
				<button
					class="nav_button"
					class:is-open={isMenuOpen}
					onclick={toggleMenu}
					aria-label="Toggle menu"
					aria-expanded={isMenuOpen}
				>
					<div class="nav_button-inner">
						<div class="nav_button-line is-top"></div>
						<div class="nav_button-line is-middle"></div>
						<div class="nav_button-line is-bottom"></div>
					</div>
				</button>
			</div>
		</nav>
	</div>
{/if}

<style>
	.nav_wrapper {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		background-color: var(--white);
	}

	.navbar {
		width: 100%;
	}

	.nav_wrap {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 90%;
		max-width: var(--container-max);
		margin: 0 auto;
		height: var(--nav-height);
	}

	.nav_brand {
		position: relative;
		text-decoration: none;
	}

	.nav_logo {
		height: 2.5rem;
		width: auto;
	}

	.nav_menu-items {
		display: flex;
		align-items: center;
	}

	.nav_menu-items-inner {
		display: flex;
		align-items: center;
		gap: 3rem;
	}

	.nav_menu-link-wrap {
		display: flex;
		gap: 2rem;
	}

	.nav_link {
		position: relative;
		text-decoration: none;
		text-transform: uppercase;
		font-size: 0.875rem;
		letter-spacing: 0.02em;
		padding: 0.5rem 0;
	}

	.nav_button {
		display: none;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		width: 2.5rem;
		height: 2.5rem;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.nav_button-inner {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 6px;
		width: 1.5rem;
	}

	.nav_button-line {
		width: 100%;
		height: 2px;
		background-color: var(--black);
		transition: transform 0.3s var(--ease-stack), opacity 0.3s var(--ease-stack);
	}

	.nav_button.is-open .nav_button-line.is-top {
		transform: translateY(8px) rotate(45deg);
	}

	.nav_button.is-open .nav_button-line.is-middle {
		opacity: 0;
	}

	.nav_button.is-open .nav_button-line.is-bottom {
		transform: translateY(-8px) rotate(-45deg);
	}

	/* Tablet Breakpoint */
	@media (max-width: 991px) {
		.nav_button {
			display: flex;
		}

		.nav_menu-items {
			position: fixed;
			top: var(--nav-height);
			left: 0;
			right: 0;
			bottom: 0;
			background-color: var(--white);
			flex-direction: column;
			justify-content: flex-start;
			padding: 2rem;
			transform: translateX(100%);
			transition: transform 0.4s var(--ease-stack);
		}

		.nav_menu-items.is-open {
			transform: translateX(0);
		}

		.nav_menu-items-inner {
			flex-direction: column;
			gap: 1rem;
			width: 100%;
		}

		.nav_menu-link-wrap {
			flex-direction: column;
			width: 100%;
			gap: 0;
		}

		.nav_link {
			font-size: 1.5rem;
			padding: 1rem 0;
			border-bottom: 1px solid var(--light-grey);
		}
	}
</style>
