<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';

	// Scroll reveal observer
	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('visible');
					}
				});
			},
			{ threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
		);

		document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

		return () => observer.disconnect();
	});
</script>

<SEO
	title="About | Micah Johnson — Your AI Person"
	description="I connect business tools to AI and teach the AI how your business works. 16+ production integrations. System Architect at Webflow. Based in Texas."
	keywords="Micah Johnson, AI integration, fractional AI architect, business tool automation, AI consulting Texas"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<p class="hero-eyebrow reveal">About</p>
		<h1 class="hero-title reveal">I build connections. Then I build intelligence.</h1>
		<p class="hero-detail reveal">
			I started by connecting business tools to AI — Salesforce, HubSpot, Notion,
			Procore, custom systems. I've built 16+ production integrations. That experience
			taught me something: the connection is the easy part. The intelligence — teaching
			AI how your business actually works — is what makes it valuable.
		</p>
	</div>
</section>

<!-- The Approach -->
<section class="about-section">
	<div class="section-container">
		<div class="about-content reveal">
			<h2>The approach</h2>
			<p>
				I connect your business tools to AI, then build the intelligence
				on top. I give Claude, Cursor, and Codex access to your actual systems, then teach
				them how your business works — through business rules, workflow logic, and
				ongoing refinement.
			</p>
			<p>
				My methodology is the Subtractive Triad: before building anything new, I
				audit your systems to find what should be removed — duplication, excess,
				disconnection. What remains is what's worth connecting. This is why my
				implementations work: I don't just add connections. I design the system first.
			</p>
		</div>
	</div>
</section>

<!-- Background -->
<section class="about-section">
	<div class="section-container">
		<div class="about-content reveal">
			<h2>Background</h2>
			<p>
				Micah Johnson. System Architect on the Marketplace Team at Webflow — building
				internal tools, onboarding systems, and platform infrastructure serving millions
				of users. Also building custom AI integrations and managed intelligence services
				for businesses across the US.
			</p>
			<p>
				I've deployed 16+ production integrations connecting tools like Salesforce,
				HubSpot, Notion, Slack, Procore, and custom internal systems to AI. That
				building experience is what makes the intelligence work credible — I know
				what breaks because I've built it.
			</p>
			<p>
				Based in Texas. Working with businesses across the US.
			</p>
			<p>
				<a href="https://www.linkedin.com/in/micahryanjohnson/" class="link" target="_blank" rel="noopener noreferrer">LinkedIn</a> · <a href="mailto:micah@createsomething.agency" class="link">Email</a>
			</p>
		</div>
	</div>
</section>

<!-- The System -->
<section class="about-section">
	<div class="section-container">
		<div class="about-content reveal">
			<h2>The system behind the work</h2>
			<p>CREATE SOMETHING operates as a connected system — each part informs the others:</p>
			<ul class="circle-list">
				<li><a href="https://createsomething.ltd" class="link" target="_blank" rel="noopener noreferrer"><strong>.ltd</strong></a> — Philosophy and principles</li>
				<li><a href="https://createsomething.io" class="link" target="_blank" rel="noopener noreferrer"><strong>.io</strong></a> — Research and validated patterns</li>
				<li><a href="https://createsomething.space" class="link" target="_blank" rel="noopener noreferrer"><strong>.space</strong></a> — Tools and experiments</li>
				<li><strong>.agency</strong> — Your AI person <span class="muted">(you are here)</span></li>
			</ul>
			<p>
				Client work informs the research. Research refines the methodology. The methodology
				improves the client work. Every part serves the whole.
			</p>
		</div>
	</div>
</section>

<!-- Also Building -->
<section class="about-section">
	<div class="section-container">
		<div class="about-content reveal">
			<h2>Also building</h2>
			<p>
				I'm also building <a href="https://workway.co" class="link" target="_blank" rel="noopener noreferrer">WORKWAY</a> — AI automation for construction, built on Procore. What I learn building for construction strengthens what I bring to every client engagement.
			</p>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<h2 class="cta-heading reveal">Limited roster. Let's see if there's a fit.</h2>
		<div class="cta-actions reveal">
			<a href="/book" class="cta-link-primary">Book a Call →</a>
			<a href="/services" class="cta-link-secondary">How I work →</a>
		</div>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: var(--content-width-xl);
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}

	/* Hero with grid background */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
		overflow: hidden;
	}

	.hero-grid {
		position: absolute;
		inset: 0;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
		background-size: 60px 60px;
		mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		-webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
		pointer-events: none;
	}

	.hero-content {
		position: relative;
		text-align: center;
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}

	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-5, 1.5rem);
	}

	.hero-title {
		font-size: var(--text-display);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
		line-height: 1.1;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}

	.hero-detail {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		max-width: 38em;
		margin: 0 auto;
	}

	/* About Sections */
	.about-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}

	.about-content h2 {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-4, 1rem);
	}

	.about-content p {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-4, 1rem);
	}

	.about-content p:last-child {
		margin-bottom: 0;
	}

	/* Hermeneutic circle list */
	.circle-list {
		list-style: none;
		padding: 0;
		margin: 0 0 var(--space-4, 1rem) 0;
	}

	.circle-list li {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		padding: var(--space-2, 0.5rem) 0;
		border-bottom: 1px solid var(--color-border-default);
	}

	.circle-list li:first-child {
		border-top: 1px solid var(--color-border-default);
	}

	.circle-list li strong {
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}

	.muted {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.link {
		color: var(--color-fg-primary);
		transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
	}

	.link:hover {
		opacity: 0.7;
	}

	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}

	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-5, 1.5rem);
	}

	.cta-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-4, 1rem);
	}

	.cta-link-primary {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		transition: opacity var(--duration-micro, 200ms) var(--ease-standard);
	}

	.cta-link-primary:hover {
		opacity: 0.7;
	}

	.cta-link-secondary {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}

	.cta-link-secondary:hover {
		color: var(--color-fg-primary);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}

		.hero-title {
			font-size: var(--text-h1);
		}

		.about-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
	}
</style>
