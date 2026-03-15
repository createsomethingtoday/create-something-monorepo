<script lang="ts">
	// CLEARWAY Developers
</script>

<svelte:head>
	<title>Developers - CLEARWAY</title>
	<meta name="description" content="Build on CLEARWAY. API access, webhooks, and integration guides for developers." />
</svelte:head>

<main class="developers">
	<div class="container">
		<h1>Developers</h1>
		<p class="lead">Build powerful integrations with the CLEARWAY platform.</p>

		<section class="dev-section">
			<h2>Why Build on CLEARWAY?</h2>
			<div class="feature-grid">
				<div class="feature">
					<h3>Real-time State</h3>
					<p>Durable Objects guarantee consistency. No race conditions, no double bookings.</p>
				</div>
				<div class="feature">
					<h3>Edge-first</h3>
					<p>Built on Cloudflare Workers. Sub-50ms response times globally.</p>
				</div>
				<div class="feature">
					<h3>Webhooks</h3>
					<p>Real-time notifications for reservations, cancellations, and waitlist updates.</p>
				</div>
				<div class="feature">
					<h3>White-label Ready</h3>
					<p>Embed the widget or build your own UI with our API.</p>
				</div>
			</div>
		</section>

		<section class="dev-section">
			<h2>Getting Started</h2>
			<div class="steps">
				<div class="step">
					<span class="step-number">1</span>
					<div>
						<h3>Get API Access</h3>
						<p>Contact us to receive your API key and facility credentials.</p>
					</div>
				</div>
				<div class="step">
					<span class="step-number">2</span>
					<div>
						<h3>Explore the API</h3>
						<p>Review our <a href="/docs">documentation</a> for endpoints and examples.</p>
					</div>
				</div>
				<div class="step">
					<span class="step-number">3</span>
					<div>
						<h3>Build & Test</h3>
						<p>Use our sandbox environment to develop your integration.</p>
					</div>
				</div>
				<div class="step">
					<span class="step-number">4</span>
					<div>
						<h3>Go Live</h3>
						<p>Switch to production credentials and launch.</p>
					</div>
				</div>
			</div>
		</section>

		<section class="dev-section">
			<h2>Integration Patterns</h2>

			<h3>Embedded Widget</h3>
			<p>The fastest path to integration. Add our JavaScript snippet and you're live.</p>
			<pre><code>&lt;div id="clearway-widget"&gt;&lt;/div&gt;
&lt;script src="https://clearway.pages.dev/embed.js"
  data-facility="your-slug"
  data-theme="dark"&gt;
&lt;/script&gt;</code></pre>

			<h3>Headless API</h3>
			<p>Build your own UI with full control. Fetch availability, create bookings, manage reservations.</p>
			<pre><code>// Fetch available slots
const response = await fetch(
  'https://clearway.pages.dev/api/availability?' +
  'facility=your-slug&amp;date=2025-01-15'
);
const {'{'} courts {'}'} = await response.json();

// Create a booking
const booking = await fetch(
  'https://clearway.pages.dev/api/book',
  {'{'}
    method: 'POST',
    headers: {'{'} 'Content-Type': 'application/json' {'}'},
    body: JSON.stringify({'{'}
      facility_slug: 'your-slug',
      court_id: 'court-1',
      date: '2025-01-15',
      start_time: '2025-01-15T18:00:00Z',
      member_email: 'player@example.com',
      member_name: 'Jane Smith'
    {'}'})
  {'}'}
);</code></pre>

			<h3>Webhooks</h3>
			<p>Receive real-time notifications when events occur.</p>
			<pre><code>// Webhook payload example
{'{'}
  "event": "reservation.created",
  "data": {'{'}
    "id": "res_abc123",
    "court": "Court 1",
    "start_time": "2025-01-15T18:00:00Z",
    "member_email": "player@example.com"
  {'}'},
  "timestamp": "2025-01-14T10:30:00Z"
{'}'}</code></pre>
		</section>

		<section class="dev-section">
			<h2>Tech Stack</h2>
			<p>CLEARWAY is built with:</p>
			<ul class="tech-list">
				<li><strong>Cloudflare Workers</strong> — Edge compute</li>
				<li><strong>Durable Objects</strong> — Real-time state coordination</li>
				<li><strong>D1</strong> — SQLite at the edge</li>
				<li><strong>Stripe Connect</strong> — Payment processing</li>
				<li><strong>SvelteKit</strong> — Frontend framework</li>
			</ul>
		</section>

		<section class="dev-section cta-section">
			<h2>Ready to Build?</h2>
			<p>Get in touch to request API access and discuss your integration.</p>
			<a href="mailto:developers@createsomething.agency" class="btn">Contact Developer Relations</a>
		</section>
	</div>
</main>

<style>
	.developers {
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

	.dev-section {
		margin-bottom: var(--space-xl, 4rem);
		padding-bottom: var(--space-xl, 4rem);
		border-bottom: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.dev-section:last-child {
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

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
		gap: var(--space-md, 1.5rem);
	}

	.feature {
		padding: var(--space-md, 1.5rem);
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		border-radius: var(--radius-md, 8px);
	}

	.feature h3 {
		margin: 0 0 var(--space-xs, 0.5rem);
		font-size: var(--text-body-lg, 1.125rem);
	}

	.feature p {
		margin: 0;
		font-size: var(--text-body-sm, 0.875rem);
	}

	.steps {
		display: flex;
		flex-direction: column;
		gap: var(--space-md, 1.5rem);
	}

	.step {
		display: flex;
		gap: var(--space-md, 1.5rem);
		align-items: flex-start;
	}

	.step-number {
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
		border-radius: 50%;
		font-weight: 700;
		flex-shrink: 0;
	}

	.step h3 {
		margin: 0 0 var(--space-xs, 0.5rem);
	}

	.step p {
		margin: 0;
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
		font-size: 0.85rem;
		color: var(--color-fg-primary, #fff);
	}

	.tech-list {
		list-style: none;
		padding: 0;
		margin: var(--space-md, 1.5rem) 0;
	}

	.tech-list li {
		padding: var(--space-sm, 1rem) 0;
		border-bottom: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
	}

	.tech-list li:last-child {
		border-bottom: none;
	}

	.tech-list strong {
		color: var(--color-fg-primary, #fff);
	}

	.cta-section {
		text-align: center;
	}

	.btn {
		display: inline-block;
		padding: 1rem 2rem;
		background: var(--color-fg-primary, #fff);
		color: var(--color-bg-pure, #000);
		text-decoration: none;
		border-radius: var(--radius-md, 8px);
		font-weight: 600;
		margin-top: var(--space-md, 1.5rem);
		transition: opacity 200ms ease;
	}

	.btn:hover {
		opacity: 0.9;
	}

	a {
		color: var(--color-fg-primary, #fff);
	}
</style>
