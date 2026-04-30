<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
</script>

<section class="hero glass panel">
	<div class="eyebrow">Hosted Product Plane</div>
	<h1 class="page-title">AI-native concierge chat for progressive profiling.</h1>
	<p class="lede">
		Instead of forcing a busy nurse through a rigid intake form, the conversation builds the
		profile invisibly and only renders structured tools when policy or confidence requires them.
	</p>

	<div class="hero-actions">
		<a class="link-button" href={data.latestThreadId ? `/chat/${data.latestThreadId}` : '/chat'}>Open demo thread</a>
		<a class="link-secondary" href="/chat">View thread list</a>
	</div>
</section>

<section class="grid-3 section-gap">
	<div class="glass panel">
		<div class="eyebrow">Control Plane</div>
		<h2 class="section-title">.agency owns access</h2>
		<p class="muted">
			Credentials, entitlements, security posture, and partner admin remain outside the chat
			product.
		</p>
	</div>

	<div class="glass panel">
		<div class="eyebrow">Product Plane</div>
		<h2 class="section-title">Concierge owns the session</h2>
		<p class="muted">
			Threads, profile progress, dynamic widgets, and handoff all live here as the end-user
			experience.
		</p>
	</div>

	<div class="glass panel">
		<div class="eyebrow">Execution Plane</div>
		<h2 class="section-title">Hub owns governed tool use</h2>
		<p class="muted">
			MCP discovery, route authorization, auth recovery, and tenant-safe execution stay behind
			the hosted app.
		</p>
	</div>
</section>

<section class="glass panel section-gap">
	<div class="section-header">
		<div>
			<div class="eyebrow">Demo Threads</div>
			<h2 class="section-title">Scaffolded flows</h2>
		</div>
		<span class="status-pill">{data.threads.length} seeded threads</span>
	</div>

	<div class="thread-list">
		{#each data.threads as thread}
			<a class="thread-card" href={`/chat/${thread.id}`}>
				<div class="thread-top">
					<strong>{thread.title}</strong>
					<span class={`status-pill ${thread.status === 'handoff_ready' ? 'danger' : 'warn'}`}>
						{thread.status.replace('_', ' ')}
					</span>
				</div>
				<p>{thread.subtitle}</p>
				<div class="thread-meta">
					<span>{thread.profileCompletion}% complete</span>
					<span>{thread.pendingAction}</span>
				</div>
			</a>
		{/each}
	</div>
</section>

<style>
	.panel {
		padding: 1.35rem;
	}

	.hero {
		padding: 1.8rem;
	}

	.lede {
		max-width: 48rem;
		font-size: 1.08rem;
		color: var(--muted);
	}

	.hero-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-top: 1.5rem;
	}

	.link-button,
	.link-secondary {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.8rem 1.2rem;
		border-radius: 999px;
		text-decoration: none;
	}

	.link-button {
		background: var(--ink);
		color: white;
	}

	.link-secondary {
		background: rgba(255, 255, 255, 0.6);
	}

	.section-gap {
		margin-top: 1rem;
	}

	.section-header,
	.thread-top,
	.thread-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.thread-list {
		display: grid;
		gap: 0.85rem;
		margin-top: 1rem;
	}

	.thread-card {
		padding: 1rem 1.1rem;
		border-radius: 18px;
		text-decoration: none;
		background: rgba(255, 255, 255, 0.58);
		border: 1px solid rgba(31, 27, 22, 0.08);
	}

	p {
		line-height: 1.6;
	}
</style>
