<script lang="ts">
	import { CubeMark, SEO, Wordmark } from '@create-something/canon';

	let { data } = $props();

	const frameTitle = $derived(
		data.iframeSrc ? `${data.name} chat experience` : 'Dify chatbot host'
	);
</script>

<SEO
	title={data.iframeSrc ? `${data.name} — Agent Host` : 'Agent Host'}
	description={data.description}
	propertyName="ltd"
	breadcrumbs={[
		{ name: 'Home', url: 'https://createsomething.ltd' },
		{ name: 'Agent Host', url: 'https://createsomething.ltd/embed' }
	]}
/>

<section class="embed-page">
	<div class="embed-grid">
		<header class="hero glass-card">
			<div class="brand-lockup">
				<div class="brand-mark">
					<CubeMark size="lg" animate={true} animationType="reveal" />
				</div>

				<div class="brand-copy">
					<p class="eyebrow">CREATE SOMETHING Agent Host</p>
					<Wordmark size="lg" tagline="Dify Wrapper" />
				</div>
			</div>

			<div class="hero-copy">
				<h1>{data.name}</h1>
				<p class="lede">{data.description}</p>
			</div>

			<div class="hero-meta">
				<span class="meta-pill">Host: .ltd</span>
				<span class="meta-pill">Renderer: iframe</span>
				<span class="meta-pill">Origin: udify.app</span>
				<span class="meta-pill">Mic: enabled</span>
			</div>

			{#if data.iframeSrc}
				<div class="hero-actions">
					<a class="button-secondary" href={data.iframeSrc} target="_blank" rel="noreferrer">
						Open source app
					</a>
					{#if data.token}
						<span class="token-label">Token: {data.token}</span>
					{/if}
				</div>
			{/if}
		</header>

		{#if data.iframeSrc}
			<div class="embed-layout">
				<div class="embed-card glass-card">
					<div class="embed-toolbar">
						<div class="toolbar-status">
							<span class="status-dot" aria-hidden="true"></span>
							<span>{data.name}</span>
						</div>

						<a class="toolbar-link" href={data.iframeSrc} target="_blank" rel="noreferrer">
							Open
						</a>
					</div>

					<div class="embed-viewport">
						<iframe
							src={data.iframeSrc}
							title={frameTitle}
							allow="microphone"
							loading="eager"
							referrerpolicy="strict-origin-when-cross-origin"
						></iframe>
					</div>
				</div>

				<aside class="detail-rail glass-card" aria-label="Integration details">
					<div class="detail-section">
						<p class="detail-label">How to use it</p>
						<p>
							Pass a Dify chatbot URL or token into this route, then use the branded `.ltd`
							URL anywhere you want the CREATE SOMETHING shell instead of raw Dify chrome.
						</p>
					</div>

					<div class="detail-section">
						<p class="detail-label">Current source</p>
						<p class="mono">{data.iframeSrc}</p>
					</div>

					<div class="detail-section">
						<p class="detail-label">Direct examples</p>
						{#each data.examples as example}
							<code>{example}</code>
						{/each}
					</div>
				</aside>
			</div>
		{:else}
			<section class="empty-state glass-card">
				<p class="detail-label">Input required</p>
				<h2>Give the host a Dify URL or token.</h2>
				<p>{data.invalidReason}</p>

				<div class="example-list">
					{#each data.examples as example}
						<code>{example}</code>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</section>

<style>
	.embed-page {
		position: relative;
		min-height: 100vh;
		padding: clamp(1rem, 2vw, 2rem);
		background:
			radial-gradient(circle at 16% 12%, rgba(68, 119, 170, 0.2), transparent 24%),
			radial-gradient(circle at 85% 0%, rgba(255, 255, 255, 0.08), transparent 20%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 18%),
			var(--color-bg-pure);
	}

	.embed-grid {
		width: min(100%, 1480px);
		margin: 0 auto;
		display: grid;
		gap: var(--space-lg);
	}

	.hero,
	.embed-card,
	.detail-rail,
	.empty-state {
		position: relative;
		overflow: hidden;
		border-radius: var(--radius-xl);
	}

	.hero {
		padding: clamp(1.25rem, 2vw, 2rem);
		background:
			linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 48%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 100%);
	}

	.hero::after,
	.embed-card::after,
	.detail-rail::after,
	.empty-state::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 48px 48px;
		mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.65), transparent 80%);
		pointer-events: none;
	}

	.brand-lockup {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
	}

	.brand-mark {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 72px;
		height: 72px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--color-border-default);
	}

	.brand-copy {
		display: grid;
		gap: var(--space-xs);
	}

	.eyebrow {
		margin: 0;
		font-size: var(--text-caption);
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.hero-copy {
		display: grid;
		gap: var(--space-sm);
		max-width: 72ch;
		margin-bottom: var(--space-lg);
	}

	.hero-copy h1 {
		margin: 0;
		font-size: clamp(2.75rem, 6vw, 5.5rem);
		line-height: 0.92;
		letter-spacing: -0.05em;
		color: var(--color-fg-primary);
	}

	.lede {
		margin: 0;
		font-size: var(--text-body-lg);
		line-height: var(--leading-relaxed);
		color: var(--color-fg-secondary);
	}

	.hero-meta,
	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.hero-meta {
		margin-bottom: var(--space-md);
	}

	.meta-pill,
	.token-label {
		display: inline-flex;
		align-items: center;
		padding: 0.55rem 0.85rem;
		border-radius: 999px;
		border: 1px solid var(--color-border-default);
		background: rgba(255, 255, 255, 0.04);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.embed-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
		gap: var(--space-lg);
		align-items: start;
	}

	.embed-card {
		padding: 0;
		min-height: 720px;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 14%),
			rgba(0, 0, 0, 0.48);
	}

	.embed-toolbar {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
		padding: 0.95rem 1rem;
		border-bottom: 1px solid var(--color-border-default);
		background: rgba(0, 0, 0, 0.32);
	}

	.toolbar-status {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
	}

	.status-dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 999px;
		background: var(--color-success);
		box-shadow: 0 0 0 0.35rem rgba(68, 170, 68, 0.16);
	}

	.toolbar-link {
		color: var(--color-fg-primary);
		text-decoration: none;
		font-size: var(--text-body-sm);
	}

	.embed-viewport {
		position: relative;
		min-height: clamp(720px, 84vh, 1100px);
		background:
			linear-gradient(180deg, rgba(17, 17, 17, 0.82), rgba(0, 0, 0, 0.92)),
			var(--color-bg-elevated);
	}

	.embed-viewport iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		background: var(--color-bg-pure);
	}

	.detail-rail,
	.empty-state {
		padding: 1.25rem;
		display: grid;
		gap: var(--space-md);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 100%),
			rgba(0, 0, 0, 0.36);
	}

	.detail-section {
		display: grid;
		gap: 0.65rem;
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-border-default);
	}

	.detail-section:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.detail-label {
		margin: 0;
		font-size: var(--text-caption);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--color-fg-muted);
	}

	.detail-rail p,
	.empty-state p {
		margin: 0;
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	.detail-rail code,
	.empty-state code {
		display: block;
		padding: 0.85rem 0.95rem;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid var(--color-border-default);
		color: var(--color-fg-primary);
		font-size: 0.84rem;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	.mono {
		font-family: var(--font-mono);
		font-size: 0.92rem;
	}

	.empty-state {
		max-width: 820px;
	}

	.empty-state h2 {
		margin: 0;
		font-size: clamp(1.8rem, 4vw, 3rem);
		color: var(--color-fg-primary);
		letter-spacing: -0.03em;
	}

	.example-list {
		display: grid;
		gap: 0.75rem;
	}

	@media (max-width: 1080px) {
		.embed-layout {
			grid-template-columns: 1fr;
		}

		.detail-rail {
			order: -1;
		}
	}

	@media (max-width: 720px) {
		.embed-page {
			padding: 0.75rem;
		}

		.brand-lockup {
			align-items: flex-start;
		}

		.hero-copy h1 {
			font-size: clamp(2.3rem, 11vw, 3.6rem);
		}

		.embed-card {
			min-height: 640px;
		}

		.embed-viewport {
			min-height: min(78vh, 760px);
		}
	}
</style>
