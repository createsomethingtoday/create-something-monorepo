<script lang="ts">
	import {
		getAgencyAccessControlPlaneSurface,
		getAgencyAccessMeta,
		getAgencyAccessStatusLabel,
		getAgencyAccessTone
	} from '$lib/agency-access';
	import { buildControlPlaneBridgeHref } from '$lib/control-plane';
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
	$: isPublicIntakeRoute =
		data.currentPath === '/' ||
		data.currentPath === '/nurses' ||
		data.currentPath === '/jobs' ||
		data.currentPath === '/facilities' ||
		data.currentPath === '/agents' ||
		data.currentPath === '/style-guide' ||
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
					{ href: '/style-guide', label: 'Style' },
					{ href: '/apply', label: 'Start' }
				]
		: [
				{ href: '/', label: 'Home' },
				{ href: '/nurses', label: 'Nurses' },
				{ href: '/jobs', label: 'Jobs' },
				{ href: '/facilities', label: 'Facilities' },
				{ href: '/apply', label: 'Apply' },
				{ href: '/agents', label: 'Agents' },
				{ href: '/chat', label: 'Workspace' },
				{ href: '/settings', label: 'Settings' }
			];
</script>

<div class="app-shell">
	<header class="app-nav glass">
		<a class="brand-lockup" href="/">
			<span class="brand-mark" aria-hidden="true">A</span>
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

	<main>
		<slot />
	</main>
</div>

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
		background: var(--ink);
		color: var(--button-ink);
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: var(--font-medium, 500);
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

	@media (max-width: 760px) {
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
