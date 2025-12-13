<script lang="ts">
	/**
	 * Timeless Materials
	 *
	 * Choose what ages well. Avoid trends. Mies used steel because
	 * it endures. What's the steel of software?
	 */
</script>

<svelte:head>
	<title>Timeless Materials — CREATE SOMETHING.ltd</title>
	<meta
		name="description"
		content="Choose what ages well. Avoid trends. Web standards over frameworks. SQL over NoSQL. HTTP over proprietary protocols. Build on foundations that endure."
	/>
</svelte:head>

<!-- Header -->
<section class="pt-24 pb-16 px-6 border-b border-canon">
	<div class="max-w-3xl mx-auto">
		<a href="/patterns" class="text-sm-canon opacity-40-canon hover:opacity-70-canon transition-opacity mb-8 inline-block">
			← All Patterns
		</a>
		<p class="text-sm-canon tracking-widest uppercase opacity-60-canon mb-4">Pattern</p>
		<h1 class="mb-6">Timeless Materials</h1>
		<p class="text-xl-canon opacity-70-canon leading-relaxed">
			Choose what ages well. Avoid trends. Mies used steel because it endures.
			Web standards over frameworks. SQL over NoSQL. Build on what lasts.
		</p>
	</div>
</section>

<!-- Quote -->
<section class="py-12 px-6">
	<div class="max-w-3xl mx-auto">
		<div class="p-6 border border-canon">
			<p class="text-lg-canon opacity-70-canon italic">
				"God is in the details."
			</p>
			<p class="text-sm-canon opacity-40-canon mt-2">— Mies van der Rohe</p>
		</div>
	</div>
</section>

<!-- Definition -->
<section class="py-16 px-6">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Definition</h2>

		<div class="space-y-6 text-base-canon opacity-70-canon leading-relaxed">
			<p>
				<strong>Timeless Materials</strong> are foundations that don't expire. Mies van der Rohe
				chose steel, glass, and travertine not for fashion but for permanence. His buildings
				from the 1950s look contemporary today because the materials transcend their era.
			</p>

			<p>
				In software, timeless materials are the technologies with staying power: web standards
				(HTML, CSS, JavaScript), relational databases (SQL), foundational protocols (HTTP, TCP/IP).
				These aren't exciting—they're reliable. They won't be deprecated next year.
			</p>

			<p>
				The anti-pattern is trend-chasing: adopting the latest framework because it's popular,
				choosing NoSQL because it's "modern," using a proprietary protocol because the vendor
				promises better performance. These decisions age poorly.
			</p>

			<div class="p-6 border border-canon my-8">
				<p class="text-sm-canon opacity-60-canon italic">
					"The question is not 'what's new?' but 'what will last?'"
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
				<h3 class="text-lg-canon font-semibold mb-3">Standards Over Frameworks</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Frameworks come and go. Standards persist. When possible, build on
					web standards directly. Use frameworks as thin layers, not foundations.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ HTML/CSS before framework abstractions</p>
					<p class="mb-1">✓ Fetch API over axios</p>
					<p>✓ Web Components when interoperability matters</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Proven Over Novel</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Technologies with 20+ years of production use have passed the test.
					New doesn't mean better—often it means untested.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ PostgreSQL over the database of the month</p>
					<p class="mb-1">✓ HTTP/REST before GraphQL (unless you need it)</p>
					<p>✓ Unix philosophy over containerized everything</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Exit Paths Required</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Even "timeless" choices may need replacement. Ensure you can exit.
					Avoid lock-in. Own your data. Keep abstractions thin.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Data exportable in standard formats</p>
					<p class="mb-1">✓ No vendor-specific languages</p>
					<p>✓ Thin wrappers over platform APIs</p>
				</div>
			</div>

			<div class="border border-canon p-6">
				<h3 class="text-lg-canon font-semibold mb-3">Boring Is Beautiful</h3>
				<p class="text-sm-canon opacity-60-canon mb-4">
					Exciting technology is risky technology. The most reliable systems
					are built on boring, well-understood foundations.
				</p>
				<div class="text-xs-canon opacity-40-canon font-mono">
					<p class="mb-1">✓ Choose based on requirements, not hype</p>
					<p class="mb-1">✓ Innovation in product, not in infrastructure</p>
					<p>✓ "Boring" = battle-tested = trustworthy</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- When to Use -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">When to Apply</h2>

		<div class="grid md:grid-cols-2 gap-8">
			<div class="p-6 bg-success-subtle border border-success">
				<h3 class="text-lg-canon font-semibold text-success mb-4">Apply When</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Building for long-term maintenance</li>
					<li>• Team stability is uncertain</li>
					<li>• Requirements are well-understood</li>
					<li>• Reliability trumps novelty</li>
					<li>• You value sleep over excitement</li>
				</ul>
			</div>

			<div class="p-6 bg-warning-subtle border border-warning">
				<h3 class="text-lg-canon font-semibold text-warning mb-4">Exception Cases</h3>
				<ul class="space-y-2 text-sm-canon opacity-70-canon">
					<li>• Problem genuinely requires new solutions</li>
					<li>• Scale exceeds proven technology limits</li>
					<li>• Competitive advantage from new capability</li>
					<li>• Prototyping where long-term doesn't matter</li>
				</ul>
			</div>
		</div>
	</div>
