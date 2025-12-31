<script lang="ts">
	import { siteConfig } from '$lib/config/context';

	const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
	const dayLabels: Record<string, string> = {
		monday: 'Monday',
		tuesday: 'Tuesday',
		wednesday: 'Wednesday',
		thursday: 'Thursday',
		friday: 'Friday',
		saturday: 'Saturday',
		sunday: 'Sunday'
	};
</script>

<svelte:head>
	<title>Contact - {$siteConfig.name}</title>
	<meta
		name="description"
		content="Contact us to schedule an appointment or ask questions. {$siteConfig.address.street}, {$siteConfig.address.city}, {$siteConfig.address.state}"
	/>
</svelte:head>

<section class="page-header">
	<div class="container">
		<h1>Contact Us</h1>
		<p class="lead">Schedule an appointment or get in touch with our team.</p>
	</div>
</section>

<section class="contact-info">
	<div class="container">
		<div class="contact-grid">
			<div class="info-section">
				<h2>Get in Touch</h2>

				<div class="contact-methods">
					<div class="contact-method">
						<h3>Phone</h3>
						<a href="tel:{$siteConfig.phone}" class="contact-link">{$siteConfig.phone}</a>
						<p class="note">Main office line</p>
					</div>

					{#if $siteConfig.fax}
						<div class="contact-method">
							<h3>Fax</h3>
							<p class="contact-text">{$siteConfig.fax}</p>
						</div>
					{/if}

					<div class="contact-method">
						<h3>Email</h3>
						<a href="mailto:{$siteConfig.email}" class="contact-link">{$siteConfig.email}</a>
						<p class="note">For non-urgent inquiries</p>
					</div>

					<div class="contact-method">
						<h3>Address</h3>
						<address class="contact-address">
							{$siteConfig.address.street}<br />
							{$siteConfig.address.city}, {$siteConfig.address.state}
							{$siteConfig.address.zip}
						</address>
					</div>
				</div>

				{#if $siteConfig.afterHours.enabled}
					<div class="after-hours">
						<h3>After Hours Care</h3>
						<p>{$siteConfig.afterHours.note}</p>
						<a href="tel:{$siteConfig.afterHours.phone}" class="emergency-phone">
							{$siteConfig.afterHours.phone}
						</a>
					</div>
				{/if}
			</div>

			<div class="hours-section">
				<h2>Office Hours</h2>
				<div class="hours-list">
					{#each daysOfWeek as day}
						<div class="hours-row">
							<span class="day">{dayLabels[day]}</span>
							<span class="time">{$siteConfig.hours[day]}</span>
						</div>
					{/each}
				</div>

				<div class="parking-info">
					<h3>Parking & Directions</h3>
					<ul>
						<li>Free parking available in the Medical Plaza garage</li>
						<li>Accessible parking near building entrance</li>
						<li>Building entrance on the west side</li>
						<li>Elevators to Suite 200</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</section>

<section class="privacy-notice">
	<div class="container">
		<div class="notice-box">
			<h3>Privacy Notice</h3>
			<p>
				Please do not include any personal medical information in emails, voicemails, or contact
				forms. For medical questions or concerns, please call our office directly to speak with a
				staff member.
			</p>
		</div>
	</div>
</section>

<section class="booking-section">
	<div class="container">
		<h2>Schedule an Appointment</h2>
		<p class="intro">
			{#if $siteConfig.booking.enabled}
				{$siteConfig.booking.note}
			{:else}
				Call our office to schedule an appointment with one of our providers.
			{/if}
		</p>

		<div class="booking-options">
			{#if $siteConfig.booking.enabled}
				<a href={$siteConfig.booking.url} class="button-primary" target="_blank" rel="noopener">
					Book Online
				</a>
			{/if}
			<a href="tel:{$siteConfig.phone}" class="button-secondary">Call to Schedule</a>
		</div>

		{#if $siteConfig.newPatients.accepting}
			<div class="new-patients">
				<h3>New Patients Welcome</h3>
				<p>{$siteConfig.newPatients.note}</p>
				{#if $siteConfig.newPatients.forms && $siteConfig.newPatients.forms.length > 0}
					<div class="forms-list">
						<p class="forms-intro">Download and complete these forms before your first visit:</p>
						<ul>
							{#each $siteConfig.newPatients.forms as form}
								<li>
									<a href={form.url} class="form-link" target="_blank" rel="noopener">
										{form.name}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>

<section class="emergency-notice">
	<div class="container">
		<div class="notice-content">
			<h2>Medical Emergency?</h2>
			<p>
				If you are experiencing a medical emergency, call <strong>911</strong> immediately or go to
				your nearest emergency room. Do not use email or the contact form for urgent medical needs.
			</p>
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

	.contact-info {
		padding: var(--space-2xl) 0;
	}

	.contact-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-2xl);
	}

	.privacy-notice {
		padding: var(--space-xl) 0;
		background: var(--color-bg-elevated);
	}

	.notice-box {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		max-width: 800px;
		margin: 0 auto;
	}

	.notice-box h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.notice-box p {
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.info-section h2,
	.hours-section h2 {
		margin-bottom: var(--space-xl);
		color: var(--color-fg-primary);
	}

	.contact-methods {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
		margin-bottom: var(--space-xl);
	}

	.contact-method h3 {
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
		font-weight: var(--font-semibold);
	}

	.contact-link {
		display: block;
		color: var(--color-fg-primary);
		font-size: var(--text-body-lg);
		margin-bottom: var(--space-xs);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.contact-link:hover {
		color: var(--color-fg-secondary);
	}

	.contact-text {
		color: var(--color-fg-secondary);
		font-size: var(--text-body-lg);
	}

	.note {
		color: var(--color-fg-tertiary);
		font-size: var(--text-body-sm);
	}

	.contact-address {
		color: var(--color-fg-secondary);
		font-style: normal;
		line-height: 1.6;
	}

	.after-hours {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-emphasis);
	}

	.after-hours h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.after-hours p {
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-md);
		line-height: 1.6;
	}

	.emergency-phone {
		display: inline-block;
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
		font-size: var(--text-body-lg);
	}

	.hours-list {
		background: var(--color-bg-surface);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
		margin-bottom: var(--space-xl);
	}

	.hours-row {
		display: flex;
		justify-content: space-between;
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.hours-row:last-child {
		border-bottom: none;
	}

	.day {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium);
	}

	.time {
		color: var(--color-fg-secondary);
	}

	.parking-info h3 {
		margin-bottom: var(--space-md);
		color: var(--color-fg-primary);
	}

	.parking-info ul {
		list-style: none;
		padding: 0;
	}

	.parking-info li {
		padding: var(--space-sm) 0 var(--space-sm) var(--space-md);
		color: var(--color-fg-secondary);
		position: relative;
		line-height: 1.6;
	}

	.parking-info li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-fg-muted);
	}

	.booking-section {
		padding: var(--space-2xl) 0;
		background: var(--color-bg-elevated);
		text-align: center;
	}

	.booking-section h2 {
		margin-bottom: var(--space-md);
	}

	.intro {
		color: var(--color-fg-secondary);
		max-width: 600px;
		margin: 0 auto var(--space-xl) auto;
		font-size: var(--text-body-lg);
	}

	.booking-options {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
		margin-bottom: var(--space-xl);
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

	.new-patients {
		max-width: 700px;
		margin: 0 auto;
		text-align: left;
		background: var(--color-bg-surface);
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border-default);
	}

	.new-patients h3 {
		margin-bottom: var(--space-sm);
		color: var(--color-fg-primary);
	}

	.new-patients > p {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-md);
	}

	.forms-list {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-border-default);
	}

	.forms-intro {
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-sm);
		font-size: var(--text-body-sm);
	}

	.forms-list ul {
		list-style: none;
		padding: 0;
	}

	.forms-list li {
		padding: var(--space-xs) 0;
	}

	.form-link {
		color: var(--color-fg-primary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.form-link:hover {
		color: var(--color-fg-secondary);
	}

	.emergency-notice {
		padding: var(--space-2xl) 0;
	}

	.notice-content {
		background: var(--color-bg-surface);
		padding: var(--space-xl);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-error);
		text-align: center;
		max-width: 800px;
		margin: 0 auto;
	}

	.notice-content h2 {
		color: var(--color-error);
		margin-bottom: var(--space-md);
	}

	.notice-content p {
		color: var(--color-fg-secondary);
		line-height: 1.6;
		font-size: var(--text-body-lg);
	}

	.notice-content strong {
		color: var(--color-fg-primary);
	}

	@media (max-width: 968px) {
		.contact-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 768px) {
		.booking-options {
			flex-direction: column;
			align-items: center;
		}

		.button-primary,
		.button-secondary {
			width: 100%;
			max-width: 300px;
		}

		.new-patients {
			text-align: center;
		}

		.forms-list {
			text-align: left;
		}
	}
</style>
