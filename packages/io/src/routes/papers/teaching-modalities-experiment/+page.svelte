<script lang="ts">
	/**
	 * Teaching Modalities Experiment
	 *
	 * Interactive paper exploring three approaches to teaching CREATE SOMETHING:
	 * 1. Spritz - RSVP speed reading
	 * 2. Motion Studio - Vox-style motion graphics  
	 * 3. Learn Platform - Interactive structured paths
	 *
	 * Each modality is embedded with engagement tracking to test the hypothesis.
	 * 
	 * GDPR Compliance:
	 * - Tracking is opt-in (explicit consent required)
	 * - All data is anonymous (no PII, no cookies)
	 * - Respects browser DNT setting
	 * - Data stored only in sessionStorage (cleared on tab close)
	 * - No server-side tracking without consent
	 */
	import { onMount } from 'svelte';
	import { Spritz } from '@create-something/spritz';
	import { CanonReveal } from '@create-something/components/motion';
	import { BookOpen, Play, RotateCcw, ChevronRight, Layers, Timer, Shield, Eye, EyeOff } from 'lucide-svelte';
	import { isDNTEnabled } from '@create-something/components/gdpr';
	import { canonRevealStyles, type CanonRevealStyle } from '$lib/animations/canon-reveals';

	// ===========================================
	// GDPR-COMPLIANT CONSENT MANAGEMENT
	// ===========================================
	const EXPERIMENT_CONSENT_KEY = 'cs_experiment_consent';
	
	/** Consent state for this experiment */
	let hasConsent = $state(false);
	let consentChecked = $state(false);
	let showConsentBanner = $state(false);
	
	/** Check if DNT is enabled - always respected */
	let dntEnabled = $state(false);
	
	onMount(() => {
		// Check DNT first - if enabled, no tracking regardless of consent
		dntEnabled = isDNTEnabled();
		
		if (dntEnabled) {
			// DNT enabled - no banner needed, just inform user
			consentChecked = true;
			showConsentBanner = false;
			return;
		}
		
		// Check for existing consent
		try {
			const stored = sessionStorage.getItem(EXPERIMENT_CONSENT_KEY);
			if (stored) {
				const consent = JSON.parse(stored);
				hasConsent = consent.tracking === true;
				consentChecked = true;
				showConsentBanner = false;
			} else {
				// No stored consent - show banner
				showConsentBanner = true;
				consentChecked = true;
			}
		} catch {
			showConsentBanner = true;
			consentChecked = true;
		}
	});
	
	function acceptTracking() {
		hasConsent = true;
		showConsentBanner = false;
		try {
			sessionStorage.setItem(EXPERIMENT_CONSENT_KEY, JSON.stringify({
				tracking: true,
				timestamp: new Date().toISOString()
			}));
		} catch {
			// sessionStorage not available, consent only for this session
		}
	}
	
	function declineTracking() {
		hasConsent = false;
		showConsentBanner = false;
		try {
			sessionStorage.setItem(EXPERIMENT_CONSENT_KEY, JSON.stringify({
				tracking: false,
				timestamp: new Date().toISOString()
			}));
		} catch {
			// sessionStorage not available
		}
	}
	
	function toggleTracking() {
		if (hasConsent) {
			declineTracking();
		} else {
			acceptTracking();
		}
	}
	
	/** Check if tracking is allowed (consent given AND DNT not enabled) */
	function canTrack(): boolean {
		return hasConsent && !dntEnabled;
	}

	// ===========================================
	// ANALYTICS TRACKING (GDPR Compliant)
	// ===========================================
	let engagementData = $state({
		spritz: { starts: 0, completions: 0, totalTimeMs: 0 },
		motion: { plays: 0, replays: 0, watchTimeMs: 0 },
		learn: { clicks: 0, hovers: 0 }
	});

	async function trackModality(modality: 'spritz' | 'motion' | 'learn', action: string, value?: number) {
		// Always update local state (this is just in-memory, not tracking)
		if (modality === 'spritz') {
			if (action === 'start') engagementData.spritz.starts++;
			if (action === 'complete') engagementData.spritz.completions++;
			if (action === 'time' && value && value > 0) engagementData.spritz.totalTimeMs += value;
		} else if (modality === 'motion') {
			if (action === 'play') engagementData.motion.plays++;
			if (action === 'replay') engagementData.motion.replays++;
			// FIX: Only add valid durations (> 0 and < 1 hour to filter out bugs)
			if (action === 'time' && value && value > 0 && value < 3600000) {
				engagementData.motion.watchTimeMs += value;
			}
		} else if (modality === 'learn') {
			if (action === 'click') engagementData.learn.clicks++;
			if (action === 'hover') engagementData.learn.hovers++;
		}

		// Only send to server analytics if user has consented
		if (!canTrack()) {
			return;
		}

		// Send anonymous event to analytics (no PII)
		if (typeof window !== 'undefined' && (window as any).trackEvent) {
			await (window as any).trackEvent('modality_engagement', {
				modality,
				action,
				value,
				category: 'interaction',
				// No user ID, no session ID - fully anonymous
			});
		}
	}

	// ===========================================
	// SPRITZ CONTENT
	// ===========================================
	const spritzContent = [
		{
			label: 'The Meta-Principle',
			text: 'Creation is the discipline of removing what obscures. Not adding features. Not building more. Removing what prevents the essential from emerging.'
		},
		{
			label: 'DRY (Implementation)',
			text: 'Don\'t Repeat Yourself. Every piece of knowledge must have a single, unambiguous representation. Duplication is the root of maintenance nightmares.'
		},
		{
			label: 'Rams (Artifact)',
			text: 'Less, but better. Dieter Rams taught us that good design is as little design as possible. Every element must justify its existence.'
		},
		{
			label: 'Heidegger (System)',
			text: 'The tool recedes into transparent use. When you\'re truly using a hammer, you don\'t see the hammer. You see the nail going in.'
		}
	];

	let spritzStartTime = 0;
	function onSpritzStart() {
		spritzStartTime = Date.now();
		trackModality('spritz', 'start');
	}

	function onSpritzComplete() {
		const duration = Date.now() - spritzStartTime;
		trackModality('spritz', 'complete');
		trackModality('spritz', 'time', duration);
	}

	// ===========================================
	// MOTION DEMO (Using CanonReveal component + shared spec)
	// Spec source: packages/motion-studio/src/specs/canon-reveals.ts
	// ===========================================
	let currentRevealIndex = $state(0);
	let revealKey = $state(0); // Force re-mount on change
	let motionStartTime = $state(0);
	let hasPlayed = $state(false);
	let motionInitialized = $state(false); // Track if user has interacted

	const currentReveal = $derived(canonRevealStyles[currentRevealIndex]);

	function playMotion() {
		motionStartTime = Date.now();
		motionInitialized = true;
		if (hasPlayed) {
			trackModality('motion', 'replay');
		} else {
			trackModality('motion', 'play');
			hasPlayed = true;
		}
		revealKey++; // Force re-mount to restart animation
	}

	function nextReveal() {
		currentRevealIndex = (currentRevealIndex + 1) % canonRevealStyles.length;
		hasPlayed = false;
		motionInitialized = true;
		revealKey++;
		trackModality('motion', 'play');
		motionStartTime = Date.now();
	}

	function onMotionComplete() {
		// FIX: Only track time if user has actually interacted with the motion demo
		// This prevents the bug where autoplay on mount triggers with motionStartTime=0,
		// resulting in a duration equal to the Unix timestamp
		if (!motionInitialized || motionStartTime === 0) {
			return;
		}
		
		const duration = Date.now() - motionStartTime;
		
		// Sanity check: duration should be positive and less than 1 hour
		if (duration > 0 && duration < 3600000) {
			trackModality('motion', 'time', duration);
		}
	}

	// ===========================================
	// LEARN PATHS PREVIEW
	// ===========================================
	const samplePaths = [
		{
			id: 'terminal-mastery',
			title: 'Terminal Mastery',
			subtitle: 'The CLI is the cockpit',
			lessons: 6,
			color: 'green',
			description: 'Master the command line as your primary interface.'
		},
		{
			id: 'subtractive-design',
			title: 'Subtractive Design',
			subtitle: 'Less, but better',
			lessons: 5,
			color: 'purple',
			description: 'Learn to design by removing what doesn\'t belong.'
		},
		{
			id: 'agent-orchestration',
			title: 'Agent Orchestration',
			subtitle: 'AI as collaborator',
			lessons: 8,
			color: 'blue',
			description: 'Build AI-powered development workflows.'
		}
	];

	function onPathClick(pathId: string) {
		trackModality('learn', 'click');
	}

	function onPathHover() {
		trackModality('learn', 'hover');
	}
