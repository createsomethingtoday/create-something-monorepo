<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const authExample = $derived(
		`curl "${data.apiBase}/profile" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`
	);
	const listExample = $derived(
		`curl "${data.apiBase}/assets?status=Published&limit=20" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`
	);

	const profileResponse = JSON.stringify(
		{
			id: 'recXXXXXXXXXXXXXX',
			name: 'Studio Name',
			slug: 'studio-name',
			avatar: 'https://…/avatar.png',
			biography: 'We build templates for product teams.',
			personalSite: 'https://studio.example',
			meta: { timestamp: '2026-11-13T19:00:00.000Z', version: 'v1', cached: false }
		},
		null,
		2
	);

	const asset = {
		id: 'recXXXXXXXXXXXXXX',
		name: 'Template Name',
		status: 'Published',
		type: 'Template',
		submittedDate: '2026-03-01',
		publishedDate: '2026-03-12',
		thumbnail: 'https://…/thumbnail.png',
		websiteUrl: 'https://template-name.webflow.io',
		marketplaceUrl: 'https://webflow.com/templates/html/template-name',
		metrics: { viewers: 1840, purchases: 56, revenue: 4200 }
	};

	const listResponse = JSON.stringify(
		{
			data: [asset],
			pagination: { total: 14, limit: 20, offset: 0, hasMore: false },
			meta: { timestamp: '2026-11-13T19:00:00.000Z', version: 'v1', cached: true }
		},
		null,
		2
	);

	const errorResponse = JSON.stringify(
		{
			error: 'This API key was revoked.',
			code: 'KEY_REVOKED',
			requestId: '6f1c2a9e-5d0b-4c7e-9a43-2b8d1e0f7c55'
		},
		null,
		2
	);

	const errors: { status: number; code: string; meaning: string }[] = [
		{ status: 400, code: 'INVALID_PARAMETER', meaning: 'A query parameter has a value the API does not accept. The message names the parameter.' },
		{ status: 401, code: 'MISSING_AUTH_HEADER', meaning: 'The request has no Authorization header.' },
		{ status: 401, code: 'INVALID_KEY_FORMAT', meaning: 'The header is not “Bearer” followed by a key in the correct format.' },
		{ status: 401, code: 'INVALID_KEY', meaning: 'No key matches the one you sent.' },
		{ status: 401, code: 'KEY_REVOKED', meaning: 'The key was revoked. Create a new key.' },
		{ status: 401, code: 'KEY_EXPIRED', meaning: 'The key is past its expiry date. Create a new key.' },
		{ status: 403, code: 'INSUFFICIENT_SCOPE', meaning: 'The key does not have the permission this endpoint needs.' },
		{ status: 404, code: 'ASSET_NOT_FOUND', meaning: 'No asset with this ID belongs to you.' },
		{ status: 404, code: 'PROFILE_NOT_FOUND', meaning: 'The key is not linked to a creator profile.' },
		{ status: 404, code: 'NOT_FOUND', meaning: 'The path is not an API endpoint.' },
		{ status: 429, code: 'RATE_LIMIT_EXCEEDED', meaning: 'You used all requests for this hour. Wait the number of seconds in Retry-After.' },
		{ status: 429, code: 'TOO_MANY_KEY_LOOKUPS', meaning: 'Your address sent too many keys that the API could not verify. Check the key, then wait.' },
		{ status: 500, code: 'INTERNAL_ERROR', meaning: 'The API failed. Try again. If it continues, report it with the requestId.' },
		{ status: 503, code: 'SERVICE_UNAVAILABLE', meaning: 'The API is not available for a short time. Wait the number of seconds in Retry-After.' }
	];
</script>

<svelte:head>
	<title>Creator API reference · Webflow Asset Dashboard</title>
	<meta
		name="description"
		content="Read your Webflow Marketplace profile and assets from your own tools."
	/>
</svelte:head>

