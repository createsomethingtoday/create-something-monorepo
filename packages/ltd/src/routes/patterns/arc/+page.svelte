<script lang="ts">
	/**
	 * Arc Pattern
	 *
	 * Efficient connection between points. One-directional sync
	 * with minimal transformation. The shortest path that works.
	 */
</script>

<svelte:head>
	<title>Arc Pattern — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="The Arc pattern: efficient one-directional sync with minimal transformation. Connect point A to point B without unnecessary complexity."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Arc</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Efficient connection between points. One-directional sync with minimal transformation.
			The shortest path that works.
		</p>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				An <strong>Arc</strong> is the minimal viable connection between two systems.
				Not bidirectional synchronization. Not complex transformation pipelines.
				Just data flowing efficiently from A to B.
			</p>

			<p>
				The name comes from geometry: an arc is a portion of a curve—the most direct
				path between two points on a circle. In systems design, an Arc connects two
				services with the least complexity required to achieve the goal.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"The Arc pattern asks: what's the shortest path between these two points
					that actually works in production?"
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Principles -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Principles</h2>

		<div class="space-y-8">
			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">One Direction</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Data flows one way. Source to destination. No round-trips, no sync conflicts,
					no reconciliation logic. Simplicity through constraint.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">Gmail → Notion (not Gmail ↔ Notion)</p>
					<p class="mb-1">API → Database (not real-time bidirectional)</p>
					<p>Event → Handler (fire and forget)</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Minimal Transformation</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Transform only what's necessary. Preserve source fidelity. Don't normalize
					data that doesn't need normalizing.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Map fields directly when schemas align</p>
					<p class="mb-1">✓ Preserve formatting (links, bold, structure)</p>
					<p>✗ Don't build complex ETL when simple mapping works</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Serverless Infrastructure</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Arcs should be stateless. No servers to maintain. Run on-demand via
					scheduled triggers or webhooks. Pay only for what you use.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Cloudflare Workers, AWS Lambda</p>
					<p class="mb-1">✓ Cron triggers for polling patterns</p>
					<p>✓ Webhook endpoints for push patterns</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">OAuth over API Keys</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					For multi-user systems, OAuth provides proper authorization. Each user
					authenticates with their own credentials. No shared secrets.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ User-scoped access tokens</p>
					<p class="mb-1">✓ Automatic token refresh</p>
					<p>✓ Revocable permissions</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- When to Use -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Use</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-success-subtle border border-success">
				<h3 class="text-lg-canon font-semibold text-success mb-4">Good Fit</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Data capture from one system to another</li>
					<li>• Automated backups and archiving</li>
					<li>• Event logging and analytics pipelines</li>
					<li>• Notification forwarding</li>
					<li>• Report generation from live data</li>
				</ul>
			</div>

			<div class="p-6 bg-error-subtle border border-error">
				<h3 class="text-lg-canon font-semibold text-error mb-4">Poor Fit</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Real-time collaboration features</li>
					<li>• Bidirectional sync requirements</li>
					<li>• Complex data reconciliation</li>
					<li>• Systems requiring strong consistency</li>
					<li>• Interactive user workflows</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Reference Implementation -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference Implementation</h2>

		<div class="border border-canon p-8">
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-xl-canon font-semibold mb-2">Arc for Gmail</h3>
					<p class="text-sm-canon opacity-50-canon">Gmail → Notion sync for Half Dozen</p>
				</div>
				<div class="text-xs-canon opacity-40-canon font-mono text-right">
					<p>~11 hours to production</p>
					<p>99.8% cost savings vs manual</p>
				</div>
			</div>

			<div class="space-y-4 text-sm-canon opacity-60-canon mb-8">
				<p>
					Multi-user OAuth integration syncing labeled Gmail threads to a Notion database.
					5-minute polling cycle, zero production failures, automatic contact creation.
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-4 mb-8">
				<div class="p-4 bg-surface-subtle text-center">
					<div class="text-2xl-canon font-bold mb-1">5 min</div>
					<div class="text-xs-canon opacity-50-canon">Sync cycle</div>
				</div>
				<div class="p-4 bg-surface-subtle text-center">
					<div class="text-2xl-canon font-bold mb-1">0</div>
					<div class="text-xs-canon opacity-50-canon">Production failures</div>
				</div>
				<div class="p-4 bg-surface-subtle text-center">
					<div class="text-2xl-canon font-bold mb-1">$6.30</div>
					<div class="text-xs-canon opacity-50-canon">AI development cost</div>
				</div>
			</div>

			<div class="border-t border-canon pt-6">
				<h4 class="text-sm-canon font-semibold mb-4 opacity-70-canon">Architecture</h4>
				<div class="text-xs-canon font-mono opacity-50-canon space-y-1">
					<p>Gmail API (OAuth) → Cloudflare Worker → Notion API</p>
					<p>KV Store for token persistence and sync state</p>
					<p>Cron trigger every 5 minutes</p>
				</div>
			</div>

			<div class="border-t border-canon pt-6 mt-6">
				<a
					href="https://createsomething.agency/work/arc-for-gmail"
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs-canon font-mono opacity-50-canon hover:opacity-100 transition-opacity"
				>
					View case study →
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns#hermeneutic-spiral" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Hermeneutic Spiral</h3>
				<p class="text-sm-canon opacity-60-canon">
					When the Arc needs memory—understanding accumulates across syncs.
				</p>
			</a>

			<a href="/patterns#timeless-materials" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Timeless Materials</h3>
				<p class="text-sm-canon opacity-60-canon">
					Arcs built on web standards (HTTP, OAuth, JSON) age well.
				</p>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto text-center">
		<p class="text-sm-canon opacity-40-canon">
			Part of the <a href="/patterns" class="underline hover:opacity-70-canon">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>

