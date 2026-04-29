<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="glass panel">
	<div class="eyebrow">Settings</div>
	<h1 class="section-title">Hosted product preferences</h1>
	<p class="muted">
		This surface owns conversation defaults and linked-tool status. Credential minting, security
		controls, and entitlement changes still live in `.agency`.
	</p>
</section>

<section class="grid-3 section-gap">
	<div class="glass panel">
		<h2 class="section-title">Notifications</h2>
		<ul>
			{#each data.settings.notifications as item}
				<li>{item}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<h2 class="section-title">Guardrails</h2>
		<ul>
			{#each data.settings.guardrails as item}
				<li>{item}</li>
			{/each}
		</ul>
	</div>

	<div class="glass panel">
		<h2 class="section-title">Control Plane</h2>
		<div class="link-list">
			{#each data.settings.controlPlaneLinks as link}
				<a href={link.href}>{link.label}</a>
			{/each}
		</div>
	</div>
</section>

<style>
	.panel {
		padding: 1.2rem;
	}

	.section-gap {
		margin-top: 1rem;
	}

	ul {
		margin: 0.8rem 0 0;
		padding-left: 1.1rem;
		line-height: 1.7;
	}

	.link-list {
		display: grid;
		gap: 0.75rem;
		margin-top: 0.8rem;
	}

	.link-list a {
		text-decoration: none;
		color: var(--accent);
		font-weight: 600;
	}
</style>