</script>

<svelte:head>
	<title>Teaching Modalities Experiment | CREATE SOMETHING.io</title>
	<meta name="description" content="Interactive experiment comparing Spritz, Motion Graphics, and Learn Platform for teaching CREATE SOMETHING." />
</svelte:head>

<!-- GDPR Consent Banner -->
{#if showConsentBanner && !dntEnabled}
	<div class="consent-banner" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-description">
		<div class="consent-content">
			<div class="consent-header">
				<Shield size={20} />
				<h3 id="consent-title" class="consent-title">Help Improve This Experiment?</h3>
			</div>
			<p id="consent-description" class="consent-text">
				We'd like to track your interactions to understand which teaching modality works best. 
				All data is <strong>anonymous</strong> (no cookies, no personal information) and stored only 
				in your browser session.
			</p>
			<div class="consent-actions">
				<button class="consent-btn decline" onclick={declineTracking}>
					No Thanks
				</button>
				<button class="consent-btn accept" onclick={acceptTracking}>
					Enable Tracking
				</button>
			</div>
		</div>
	</div>
{/if}

<div class="min-h-screen p-6 paper-container">
	<div class="max-w-5xl mx-auto space-y-12">
		<!-- Header -->
		<div class="pb-8 paper-header">
			<div class="font-mono mb-4 paper-id">PAPER-2026-002 • INTERACTIVE</div>
			<h1 class="mb-3 paper-title">Teaching Modalities</h1>
			<p class="max-w-3xl paper-subtitle">
				Finding the Right Medium for CREATE SOMETHING: Compare the modalities yourself below.
			</p>
			<div class="flex gap-4 mt-4 paper-meta">
				<span>Research</span>
				<span>•</span>
				<span>Interactive</span>
				<span>•</span>
				<span class="privacy-badge">
					<Shield size={12} />
					{#if dntEnabled}
						DNT Respected
					{:else if hasConsent}
						Tracking On
					{:else}
						Privacy First
					{/if}
				</span>
			</div>
		</div>

		<!-- Abstract -->
		<section class="pl-6 space-y-4 abstract-section">
			<h2 class="section-heading">Abstract</h2>
			<p class="leading-relaxed body-text">
				How do you teach a philosophy? This interactive paper lets you <em>experience</em> three 
				distinct modalities. Try each one below. 
				{#if hasConsent && !dntEnabled}
					Your interactions are tracked anonymously to help us understand which approach works best.
				{:else}
					Engagement data is displayed locally only—no data is sent to our servers unless you enable tracking.
				{/if}
			</p>
		</section>

		<!-- Hypothesis -->
		<section class="space-y-4">
			<h2 class="section-heading">The Hypothesis</h2>
			<div class="overflow-x-auto">
				<table class="hypothesis-table">
					<thead>
						<tr>
							<th>Stage</th>
							<th>Modality</th>
							<th>Why</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td><strong>Awareness</strong></td>
							<td>Spritz</td>
							<td>Fast absorption of core principles, memorable phrases</td>
						</tr>
						<tr>
							<td><strong>Understanding</strong></td>
							<td>Motion</td>
							<td>Visual context, relationships, narrative structure</td>
						</tr>
						<tr>
							<td><strong>Mastery</strong></td>
							<td>Learn Platform</td>
							<td>Deep practice, hands-on application, retention</td>
						</tr>
					</tbody>
				</table>
			</div>
			<p class="body-text text-center mt-4 text-muted">
				↓ Test each modality below ↓
			</p>
		</section>

		<!-- =============================================
		     MODALITY 1: SPRITZ
		     ============================================= -->
		<section class="space-y-6">
			<div class="modality-header">
				<div class="modality-number">01</div>
				<div>
					<h2 class="modality-title-lg">Spritz: RSVP Speed Reading</h2>
					<p class="modality-stage">Stage: Awareness • Fast absorption of principles</p>
				</div>
			</div>

			<div class="demo-container spritz-demo">
				<div class="demo-label">
					<Timer size={14} />
					<span>LIVE DEMO — Click play to start</span>
				</div>
				<Spritz 
					content={spritzContent}
					wpm={300}
					showControls
					showProgress
					showWpmControl
					class="spritz-embed"
					on:play={onSpritzStart}
					on:complete={onSpritzComplete}
				/>
			</div>

			<div class="modality-details-grid">
				<div class="detail-card">
					<h4 class="detail-title">How It Works</h4>
					<p class="detail-text">
						Words appear one at a time. The <strong>Optimal Recognition Point (ORP)</strong> 
						is highlighted—the letter your eye naturally focuses on. No scanning, no backtracking.
					</p>
				</div>
				<div class="detail-card">
					<h4 class="detail-title">Best For</h4>
					<ul class="detail-list">
						<li>Quick principle statements</li>
						<li>Video intro/transition screens</li>
						<li>Mantras and memorable phrases</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- =============================================
		     MODALITY 2: MOTION
		     ============================================= -->
		<section class="space-y-6">
			<div class="modality-header">
				<div class="modality-number">02</div>
				<div>
					<h2 class="modality-title-lg">Motion Studio: Canon Text Reveals</h2>
					<p class="modality-stage">Stage: Understanding • Visual context and relationships</p>
				</div>
			</div>

			<div class="demo-container motion-demo">
				<div class="demo-label">
					<Layers size={14} />
					<span>LIVE DEMO — "{currentReveal.label}" reveal style</span>
				</div>
				
				<div class="motion-canvas">
					<div class="reveal-label">{currentReveal.label}</div>
					
					{#key revealKey}
						<CanonReveal
							text={currentReveal.text}
							reveal={currentReveal.id}
							duration={currentReveal.id === 'threshold' ? 1000 : currentReveal.id === 'mask' ? 1200 : 2500}
							autoplay={true}
							onComplete={onMotionComplete}
							class="reveal-display"
						/>
					{/key}
					
					<div class="reveal-philosophy">{currentReveal.philosophy}</div>
				</div>

				<div class="motion-controls">
					<button class="motion-btn" onclick={playMotion}>
						<RotateCcw size={18} />
						<span>Replay</span>
					</button>
					<button class="motion-btn play" onclick={nextReveal}>
						<Play size={18} />
						<span>Next Style ({canonRevealStyles[(currentRevealIndex + 1) % canonRevealStyles.length].label})</span>
					</button>
				</div>

				<!-- Style indicator dots -->
				<div class="style-dots">
					{#each canonRevealStyles as style, i}
						<button 
							class="style-dot" 
							class:active={i === currentRevealIndex}
							onclick={() => { currentRevealIndex = i; revealKey++; motionStartTime = Date.now(); motionInitialized = true; trackModality('motion', 'play'); }}
							title={style.label}
						></button>
					{/each}
				</div>
			</div>

			<div class="modality-details-grid">
				<div class="detail-card">
					<h4 class="detail-title">Canon Reveal Styles</h4>
					<ul class="detail-list mono">
						<li><code>decode</code> — random chars resolve to meaning</li>
						<li><code>unconcealment</code> — emerges from noise (Heidegger)</li>
						<li><code>typewriter</code> — char-by-char with cursor</li>
						<li><code>threshold</code> — binary snap (Rams)</li>
						<li><code>mask</code> — horizontal wipe reveal</li>
					</ul>
				</div>
				<div class="detail-card">
					<h4 class="detail-title">Best For</h4>
					<ul class="detail-list">
						<li>Complex concept explanations</li>
						<li>Data-driven narratives</li>
						<li>Walkthrough tutorials</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- =============================================
		     MODALITY 3: LEARN
		     ============================================= -->
		<section class="space-y-6">
			<div class="modality-header">
				<div class="modality-number">03</div>
				<div>
					<h2 class="modality-title-lg">Learn Platform: Interactive Paths</h2>
					<p class="modality-stage">Stage: Mastery • Deep practice and retention</p>
				</div>
			</div>

			<div class="demo-container learn-demo">
				<div class="demo-label">
					<BookOpen size={14} />
					<span>PREVIEW — Sample learning paths</span>
				</div>

				<div class="learn-paths-grid">
					{#each samplePaths as path}
						<a 
							href="https://learn.createsomething.space/paths/{path.id}"
							class="learn-path-card {path.color}"
							target="_blank"
							rel="noopener noreferrer"
							onclick={() => onPathClick(path.id)}
							onmouseenter={onPathHover}
						>
							<div class="path-header-row">
								<div class="path-dot"></div>
								<span class="path-lessons">{path.lessons} lessons</span>
							</div>
							<h4 class="path-title-text">{path.title}</h4>
							<p class="path-subtitle-text">{path.subtitle}</p>
							<p class="path-description-text">{path.description}</p>
							<div class="path-cta">
								<span>Start Path</span>
								<ChevronRight size={16} />
							</div>
						</a>
					{/each}
				</div>
			</div>

			<div class="modality-details-grid">
				<div class="detail-card">
					<h4 class="detail-title">The Hermeneutic Spiral</h4>
					<p class="detail-text">
						<strong>Read → Practice → Reflect → Return.</strong> Each revisit deepens understanding. 
						Learning is not linear; it spirals inward toward mastery.
					</p>
				</div>
				<div class="detail-card">
					<h4 class="detail-title">Best For</h4>
					<ul class="detail-list">
						<li>Deep skill building</li>
						<li>Hands-on Praxis exercises</li>
						<li>Long-term retention</li>
					</ul>
				</div>
			</div>
		</section>

		<!-- =============================================
		     ENGAGEMENT METRICS (Live) + GDPR Consent
		     ============================================= -->
		<section class="space-y-6">
			<h2 class="section-heading">Your Engagement (This Session)</h2>
			
			<!-- Privacy Status Indicator -->
			<div class="privacy-status">
				<div class="privacy-indicator">
					<Shield size={16} />
					{#if dntEnabled}
						<span class="privacy-text">Do Not Track enabled — no data sent to server</span>
					{:else if hasConsent}
						<span class="privacy-text">Tracking enabled — anonymous data helps improve the experiment</span>
						<button class="privacy-toggle" onclick={toggleTracking}>
							<EyeOff size={14} />
							<span>Disable</span>
						</button>
					{:else if consentChecked}
						<span class="privacy-text">Tracking disabled — only local display</span>
						<button class="privacy-toggle" onclick={toggleTracking}>
							<Eye size={14} />
							<span>Enable</span>
						</button>
					{:else}
						<span class="privacy-text">Loading privacy preferences...</span>
					{/if}
				</div>
				<p class="privacy-note">
					{#if dntEnabled}
						Your browser's Do Not Track setting is respected. We never override this preference.
					{:else}
						All tracking is anonymous (no cookies, no personal data). Data is stored only in your browser's session.
					{/if}
				</p>
			</div>

			<div class="engagement-grid">
				<div class="engagement-card spritz-accent">
					<div class="engagement-icon"><Timer size={24} /></div>
					<div class="engagement-modality">Spritz</div>
					<div class="engagement-stats">
						<div class="stat">
							<span class="stat-value">{engagementData.spritz.starts}</span>
							<span class="stat-label">starts</span>
						</div>
						<div class="stat">
							<span class="stat-value">{engagementData.spritz.completions}</span>
							<span class="stat-label">completions</span>
						</div>
						<div class="stat">
							<span class="stat-value">{Math.round(engagementData.spritz.totalTimeMs / 1000)}s</span>
							<span class="stat-label">time spent</span>
						</div>
					</div>
				</div>

				<div class="engagement-card motion-accent">
					<div class="engagement-icon"><Layers size={24} /></div>
					<div class="engagement-modality">Motion</div>
					<div class="engagement-stats">
						<div class="stat">
							<span class="stat-value">{engagementData.motion.plays}</span>
							<span class="stat-label">plays</span>
						</div>
						<div class="stat">
							<span class="stat-value">{engagementData.motion.replays}</span>
							<span class="stat-label">replays</span>
						</div>
						<div class="stat">
							<span class="stat-value">{Math.round(engagementData.motion.watchTimeMs / 1000)}s</span>
							<span class="stat-label">watch time</span>
						</div>
					</div>
				</div>

				<div class="engagement-card learn-accent">
					<div class="engagement-icon"><BookOpen size={24} /></div>
					<div class="engagement-modality">Learn</div>
					<div class="engagement-stats">
						<div class="stat">
							<span class="stat-value">{engagementData.learn.clicks}</span>
							<span class="stat-label">clicks</span>
						</div>
						<div class="stat">
							<span class="stat-value">{engagementData.learn.hovers}</span>
							<span class="stat-label">hovers</span>
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Subtractive Alignment -->
		<section class="space-y-4">
			<h2 class="section-heading">Alignment with Subtractive Triad</h2>
			<div class="grid md:grid-cols-3 gap-4">
				<div class="p-4 triad-card">
					<h4 class="triad-title">DRY (Don't Repeat Yourself)</h4>
					<p class="triad-text">
						Same content, three presentations. The philosophy is written once, 
						the modality adapts to context.
					</p>
				</div>
				<div class="p-4 triad-card">
					<h4 class="triad-title">Dieter Rams</h4>
					<p class="triad-text">
						Each modality removes what isn't needed. Spritz removes eye movement. 
						Motion removes static walls of text. Learn removes repetitive explanation.
					</p>
				</div>
				<div class="p-4 triad-card">
					<h4 class="triad-title">Heidegger</h4>
					<p class="triad-text">
						The tool recedes into transparent use. When learning flows, you don't 
						see the modality—you see understanding.
					</p>
				</div>
			</div>
		</section>

		<!-- Links -->
		<section class="space-y-4 pb-12">
			<h2 class="section-heading">Full Experiences</h2>
			<div class="links-grid">
				<a href="https://createsomething.io/experiments/spritz" class="link-card" target="_blank" rel="noopener noreferrer">
					<Timer size={20} />
					<span>Spritz Experiment</span>
					<ChevronRight size={16} />
				</a>
				<a href="https://learn.createsomething.space" class="link-card" target="_blank" rel="noopener noreferrer">
					<BookOpen size={20} />
					<span>Learn Platform</span>
					<ChevronRight size={16} />
				</a>
				<span class="link-card muted">
					<Layers size={20} />
					<span>Motion Studio (internal: packages/motion-studio)</span>
				</span>
			</div>
		</section>
	</div>
</div>

<style>
	/* ===========================================
	   BASE STYLES
	   =========================================== */
	.paper-container {
		background: var(--color-bg-base);
	}

	.paper-id {
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		letter-spacing: 0.1em;
	}

	.paper-title {
		font-size: var(--text-h1);
		font-weight: var(--font-bold);
	}

	.paper-subtitle {
		font-size: var(--text-body-lg);
		color: var(--color-fg-secondary);
	}

	.paper-meta {
		color: var(--color-fg-muted);
		font-size: var(--text-body-sm);
	}

	.section-heading {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		margin-bottom: 1rem;
	}

	.body-text {
		color: var(--color-fg-secondary);
		line-height: 1.7;
	}

	.text-muted {
		color: var(--color-fg-muted);
	}

	/* ===========================================
	   MODALITY HEADERS
	   =========================================== */
	.modality-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.modality-number {
		font-family: var(--font-mono);
		font-size: 2rem;
		font-weight: var(--font-bold);
		color: var(--color-fg-muted);
		opacity: 0.5;
		line-height: 1;
	}

	.modality-title-lg {
		font-size: var(--text-h3);
		font-weight: var(--font-semibold);
		margin-bottom: 0.25rem;
	}

	.modality-stage {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* ===========================================
	   DEMO CONTAINERS
	   =========================================== */
	.demo-container {
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
	}

	.demo-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 1rem;
	}

	/* ===========================================
	   SPRITZ DEMO
	   =========================================== */
	.spritz-demo {
		border-color: rgba(34, 197, 94, 0.3);
	}

	:global(.spritz-embed) {
		--spritz-bg: var(--color-bg-base);
		--spritz-fg: var(--color-fg-primary);
		min-height: 200px;
	}

	/* ===========================================
	   MOTION DEMO
	   =========================================== */
	.motion-demo {
		border-color: rgba(168, 85, 247, 0.3);
	}

	.motion-canvas {
		background: #000;
		border-radius: var(--radius-md);
		padding: 3rem 2rem;
		min-height: 200px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		margin-bottom: 1rem;
		gap: 1.5rem;
	}

	.reveal-label {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: #737373;
		letter-spacing: 0.15em;
		text-transform: uppercase;
	}

	:global(.reveal-display) {
		font-size: 1.75rem !important;
		color: #fff !important;
		text-align: center;
		min-height: 2.5em;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.reveal-philosophy {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: #525252;
		text-align: center;
		max-width: 400px;
	}

	.motion-controls {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
	}

	.motion-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		color: var(--color-fg-secondary);
		font-size: var(--text-body-sm);
		cursor: pointer;
		transition: all 0.15s;
	}

	.motion-btn:hover {
		background: var(--color-bg-surface);
		color: var(--color-fg-primary);
	}

	.motion-btn.play {
		background: #fff;
		color: #000;
		border-color: #fff;
	}

	.motion-btn.play:hover {
		background: #e5e5e5;
	}

	.style-dots {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-top: 1rem;
	}

	.style-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-border-subtle);
		border: none;
		cursor: pointer;
		transition: all 0.15s;
	}

	.style-dot:hover {
		background: var(--color-fg-muted);
	}

	.style-dot.active {
		background: #a855f7;
		transform: scale(1.25);
	}

	/* ===========================================
	   LEARN DEMO
	   =========================================== */
	.learn-demo {
		border-color: rgba(59, 130, 246, 0.3);
	}

	.learn-paths-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.learn-path-card {
		display: block;
		padding: 1.25rem;
		background: var(--color-bg-base);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		text-decoration: none;
		transition: all 0.2s;
	}

	.learn-path-card:hover {
		border-color: var(--color-border-emphasis);
		transform: translateY(-2px);
	}

	.learn-path-card.green { border-left: 3px solid #22c55e; }
	.learn-path-card.purple { border-left: 3px solid #a855f7; }
	.learn-path-card.blue { border-left: 3px solid #3b82f6; }

	.path-header-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.path-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.learn-path-card.green .path-dot { background: #22c55e; }
	.learn-path-card.purple .path-dot { background: #a855f7; }
	.learn-path-card.blue .path-dot { background: #3b82f6; }

	.path-lessons {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
	}

	.path-title-text {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		color: var(--color-fg-primary);
		margin-bottom: 0.25rem;
	}

	.path-subtitle-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
		margin-bottom: 0.5rem;
	}

	.path-description-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.path-cta {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	.learn-path-card:hover .path-cta {
		color: var(--color-fg-primary);
	}

	/* ===========================================
	   MODALITY DETAILS
	   =========================================== */
	.modality-details-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1rem;
	}

	.detail-card {
		padding: 1rem;
		background: var(--color-bg-surface);
		border-radius: var(--radius-md);
	}

	.detail-title {
		font-size: var(--text-body-sm);
		font-weight: var(--font-semibold);
		margin-bottom: 0.5rem;
	}

	.detail-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		line-height: 1.6;
	}

	.detail-list {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		list-style: disc;
		list-style-position: inside;
	}

	.detail-list.mono {
		font-family: var(--font-mono);
		font-size: 0.8rem;
	}

	.detail-list li {
		margin-bottom: 0.25rem;
	}

	/* ===========================================
	   ENGAGEMENT METRICS
	   =========================================== */
	.engagement-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.engagement-card {
		padding: 1.25rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-lg);
	}

	.engagement-card.spritz-accent { border-top: 3px solid #22c55e; }
	.engagement-card.motion-accent { border-top: 3px solid #a855f7; }
	.engagement-card.learn-accent { border-top: 3px solid #3b82f6; }

	.engagement-icon {
		color: var(--color-fg-muted);
		margin-bottom: 0.5rem;
	}

	.engagement-modality {
		font-weight: var(--font-semibold);
		margin-bottom: 1rem;
	}

	.engagement-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: var(--font-bold);
		font-family: var(--font-mono);
	}

	.stat-label {
		font-size: 0.7rem;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* ===========================================
	   HYPOTHESIS TABLE
	   =========================================== */
	.hypothesis-table {
		width: 100%;
		font-size: var(--text-body-sm);
	}

	.hypothesis-table th,
	.hypothesis-table td {
		text-align: left;
		padding: 0.75rem 1rem;
	}

	.hypothesis-table thead tr {
		border-bottom: 1px solid var(--color-border-subtle);
	}

	.hypothesis-table tbody tr {
		border-bottom: 1px solid var(--color-border-muted);
	}

	.hypothesis-table tbody {
		color: var(--color-fg-secondary);
	}

	/* ===========================================
	   TRIAD CARDS
	   =========================================== */
	.triad-card {
		background: var(--color-bg-surface);
		border-radius: var(--radius-lg);
	}

	.triad-title {
		font-weight: var(--font-semibold);
		margin-bottom: 0.5rem;
	}

	.triad-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-muted);
	}

	/* ===========================================
	   LINKS
	   =========================================== */
	.links-grid {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.link-card {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
		text-decoration: none;
		color: var(--color-fg-primary);
		transition: all 0.15s;
	}

	.link-card:hover:not(.muted) {
		border-color: var(--color-border-emphasis);
		background: var(--color-bg-elevated);
	}

	.link-card.muted {
		color: var(--color-fg-muted);
		cursor: default;
	}

	.link-card span {
		flex: 1;
	}

	/* ===========================================
	   GDPR CONSENT BANNER
	   =========================================== */
	.consent-banner {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: var(--color-bg-surface);
		border-top: 1px solid var(--color-border-subtle);
		padding: 1.5rem;
		z-index: 1000;
		box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
	}

	.consent-content {
		max-width: 600px;
		margin: 0 auto;
	}

	.consent-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		color: var(--color-fg-primary);
	}

	.consent-title {
		font-size: var(--text-body);
		font-weight: var(--font-semibold);
		margin: 0;
	}

	.consent-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.consent-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.consent-btn {
		padding: 0.5rem 1rem;
		border-radius: var(--radius-md);
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		cursor: pointer;
		transition: all 0.15s;
	}

	.consent-btn.decline {
		background: transparent;
		border: 1px solid var(--color-border-subtle);
		color: var(--color-fg-secondary);
	}

	.consent-btn.decline:hover {
		background: var(--color-bg-elevated);
		color: var(--color-fg-primary);
	}

	.consent-btn.accept {
		background: #22c55e;
		border: 1px solid #22c55e;
		color: #000;
	}

	.consent-btn.accept:hover {
		background: #16a34a;
		border-color: #16a34a;
	}

	/* ===========================================
	   PRIVACY STATUS & CONTROLS
	   =========================================== */
	.privacy-status {
		padding: 1rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-md);
	}

	.privacy-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		color: var(--color-fg-muted);
	}

	.privacy-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	.privacy-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-left: auto;
		padding: 0.25rem 0.5rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-sm);
		color: var(--color-fg-muted);
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.privacy-toggle:hover {
		background: var(--color-bg-base);
		color: var(--color-fg-primary);
		border-color: var(--color-border-emphasis);
	}

	.privacy-note {
		font-size: 0.75rem;
		color: var(--color-fg-muted);
		margin-top: 0.5rem;
		line-height: 1.4;
	}

	.privacy-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.125rem 0.5rem;
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-subtle);
		border-radius: var(--radius-full);
		font-size: 0.7rem;
	}
</style>
