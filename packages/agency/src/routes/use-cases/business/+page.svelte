<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AnimatedGridPattern, BlurFade, BorderBeam, OrbitingCircles, ShimmerButton } from '@create-something/canon/magicui';
	import { agencyCoreMessaging } from '$lib/data/marketingCopy';

	const deliveryVector = {
		canonicalPhrase: 'Skills on MCP',
		clientFacingLabel: 'Skills + MCP',
		technicalLabel: 'MCP + Skills'
	};

	const chapters = [
		{
			number: '01',
			title: 'Start with one critical workflow',
			paragraphs: [
				'Pick the workflow that steals the most time. The Monday report. The handoff that breaks between tools. The updates your team keeps rebuilding by hand.',
				`We start with a scoped workflow wedge using ${deliveryVector.clientFacingLabel}: connectivity, setup, policy, and runbook for one high-value workflow. 2\u20134 weeks. $2,000\u2013$5,000. You own the code.`,
				'Now your agent can work against your actual systems instead of forcing your team to stay in the middle.'
			]
		},
		{
			number: '02',
			title: 'See the value, then map the whole picture',
			paragraphs: [
				'One connection proves the value. The Subtractive Triad audit shows you where to go next.',
				'We map every tool, workflow, and data flow. Then we find the duplication, the waste, and the disconnected information that is quietly slowing the business down.',
				'You get a strategic report with a prioritized roadmap. No obligation to build. $5,000\u2013$10,000.'
			]
		},
		{
			number: '03',
			title: 'Make it reliable',
			paragraphs: [
				'Connections are the start. Reliability is what makes them usable in real operations.',
				'Connections are the start. Reliability is what makes them usable in real operations.',
				'Policy OS keeps the workflow healthy over time with prompt tuning, policy updates, performance monitoring, and edge-case handling before problems become incidents.',
				'Your automation becomes more dependable as the business changes. $1,500\u2013$3,500/mo.'
			]
		}
	];

	const timeline = [
		{
			label: 'Month 1',
			detail: 'Built a workflow wedge for a HubSpot pipeline ($3,000): MCP endpoint, Codex setup, approval policy, and runbook.',
			result: 'Saves 5 hrs/week.'
		},
		{
			label: 'Month 3',
			detail: 'Audit revealed 3 disconnected systems and 20 hrs/week of manual data movement.',
			result: '$7,500 audit.'
		},
		{
			label: 'Month 4',
			detail: 'Second MCP connected to Notion project tracker. Judgment layer runbook managing both agent flows.',
			result: '$2,500/mo.'
		}
	];

	const whoThisIsFor = [
		'Teams tired of being the integration layer between their tools',
		'Organizations already using AI but can\u2019t connect it to their actual data',
		'Founders who\u2019d rather sell than administrate',
		'Teams that tried Zapier/Make and hit the complexity wall'
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
	title="Your tools don't talk to each other. We fix that. | CREATE SOMETHING"
	description="We help small teams turn one painful workflow into a reliable system, starting with a scoped wedge and expanding only when the workflow proves out."
	keywords="small business automation, workflow integration, custom mcp, HubSpot automation, Notion integration, ops automation, SMB AI"
	ogImage="/og-image.svg"
	propertyName="agency"
/>

<!-- Hero — the SMB entry point -->
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
				<p class="hero-eyebrow">For teams of 5–50</p>
			</BlurFade>
			<BlurFade delay={0.1}>
				<h1 class="hero-title">Your tools don't talk to each&nbsp;other. You fill the&nbsp;gap.</h1>
			</BlurFade>
			<BlurFade delay={0.2}>
				<p class="hero-detail">
					We turn one painful workflow into a reliable system instead of asking your team to keep
					bridging the gap by hand. If your team is stitching together HubSpot, Notion, Slack,
					and spreadsheets, we start with the smallest wedge that removes the manual bridge.
				</p>
			</BlurFade>
			<BlurFade delay={0.3}>
				<div class="hero-cta">
					<ShimmerButton href={agencyCoreMessaging.selfMapHref}>
						{agencyCoreMessaging.selfMapLabel}
					</ShimmerButton>
					<a href="/" class="hero-link">&larr; Back to home</a>
				</div>
			</BlurFade>
		</div>
		<BlurFade delay={0.4} class="hero-visual-wrapper">
			<div class="hero-visual-frame">
				<div class="hero-visual-glow" aria-hidden="true"></div>
				<div class="hero-visual-container">
					<BorderBeam 
						size={250}
						duration={12}
						colorFrom="rgba(96, 165, 250, 0.8)"
						colorTo="rgba(167, 139, 250, 0.6)"
					/>
					<div class="orbital-container">
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

<!-- The Story — three chapters of natural progression -->
<section class="story-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">The story</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				You do not need a re-platform. You need the first broken workflow to stop stealing time.
			</p>
		</BlurFade>
		<div class="story-track">
			{#each chapters as chapter, i}
				<BlurFade delay={0.2 + i * 0.15}>
					<div class="story-chapter" class:story-chapter-first={i === 0}>
						<div class="chapter-header">
							<span class="chapter-number">{chapter.number}</span>
							<h3 class="chapter-title">{chapter.title}</h3>
						</div>
						<div class="chapter-body">
							{#each chapter.paragraphs as paragraph, j}
								<p class="chapter-text" class:chapter-text-highlight={j === chapter.paragraphs.length - 1}>
									{paragraph}
								</p>
							{/each}
						</div>
						{#if i < chapters.length - 1}
							<div class="chapter-connector" aria-hidden="true">
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M12 5v14M19 12l-7 7-7-7"/>
								</svg>
							</div>
						{/if}
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- Real Example — concrete numbers from a real engagement -->
<section class="example-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Real numbers</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="section-intro">
				A 15-person professional services firm.
			</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<div class="example-card">
				<div class="example-timeline">
					{#each timeline as entry, i}
						<div class="timeline-entry">
							<div class="timeline-marker">
								<span class="timeline-dot"></span>
								{#if i < timeline.length - 1}
									<span class="timeline-line" aria-hidden="true"></span>
								{/if}
							</div>
							<div class="timeline-content">
								<p class="timeline-label">{entry.label}</p>
								<p class="timeline-detail">{entry.detail}</p>
								<p class="timeline-result">{entry.result}</p>
							</div>
						</div>
					{/each}
				</div>
				<div class="example-outcome">
					<div class="outcome-stat">
						<span class="outcome-value">15 hrs/week</span>
						<span class="outcome-label">automated</span>
					</div>
					<div class="outcome-stat">
						<span class="outcome-value">$39k/year</span>
						<span class="outcome-label">recovered</span>
					</div>
					<div class="outcome-stat">
						<span class="outcome-value">$13k + $2.5k/mo</span>
						<span class="outcome-label">total investment</span>
					</div>
				</div>
			</div>
		</BlurFade>
	</div>
</section>

<!-- Who This Is For -->
<section class="who-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="section-heading">Who this is for</h2>
		</BlurFade>
		<div class="who-grid">
			{#each whoThisIsFor as item, i}
				<BlurFade delay={0.1 + i * 0.1}>
					<div class="who-card">
						<span class="who-check">&#10003;</span>
						<p class="who-text">{item}</p>
					</div>
				</BlurFade>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="cta-section">
	<div class="section-container">
		<BlurFade>
			<h2 class="cta-heading">Start with one&nbsp;workflow.</h2>
		</BlurFade>
		<BlurFade delay={0.1}>
			<p class="cta-subtext">
				Pick the workflow that wastes the most time. We&apos;ll deliver your first scoped workflow
				wedge in 2–4&nbsp;weeks. You own the code and runbook. Delivery vector is {deliveryVector.canonicalPhrase}, and technical proof surfaces use {deliveryVector.technicalLabel}. If you need discovery or compliance-only, we can scope MCP Wedge as the entry point.
			</p>
		</BlurFade>
		<BlurFade delay={0.2}>
			<div class="cta-actions">
				<ShimmerButton href={agencyCoreMessaging.selfMapHref}>
					{agencyCoreMessaging.selfMapLabel}
				</ShimmerButton>
				<a href="/services" class="cta-link">See all services &rarr;</a>
				<a href={agencyCoreMessaging.workflowMappingSessionHref} class="cta-link cta-link-secondary">Have questions? Book a mapping session</a>
			</div>
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
	
	/* Hero with grid background */
	.hero {
		position: relative;
		padding: var(--section-padding-lg, 8rem) var(--container-padding, 1.5rem) var(--section-padding, 6rem);
		max-width: 100%;
		overflow: hidden;
	}
	
	.hero-grid-container {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
	}
	
	:global(.hero-animated-grid) {
		mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
		-webkit-mask-image: radial-gradient(600px circle at 50% 35%, white, transparent);
	}
	
	.hero-container {
		position: relative;
		width: 100%;
		max-width: min(var(--content-width-xl), calc(100vw - 2 * var(--container-padding)));
		display: grid;
		grid-template-columns: 1fr minmax(380px, 1fr);
		gap: var(--space-8, 3rem);
		align-items: center;
		margin: 0 auto;
	}
	
	.hero-content {
		min-width: 0;
		max-width: 32em;
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
		font-size: clamp(2.25rem, 4vw + 1.5rem, 4rem);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-6, 2rem);
		line-height: 1.15;
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
	
	/* Hero visual */
	.hero-visual-frame {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.hero-visual-glow {
		position: absolute;
		width: 100%;
		height: 100%;
		background: var(--accent-glow);
		filter: blur(40px);
		pointer-events: none;
	}
	
	.hero-visual-container {
		position: relative;
		padding: var(--space-6, 2rem);
		border-radius: var(--radius-xl, 16px);
		border: 1px solid var(--glass-border-light);
		background: rgba(255, 255, 255, 0.02);
	}
	
	.orbital-container {
		position: relative;
		width: 300px;
		height: 300px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.orbit-layer {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.orbit-layer.layer-main { z-index: 5; }
	
	.orbit-layer.layer-close {
		z-index: 8;
		filter: blur(0.5px);
		opacity: 0.85;
	}
	
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
		background: var(--glass-bg-strong);
		backdrop-filter: blur(20px) saturate(120%);
		-webkit-backdrop-filter: blur(20px) saturate(120%);
		border: 1px solid var(--glass-border-medium);
		border-radius: 20px;
		box-shadow: 
			0 8px 32px rgba(0, 0, 0, 0.4),
			inset 0 1px 0 var(--glass-border-light);
		color: white;
	}
	
	.center-icon :global(svg) {
		width: 52px;
		height: 52px;
	}
	
	.orbit-item {
		width: 44px;
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--glass-border-subtle);
		border: 1px solid var(--glass-border-light);
		border-radius: 12px;
		color: white;
		box-shadow: 
			0 4px 16px rgba(0, 0, 0, 0.3),
			inset 0 1px 0 var(--glass-border-subtle);
		transition: all var(--duration-standard) var(--ease-standard);
	}
	
	.orbit-item :global(svg) {
		width: 22px;
		height: 22px;
	}
	
	.orbit-item.orbit-close {
		width: 38px;
		height: 38px;
		background: var(--glass-border-subtle);
		border-color: var(--glass-border-medium);
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
			min-width: 0;
		}
	}
	
	/* The Story — chapter-based progression */
	.story-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.story-track {
		display: flex;
		flex-direction: column;
		gap: var(--space-5, 1.5rem);
		max-width: var(--content-width-md);
		margin: 0 auto;
	}
	
	.story-chapter {
		position: relative;
		padding: var(--space-7, 2.5rem) var(--space-6, 2rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
		transition: 
			border-color var(--duration-standard) var(--ease-standard),
			box-shadow var(--duration-standard) var(--ease-standard),
			transform var(--duration-bounce) var(--ease-bounce);
	}
	
	.story-chapter:hover {
		border-color: var(--color-border-emphasis);
		box-shadow: var(--glass-shine-standard), var(--glass-outer-sm);
		transform: translateY(-2px);
	}
	
	.story-chapter-first {
		border-color: var(--accent-blue-subtle);
		background: var(--accent-gradient-subtle);
	}
	
	.chapter-header {
		display: flex;
		align-items: baseline;
		gap: var(--space-4, 1rem);
		margin-bottom: var(--space-5, 1.5rem);
	}
	
	.chapter-number {
		font-size: var(--text-h2);
		font-weight: var(--font-bold);
		color: var(--color-fg-muted);
		opacity: 0.35;
		letter-spacing: -0.02em;
		line-height: 1;
		flex-shrink: 0;
	}
	
	.story-chapter-first .chapter-number {
		color: var(--accent-blue-strong);
		opacity: 0.6;
	}
	
	.chapter-title {
		font-size: var(--text-body-lg);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		letter-spacing: var(--tracking-tight, -0.015em);
		line-height: 1.3;
	}
	
	.chapter-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-4, 1rem);
	}
	
	.chapter-text {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}
	
	.chapter-text-highlight {
		color: var(--color-fg-primary);
		font-weight: var(--font-medium, 500);
	}
	
	.chapter-connector {
		display: flex;
		justify-content: center;
		margin-top: var(--space-5, 1.5rem);
		color: var(--color-fg-muted);
		opacity: 0.4;
	}
	
	.chapter-connector svg {
		width: 20px;
		height: 20px;
	}
	
	/* Real Example — timeline card */
	.example-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.example-card {
		max-width: var(--content-width-md);
		margin: 0 auto;
		padding: var(--space-8, 3rem) var(--space-6, 2rem);
		border-radius: var(--radius-xl, 16px);
		background: var(--color-bg-pure);
		box-shadow: var(--glass-shine-soft);
	}
	
	.example-timeline {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-bottom: var(--space-8, 3rem);
	}
	
	.timeline-entry {
		display: flex;
		gap: var(--space-4, 1rem);
		position: relative;
	}
	
	.timeline-marker {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex-shrink: 0;
		width: 20px;
		padding-top: 4px;
	}
	
	.timeline-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent-blue-strong);
		border: 2px solid var(--color-bg-pure);
		box-shadow: 0 0 0 2px var(--accent-blue-subtle);
		flex-shrink: 0;
	}
	
	.timeline-line {
		width: 2px;
		flex: 1;
		background: var(--color-border-default);
		margin-top: var(--space-1, 0.25rem);
		margin-bottom: 0;
	}
	
	.timeline-content {
		padding-bottom: var(--space-6, 2rem);
	}
	
	.timeline-label {
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--accent-blue-strong);
		font-weight: var(--font-semibold);
		margin-bottom: var(--space-2, 0.5rem);
	}
	
	.timeline-detail {
		font-size: var(--text-body);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-1, 0.25rem);
	}
	
	.timeline-result {
		font-size: var(--text-body-sm);
		color: var(--color-fg-primary);
		font-weight: var(--font-semibold);
	}
	
	.example-outcome {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-4, 1rem);
		padding-top: var(--space-6, 2rem);
	}
	
	.outcome-stat {
		text-align: center;
		padding: var(--space-4, 1rem);
		border-radius: var(--radius-lg, 12px);
		border: 1px solid var(--accent-blue-subtle);
		background: var(--accent-gradient-subtle);
	}
	
	.outcome-value {
		display: block;
		font-size: var(--text-body-lg);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-1, 0.25rem);
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	.outcome-label {
		display: block;
		font-size: var(--text-caption);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--color-fg-muted);
		font-weight: var(--font-semibold);
	}
	
	/* Who this is for */
	.who-section {
		padding: var(--section-padding, 6rem) 0;
	}
	
	.who-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-4, 1rem);
		max-width: var(--content-width-md);
		margin: 0 auto;
	}
	
	.who-card {
		display: flex;
		align-items: flex-start;
		gap: var(--space-3, 0.75rem);
		padding: var(--space-4, 1rem) var(--space-5, 1.5rem);
		border-radius: var(--radius-lg, 12px);
		background: var(--color-bg-pure);
		transition: border-color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.who-card:hover {
		border-color: var(--color-border-emphasis);
	}
	
	.who-check {
		color: var(--accent-blue-strong);
		font-weight: var(--font-bold);
		flex-shrink: 0;
		margin-top: 2px;
	}
	
	.who-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: var(--leading-relaxed);
	}

	/* CTA */
	.cta-section {
		padding: var(--section-padding, 6rem) 0;
		text-align: center;
	}
	
	.cta-heading {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
		color: var(--color-fg-primary);
		margin-bottom: var(--space-3, 0.75rem);
		max-width: var(--content-width-md);
		margin-left: auto;
		margin-right: auto;
		letter-spacing: var(--tracking-tight, -0.015em);
	}
	
	.cta-subtext {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-6, 2rem);
		max-width: var(--content-width-sm);
		margin-left: auto;
		margin-right: auto;
		line-height: var(--leading-relaxed);
	}
	
	.cta-actions {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-5, 1.5rem);
		flex-wrap: wrap;
	}
	
	.cta-link {
		font-size: var(--text-body-sm);
		color: var(--accent-blue-strong);
		text-decoration: none;
		transition: color var(--duration-micro, 200ms) var(--ease-standard);
	}
	
	.cta-link:hover {
		color: var(--accent-blue);
	}
	
	.cta-link-secondary {
		color: var(--color-fg-secondary);
	}
	
	.cta-link-secondary:hover {
		color: var(--color-fg-primary);
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
		
		.who-grid {
			grid-template-columns: 1fr;
		}
		
		.example-outcome {
			grid-template-columns: 1fr;
			gap: var(--space-3, 0.75rem);
		}
	}
	
	@media (max-width: 768px) {
		.hero {
			padding: var(--layout-3, 4rem) var(--container-padding, 1.5rem);
		}
		
		.hero-title {
			font-size: clamp(2rem, 7vw, 3.5rem);
		}
		
		.who-grid {
			grid-template-columns: 1fr;
		}
		
		.story-section,
		.example-section,
		.who-section,
		.cta-section {
			padding: var(--layout-3, 4rem) 0;
		}
		
		.chapter-header {
			flex-direction: column;
			gap: var(--space-2, 0.5rem);
		}
	}
</style>
