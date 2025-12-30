<script lang="ts">
	/**
	 * Navigation Component
	 *
	 * Centered logo layout using exact Webflow pattern:
	 * - CSS Grid with 15rem gap creates space for logo
	 * - Logo absolutely positioned in center
	 * - Two columns: left links | right links
	 */

	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	let isMenuOpen = $state(false);
	let isVisible = $state(false);

	const leftLinks = [
		{ href: '/book', label: 'book a court' },
		{ href: '/locations', label: 'locations' }
	];

	const rightLinks = [
		{ href: '/team', label: 'meet our team' },
		{ href: '/contact', label: 'Contact' }
	];

	onMount(() => {
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
		<nav class="navbar">
			<div class="nav_wrap">
				<!-- Center Logo (absolute positioned) -->
				<a href="/" class="nav_brand">
					<img
						src="/images/logo.png"
						loading="lazy"
						alt="The Stack Indoor Pickleball"
						class="nav_logo"
					/>
				</a>

				<!-- Grid container for links -->
				<div class="nav_menu-items-inner">
					<!-- Left Links -->
					<div class="nav_menu-link-wrap is-left">
						{#each leftLinks as link}
							<a href={link.href} class="nav_link">
								<span class="z-index-2">{link.label}</span>
								<div class="link_line"></div>
							</a>
						{/each}
					</div>

					<!-- Right Links -->
					<div class="nav_menu-link-wrap is-right">
						{#each rightLinks as link}
							<a href={link.href} class="nav_link">
								<span class="z-index-2">{link.label}</span>
								<div class="link_line"></div>
							</a>
						{/each}
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

			<!-- Mobile Menu -->
			<div class="nav_menu-mobile" class:is-open={isMenuOpen}>
				{#each [...leftLinks, ...rightLinks] as link}
					<a href={link.href} class="nav_link-mobile">
						{link.label}
					</a>
				{/each}
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
		border-bottom: 1px solid var(--light-grey);
	}

	.navbar {
		width: 100%;
		height: 6rem; /* Exact Webflow height */
	}

	/* Webflow .nav_wrap pattern */
	.nav_wrap {
		justify-content: center;
		align-items: center;
		width: 100%;
		max-width: 72.875rem; /* 1166px exact */
		height: 100%;
		display: flex;
		position: relative;
		margin: 0 auto;
		padding: 0 2rem;
	}

	/* Logo absolutely positioned in center */
	.nav_brand {
		z-index: 100;
		width: 10.5625rem; /* Exact Webflow width */
		position: absolute;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.nav_logo {
		width: 100%;
		height: auto;
	}

	/* Grid container for left/right links - exact Webflow pattern */
	.nav_menu-items-inner {
		grid-column-gap: 15rem; /* KEY: Creates space for logo */
		grid-template-columns: 1fr 1fr;
		justify-content: space-between;
		width: 100%;
		display: grid;
	}

	/* Link wrapper - exact Webflow pattern */
	.nav_menu-link-wrap {
		gap: 3rem;
		width: 20rem;
		display: flex;
	}

	.nav_menu-link-wrap.is-left {
		justify-content: flex-start;
	}

	.nav_menu-link-wrap.is-right {
		justify-content: flex-end;
	}

	/* Nav links - exact Webflow pattern */
	.nav_link {
		position: relative;
		text-decoration: none;
		text-transform: uppercase;
		font-family: var(--font-coolvetica);
		font-size: 1.125rem; /* Exact Webflow size */
		letter-spacing: 0.04em;
		color: var(--black);
		padding: 0.5rem 0;
		white-space: nowrap;
	}

	.link_line {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 1px;
		background-color: var(--black);
		transform: scaleX(0);
		transform-origin: right;
		transition: transform 0.3s var(--ease-stack);
	}

	.nav_link:hover .link_line {
		transform: scaleX(1);
		transform-origin: left;
	}

	/* Hamburger Button */
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
		position: absolute;
		right: 1rem;
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

	/* Mobile Menu */
	.nav_menu-mobile {
		display: none;
		flex-direction: column;
		background-color: var(--white);
		padding: 1rem 2rem 2rem;
		border-top: 1px solid var(--light-grey);
	}

	.nav_menu-mobile.is-open {
		display: flex;
	}

	.nav_link-mobile {
		text-decoration: none;
		text-transform: uppercase;
		font-family: var(--font-coolvetica);
		font-size: 1.25rem;
		letter-spacing: 0.04em;
		color: var(--black);
		padding: 1rem 0;
		border-bottom: 1px solid var(--light-grey);
	}

	/* Tablet Breakpoint */
	@media (max-width: 991px) {
		.navbar {
			height: 4.5rem;
		}

		.nav_wrap {
			justify-content: center;
			padding: 0.75rem 1rem;
			position: relative;
		}

		.nav_menu-items-inner {
			display: none;
		}

		.nav_button {
			display: flex;
		}

		.nav_brand {
			position: relative;
			margin: 0 auto;
		}
	}
</style>
