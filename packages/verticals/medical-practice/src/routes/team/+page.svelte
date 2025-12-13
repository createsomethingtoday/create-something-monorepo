<script lang="ts">
	import { siteConfig } from '$lib/config/context';
</script>

<svelte:head>
	<title>Our Team - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Meet our board-certified physicians, nurse practitioners, and medical staff dedicated to your health."
	/>
</svelte:head>

<section class="page-header">
	<div class="container">
		<h1>Meet Our Team</h1>
		<p class="lead">
			Board-certified physicians and experienced healthcare professionals committed to your
			wellbeing.
		</p>
	</div>
</section>

<section class="providers">
	<div class="container">
		<div class="providers-grid">
			{#each $siteConfig.providers as provider}
				<div class="provider-card">
					<div class="provider-image">
						<img src={provider.image} alt={provider.name} />
					</div>
					<div class="provider-info">
						<h2>{provider.name}</h2>
						<p class="role">{provider.role}</p>
						<p class="credentials">{provider.credentials}</p>

						<div class="bio">
							<p>{provider.bio}</p>
						</div>

						<div class="specialties">
							<h3>Specialties</h3>
							<ul>
								{#each provider.specialties as specialty}
									<li>{specialty}</li>
								{/each}
							</ul>
						</div>

						{#if provider.languages && provider.languages.length > 0}
							<div class="languages">
								<h3>Languages</h3>
								<p class="language-list">{provider.languages.join(', ')}</p>
							</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<section class="support-staff">
	<div class="container">
		<h2>Supporting Your Care</h2>
		<p class="intro">
			Our dedicated medical assistants, nurses, and administrative staff work together to ensure
			you receive comprehensive, coordinated care.
		</p>

		<div class="staff-roles">
			<div class="role-card">
				<h3>Medical Assistants</h3>
				<p>
					Certified medical assistants support our providers with patient care, vitals, and
					procedures.
				</p>
			</div>
			<div class="role-card">
				<h3>Nursing Staff</h3>
				<p>
					Registered nurses and LPNs provide patient education, care coordination, and clinical
					support.
				</p>
			</div>
			<div class="role-card">
				<h3>Front Desk Team</h3>
				<p>
					Our scheduling and administrative staff ensure smooth operations and excellent patient
					service.
				</p>
			</div>
		</div>
	</div>
</section>

<section class="cta-section">
	<div class="container">
		<h2>Schedule an Appointment</h2>
		<p>Ready to meet your new healthcare team? Book an appointment today.</p>
		<div class="cta-group">
			<a href="/contact" class="button-primary">Book Appointment</a>
			<a href="/services" class="button-secondary">View Services</a>
		</div>
	</div>
</section>

<style>
	.page-header {
		padding: var(--space-2xl) 0 var(--space-xl) 0;
		text-align: center;
		border-bottom: 1px solid var(--color-border-default);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 var(--space-md);
	}

	h1 {
		margin-bottom: var(--space-md);
	}

	.lead {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.providers {
		padding: var(--space-2xl) 0;
	}

	.providers-grid {
		display: grid;
		gap: var(--space-2xl);
	}

	.provider-card {
		display: grid;
		grid-template-columns: 250px 1fr;
		gap: var(--space-xl);
		background: var(--color-bg-surface);
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.provider-image {
		width: 250px;
		height: 250px;
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-default);
	}

	.provider-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.provider-info h2 {
		margin-bottom: var(--space-xs);
		color: var(--color-fg-primary);
	}

	.role {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
		margin-bottom: var(--space-xs);
	}

	.credentials {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-md);
	}

	.bio {
		margin-bottom: var(--space-md);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.bio p {
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.specialties {
		margin-bottom: var(--space-md);
	}

	.specialties h3 {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		font-weight: var(--font-semibold);
	}

	.specialties ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.specialties li {
		background: var(--color-bg-elevated);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		border: 1px solid var(--color-border-default);
	}

	.languages h3 {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
		font-weight: var(--font-semibold);
	}

	.language-list {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.support-staff {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
	}

	.support-staff h2 {
		text-align: center;
		margin-bottom: var(--space-md);
	}

	.intro {
		text-align: center;
		color: var(--color-fg-secondary);
		max-width: 700px;
		margin: 0 auto var(--space-xl) auto;
		font-size: var(--text-body-lg);
	}

	.staff-roles {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-lg);
	}

	.role-card {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.role-card h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.role-card p {
		color: var(--color-fg-tertiary);
		line-height: 1.6;
	}

	.cta-section {
		padding: var(--space-2xl) 0;
		text-align: center;
	}

	.cta-section h2 {
		margin-bottom: var(--space-sm);
	}

	.cta-section p {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
	}

	.cta-group {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.button-primary {
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		transition: background var(--duration-micro) var(--ease-standard);
	}

	.button-primary:hover {
		background: var(--color-fg-secondary);
	}

	.button-secondary {
		border: 1px solid var(--color-border-emphasis);
		color: var(--color-fg-primary);
		padding: var(--space-md) var(--space-lg);
		border-radius: var(--radius-md);
		font-weight: var(--font-semibold);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.button-secondary:hover {
		border-color: var(--color-border-strong);
	}

	@media (max-width: 968px) {
		.provider-card {
			grid-template-columns: 1fr;
		}

		.provider-image {
			width: 100%;
			max-width: 250px;
			margin: 0 auto;
		}
	}

	@media (max-width: 768px) {
		.staff-roles {
			grid-template-columns: 1fr;
		}

		.cta-group {
			flex-direction: column;
			align-items: center;
		}

		.button-primary,
		.button-secondary {
			width: 100%;
			max-width: 300px;
		}
	}
</style>