<style>
	/* Typography */
	.text-xs-canon {
		font-size: var(--text-caption);
	}

	.text-sm-canon {
		font-size: var(--text-body-sm);
	}

	.text-base-canon {
		font-size: var(--text-body);
	}

	.text-lg-canon {
		font-size: var(--text-body-lg);
	}

	.text-xl-canon {
		font-size: var(--text-h3);
	}

	.text-2xl-canon {
		font-size: var(--text-h2);
	}

	.text-3xl-canon {
		font-size: var(--text-h1);
	}

	/* Opacity as color tokens */
	.opacity-40-canon {
		color: var(--color-fg-muted);
	}

	.opacity-50-canon {
		color: var(--color-fg-muted);
	}

	.opacity-60-canon {
		color: var(--color-fg-tertiary);
	}

	.opacity-70-canon {
		color: var(--color-fg-secondary);
	}

	.opacity-80-canon {
		color: var(--color-fg-secondary);
	}

	/* Borders */
	.border-canon {
		border-color: var(--color-border-default);
	}

	.border-emphasis {
		border-color: var(--color-border-emphasis);
	}

	.border-hover {
		border-color: var(--color-border-emphasis);
	}

	.divide-canon > * + * {
		border-color: var(--color-border-default);
	}

	/* Backgrounds */
	.bg-surface-subtle {
		background: var(--color-bg-subtle);
	}

	.bg-surface {
		background: var(--color-bg-surface);
	}

	/* Semantic colors */
	.text-success {
		color: #4ade80;
	}

	.text-error {
		color: #f87171;
	}

	.text-warning {
		color: #fbbf24;
	}

	.bg-success-subtle {
		background: rgba(74, 222, 128, 0.05);
	}

	.bg-success-muted {
		background: rgba(74, 222, 128, 0.1);
	}

	.bg-error-subtle {
		background: rgba(248, 113, 113, 0.05);
	}

	.bg-error-muted {
		background: rgba(248, 113, 113, 0.1);
	}

	.bg-warning-subtle {
		background: rgba(251, 191, 36, 0.05);
	}

	.bg-warning-muted {
		background: rgba(251, 191, 36, 0.1);
	}

	.border-success {
		border-color: rgba(74, 222, 128, 0.2);
	}

	.border-error {
		border-color: rgba(248, 113, 113, 0.2);
	}

	.border-warning {
		border-color: rgba(251, 191, 36, 0.2);
	}

	/* Universal element styles */
	section {
		border-color: var(--color-border-default);
	}

	table {
		border-color: var(--color-border-default);
	}

	thead {
		border-color: var(--color-border-default);
	}
</style>
