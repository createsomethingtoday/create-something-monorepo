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
<section class="pt-24 pb-16 px-6 border-b border-white/10">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm opacity-40 hover:opacity-70 transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm tracking-widest uppercase opacity-60 mb-4">Pattern</p>
		<h1 class="mb-6">Arc</h1>
		<p class="text-xl opacity-70 leading-relaxed">
			Efficient connection between points. One-directional sync with minimal transformation.
			The shortest path that works.
		</p>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base opacity-70 leading-relaxed">
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

			<div class="p-6 border border-white/10 my-8">
				<p class="text-sm opacity-60 italic">
					"The Arc pattern asks: what's the shortest path between these two points
					that actually works in production?"
				</p>
			</div>
		</div>
	</div>
</section>

<!-- Principles -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Principles</h2>

		<div class="space-y-8">
			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">One Direction</h3>
				<p class="text-sm opacity-60 mb-4">
					Data flows one way. Source to destination. No round-trips, no sync conflicts,
					no reconciliation logic. Simplicity through constraint.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">Gmail → Notion (not Gmail ↔ Notion)</p>
					<p class="mb-1">API → Database (not real-time bidirectional)</p>
					<p>Event → Handler (fire and forget)</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Minimal Transformation</h3>
				<p class="text-sm opacity-60 mb-4">
					Transform only what's necessary. Preserve source fidelity. Don't normalize
					data that doesn't need normalizing.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Map fields directly when schemas align</p>
					<p class="mb-1">✓ Preserve formatting (links, bold, structure)</p>
					<p>✗ Don't build complex ETL when simple mapping works</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">Serverless Infrastructure</h3>
				<p class="text-sm opacity-60 mb-4">
					Arcs should be stateless. No servers to maintain. Run on-demand via
					scheduled triggers or webhooks. Pay only for what you use.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ Cloudflare Workers, AWS Lambda</p>
					<p class="mb-1">✓ Cron triggers for polling patterns</p>
					<p>✓ Webhook endpoints for push patterns</p>
				</div>
			</div>

			<div class="border border-white/10 p-6">
				<h3 class="text-lg font-semibold mb-3">OAuth over API Keys</h3>
				<p class="text-sm opacity-60 mb-4">
					For multi-user systems, OAuth provides proper authorization. Each user
					authenticates with their own credentials. No shared secrets.
				</p>
				<div class="text-xs opacity-40 font-mono">
					<p class="mb-1">✓ User-scoped access tokens</p>
					<p class="mb-1">✓ Automatic token refresh</p>
					<p>✓ Revocable permissions</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- When to Use -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Use</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-green-500/5 border border-green-500/20">
				<h3 class="text-lg font-semibold text-green-300 mb-4">Good Fit</h3>
				<ul class="space-y-2 text-sm opacity-70">
					<li>• Data capture from one system to another</li>
					<li>• Automated backups and archiving</li>
					<li>• Event logging and analytics pipelines</li>
					<li>• Notification forwarding</li>
					<li>• Report generation from live data</li>
				</ul>
			</div>

			<div class="p-6 bg-red-500/5 border border-red-500/20">
				<h3 class="text-lg font-semibold text-red-300 mb-4">Poor Fit</h3>
				<ul class="space-y-2 text-sm opacity-70">
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
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Reference Implementation</h2>

		<div class="border border-white/10 p-8">
			<div class="flex items-start justify-between mb-6">
				<div>
					<h3 class="text-xl font-semibold mb-2">Arc for Gmail</h3>
					<p class="text-sm opacity-50">Gmail → Notion sync for Half Dozen</p>
				</div>
				<div class="text-xs opacity-40 font-mono text-right">
					<p>~11 hours to production</p>
					<p>99.8% cost savings vs manual</p>
				</div>
			</div>

			<div class="space-y-4 text-sm opacity-60 mb-8">
				<p>
					Multi-user OAuth integration syncing labeled Gmail threads to a Notion database.
					5-minute polling cycle, zero production failures, automatic contact creation.
				</p>
			</div>

			<div class="grid md:grid-cols-3 gap-4 mb-8">
				<div class="p-4 bg-white/5 text-center">
					<div class="text-2xl font-bold mb-1">5 min</div>
					<div class="text-xs opacity-50">Sync cycle</div>
				</div>
				<div class="p-4 bg-white/5 text-center">
					<div class="text-2xl font-bold mb-1">0</div>
					<div class="text-xs opacity-50">Production failures</div>
				</div>
				<div class="p-4 bg-white/5 text-center">
					<div class="text-2xl font-bold mb-1">$6.30</div>
					<div class="text-xs opacity-50">AI development cost</div>
				</div>
			</div>

			<div class="border-t border-white/10 pt-6">
				<h4 class="text-sm font-semibold mb-4 opacity-70">Architecture</h4>
				<div class="text-xs font-mono opacity-50 space-y-1">
					<p>Gmail API (OAuth) → Cloudflare Worker → Notion API</p>
					<p>KV Store for token persistence and sync state</p>
					<p>Cron trigger every 5 minutes</p>
				</div>
			</div>

			<div class="border-t border-white/10 pt-6 mt-6">
				<a
					href="https://createsomething.agency/work/arc-for-gmail"
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs font-mono opacity-50 hover:opacity-100 transition-opacity"
				>
					View case study →
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns#hermeneutic-spiral" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Hermeneutic Spiral</h3>
				<p class="text-sm opacity-60">
					When the Arc needs memory—understanding accumulates across syncs.
				</p>
			</a>

			<a href="/patterns#timeless-materials" class="block border border-white/10 p-6 hover:border-white/30 transition-colors">
				<h3 class="text-lg font-semibold mb-2">Timeless Materials</h3>
				<p class="text-sm opacity-60">
					Arcs built on web standards (HTTP, OAuth, JSON) age well.
				</p>
			</a>
		</div>
	</div>
</section>

<!-- Footer -->
<section class="py-16 px-6 border-t border-white/10">
	<div class="max-w-3xl mx-auto text-center">
		<p class="text-sm opacity-40">
			Part of the <a href="/patterns" class="underline hover:opacity-70">CREATE SOMETHING Pattern Library</a>
		</p>
	</div>
</section>
