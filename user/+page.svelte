<script lang="ts">
	/**
	 * OUTERFIELDS User Presentation
	 *
	 * Designed for end users / customers.
	 */
	import Presentation from '$lib/components/Presentation.svelte';
	import Slide from '$lib/components/Slide.svelte';
	import AIAnalytics from '$lib/components/AIAnalytics.svelte';
	import AnalyticsDashboard from '$lib/components/AnalyticsDashboard.svelte';
</script>

<svelte:head>
	<title>OUTERFIELDS | User Presentation</title>
	<meta name="description" content="OUTERFIELDS - User walkthrough deck." />
	<meta name="robots" content="noindex" />
</svelte:head>

<Presentation title="OUTERFIELDS" subtitle="User Walkthrough">
	<Slide type="title">
		<span class="number">01</span>
		<div class="logo">∞</div>
		<h1>OUTERFIELDS</h1>
		<p class="subtitle">Premium Content Network</p>
		<p class="tagline">Browse like Netflix. Unlock the full library.</p>
	</Slide>

	<Slide type="content">
		<span class="number">02</span>
		<h2>What it is</h2>
		<p>
			OUTERFIELDS is a <span class="highlight">premium content network</span>.
			You can browse previews for free, and unlock the full catalog as a member.
		</p>
		<ul>
			<li>High-quality series, episodes, and films</li>
			<li>Member-only behind-the-scenes and tools</li>
			<li>Simple, fast, and built to feel finished</li>
		</ul>
	</Slide>

	<Slide type="content">
		<span class="number">03</span>
		<h2>How access works</h2>
		<p>It’s intentionally Netflix-style:</p>
		<ul>
			<li>You can preview a small slice of content</li>
			<li>Most content is locked until you join</li>
			<li>Members get the full library + tools</li>
		</ul>
	</Slide>

	<Slide type="image">
		<span class="number">04</span>
		<div class="embed">
			<AIAnalytics forceUnlocked interactive={false} />
		</div>
		<p class="caption">Members can ask questions in plain English and get clear next steps.</p>
	</Slide>

	<Slide type="image">
		<span class="number">05</span>
		<div class="embed">
			<AnalyticsDashboard forceUnlocked interactive={false} />
		</div>
		<p class="caption">Members see a unified dashboard: engagement, social, and progress.</p>
	</Slide>

	<Slide type="content">
		<span class="number">06</span>
		<h2>What you get as a member</h2>
		<ul>
			<li>Full access to the content catalog</li>
			<li>Behind-the-scenes and “making-of” content</li>
			<li>Member-only analytics + AI assistant</li>
			<li>Included discovery call</li>
		</ul>
	</Slide>

	<Slide type="split">
		<span class="number">07</span>
		<div class="left">
			<h2>Price</h2>
			<p><span class="brand">$99</span> one-time</p>
			<p>Lifetime access. No subscriptions.</p>
			<p class="muted">30-day money-back guarantee</p>
		</div>
		<div class="divider"></div>
		<div class="right">
			<h2>Why it’s worth it</h2>
			<p>One place for premium content.</p>
			<p>Extra behind-the-scenes.</p>
			<p>Tools that make the catalog feel alive.</p>
		</div>
	</Slide>

	<Slide type="content">
		<span class="number">08</span>
		<h2>What to do next</h2>
		<ul>
			<li>Browse the homepage and watch the free previews</li>
			<li>Join as a founding member to unlock everything</li>
			<li>Use the AI assistant to find what to watch next</li>
		</ul>
		<p class="muted spaced">Live: <a class="link" href="https://outerfields.createsomething.agency">outerfields.createsomething.agency</a></p>
	</Slide>

	<Slide type="title">
		<span class="number">09</span>
		<div class="logo">∞</div>
		<h1>OUTERFIELDS</h1>
		<p class="subtitle">Premium Content Network</p>
		<p class="tagline">
			<a href="https://outerfields.createsomething.agency" class="cta-link">Open the site</a>
		</p>
	</Slide>
</Presentation>

<style>
	/* Presentation embeds: make full-page sections compact inside slides */
	.embed :global(section) {
		padding: 0 !important;
	}

	.embed :global(.section-header) {
		margin-bottom: 1.5rem !important;
	}

	.embed :global(.ai-analytics-container),
	.embed :global(.analytics-container) {
		max-width: 100% !important;
	}

	:global(.cta-link) {
		color: var(--color-brand, #7c2bee) !important;
		text-decoration: none;
		font-weight: 600;
	}

	:global(.cta-link:hover) {
		text-decoration: underline;
	}

	:global(.link) {
		color: var(--color-brand, #7c2bee);
		text-decoration: underline;
		text-underline-offset: 4px;
	}

	:global(.spaced) {
		margin-top: var(--space-md);
	}
</style>

