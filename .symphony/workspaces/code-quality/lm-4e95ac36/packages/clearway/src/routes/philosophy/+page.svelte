<script lang="ts">
	// CLEARWAY Design Philosophy
	// The Heideggerian foundation: Zuhandenheit without the jargon
</script>

<svelte:head>
	<title>Our Philosophy - CLEARWAY</title>
	<meta name="description" content="The design philosophy behind CLEARWAY. Why we built software that disappears, and what that means for your members." />
</svelte:head>

<main class="philosophy-page">
	<div class="container">
		<header class="hero">
			<h1>The Philosophy of Disappearing Software</h1>
			<p class="subtitle">Why the best infrastructure is the kind you never notice</p>
		</header>

		<article class="content">
			<section>
				<h2>The Hammer Problem</h2>
				<p>There's a concept in philosophy about tools and attention. When you're using a hammer to drive a nail, you don't think about the hammer. You think about the nail, the wall, the picture you're hanging. The hammer is invisible—it recedes into the background of your awareness.</p>
				<p>But the moment the hammer breaks—the head flies off, the handle cracks—suddenly you're thinking about the hammer. The tool that was invisible becomes the center of attention. The work stops. You're no longer hanging a picture; you're dealing with a broken tool.</p>
				<p>This is true of all tools: the best ones disappear into use. The worst ones constantly remind you they exist.</p>
			</section>

			<section>
				<h2>Software That Demands Attention</h2>
				<p>Most scheduling software is always broken—not literally broken, but philosophically broken. It constantly demands attention:</p>
				<ul>
					<li>Pop-ups asking for input</li>
					<li>Confusing interfaces requiring decisions</li>
					<li>Workflows that interrupt rather than assist</li>
					<li>Features that serve the software, not the user</li>
				</ul>
				<p>For your members, this means the booking system is always present. They don't think "I want to play pickleball tomorrow"—they think "I have to deal with the booking system." The tool never recedes. The experience suffers.</p>
			</section>

			<section>
				<h2>The CLEARWAY Principle</h2>
				<div class="principle-box">
					<p class="principle-statement">The best infrastructure is the kind you never notice.</p>
				</div>
				<p>This isn't just a design preference—it's a commitment that shapes every decision we make. When we evaluate a feature, we ask: does this help the software disappear, or does it make the software more present?</p>
				<p>A good booking flow doesn't feel like "using a booking system." It feels like deciding to play pickleball and then playing pickleball. The steps in between should be so smooth, so natural, that they barely register as steps at all.</p>
			</section>

			<section>
				<h2>What This Means in Practice</h2>
				
				<h3>For Members</h3>
				<p>When your members book through CLEARWAY, they should think about:</p>
				<ul>
					<li>When they want to play</li>
					<li>Who they want to play with</li>
					<li>Which court suits their game</li>
				</ul>
				<p>They should not think about:</p>
				<ul>
					<li>How to navigate the interface</li>
					<li>Whether the system will work</li>
					<li>What the software wants from them</li>
				</ul>
				
				<h3>For Operators</h3>
				<p>Your staff should spend their time on what matters—member experience, facility quality, community building. The booking system should run itself, surfacing issues only when human judgment is genuinely needed, and otherwise staying out of the way.</p>
			</section>

			<section>
				<h2>The Invisible Infrastructure</h2>
				<p>Consider the infrastructure you rely on every day: roads, plumbing, electrical grids. When these systems work, you don't think about them. You think about where you're going, not the road. You think about washing your hands, not the pipes.</p>
				<p>That's what court booking should be. Infrastructure so reliable, so thoughtfully designed, that it becomes invisible. Your members think about playing. Your staff think about hospitality. Everyone focuses on what matters.</p>
				<p>The software recedes. The experience remains.</p>
			</section>

			<section class="closing">
				<h2>Our Commitment</h2>
				<p>Every feature we build, every interface we design, every decision we make is guided by this question: does this help CLEARWAY disappear?</p>
				<p>When members book a court without friction, when staff manage schedules without confusion, when operators run their facilities without wrestling with software—that's when we've succeeded.</p>
				<p>Not when they notice how good the software is. When they don't notice the software at all.</p>
			</section>
		</article>

		<nav class="back-nav">
			<a href="/" class="back-link">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M19 12H5"/>
					<path d="m12 19-7-7 7-7"/>
				</svg>
				Back to home
			</a>
		</nav>
	</div>
</main>

<style>
	.philosophy-page {
		min-height: 100vh;
		padding: var(--space-2xl, 6rem) var(--space-md, 1.5rem);
		background: var(--color-bg-pure, #000);
	}

	.container {
		max-width: 48rem;
		margin: 0 auto;
	}

	.hero {
		text-align: center;
		margin-bottom: var(--space-2xl, 6rem);
	}

	h1 {
		font-size: clamp(2rem, 5vw, 3rem);
		font-weight: 700;
		margin: 0 0 var(--space-sm, 1rem);
		color: var(--color-fg-primary, #fff);
		line-height: 1.2;
	}

	.subtitle {
		font-size: var(--text-body-lg, 1.125rem);
		color: var(--color-fg-tertiary, rgba(255,255,255,0.6));
		margin: 0;
	}

	.content {
		margin-bottom: var(--space-2xl, 6rem);
	}

	section {
		margin-bottom: var(--space-xl, 4rem);
	}

	h2 {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		margin: 0 0 var(--space-md, 1.5rem);
		color: var(--color-fg-primary, #fff);
	}

	h3 {
		font-size: var(--text-body-lg, 1.125rem);
		font-weight: 600;
		margin: var(--space-lg, 2.5rem) 0 var(--space-sm, 1rem);
		color: var(--color-fg-primary, #fff);
	}

	p {
		font-size: var(--text-body, 1rem);
		line-height: 1.8;
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		margin: 0 0 var(--space-md, 1.5rem);
	}

	ul {
		margin: 0 0 var(--space-md, 1.5rem);
		padding-left: var(--space-md, 1.5rem);
	}

	li {
		font-size: var(--text-body, 1rem);
		line-height: 1.8;
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		margin-bottom: var(--space-xs, 0.5rem);
	}

	.principle-box {
		padding: var(--space-lg, 2.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-surface, #111);
		border: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
		margin: var(--space-lg, 2.5rem) 0;
		text-align: center;
	}

	.principle-statement {
		font-size: var(--text-h3, 1.25rem);
		font-weight: 600;
		color: var(--color-fg-primary, #fff);
		margin: 0;
		font-style: italic;
	}

	.closing {
		padding-top: var(--space-xl, 4rem);
		border-top: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.back-nav {
		padding-top: var(--space-lg, 2.5rem);
		border-top: 1px solid var(--color-border-default, rgba(255,255,255,0.1));
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs, 0.5rem);
		font-size: var(--text-body, 1rem);
		color: var(--color-fg-secondary, rgba(255,255,255,0.8));
		text-decoration: none;
		transition: color 0.15s ease;
	}

	.back-link:hover {
		color: var(--color-fg-primary, #fff);
	}

	.back-link svg {
		transition: transform 0.15s ease;
	}

	.back-link:hover svg {
		transform: translateX(-4px);
	}

	.back-link:focus-visible {
		outline: 2px solid var(--color-focus, #fff);
		outline-offset: 4px;
		border-radius: var(--radius-sm, 4px);
	}

	@media (prefers-reduced-motion: reduce) {
		.back-link,
		.back-link svg {
			transition: none;
		}
		.back-link:hover svg {
			transform: none;
		}
	}
</style>