<main class="docs">
	<header>
		<p class="eyebrow">Webflow Asset Dashboard</p>
		<h1>Creator API reference</h1>
		<p class="lede">
			Read your Marketplace profile and assets from your own tools. The API is read-only, and the
			version is part of the path.
		</p>
		<p><a href="/dashboard">Open the dashboard</a></p>
	</header>

	<section aria-labelledby="start">
		<h2 id="start">Before you start</h2>
		<ol>
			<li>In the dashboard, open your profile settings, then select <strong>API Keys</strong>.</li>
			<li>Create a key and select the permissions it needs.</li>
			<li>Copy the key immediately. The dashboard shows it one time only.</li>
		</ol>
		<p>
			Keep the key on a server. Do not put it in page code that a browser loads: a key in a web
			page is public. Requests from browser code on other sites are blocked.
		</p>
	</section>

	<section aria-labelledby="auth">
		<h2 id="auth">Authentication</h2>
		<p>
			Send the key in the <code>Authorization</code> header of each request. The API accepts
			<code>GET</code> requests only.
		</p>
		<pre><code>{authExample}</code></pre>
		<p>Base URL: <code>{data.apiBase}</code></p>
	</section>

	<section aria-labelledby="endpoints">
		<h2 id="endpoints">Endpoints</h2>

		<h3><span class="method">GET</span> /profile</h3>
		<p>Your public creator profile. Permission: <code>read:profile</code>.</p>
		<pre><code>{profileResponse}</code></pre>

		<h3><span class="method">GET</span> /assets</h3>
		<p>
			Your assets, with the newest submission first. Permission: <code>read:assets</code>.
		</p>
		<div class="table-scroll">
			<table>
				<thead>
					<tr><th scope="col">Parameter</th><th scope="col">Values</th><th scope="col">Default</th></tr>
				</thead>
				<tbody>
					<tr>
						<td><code>status</code></td>
						<td>{data.statuses.join(', ')}</td>
						<td>All statuses</td>
					</tr>
					<tr>
						<td><code>type</code></td>
						<td>{data.types.join(', ')}</td>
						<td>All types</td>
					</tr>
					<tr>
						<td><code>limit</code></td>
						<td>1 to {data.listMaxLimit}</td>
						<td>{data.listDefaultLimit}</td>
					</tr>
					<tr>
						<td><code>offset</code></td>
						<td>0 or more</td>
						<td>0</td>
					</tr>
				</tbody>
			</table>
		</div>
		<pre><code>{listExample}</code></pre>
		<pre><code>{listResponse}</code></pre>

		<h3><span class="method">GET</span> /assets/&#123;id&#125;</h3>
		<p>
			One asset, by the <code>id</code> from the list. Permission: <code>read:assets</code>. The
			response is the asset object with a <code>meta</code> field.
		</p>

		<h3>About the data</h3>
		<ul>
			<li>
				The API returns the assets of your own creator profile. If the dashboard also shows you
				assets from another creator's profile, the API does not include them.
			</li>
			<li>Data can be up to {data.dataDelayMinutes} minutes behind the dashboard.</li>
			<li><code>metrics.revenue</code> is in US dollars, as the dashboard shows it.</li>
			<li>
				<code>metrics.viewers</code> is <code>null</code> when view data is not available. It is
				not a zero.
			</li>
			<li>
				Image links are temporary. Request the asset again to get a new link, or keep your own
				copy of the image.
			</li>
		</ul>
	</section>

	<section aria-labelledby="limits">
		<h2 id="limits">Rate limits</h2>
		<p>
			You can make {data.requestsPerHour} requests in each clock hour (UTC). All your keys share
			this limit. When the API accepts your key, the response has these headers:
		</p>
		<div class="table-scroll">
			<table>
				<thead><tr><th scope="col">Header</th><th scope="col">Meaning</th></tr></thead>
				<tbody>
					<tr><td><code>X-RateLimit-Limit</code></td><td>Requests allowed in the hour.</td></tr>
					<tr><td><code>X-RateLimit-Remaining</code></td><td>Requests left in the hour.</td></tr>
					<tr>
						<td><code>X-RateLimit-Reset</code></td>
						<td>When the hour ends, as a Unix time in seconds.</td>
					</tr>
				</tbody>
			</table>
		</div>
		<p>
			After the limit, the API answers <code>429</code> with a <code>Retry-After</code> header in
			seconds. A refused request does not use the limit.
		</p>
	</section>

	<section aria-labelledby="errors">
		<h2 id="errors">Errors</h2>
		<p>
			An error from an endpoint has an HTTP status and a JSON body. Use <code>code</code> in your
			program. The
			<code>error</code> text is for people and can change. Include <code>requestId</code> when you
			report a problem.
		</p>
		<pre><code>{errorResponse}</code></pre>
		<div class="table-scroll">
			<table>
				<thead>
					<tr><th scope="col">Status</th><th scope="col">Code</th><th scope="col">Meaning</th></tr>
				</thead>
				<tbody>
					{#each errors as item (item.code)}
						<tr>
							<td>{item.status}</td>
							<td><code>{item.code}</code></td>
							<td>{item.meaning}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section aria-labelledby="keys">
		<h2 id="keys">Keys</h2>
		<ul>
			<li>
				A key expires {data.keyLifetimeDays} days after you create it, at 00:00 UTC on the expiry
				date the dashboard shows.
			</li>
			<li>You can have {data.maxActiveKeys} active keys.</li>
			<li>A revoked key stops working on its next request.</li>
			<li>A key reads only your own profile and assets. It cannot change data.</li>
		</ul>
	</section>

	<section aria-labelledby="versioning">
		<h2 id="versioning">Versioning</h2>
		<ul>
			<li>
				We can add fields and endpoints to v1. Make your program ignore fields it does not know.
			</li>
			<li>We do not remove or rename v1 fields, and we do not change what they mean.</li>
			<li>
				A change that breaks these rules gets a new version in the path. We tell key owners by
				email, and v1 continues to work for 90 days or more after that message.
			</li>
		</ul>
	</section>

	<section aria-labelledby="help">
		<h2 id="help">Help</h2>
		<p>
			Use the Feedback button in the dashboard. Include the <code>requestId</code> from the error.
		</p>
	</section>
</main>

<style>
	.docs {
		max-width: 46rem;
		margin: 0 auto;
		padding: 3rem 1.5rem 6rem;
		color: var(--color-fg-secondary);
		font-size: var(--text-body);
		line-height: 1.6;
	}

	header {
		margin-bottom: 2.5rem;
	}

	.eyebrow {
		margin: 0 0 var(--space-xs);
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
	}

	h1 {
		margin: 0 0 var(--space-sm);
		font-family: var(--font-heading);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	.lede {
		margin: 0 0 var(--space-sm);
		font-size: var(--text-body-lg);
		color: var(--color-fg-primary);
	}

	section {
		margin-top: 2.5rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border-default);
	}

	h2 {
		margin: 0 0 var(--space-sm);
		font-family: var(--font-heading);
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	h3 {
		margin: 2rem 0 var(--space-xs);
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}

	p,
	ul,
	ol {
		margin: 0 0 var(--space-sm);
	}

	ul,
	ol {
		padding-left: 1.25rem;
	}

	li + li {
		margin-top: var(--space-xs);
	}

	a {
		color: var(--color-info-ink);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	a:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}

	code {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.875em;
		color: var(--color-fg-primary);
	}

	pre {
		margin: 0 0 var(--space-sm);
		padding: var(--space-md);
		overflow-x: auto;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
	}

	pre code {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		white-space: pre;
	}

	.method {
		margin-right: 0.375rem;
		padding: 0.125rem 0.375rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.75em;
		color: var(--color-info-ink);
		background: var(--color-info-muted);
		border-radius: var(--radius-sm);
	}

	.table-scroll {
		margin: 0 0 var(--space-sm);
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-body-sm);
	}

	th,
	td {
		padding: 0.5rem 0.75rem 0.5rem 0;
		text-align: left;
		vertical-align: top;
		border-bottom: 1px solid var(--color-border-default);
	}

	th {
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
	}
</style>
