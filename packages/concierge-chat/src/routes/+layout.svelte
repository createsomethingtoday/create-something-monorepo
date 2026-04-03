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

	const navItems = [
		{ href: '/', label: 'Home' },
		{ href: '/apply', label: 'Apply' },
		{ href: '/chat', label: 'Workspace' },
		{ href: '/settings', label: 'Settings' }
	];

	$: controlPlaneTone = getAgencyAccessTone(data.agencyAccess);
	$: controlPlaneHref = buildControlPlaneBridgeHref(
		getAgencyAccessControlPlaneSurface(data.agencyAccess)
	);
	$: controlPlaneLabel = getAgencyAccessStatusLabel(data.agencyAccess);
	$: controlPlaneMeta = getAgencyAccessMeta(data.agencyAccess, data.user);
</script>

<div class="app-shell">
	<header class="app-nav glass">
		<div>
			<div class="eyebrow">CREATE SOMETHING .agency</div>
			<div class="brand">Abundance Concierge</div>
			<div class="brand-note">Nurse staffing product plane</div>
		</div>

		<div class="nav-cluster">
			<nav>
				{#each navItems as item}
					<a href={item.href}>{item.label}</a>
				{/each}
			</nav>

			<a
				class={`session-link ${data.agencyAccess.status}`}
				href={controlPlaneHref}
				target="_blank"
				rel="noreferrer"
			>
				<span class={`status-pill ${controlPlaneTone}`}>{controlPlaneLabel}</span>
				<span class="session-meta">{controlPlaneMeta}</span>
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
	}

	.brand {
		font-family: var(--font-display);
		font-size: 1.45rem;
		letter-spacing: -0.04em;
		margin-top: 0.55rem;
	}

	.brand-note {
		margin-top: 0.3rem;
		color: var(--muted);
		font-size: 0.92rem;
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
		font-size: 0.76rem;
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
	}
</style>
