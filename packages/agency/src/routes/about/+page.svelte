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
	title="About | Custom MCP Development"
	description="We build and operate custom MCP servers that connect your tools to agents. Based in Texas. Fast turnaround, fixed pricing."
	keywords="MCP development, custom MCP server, about, Micah Johnson"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero -->
<section class="hero">
	<div class="hero-grid"></div>
	<div class="hero-content">
		<p class="hero-eyebrow reveal">About</p>
		<h1 class="hero-title reveal">We build and operate MCP servers</h1>
		<p class="hero-detail reveal">
			Custom integrations that connect your existing tools to agents. 
			Fast turnaround. Fixed pricing. Managed runtime or handoff.
		</p>
	</div>
</section>

<!-- The Work -->
<section class="about-section">
	<div class="section-container">
		<div class="about-content reveal">
			<h2>The work</h2>
			<p>
				MCP (Model Context Protocol) is how AI agents connect to external tools. 
				We build the servers that make those connections possible—auth, data mapping, 
				error handling, deployment packaging.
			</p>
			<p>
				We can also operate your MCP servers on a managed runtime (Cloudflare-native), 
				with monitoring, alerts, and API change handling.
			</p>
			<p>
				Every project ships working code. You get the source, the deployment package, 
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
				MCP development and agent integration.
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
		<h2 class="cta-heading reveal">Let's talk about your integration</h2>
		<p class="cta-subtext reveal">30-minute discovery call. We'll scope build + operate options.</p>
		<a href="/contact" class="cta-link reveal">Get in touch →</a>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: 640px;
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
		max-width: 600px;
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
