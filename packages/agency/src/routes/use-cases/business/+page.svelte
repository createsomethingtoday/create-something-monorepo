<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AnimatedGridPattern, BlurFade, BorderBeam, OrbitingCircles, ShimmerButton } from '@create-something/canon/magicui';
	
	const painPoints = [
		{ problem: 'Copy-pasting between tools', solution: 'AI pulls from CRM, updates docs automatically' },
		{ problem: 'Context switching kills focus', solution: 'One interface to access all your systems' },
		{ problem: 'AI can\'t see your data', solution: 'MCP connects AI to your actual tools' },
		{ problem: '"AI integration" sounds expensive', solution: 'Fixed pricing from $750. Know the cost upfront.' }
	];
	
	const workflows = [
		{
			title: 'CRM → Docs Sync',
			tagline: 'Deals that document themselves',
			description: 'New deal closed in HubSpot. Meeting notes, contract terms, and project docs created in Notion automatically.'
		},
		{
			title: 'Support Intelligence',
			tagline: 'Tickets that get smarter',
			description: 'Customer emails analyzed. Priority assigned. Relevant context pulled from your knowledge base. Response drafted.'
		},
		{
			title: 'Report Generator',
			tagline: 'Reports that write themselves',
			description: 'Weekly metrics pulled from your tools. Summary generated. Sent to Slack or email. No manual aggregation.'
		}
	];
	
	const steps = [
		{ num: '1', title: 'Discovery Call', description: 'Map your tools and workflows' },
		{ num: '2', title: 'We Build', description: 'MCP servers + agent configuration' },
		{ num: '3', title: 'You Deploy', description: 'Your infrastructure, your keys' },
		{ num: '4', title: 'AI Works', description: 'Connected to your actual systems' }
	];
</script>

