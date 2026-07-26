<script lang="ts">
	type SecurityAdminSection =
		| 'overview'
		| 'bearer-tokens'
		| 'contracts'
		| 'commercial'
		| 'partners'
		| 'seeds'
		| 'audit';

	export let current: SecurityAdminSection;

	const destinations: Array<{ id: SecurityAdminSection; href: string; label: string }> = [
		{ id: 'overview', href: '/admin/security', label: 'Overview' },
		{ id: 'bearer-tokens', href: '/admin/security/bearer-tokens', label: 'Bearer access' },
		{ id: 'contracts', href: '/admin/security/contracts', label: 'Contracts' },
		{ id: 'commercial', href: '/admin/security/commercial', label: 'Commercial' },
		{ id: 'partners', href: '/admin/security/partners', label: 'Partner bindings' },
		{ id: 'seeds', href: '/admin/security/seeds', label: 'User seeds' },
		{ id: 'audit', href: '/admin/security/audit', label: 'Audit' }
	];
</script>

<nav aria-label="Security operations">
	{#each destinations as destination}
		<a
			href={destination.href}
			aria-current={destination.id === current ? 'page' : undefined}
		>
			{destination.label}
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1rem;
		margin-top: 1rem;
	}

	a {
		color: inherit;
		text-decoration: none;
		padding: 0.25rem 0;
		border-bottom: 1px solid transparent;
	}

	a[aria-current='page'] {
		border-color: var(--color-performance-focus);
	}

	a:focus-visible {
		outline: 2px solid var(--color-performance-focus);
		outline-offset: 3px;
	}
</style>
