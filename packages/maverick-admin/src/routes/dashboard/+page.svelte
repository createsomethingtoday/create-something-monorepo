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

	function formatDate(date: unknown): string {
		return new Date(String(date)).toLocaleDateString();
	}
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

			<!-- Mobile Card Layout -->
			<div class="contacts-cards">
				{#each data.recentContacts as contact}
					<a href="/dashboard/contacts/{contact.id}" class="contact-card card">
						<div class="contact-card-header">
							<span class="contact-name">{contact.name}</span>
							<span class="badge badge-{contact.status === 'new' ? 'warning' : 'success'}">{contact.status}</span>
						</div>
						<div class="contact-card-details">
							{#if contact.company}
								<span class="contact-company">{contact.company}</span>
							{/if}
							<span class="badge badge-{contact.category || 'primary'}">{contact.category || 'general'}</span>
						</div>
						<div class="contact-card-footer">
							<span class="contact-date">{formatDate(contact.created_at)}</span>
						</div>
					</a>
				{/each}
			</div>

			<!-- Desktop Table Layout -->
			<div class="card contacts-table-wrapper">
				<table class="contacts-table">
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
								<td class="cell-muted">{formatDate(contact.created_at)}</td>
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

	/* Mobile Card Layout for Contacts */
	.contacts-cards {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.contacts-table-wrapper {
		display: none;
	}

	@media (min-width: 768px) {
		.contacts-cards {
			display: none;
		}

		.contacts-table-wrapper {
			display: block;
		}
	}

	.contact-card {
		display: block;
		text-decoration: none;
		color: inherit;
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.contact-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.contact-card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-xs);
	}

	.contact-name {
		font-weight: 600;
		color: var(--color-fg-primary);
	}

	.contact-card-details {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-xs);
		margin-bottom: var(--space-xs);
	}

	.contact-company {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-secondary);
	}

	.contact-card-footer {
		display: flex;
		justify-content: flex-end;
	}

	.contact-date {
		font-size: var(--text-body-sm, 0.875rem);
		color: var(--color-fg-muted);
	}
</style>
