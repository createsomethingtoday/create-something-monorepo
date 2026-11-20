<script lang="ts">
	import { goto } from '$app/navigation';

	let { user }: { user: { email?: string; name?: string; tier?: string } | null } = $props();
	let isLoggingOut = $state(false);

	const properties = [
		{ id: 'ltd', label: 'Philosophy', href: 'https://createsomething.ltd/login?redirect=/account' },
		{ id: 'io', label: 'Research', href: 'https://createsomething.io/login?redirect=/account' },
		{ id: 'space', label: 'Practice', href: 'https://createsomething.space/login?redirect=/account' },
		{ id: 'agency', label: 'Services', href: 'https://createsomething.agency/login?redirect=/account' }
	];

	// Keep the shared account's logout request and server-owned redirect behavior.
	async function handleLogout() {
		isLoggingOut = true;
		try {
			const response = await fetch('/api/auth/logout', { method: 'POST' });
			const payload = (await response.json().catch(() => null)) as { logoutUrl?: string } | null;
			window.location.assign(payload?.logoutUrl || '/login');
		} catch {
			goto('/login');
		}
	}
</script>

<div class="agency-account">
	<header class="account-opening">
		<div>
			<p class="eyebrow">Customer workspace</p>
			<h1>Your account.</h1>
		</div>
		<p class="account-introduction">
			Your profile, access, and CREATE SOMETHING properties in one place.
		</p>
	</header>

	<section class="account-section" aria-labelledby="account-profile">
		<div class="section-heading">
			<p class="eyebrow">01 / Profile</p>
			<h2 id="account-profile" tabindex="-1">Account details</h2>
		</div>
		<dl class="profile-details">
			<div class="detail-row">
				<dt>Email</dt>
				<dd>{user?.email || 'Not provided'}</dd>
			</div>
			{#if user?.name}
				<div class="detail-row">
					<dt>Name</dt>
					<dd>{user.name}</dd>
				</div>
			{/if}
			{#if user?.tier}
				<div class="detail-row">
					<dt>Tier</dt>
					<dd>{user.tier}</dd>
				</div>
			{/if}
		</dl>
	</section>

	<section class="account-section" aria-labelledby="account-mcp-access">
		<div class="section-heading">
			<p class="eyebrow">02 / Personal access</p>
			<h2 id="account-mcp-access" tabindex="-1">MCP Access</h2>
		</div>
		<div class="section-content">
			<p>
				Review your personal bearer token, host setup snippets, and managed access scope in the
				reveal-and-copy workspace.
			</p>
			<a class="account-action" href="/mcp-access">
				Open MCP Access <span aria-hidden="true">↗</span>
			</a>
		</div>
	</section>

	<section class="account-section" aria-labelledby="account-properties">
		<div class="section-heading">
			<p class="eyebrow">03 / Across CREATE SOMETHING</p>
			<h2 id="account-properties" tabindex="-1">Connected Properties</h2>
		</div>
		<div class="section-content">
			<p>Use your CREATE SOMETHING account across these properties. Each property manages its own access.</p>
			<ul class="property-list">
				{#each properties as property}
					<li>
						<a
							class="property-link"
							href={property.href}
							aria-current={property.id === 'agency' ? 'location' : undefined}
						>
							<span class="property-identity">
								<span class="property-name">.{property.id}</span>
								<span class="property-label">{property.label}</span>
							</span>
							{#if property.id === 'agency'}<span class="property-current">Current property</span>{/if}
							<span class="property-arrow" aria-hidden="true">↗</span>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<section class="account-section account-section--session" aria-labelledby="account-session">
		<div class="section-heading">
			<p class="eyebrow">04 / Session</p>
			<h2 id="account-session" tabindex="-1">Sign out</h2>
		</div>
		<div class="section-content">
			<p>Sign out of your current session when you have finished.</p>
			<button class="account-action" type="button" onclick={handleLogout} disabled={isLoggingOut}>
				{isLoggingOut ? 'Signing out...' : 'Sign out'}
				<span aria-hidden="true">↗</span>
			</button>
		</div>
	</section>
</div>

<style>
	.agency-account {
		width: 100%;
		max-width: 1760px;
		margin: 0 auto;
		padding: 0 3vw clamp(3rem, 7vw, 6rem);
		color: var(--color-performance-ink);
		font-family: var(--font-performance-sans);
	}

	.account-opening {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 0.7fr);
		align-items: end;
		gap: 2rem 6vw;
		padding: 0 0 clamp(2rem, 5vw, 4rem);
	}

	.eyebrow,
	dt,
	.property-label,
	.property-current {
		color: var(--color-performance-muted);
		font-family: var(--font-performance-mono);
		font-size: var(--text-performance-caption);
		line-height: 1.5;
	}

	.eyebrow {
		margin: 0 0 1rem;
		font-size: 11px;
		letter-spacing: 0.045em;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		font-size: clamp(2.75rem, 5.6vw, 5.5rem);
		font-weight: 500;
		line-height: 1.02;
		letter-spacing: -0.06em;
	}

	.account-introduction,
	.section-content > p {
		max-width: 50ch;
		margin: 0;
		color: var(--color-performance-muted);
		font-size: var(--text-performance-body);
		line-height: 1.6;
	}

	.account-section {
		display: grid;
		grid-template-columns: minmax(0, 0.65fr) minmax(0, 1fr);
		gap: 1.75rem 6vw;
		padding: clamp(1.75rem, 4vw, 3rem) 0;
		border-top: 1px solid var(--color-performance-line);
	}

	.section-heading,
	.section-content,
	.profile-details {
		min-width: 0;
	}

	h2 {
		max-width: 20ch;
		margin: 0;
		font-size: clamp(1.5rem, 2.6vw, 2.5rem);
		font-weight: 500;
		line-height: 1.12;
		letter-spacing: -0.04em;
		scroll-margin-top: 112px;
	}

	.profile-details {
		margin: 0;
	}

	.detail-row {
		display: grid;
		grid-template-columns: minmax(4rem, 0.3fr) minmax(0, 1fr);
		gap: 1rem;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-performance-line);
	}

	.detail-row:first-child {
		padding-top: 0;
	}

	dt {
		padding-top: 0.2em;
	}

	dd {
		min-width: 0;
		margin: 0;
		font-size: var(--text-performance-body);
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.account-action {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
		min-height: 48px;
		max-width: 100%;
		margin-top: 1.5rem;
		padding: 0.8rem 1rem;
		border: 1px solid var(--color-performance-ink);
		border-radius: 0;
		background: var(--color-performance-ink);
		color: var(--color-performance-paper);
		font: 600 var(--text-performance-body-sm)/1.4 var(--font-performance-sans);
		text-align: start;
		text-decoration: none;
	}

	.account-action:hover:not(:disabled) {
		background: var(--color-performance-paper);
		color: var(--color-performance-ink);
	}

	.account-action:disabled {
		cursor: wait;
		color: var(--color-performance-paper);
	}

	.property-list {
		margin: 1.5rem 0 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--color-performance-line);
	}

	.property-link {
		display: flex;
		align-items: center;
		gap: 1rem;
		min-height: 72px;
		padding: 1rem 0;
		border-bottom: 1px solid var(--color-performance-line);
		color: var(--color-performance-ink);
		text-decoration: none;
	}

	.property-identity {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		min-width: 0;
	}

	.property-name {
		font-size: clamp(1.25rem, 2vw, 1.75rem);
		line-height: 1.2;
		letter-spacing: -0.035em;
	}

	.property-current {
		margin-left: auto;
		font-size: 10px;
	}

	.property-arrow {
		margin-left: auto;
		font-size: 1.25rem;
	}

	.property-current + .property-arrow {
		margin-left: 0;
	}

	.account-section--session {
		border-bottom: 1px solid var(--color-performance-line);
	}

	@media (max-width: 700px) {
		.agency-account {
			padding-inline: 6vw;
		}

		.account-opening,
		.account-section {
			grid-template-columns: minmax(0, 1fr);
			gap: 1.5rem;
		}

		h1 {
			font-size: clamp(2.5rem, 9.5vw, 4rem);
		}

		.detail-row {
			grid-template-columns: minmax(3rem, 0.25fr) minmax(0, 1fr);
		}

		.property-identity {
			flex-direction: column;
		}

		.property-current {
			max-width: 8ch;
		}
	}
</style>