<!-- SVG Icon Snippets (matching landing page) -->
{#snippet createSomethingLogo()}
	<svg viewBox="0 0 32 32" fill="none">
		<path d="M 16 4 L 26.39 10 L 16 16 L 5.61 10 Z" fill="currentColor" fill-opacity="1"/>
		<path d="M 5.61 10 L 16 16 L 16 28 L 5.61 22 Z" fill="currentColor" fill-opacity="0.6"/>
		<path d="M 16 16 L 26.39 10 L 26.39 22 L 16 28 Z" fill="currentColor" fill-opacity="0.3"/>
	</svg>
{/snippet}

{#snippet hubspotIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978V3.07A2.182 2.182 0 0017.25.89h-.036a2.182 2.182 0 00-2.181 2.18v.036c0 .859.503 1.598 1.227 1.955v2.868a5.637 5.637 0 00-2.465 1.168l-6.57-5.084a2.489 2.489 0 00.07-.576 2.478 2.478 0 10-2.477 2.478c.391 0 .756-.102 1.082-.27l6.427 4.974a5.635 5.635 0 00-.636 2.598c0 .974.253 1.888.69 2.69l-2.076 2.077a1.927 1.927 0 00-.593-.102 1.96 1.96 0 101.96 1.96c0-.21-.04-.408-.103-.593l2.026-2.026a5.668 5.668 0 103.569-10.313zm-.95 8.477a2.92 2.92 0 110-5.84 2.92 2.92 0 010 5.84z"/>
	</svg>
{/snippet}

{#snippet notionIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.84-.046.933-.56.933-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.746 0-.933-.234-1.495-.933l-4.577-7.186v6.952l1.449.327s0 .84-1.168.84l-3.22.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933zM2.718 1.321l13.496-.933c1.635-.14 2.055-.047 3.08.7l4.296 2.986c.7.513.933.653.933 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.933c-.98.047-1.448-.093-1.962-.747l-3.127-4.06c-.56-.746-.793-1.306-.793-1.958V2.948c0-.84.373-1.54 1.215-1.627z"/>
	</svg>
{/snippet}

{#snippet slackIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M6 15a2 2 0 0 1-2 2 2 2 0 0 1-2-2 2 2 0 0 1 2-2h2v2zM7 15a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-5zM9 6a2 2 0 0 1-2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9zM9 7a2 2 0 0 1 2 2 2 2 0 0 1-2 2H4a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5zM18 9a2 2 0 0 1 2-2 2 2 0 0 1 2 2 2 2 0 0 1-2 2h-2V9zM17 9a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v5zM15 18a2 2 0 0 1 2 2 2 2 0 0 1-2 2 2 2 0 0 1-2-2v-2h2zM15 17a2 2 0 0 1-2-2 2 2 0 0 1 2-2h5a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-5z"/>
	</svg>
{/snippet}

{#snippet aiIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2z"/>
	</svg>
{/snippet}

{#snippet googleIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
		<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
		<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
		<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
	</svg>
{/snippet}

{#snippet airtableIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M11.992 1.966L2.292 5.633c-.27.1-.27.467 0 .567l9.7 3.667c.27.1.567.1.833 0l9.7-3.667c.27-.1.27-.467 0-.567l-9.7-3.667c-.266-.1-.566-.1-.833 0zM2 8.667v7.4c0 .3.2.567.5.633l9 3.333c.167.067.333.067.5 0l9-3.333c.3-.067.5-.333.5-.633v-7.4l-9.5 3.567c-.333.133-.667.133-1 0L2 8.667z"/>
	</svg>
{/snippet}

{#snippet zapierIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M15.477 12.89l2.648-4.588a.691.691 0 00-.598-1.036h-5.296a.691.691 0 00-.598 1.036l2.648 4.588-2.648 4.588a.691.691 0 00.598 1.036h5.296a.691.691 0 00.598-1.036l-2.648-4.588zM8.523 12.89l2.648-4.588a.691.691 0 00-.598-1.036H5.277a.691.691 0 00-.598 1.036L7.327 12.89l-2.648 4.588a.691.691 0 00.598 1.036h5.296a.691.691 0 00.598-1.036L8.523 12.89z"/>
	</svg>
{/snippet}

{#snippet stripeIcon()}
	<svg viewBox="0 0 24 24" fill="currentColor">
		<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
	</svg>
{/snippet}

<SEO
	title="MCP for Business | Connect Your SaaS Tools to AI"
	description="Custom MCP development for SMB and mid-market. Connect HubSpot, Salesforce, Notion to AI. Fixed pricing from $500. Fast turnaround."
	keywords="MCP business, SaaS integration AI, HubSpot AI, Salesforce Claude, small business automation"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero with animated grid background (matching landing page) -->
<section class="hero">
	<div class="hero-grid-container">
		<AnimatedGridPattern
			numSquares={25}
			maxOpacity={0.08}
			duration={4}
			repeatDelay={2}
			width={60}
			height={60}
			class="hero-animated-grid"
		/>
	</div>
	<div class="hero-container">
		<div class="hero-content">
			<BlurFade delay={0}>
				<p class="hero-eyebrow">MCP for Business</p>
			</BlurFade>
			<BlurFade delay={0.1}>
				<h1 class="hero-title">Your tools, connected to&nbsp;AI</h1>
			</BlurFade>
			<BlurFade delay={0.2}>
				<p class="hero-detail">
					HubSpot, Notion, Slack, Google—connected to Claude, Cursor, or Codex. 
					See AI work across your actual systems.
				</p>
			</BlurFade>
			<BlurFade delay={0.3}>
				<div class="hero-cta">
					<ShimmerButton href="https://savvycal.com/create-something/discovery">
						Book Discovery Call
					</ShimmerButton>
					<a href="/" class="hero-link">← Back to home</a>
				</div>
			</BlurFade>
		</div>
		<BlurFade delay={0.4} class="hero-visual-wrapper">
			<div class="hero-visual-frame">
				<!-- Glow effect behind the frame -->
				<div class="hero-visual-glow" aria-hidden="true"></div>
				
				<!-- Bordered container with beam -->
				<div class="hero-visual-container">
					<BorderBeam 
						size={250}
						duration={12}
						colorFrom="rgba(96, 165, 250, 0.8)"
						colorTo="rgba(167, 139, 250, 0.6)"
					/>
					
					<div class="orbital-container">
						<!-- MAIN LAYER - business tools -->
						<div class="orbit-layer layer-main">
							<OrbitingCircles radius={110} duration={30} startAngle={0}>
								<div class="orbit-item">
									{@render hubspotIcon()}
								</div>
							</OrbitingCircles>
							
							<OrbitingCircles radius={110} duration={30} startAngle={90}>
								<div class="orbit-item">
									{@render notionIcon()}
								</div>
							</OrbitingCircles>
							
							<OrbitingCircles radius={110} duration={30} startAngle={180}>
								<div class="orbit-item">
									{@render slackIcon()}
								</div>
							</OrbitingCircles>
							
							<OrbitingCircles radius={110} duration={30} startAngle={270}>
								<div class="orbit-item">
									{@render aiIcon()}
								</div>
							</OrbitingCircles>
						</div>
						
						<!-- CLOSE LAYER - more tools -->
						<div class="orbit-layer layer-close">
							<OrbitingCircles radius={75} duration={18} startAngle={45} reverse>
								<div class="orbit-item orbit-close">
									{@render googleIcon()}
								</div>
							</OrbitingCircles>
							
							<OrbitingCircles radius={75} duration={18} startAngle={135} reverse>
								<div class="orbit-item orbit-close">
									{@render airtableIcon()}
								</div>
							</OrbitingCircles>
							
							<OrbitingCircles radius={75} duration={18} startAngle={225} reverse>
								<div class="orbit-item orbit-close">
									{@render zapierIcon()}
								</div>
							</OrbitingCircles>
							
							<OrbitingCircles radius={75} duration={18} startAngle={315} reverse>
								<div class="orbit-item orbit-close">
									{@render stripeIcon()}
								</div>
							</OrbitingCircles>
						</div>
						
						<!-- Central hub - Create Something logo -->
						<div class="orbital-center">
							<div class="center-icon">
								{@render createSomethingLogo()}
							</div>
						</div>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Pain Points -->
<section class="pain-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Problems, solved</h2>
		</BlurFade>
		<div class="pain-grid">
			{#each painPoints as item, i}
				<BlurFade delay={i * 0.1}>
					<div class="pain-card">
						<div class="pain-problem">{item.problem}</div>
						<div class="pain-arrow">→</div>
						<div class="pain-solution">{item.solution}</div>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- How It Works -->
<section class="steps-section">
	<div class="section-container">
		<h2 class="section-heading reveal">How it works</h2>
		<p class="section-intro reveal">Four steps from discovery to deployment</p>
		<div class="steps-grid">
			{#each steps as step, i}
				<div class="step-card reveal" style="--delay: {i * 0.1}s">
					<div class="step-num">{step.num}</div>
					<h3 class="step-title">{step.title}</h3>
					<p class="step-desc">{step.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Workflows -->
<section class="workflows-section">
	<div class="section-container">
		<h2 class="section-heading reveal">Example workflows</h2>
		<p class="section-intro reveal">What becomes possible when your tools talk to AI</p>
		<div class="workflows-grid">
			{#each workflows as wf, i}
				<div class="workflow-card reveal" style="--delay: {i * 0.1}s">
					<h3 class="workflow-title">{wf.title}</h3>
					<p class="workflow-tagline">{wf.tagline}</p>
					<p class="workflow-desc">{wf.description}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing (matching landing page structure) -->
<section class="pricing-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Per-Tool Pricing</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				Clear scope. Predictable investment. Delivered.
			</p>
		</BlurFade>
		
		<!-- Core Pricing -->
		<BlurFade delay={0.2}>
			<div class="pricing-tier">
				<h4 class="pricing-tier-label">Core</h4>
				<div class="pricing-row">
					<div class="pricing-card featured">
						<div class="pricing-label">Integration</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">per tool</div>
						<p class="pricing-description">
							HubSpot, Notion, Slack, Google, or your internal systems.
						</p>
					</div>
					
					<div class="pricing-card featured">
						<div class="pricing-label">Agent</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">per agent</div>
						<p class="pricing-description">
							Claude, Cursor, Codex, or Workers AI configuration.
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
		
		<!-- Add-ons -->
		<BlurFade delay={0.3}>
			<div class="pricing-tier">
				<h4 class="pricing-tier-label">Add-ons</h4>
				<div class="pricing-row">
					<div class="pricing-card">
						<div class="pricing-label">Complex Auth</div>
						<div class="pricing-amount">$250</div>
						<div class="pricing-unit">one-time</div>
						<p class="pricing-description">
							OAuth 2.0, refresh tokens, multi-tenant flows.
						</p>
					</div>
					
					<div class="pricing-card">
						<div class="pricing-label">Automation</div>
						<div class="pricing-amount">$500</div>
						<div class="pricing-unit">one-time</div>
						<p class="pricing-description">
							Triggers, scheduled workflows, orchestration.
						</p>
					</div>
				</div>
			</div>
		</BlurFade>
		
		<BlurFade delay={0.4}>
			<div class="pricing-examples">
				<h4>Example builds</h4>
				<div class="examples-grid">
					<div class="example-item">
						<span class="example-name">Quick start</span>
						<span class="example-calc">2 tools + 1 agent</span>
						<span class="example-price">$750</span>
					</div>
					<div class="example-item">
						<span class="example-name">Team setup</span>
						<span class="example-calc">5 tools + 2 agents + auth</span>
						<span class="example-price">$2,000</span>
					</div>
					<div class="example-item">
						<span class="example-name">Full stack</span>
						<span class="example-calc">8 tools + 3 agents + both</span>
						<span class="example-price">$3,500</span>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Let's map your integration</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">30-minute call. We'll scope what's possible.</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<ShimmerButton href="https://savvycal.com/create-something/discovery">
				Book Discovery Call
			</ShimmerButton>
		</BlurFade>
	</div>
</section>

<style>
	/* Section containers */
	.section-container {
		max-width: var(--content-width-lg);
		margin: 0 auto;
		padding: 0 var(--container-padding, 1.5rem);
	}
	
	.section-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-4, 1rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	.section-intro {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		text-align: center;
		max-width: var(--content-width-sm);
		margin: 0 auto var(--space-8, 3rem);
		line-height: var(--leading-relaxed);
	}
	
	/* Hero with grid background - matching landing page */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
		max-width: 100%;
		overflow: hidden;
	}
	
	/* Animated grid background container */
	.hero-grid-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}
	
	/* Radial fade mask for the animated grid */
	:global(.hero-animated-grid) {
		mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
		-webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
	}
	
	.hero-container {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-8, 3rem);
		align-items: center;
		max-width: var(--content-width-xl);
		margin: 0 auto;
	}
	
	.hero-content {
		text-align: left;
	}
	
	.hero-eyebrow {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.hero-title {
		font-size: var(--text-display-xl);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-6, 2rem);
		line-height: 1.0;
		letter-spacing: var(--tracking-tighter, -0.025em);
	}
	
	.hero-detail {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-8, 3rem);
		line-height: var(--leading-relaxed);
		max-width: var(--content-width-sm);
	}
	
	.hero-cta {
		display: flex;
		align-items: center;
		gap: var(--space-4, 1rem);
	}
	
	.hero-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.hero-link:hover {
		color: var(--color-fg-primary);
	}
	
	/* Hero visual frame - contains glow + bordered container */
	.hero-visual-frame {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	/* Glow effect behind the visual */
	.hero-visual-glow {
		position: absolute;
		width: 100%;
		height: 100%;
		background: radial-gradient(
			ellipse at center,
			rgba(96, 165, 250, 0.15) 0%,
			rgba(167, 139, 250, 0.08) 40%,
			transparent 70%
		);
		filter: blur(40px);
		pointer-events: none;
	}
	
	/* Bordered container with beam effect */
	.hero-visual-container {
		position: relative;
		padding: var(--space-6, 2rem);
		border-radius: var(--radius-xl, 16px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: rgba(255, 255, 255, 0.02);
	}
	
	/* Orbital container */
	.orbital-container {
		position: relative;
		width: 300px;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	/* Orbit depth layers */
	.orbit-layer {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	/* MAIN layer - in focus */
	.orbit-layer.layer-main {
		z-index: 5;
	}
	
	/* CLOSE layer - in front, slight blur for motion */
	.orbit-layer.layer-close {
		z-index: 8;
		filter: blur(0.5px);
		opacity: 0.85;
	}
	
	/* Central hub - always on top and sharp */
	.orbital-center {
		position: relative;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.center-icon {
		width: 96px;
		height: 96px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(10, 10, 15, 0.9);
		backdrop-filter: blur(20px) saturate(120%);
		-webkit-backdrop-filter: blur(20px) saturate(120%);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 20px;
		box-shadow: 
			0 8px 32px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 rgba(255, 255, 255, 0.1);
		color: white;
	}
	
	.center-icon :global(svg) {
		width: 52px;
		height: 52px;
	}
	
	/* Base orbiting items */
	.orbit-item {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 12px;
		color: white;
		box-shadow: 
			0 4px 16px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		transition: all 0.3s ease;
	}
	
	.orbit-item :global(svg) {
		width: 22px;
		height: 22px;
	}
	
	/* CLOSE items - larger, brighter */
	.orbit-item.orbit-close {
		width: 38px;
		height: 38px;
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}
	
	.orbit-item.orbit-close :global(svg) {
		width: 18px;
		height: 18px;
	}
	
	:global(.hero-visual-wrapper) {
		display: none;
	}
	
	@media (min-width: 901px) {
		:global(.hero-visual-wrapper) {
			display: block;
		}
	}
	
	/* Pain Points */
	.pain-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.pain-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.pain-card {
		padding: var(--space-5, 1.5rem);
		display: flex;
		align-items: flex-start;
		gap: var(--space-4, 1rem);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.pain-card:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.pain-problem {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		flex: 1;
	}
	
	.pain-arrow {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
		flex-shrink: 0;
	}
	
	.pain-solution {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		flex: 1;
	}
	
	/* Steps */
	.steps-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.steps-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.step-card {
		text-align: center;
	}
	
	.step-num {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		border: 1px solid var(--color-border-emphasis);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin: 0 auto var(--space-4, 1rem);
	}
	
	.step-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.step-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}
	
	/* Workflows */
	.workflows-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.workflows-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.workflow-card {
		padding: var(--space-5, 1.5rem);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg, 12px);
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.workflow-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.workflow-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-1, 0.25rem);
	}
	
	.workflow-tagline {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.workflow-desc {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	/* Pricing Section (matching landing page) */
	.pricing-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
	}
	
	.pricing-tier {
		margin-bottom: var(--space-6, 2rem);
	}
	
	.pricing-tier-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.15em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
		text-align: center;
	}
	
	.pricing-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
		align-items: stretch;
		max-width: var(--content-width-md);
		margin: 0 auto;
	}
	
	.pricing-card {
		padding: var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--color-border-default);
		background: var(--color-bg-pure);
		text-align: center;
		display: flex;
		flex-direction: column;
		transition: 
			border-color 200ms ease,
			transform 200ms ease;
	}
	
	.pricing-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}
	
	.pricing-card.featured {
		border-color: rgba(96, 165, 250, 0.4);
		background: linear-gradient(
			135deg,
			rgba(96, 165, 250, 0.05) 0%,
			rgba(167, 139, 250, 0.05) 100%
		);
	}
	
	.pricing-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.pricing-amount {
		font-size: var(--text-h1);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		line-height: 1;
		font-family: var(--font-display);
	}
	
	.pricing-unit {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-4, 1rem);
	}
	
	.pricing-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-top: auto;
	}
	
	/* Example Builds */
	.pricing-examples {
		border-top: 1px solid var(--color-border-default);
		padding-top: var(--space-6, 2rem);
	}
	
	.pricing-examples h4 {
		font-size: var(--text-body-sm);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		margin-bottom: var(--space-4, 1rem);
		text-align: center;
	}
	
	.examples-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
	}
	
	.example-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-4, 1rem);
		border-radius: var(--radius-md, 8px);
		background: var(--color-bg-elevated);
	}
	
	.example-name {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-1, 0.25rem);
	}
	
	.example-calc {
		font-size: var(--text-caption);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.example-price {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		font-family: var(--font-display);
	}
	
	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
		border-top: 1px solid var(--color-border-default);
		text-align: center;
	}
	
	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
	}
	
	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
	}
	
/* Responsive */
	@media (max-width: 900px) {
		.hero-container {
			grid-template-columns: 1fr;
			text-align: center;
		}
		
		.hero-content {
			text-align: center;
		}
		
		.hero-detail {
			margin-left: auto;
			margin-right: auto;
		}
		
		.hero-cta {
			justify-content: center;
			flex-wrap: wrap;
		}
	}
	
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
		
		.hero-title {
			font-size: clamp(2.5rem, 8vw, 4rem);
		}
		
		.pain-grid {
			grid-template-columns: 1fr;
		}
		
		.steps-grid {
			grid-template-columns: repeat(2, 1fr);
		}
		
		.workflows-grid {
			grid-template-columns: 1fr;
		}
		
		.pricing-row {
			grid-template-columns: 1fr;
		}
		
		.examples-grid {
			grid-template-columns: 1fr;
		}
		
		/* Mobile section padding */
		.pain-section,
		.steps-section,
		.workflows-section,
		.pricing-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
	}
</style>
