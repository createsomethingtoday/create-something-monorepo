<script lang="ts">
	import {
		getAgencyAccessControlPlaneSurface,
		getAgencyAccessMeta,
		getAgencyAccessStatusLabel,
		getAgencyAccessTone
	} from '$lib/agency-access';
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
	import AbundanceFooter from '$lib/site/AbundanceFooter.svelte';
	import type { LayoutData } from './$types';
	import '../app.css';

	export let data: LayoutData;

	$: controlPlaneTone = getAgencyAccessTone(data.agencyAccess);
	$: controlPlaneHref = buildControlPlaneBridgeHref(
		getAgencyAccessControlPlaneSurface(data.agencyAccess)
	);
	$: controlPlaneLabel = getAgencyAccessStatusLabel(data.agencyAccess);
	$: controlPlaneMeta = getAgencyAccessMeta(data.agencyAccess, data.user);
	$: showInternalNavigation = data.agencyAccess.status === 'allowed';
	$: usesWebflowShell =
		data.currentPath === '/' ||
		data.currentPath === '/nurses' ||
		data.currentPath === '/jobs' ||
		data.currentPath === '/facilities' ||
		data.currentPath === '/agents' ||
		data.currentPath === '/apply' ||
		data.currentPath.startsWith('/apply/') ||
		data.currentPath === '/style-guide';
	$: isPublicIntakeRoute =
		data.currentPath === '/' ||
		data.currentPath === '/nurses' ||
		data.currentPath === '/jobs' ||
		data.currentPath === '/facilities' ||
		data.currentPath === '/agents' ||
		data.currentPath === '/apply' ||
		data.currentPath.startsWith('/apply/');
	$: showCompactStaffAccess = isPublicIntakeRoute || !showInternalNavigation;
	$: navItems = isPublicIntakeRoute || !showInternalNavigation
		? [
					{ href: '/', label: 'Home' },
					{ href: '/nurses', label: 'Nurses' },
					{ href: '/jobs', label: 'Jobs' },
					{ href: '/facilities', label: 'Facilities' },
					{ href: '/agents', label: 'Agents' },
					{ href: '/apply', label: 'Start' }
				]
		: [
				{ href: '/', label: 'Home' },
				{ href: '/nurses', label: 'Nurses' },
				{ href: '/jobs', label: 'Jobs' },
				{ href: '/facilities', label: 'Facilities' },
				{ href: '/apply', label: 'Apply' },
				{ href: '/agents', label: 'Agents' },
				{ href: '/style-guide', label: 'Style' },
				{ href: '/chat', label: 'Workspace' },
				{ href: '/settings', label: 'Settings' }
			];
</script>

