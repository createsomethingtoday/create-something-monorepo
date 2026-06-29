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
	<div>
		<div class="eyebrow">Nurse Staffing</div>
		<div class="brand">Abundance Staffing</div>
		<div class="brand-note">Guided nurse applications and recruiter-gated staffing</div>
	</div>

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
		gap: 1rem;
		padding: 1rem 1.1rem;
		margin-bottom: 1rem;
		position: sticky;
		top: 1rem;
		z-index: 10;
		border-radius: var(--radius);
	}

	.brand {
		font-family: var(--font-display);
		font-size: var(--text-h3, 1.2rem);
		font-weight: var(--font-medium, 500);
		line-height: var(--leading-tight, 1.25);
		letter-spacing: 0;
		margin-top: 0.55rem;
	}

	.brand-note {
		margin-top: 0.3rem;
		color: var(--muted);
		font-size: var(--text-body-sm, 0.913rem);
		line-height: var(--leading-normal, 1.5);
	}

	nav {
		display: flex;
		gap: 0.8rem;
		flex-wrap: wrap;
	}

	.nav-cluster {
		display: grid;
		gap: 0.75rem;
		justify-items: end;
	}

	nav a {
		padding: 0.55rem 0.9rem;
		border-radius: 999px;
		text-decoration: none;
		background: var(--surface-overlay);
		border: 1px solid var(--line);
			color: var(--ink-soft);
			font-family: var(--font-mono);
			font-size: 0.72rem;
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
		padding: 0.55rem 0.95rem;
		border-radius: var(--radius-tight);
		background: var(--surface-soft);
		border: 1px solid var(--line);
	}

	.session-public-label {
			color: var(--accent-warm);
			font-family: var(--font-mono);
			font-size: 0.72rem;
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
