<script lang="ts">
	// CLEARWAY Documentation
</script>

<svelte:head>
	<title>Documentation - CLEARWAY</title>
	<meta name="description" content="Learn how to integrate CLEARWAY into your facility. API reference, widget embedding, and configuration guides." />
</svelte:head>

<main class="docs">
	<div class="container">
		<h1>Documentation</h1>
		<p class="lead">Everything you need to integrate CLEARWAY into your facility.</p>

		<section class="doc-section">
			<h2>Quick Start</h2>
			<p>Get CLEARWAY running on your site in under 5 minutes.</p>

			<h3>1. Embed the Widget</h3>
			<p>Add the booking widget to any page with a single script tag:</p>
			<pre><code>&lt;script src="https://clearway.pages.dev/embed.js"
  data-facility="your-facility-slug"
  data-theme="dark"&gt;
&lt;/script&gt;</code></pre>

			<h3>2. Configure Your Facility</h3>
			<p>Set up your courts, pricing, and availability in the admin dashboard. We'll provide your facility slug during onboarding.</p>

			<h3>3. Connect Payments</h3>
			<p>CLEARWAY uses Stripe Connect for secure payment processing. Connect your Stripe account to start accepting bookings.</p>
		</section>

		<section class="doc-section">
			<h2>Widget Options</h2>
			<table class="options-table">
				<thead>
					<tr>
						<th>Attribute</th>
						<th>Type</th>
						<th>Description</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><code>data-facility</code></td>
						<td>string</td>
						<td>Your facility's unique identifier</td>
					</tr>
					<tr>
						<td><code>data-theme</code></td>
						<td>"light" | "dark"</td>
						<td>Widget color scheme (default: "dark")</td>
					</tr>
					<tr>
						<td><code>data-court-type</code></td>
						<td>string</td>
						<td>Filter to specific court type (optional)</td>
					</tr>
				</tbody>
			</table>
		</section>

		<section class="doc-section">
			<h2>API Reference</h2>
			<p>For custom integrations, CLEARWAY provides a REST API.</p>

			<h3>Base URL</h3>
			<pre><code>https://clearway.pages.dev/api</code></pre>

			<h3>Endpoints</h3>
			<div class="endpoint">
				<span class="method get">GET</span>
				<code>/availability</code>
				<p>Fetch available time slots for a facility and date.</p>
			</div>
			<div class="endpoint">
				<span class="method post">POST</span>
				<code>/book</code>
				<p>Create a new reservation.</p>
			</div>
			<div class="endpoint">
				<span class="method get">GET</span>
				<code>/reservations/:id</code>
				<p>Get reservation details.</p>
			</div>
		</section>

		<section class="doc-section">
			<h2>SMS Booking</h2>
			<p>Members can book via text message using natural language:</p>
			<blockquote>
				"Reserve court 3 at 6pm tomorrow"<br/>
				"Book a padel court for Saturday morning"<br/>
				"Cancel my reservation for tonight"
			</blockquote>
			<p>Contact us to enable SMS booking for your facility.</p>
		</section>

		<section class="doc-section">
			<h2>Need Help?</h2>
			<p>Email us at <a href="mailto:support@createsomething.agency">support@createsomething.agency</a></p>
		</section>
	</div>
</main>

<style>
	.docs {
		min-height: 100vh;
		padding: var(--space-2xl, 6rem) var(--space-md, 1.5rem);
		background: var(--color-bg-pure, #000);
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
	}

	h1 {
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 700;
		margin: 0 0 var(--space-sm, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	.lead {
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		margin: 0 0 var(--space-xl, 4rem);
	}

	.doc-section {
		margin-bottom: var(--space-xl, 4rem);
		padding-bottom: var(--space-xl, 4rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.doc-section:last-child {
		border-bottom: none;
	}

	h2 {
		font-size: var(--text-h2, 1.75rem);
		font-weight: 600;
		margin: 0 0 var(--space-md, 1.5rem);
		color: var(--color-fg-primary, #fff);
	}

	h3 {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		margin: var(--space-lg, 2rem) 0 var(--space-sm, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	p {
		font-size: var(--text-body, 1rem);
		line-height: 1.7;
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		margin: 0 0 var(--space-sm, 1rem);
	}

	pre {
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		border-radius: var(--radius-md, 8px);
		padding: var(--space-md, 1.5rem);
		overflow-x: auto;
		margin: var(--space-sm, 1rem) 0;
	}

	code {
		font-family: var(--font-mono, 'JetBrains Mono', monospace);
		font-size: 0.9rem;
		color: var(--color-fg-primary, #fff);
	}

	p code {
		background: var(--color-bg-surface, #111);
		padding: 0.2em 0.4em;
		border-radius: var(--radius-sm, 4px);
	}

	.options-table {
		width: 100%;
		border-collapse: collapse;
		margin: var(--space-md, 1.5rem) 0;
	}

	.options-table th,
	.options-table td {
		text-align: left;
		padding: var(--space-sm, 1rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.options-table th {
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		font-weight: 500;
		font-size: var(--text-body-sm, 0.875rem);
	}

	.options-table td {
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
	}

	.endpoint {
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		border-radius: var(--radius-md, 8px);
		padding: var(--space-md, 1.5rem);
		margin: var(--space-sm, 1rem) 0;
	}

	.endpoint p {
		margin: var(--space-xs, 0.5rem) 0 0;
	}

	.method {
		display: inline-block;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm, 4px);
		font-size: var(--text-body-sm, 0.875rem);
		font-weight: 600;
		margin-right: var(--space-xs, 0.5rem);
	}

	.method.get {
		background: rgba(34, 197, 94, 0.2);
		color: rgb(34, 197, 94);
	}

	.method.post {
		background: rgba(59, 130, 246, 0.2);
		color: rgb(59, 130, 246);
	}

	blockquote {
		border-left: 3px solid var(--color-border-emphasis, rgba(255,255,255,0.25));
		padding-left: var(--space-md, 1.5rem);
		margin: var(--space-md, 1.5rem) 0;
		font-style: italic;
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
	}

	a {
		color: var(--color-fg-primary, #fff);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a:hover {
		opacity: 0.8;
	}
</style>