{#if usesWebflowShell}
	<div class="abundance-webflow-page">
		<header class="webflow-nav">
			<a class="webflow-logo" href="/" aria-label="Abundance Staffing home">
				<span class="webflow-logo-mark">
					<img src="/abundance/logo-mark.svg" alt="" class="webflow-logo-image" aria-hidden="true" />
				</span>
				<span>Abundance Staffing</span>
			</a>
			<nav class="webflow-nav-links" aria-label="Public navigation">
				{#each navItems as item}
					<a href={item.href}>{item.label}</a>
				{/each}
			</nav>
			<a class="button-03 w-inline-block webflow-staff-link" href={controlPlaneHref} target="_blank" rel="noreferrer">
				<div class="button-outside-wrap">
					<div class="btn-text-outside-03">
						<div class="btn-text-inside-03">
							<div class="button-text-03">Staff sign-in</div>
							<div class="button-text-03">Staff sign-in</div>
						</div>
					</div>
				</div>
			</a>
		</header>

		<main class:public-main={isPublicIntakeRoute}>
			<slot />
		</main>
	</div>
{:else}
	<div class="app-shell">
		<header class="app-nav glass">
			<a class="brand-lockup" href="/">
				<span class="brand-mark" aria-hidden="true">
					<img src="/abundance/logo-mark.svg" alt="" class="brand-mark-image" aria-hidden="true" />
				</span>
				<span>
					<span class="brand">Abundance Staffing</span>
					<span class="brand-note">Nurse staffing</span>
				</span>
			</a>

			<div class="nav-cluster">
				<nav>
					{#each navItems as item}
						<a href={item.href}>{item.label}</a>
					{/each}
				</nav>

				<a
					class={`session-link ${data.agencyAccess.status} ${showCompactStaffAccess ? 'public' : ''}`}
					href={controlPlaneHref}
					target="_blank"
					rel="noreferrer"
				>
					{#if showCompactStaffAccess}
						<span class="session-public-label">Staff sign-in</span>
					{:else}
						<span class={`status-pill ${controlPlaneTone}`}>{controlPlaneLabel}</span>
						<span class="session-meta">{controlPlaneMeta}</span>
					{/if}
				</a>
			</div>
		</header>

		<main class:public-main={isPublicIntakeRoute}>
			<slot />
		</main>
	</div>
{/if}

{#if isPublicIntakeRoute}
	<AbundanceFooter />
{/if}

<style>
	.app-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
		padding: 0.8rem 0.9rem;
		margin-bottom: clamp(1.4rem, 3vw, 2.4rem);
		position: sticky;
		top: 1rem;
		z-index: 10;
		border-radius: var(--radius);
	}

	.brand-lockup {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		min-width: max-content;
		text-decoration: none;
	}

	.brand-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.2rem;
		height: 2.2rem;
		border-radius: 999px;
		background: #fffaf4;
		border: 1px solid rgba(175, 124, 84, 0.18);
		overflow: hidden;
	}

	.brand-mark-image {
		width: 1.62rem;
		height: 1.62rem;
		object-fit: contain;
		display: block;
	}

	.brand {
		display: block;
		font-family: var(--font-display);
		font-size: var(--text-body-lg, 1.05rem);
		font-weight: var(--font-medium, 500);
		line-height: 1.05;
		letter-spacing: 0;
	}

	.brand-note {
		display: block;
		margin-top: 0.15rem;
		color: var(--muted);
		font-size: 0.78rem;
		line-height: 1.2;
	}

	nav {
		display: flex;
		gap: 0.45rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.nav-cluster {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.55rem;
		flex-wrap: wrap;
	}

	nav a {
		padding: 0.52rem 0.78rem;
		border-radius: 999px;
		text-decoration: none;
		background: transparent;
		border: 1px solid var(--line);
			color: var(--ink-soft);
			font-family: var(--font-mono);
			font-size: 0.68rem;
			line-height: 1;
			letter-spacing: 0.08em;
		text-transform: uppercase;
		transition:
			background 140ms ease,
			border-color 140ms ease,
			transform 140ms ease;
	}

	nav a:hover {
		background: var(--surface-overlay-strong);
		border-color: var(--line-strong);
		transform: translateY(-1px);
	}

	.session-link {
		display: grid;
		gap: 0.35rem;
		justify-items: end;
		text-decoration: none;
	}

	.session-link.public {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.52rem 0.86rem;
		border-radius: 999px;
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.session-public-label {
			color: var(--accent-warm);
			font-family: var(--font-mono);
			font-size: 0.68rem;
			line-height: 1;
			letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.session-meta {
		color: var(--muted);
		font-size: 0.82rem;
	}

	main {
		padding-bottom: 3rem;
	}

	main.public-main {
		padding-bottom: 0;
	}

	.abundance-webflow-page :global(.container-full) {
		width: 100%;
	}

	.webflow-nav {
		position: sticky;
		top: 20px;
		z-index: 20;
		display: grid;
		grid-template-columns: minmax(180px, 1fr) auto minmax(140px, 1fr);
		align-items: center;
		gap: 20px;
		width: calc(100% - 60px);
		max-width: 1340px;
		margin: 30px auto 0;
		padding: 10px;
		border: 1px solid var(--black-10, #0202021a);
		border-radius: 999px;
		background: rgba(250, 245, 239, 0.88);
		backdrop-filter: blur(18px);
	}

	.webflow-logo,
	.webflow-nav-links,
	.webflow-staff-link {
		position: relative;
		z-index: 1;
	}

	.webflow-logo {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--black, #020202);
		font-size: 16px;
		line-height: 1;
		font-weight: 500;
		text-decoration: none;
	}

	.webflow-logo-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		background: #fffaf4;
		border: 1px solid rgba(175, 124, 84, 0.18);
		overflow: hidden;
	}

	.webflow-logo-image {
		display: block;
		width: 25px;
		height: 25px;
		object-fit: contain;
	}

	.webflow-nav-links {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
	}

	.webflow-nav-links a {
		padding: 10px 14px;
		border-radius: 999px;
		color: var(--black, #020202);
		font-size: 12px;
		line-height: 1;
		letter-spacing: 0.08em;
		text-decoration: none;
		text-transform: uppercase;
	}

	.webflow-nav-links a:hover {
		background: var(--secondary-12, #af7c541f);
	}

	.webflow-staff-link {
		justify-self: end;
		text-decoration: none;
	}

	@media (max-width: 760px) {
		.webflow-nav {
			position: relative;
			top: 0;
			grid-template-columns: 1fr;
			width: calc(100% - 30px);
			margin-top: 15px;
			border-radius: 20px;
		}

		.webflow-nav-links {
			justify-content: flex-start;
			flex-wrap: wrap;
		}

		.webflow-staff-link {
			justify-self: start;
		}

		.app-nav {
			flex-direction: column;
			align-items: stretch;
		}

		.nav-cluster,
		nav {
			justify-content: space-between;
			justify-items: stretch;
		}

		.session-link {
			justify-items: start;
		}

		.session-link.public {
			justify-content: flex-start;
		}
	}
</style>
