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
	title="About | We Connect Your Tools to AI"
	description="We connect your existing tools to AI agents. Based in Texas. Fast turnaround, predictable pricing, managed runtime available."
	keywords="about, connect tools to AI, MCP development, Micah Johnson, automation infrastructure"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<p class="hero-eyebrow reveal">About</p>
		<h1 class="hero-title reveal">We connect your tools to AI</h1>
		<p class="hero-detail reveal">
			You have tools you rely on every day. You want AI agents to work with them. 
			We make that connection—and keep it running. Fast turnaround. Predictable pricing.
		</p>
	</div>
</section>

<!-- The Work -->
<section class="about-section">
	<div class="section-container">
		<div class="about-content reveal">
			<h2>The work</h2>
			<p>
				We build the infrastructure that lets AI agents like Claude, Cursor, and Codex 
				access your existing tools—CRM, docs, chat, email, internal systems—securely 
				and with the permissions you set.
			</p>
			<p>
				The technology is called MCP (Model Context Protocol). It's how AI agents connect 
				to external systems. We handle the technical side: authentication, data mapping, 
				error handling, and deployment.
			</p>
			<p>
				We can also operate your connections on a managed runtime with monitoring, 
				alerts, and updates—so everything keeps running after launch. Starts at $99/mo.
			</p>
			<p>
				Every project ships working code. You own the source, the deployment package, 
				and documentation. No lock-in.
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
				Led by Micah Johnson. 5+ years at Webflow building internal tools, 
				onboarding systems, and template infrastructure. Now focused on 
				connecting tools to AI agents.
			</p>
			<p>
				Based in Texas. <a href="https://www.linkedin.com/in/micahryanjohnson/" class="link" target="_blank" rel="noopener noreferrer">LinkedIn</a> · <a href="mailto:micah@createsomething.agency" class="link">Email</a>
			</p>
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<h2 class="cta-heading reveal">Let's talk about your project</h2>
		<p class="cta-subtext reveal">30-minute discovery call. We'll map your tools and give you a clear price.</p>
		<a href="/contact" class="cta-link reveal">Get in touch →</a>
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
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.cta-link {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.cta-link:hover {
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