</section>

<!-- Comparison -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Timeless vs. Trendy</h2>

		<div class="border border-canon overflow-hidden">
			<table class="w-full text-sm-canon">
				<thead>
					<tr class="border-b border-canon bg-surface-subtle">
						<th class="text-left py-3 px-4 font-semibold">Domain</th>
						<th class="text-left py-3 px-4 font-semibold text-success">Timeless</th>
						<th class="text-left py-3 px-4 font-semibold text-warning">Trendy</th>
					</tr>
				</thead>
				<tbody class="opacity-70-canon">
					<tr class="border-b border-canon">
						<td class="py-3 px-4">Database</td>
						<td class="py-3 px-4">PostgreSQL, SQLite</td>
						<td class="py-3 px-4">This year's distributed DB</td>
					</tr>
					<tr class="border-b border-canon">
						<td class="py-3 px-4">API</td>
						<td class="py-3 px-4">REST/HTTP</td>
						<td class="py-3 px-4">GraphQL, gRPC (unless needed)</td>
					</tr>
					<tr class="border-b border-canon">
						<td class="py-3 px-4">Styling</td>
						<td class="py-3 px-4">CSS, CSS Variables</td>
						<td class="py-3 px-4">CSS-in-JS framework du jour</td>
					</tr>
					<tr class="border-b border-canon">
						<td class="py-3 px-4">State</td>
						<td class="py-3 px-4">URL, forms, localStorage</td>
						<td class="py-3 px-4">State management library #47</td>
					</tr>
					<tr>
						<td class="py-3 px-4">Hosting</td>
						<td class="py-3 px-4">VPS, static files</td>
						<td class="py-3 px-4">Serverless everything</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</section>

<!-- Related Patterns -->
<section class="py-16 px-6 border-t border-canon">
	<div class="max-w-3xl mx-auto">
		<h2 class="mb-8">Related Patterns</h2>

		<div class="grid md:grid-cols-2 gap-6">
			<a href="/patterns/arc" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Arc</h3>
				<p class="text-sm-canon opacity-60-canon">
					Arcs built on timeless materials (HTTP, OAuth, JSON) require less maintenance.
				</p>
			</a>

			<a href="/patterns/universal-utility" class="block border border-canon p-6 hover:border-hover transition-colors">
				<h3 class="text-lg-canon font-semibold mb-2">Universal Utility</h3>
				<p class="text-sm-canon opacity-60-canon">
					Standards-based materials are universally accessible.
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
