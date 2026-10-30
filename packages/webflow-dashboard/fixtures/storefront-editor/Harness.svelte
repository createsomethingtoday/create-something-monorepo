<script lang="ts">
	import EditProfileModal from '$lib/components/EditProfileModal.svelte';
	import type { LoggedRequest } from './fake-api';

	interface Props {
		scenario: string;
		requests: LoggedRequest[];
	}

	let { scenario, requests }: Props = $props();
	let open = $state(true);

	const SCENARIOS = ['default', 'empty', 'published', 'conflict', 'pending', 'propagating', 'suspended', 'ineligible', 'flaky', 'ambiguous', 'disabled'];
</script>

<main class="harness">
	<header>
		<strong>Storefront editor fixture</strong>
		<span>Local only · fake API · no credentials</span>
		<nav aria-label="Scenarios">
			{#each SCENARIOS as name}
				<a href="?scenario={name}" aria-current={name === scenario ? 'page' : undefined}>{name}</a>
			{/each}
		</nav>
		<button type="button" onclick={() => (open = true)} data-testid="open-settings">Open Settings</button>
	</header>

	<section aria-label="Request log" data-testid="request-log">
		<h2>Requests</h2>
		<ol>
			{#each requests as r}
				<li>
					<code>{r.method} {r.path}</code>
					{#if r.action}<code>action={r.action}</code>{/if}
					{#if r.idempotencyKey}<code>key={r.idempotencyKey.slice(0, 8)}…</code>{/if}
					<code>→ {r.status}</code>
				</li>
			{/each}
		</ol>
	</section>
</main>

{#if open}
	<EditProfileModal onClose={() => (open = false)} />
{/if}

<style>
	.harness {
		font-family: system-ui, sans-serif;
		padding: 16px;
		display: grid;
		gap: 12px;
	}
	header {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 16px;
		align-items: center;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	nav a[aria-current='page'] {
		font-weight: 700;
	}
	ol {
		font-size: 12px;
		max-height: 30vh;
		overflow: auto;
	}
	code {
		margin-right: 6px;
	}
</style>
