<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const stats = [
		{ label: 'Solutions', value: data.solutionCount ?? 0, brand: 'primary' },
		{ label: 'News Articles', value: data.newsCount ?? 0, brand: 'primary' },
		{ label: 'Testimonials', value: data.testimonialCount ?? 0, brand: 'primary' },
		{ label: 'New Contacts', value: data.newContactCount ?? 0, brand: 'warning' },
	];

	const quickActions = [
		{ label: 'Add Solution', href: '/dashboard/solutions/new', brand: 'lithx' },
		{ label: 'Add Article', href: '/dashboard/news/new', brand: 'petrox' },
		{ label: 'View Contacts', href: '/dashboard/contacts', brand: 'dme' },
	];
</script>

<svelte:head>
	<title>Dashboard | Maverick X Admin</title>
</svelte:head>

<div class="dashboard-page">
	<header class="page-header">
		<h1 class="page-title">Dashboard</h1>
		<p class="page-subtitle">Maverick X content management</p>
	</header>

	<!-- Stats Grid -->
	<div class="stats-grid">
		{#each stats as stat}
			<div class="card stat-card">
				<p class="stat-label">{stat.label}</p>
				<p class="stat-value">{stat.value}</p>
			</div>
		{/each}
	</div>

	<!-- Quick Actions -->
	<section class="section">
		<h2 class="section-title">Quick Actions</h2>
		<div class="actions-row">
			{#each quickActions as action}
				<a href={action.href} class="btn btn-secondary">
					{action.label}
				</a>
			{/each}
		</div>
	</section>

	<!-- Recent Contacts -->
	{#if data.recentContacts && data.recentContacts.length > 0}
		<section class="section">
			<div class="section-header">
				<h2 class="section-title">Recent Contacts</h2>
				<a href="/dashboard/contacts" class="view-all-link">View all</a>
			</div>
			<div class="card">
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Company</th>
							<th>Category</th>
							<th>Date</th>
							<th>Status</th>
						</tr>
					</thead>
					<tbody>
						{#each data.recentContacts as contact}
							<tr>
								<td>
									<a href="/dashboard/contacts/{contact.id}" class="contact-link">{contact.name}</a>
								</td>
								<td class="cell-secondary">{contact.company || '—'}</td>
								<td>
									<span class="badge badge-{contact.category || 'primary'}">{contact.category || 'general'}</span>
								</td>
								<td class="cell-muted">{new Date(contact.created_at).toLocaleDateString()}</td>
								<td>
									<span class="badge badge-{contact.status === 'new' ? 'warning' : 'success'}">{contact.status}</span>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/if}
</div>

<style>
	.dashboard-page {
		padding: var(--space-lg);
	}

	.page-header {
		margin-bottom: var(--space-lg);
	}

	.page-title {
		font-size: var(--text-h2, 1.5rem);
		font-weight: 700;
	}

	.page-subtitle {
		color: var(--color-fg-secondary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(1, 1fr);
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
	}

	@media (min-width: 768px) {
		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.stats-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	.stat-card {
		/* inherits from .card in app.css */
	}

	.stat-label {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted);
	}

	.stat-value {
		font-size: var(--text-h1, 2rem);
		font-weight: 700;
		margin-top: 0.25rem;
	}

	.section {
		margin-bottom: var(--space-lg);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
	}

	.section-title {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		margin-bottom: var(--space-sm);
	}

	.section-header .section-title {
		margin-bottom: 0;
	}

	.actions-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.view-all-link {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-primary);
	}

	.contact-link:hover {
		text-decoration: underline;
	}

	.cell-secondary {
		color: var(--color-fg-secondary);
	}

	.cell-muted {
		color: var(--color-fg-muted);
	}
</style>
