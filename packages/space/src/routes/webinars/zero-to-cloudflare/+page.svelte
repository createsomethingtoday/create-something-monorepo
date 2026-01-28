<script lang="ts">
	import { Footer, SEO } from '@create-something/canon';
	import { enhance } from '$app/forms';

	let name = $state('');
	let email = $state('');
	let experience = $state('');
	let isSubmitting = $state(false);
	let submitError = $state('');
	let submitSuccess = $state(false);

	const experienceLevels = [
		{ value: 'beginner', label: 'Beginner — New to web development' },
		{ value: 'intermediate', label: 'Intermediate — Comfortable with HTML/CSS/JS' },
		{ value: 'builder', label: 'Builder — Already shipping projects' }
	];

	async function handleSubmit(event: Event) {
		event.preventDefault();
		isSubmitting = true;
		submitError = '';

		try {
			const response = await fetch('/api/webinar/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					email,
					experience_level: experience,
					webinar_slug: 'zero-to-cloudflare'
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Registration failed');
			}

			submitSuccess = true;
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isSubmitting = false;
		}
	}

	const quickLinks = [
		{ label: 'Home', href: '/' },
		{ label: 'Experiments', href: '/experiments' },
		{ label: 'Methodology', href: '/methodology' }
	];
</script>

<SEO
	title="Zero to Cloudflare in 30 Minutes | CREATE SOMETHING"
	description="Your first step toward becoming an Automation Engineer. Deploy a site to Cloudflare using Cursor and the terminal — the foundation for building systems that work while you sleep."
	keywords="Cloudflare deployment, automation engineer, Cursor AI, terminal, Claude Code, developer workshop, WORKWAY"
	ogImage="/og-webinar-cloudflare.svg"
	propertyName="space"
/>

<!-- Hero Section -->
<section class="hero">
	<div class="hero-container">
		<div class="hero-content">
			<p class="eyebrow animate-reveal" style="--delay: 0">AUTOMATION ENGINEER · STEP 1</p>
			
			<h1 class="headline animate-reveal" style="--delay: 1">
				Zero to Cloudflare<br />in 30 Minutes
			</h1>
			
			<p class="description animate-reveal" style="--delay: 2">
				Your first capstone on the path to Automation Engineer. Learn to combine 
				AI-assisted development in Cursor with terminal mastery — the foundation 
				for building systems that work while you sleep.
			</p>

			<div class="date-badge animate-reveal" style="--delay: 3">
				<span class="date-icon">📅</span>
				<span class="date-text">Date TBA — Register for early access</span>
			</div>
		</div>
	</div>
</section>

<!-- Value Props Section -->
<section class="value-section">
	<div class="value-container">
		<div class="value-grid">
			<div class="value-card animate-reveal" style="--delay: 4">
				<div class="value-icon">💻</div>
				<h3 class="value-title">Terminal Fundamentals</h3>
				<p class="value-description">
					Learn essential CLI commands as you build. The terminal isn't scary — 
					it's the interface to everything powerful in modern development.
				</p>
			</div>

			<div class="value-card animate-reveal" style="--delay: 5">
				<div class="value-icon">🤖</div>
				<h3 class="value-title">AI + Terminal Together</h3>
				<p class="value-description">
					Use Cursor to generate code, then deploy with terminal commands.
					This combination is how Automation Engineers work.
				</p>
			</div>

			<div class="value-card animate-reveal" style="--delay: 6">
				<div class="value-icon">🎓</div>
				<h3 class="value-title">Your First Capstone</h3>
				<p class="value-description">
					Deploy a live site as proof of completion. This is step one 
					toward Claude Code, WORKWAY, and building systems that work while you sleep.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- What You'll Learn Section -->
<section class="learn-section">
	<div class="learn-container">
		<h2 class="section-title animate-reveal" style="--delay: 7">What You'll Learn</h2>
		
		<div class="learn-grid">
			<div class="learn-item animate-reveal" style="--delay: 8">
				<span class="learn-number">01</span>
				<div class="learn-content">
					<h3 class="learn-title">Terminal Basics</h3>
					<p class="learn-description"><code>cd</code>, <code>mkdir</code>, <code>npm install</code> — the commands that unlock everything else.</p>
				</div>
			</div>

			<div class="learn-item animate-reveal" style="--delay: 9">
				<span class="learn-number">02</span>
				<div class="learn-content">
					<h3 class="learn-title">Project Structure</h3>
					<p class="learn-description">Create folders, organize files — this is systems thinking at the smallest scale.</p>
				</div>
			</div>

			<div class="learn-item animate-reveal" style="--delay: 10">
				<span class="learn-number">03</span>
				<div class="learn-content">
					<h3 class="learn-title">AI-Assisted Building</h3>
					<p class="learn-description">Use Cursor to generate code. Learn to prompt effectively — the skill that scales.</p>
				</div>
			</div>

			<div class="learn-item animate-reveal" style="--delay: 11">
				<span class="learn-number">04</span>
				<div class="learn-content">
					<h3 class="learn-title">Deploy with Wrangler</h3>
					<p class="learn-description"><code>wrangler pages deploy .</code> — one command, globally live. Your first capstone.</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- The Path Section -->
<section class="path-section">
	<div class="path-container">
		<h2 class="section-title animate-reveal" style="--delay: 12">The Automation Engineer Path</h2>
		<p class="path-description animate-reveal" style="--delay: 13">
			This workshop is Step 1. Here's where it leads:
		</p>
		
		<div class="path-grid">
			<div class="path-item current animate-reveal" style="--delay: 14">
				<div class="path-step">1</div>
				<div class="path-content">
					<h3 class="path-title">Cursor + Terminal</h3>
					<p class="path-text">AI-assisted code generation + CLI deployment</p>
					<span class="path-badge">This Workshop</span>
				</div>
			</div>

			<div class="path-connector animate-reveal" style="--delay: 15">→</div>

			<div class="path-item animate-reveal" style="--delay: 16">
				<div class="path-step">2</div>
				<div class="path-content">
					<h3 class="path-title">Claude Code</h3>
					<p class="path-text">Agentic development — AI that executes, not just suggests</p>
				</div>
			</div>

			<div class="path-connector animate-reveal" style="--delay: 17">→</div>

			<div class="path-item animate-reveal" style="--delay: 18">
				<div class="path-step">3</div>
				<div class="path-content">
					<h3 class="path-title">WORKWAY</h3>
					<p class="path-text">Build automation workflows that run while you sleep</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Registration Section -->
<section class="register-section">
	<div class="register-container">
		{#if submitSuccess}
			<div class="success-message animate-reveal">
				<div class="success-icon">✓</div>
				<h2 class="success-title">You're In</h2>
				<p class="success-description">
					Check your email for confirmation. We'll send workshop details and a reminder before the session.
				</p>
				<a href="/" class="back-link">← Back to Space</a>
			</div>
		{:else}
			<div class="register-content">
				<div class="register-text animate-reveal" style="--delay: 12">
					<h2 class="register-title">Reserve Your Spot</h2>
					<p class="register-description">
						Small group, high interaction. Limited to 25 attendees for hands-on guidance.
					</p>
				</div>

				<form class="register-form animate-reveal" style="--delay: 13" onsubmit={handleSubmit}>
					<div class="form-group">
						<label for="name" class="form-label">Name</label>
						<input
							type="text"
							id="name"
							bind:value={name}
							required
							class="form-input"
							placeholder="Your name"
						/>
					</div>

					<div class="form-group">
						<label for="email" class="form-label">Email</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							class="form-input"
							placeholder="you@example.com"
						/>
					</div>

					<div class="form-group">
						<label for="experience" class="form-label">Experience Level</label>
						<select
							id="experience"
							bind:value={experience}
							required
							class="form-select"
						>
							<option value="" disabled>Select your level</option>
							{#each experienceLevels as level}
								<option value={level.value}>{level.label}</option>
							{/each}
						</select>
					</div>

					{#if submitError}
						<div class="form-error">{submitError}</div>
					{/if}

					<button
						type="submit"
						class="form-button"
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Registering...' : 'Register for Workshop'}
					</button>

					<p class="form-note">
						Free workshop. No spam — just workshop details and follow-up resources.
					</p>
				</form>
			</div>
		{/if}
	</div>
</section>

<!-- About Section -->
<section class="about-section">
	<div class="about-container">
		<div class="about-content animate-reveal" style="--delay: 19">
			<p class="about-label">From</p>
			<h2 class="about-title">CREATE SOMETHING</h2>
			<p class="about-description">
				We're building the path to Automation Engineer — developers who combine AI-assisted development, 
				terminal mastery, and agentic workflows to build systems that work while they sleep.
				WORKWAY is where it leads.
			</p>
			<div class="about-links">
				<a href="https://createsomething.ltd/presentations/workway" class="about-link">
					Learn about WORKWAY →
				</a>
				<a href="https://createsomething.space/experiments" class="about-link">
					Explore experiments →
				</a>
			</div>
		</div>
	</div>
</section>

<Footer
	mode="space"
	showNewsletter={false}
	aboutText="CREATE SOMETHING workshops teach the foundations of AI-native development and modern infrastructure."
	{quickLinks}
	showSocial={true}
/>

<style>
	/* Hero Section */
	.hero {
		padding: var(--space-3xl) var(--space-lg) var(--space-2xl);
		border-bottom: 1px solid var(--color-border-default);
	}

	.hero-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-content {
		text-align: center;
	}

	.eyebrow {
		font-size: var(--text-caption);
		font-weight: 500;
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-md);
	}

	.headline {
		font-size: clamp(2.5rem, 8vw, 4rem);
		font-weight: 700;
		color: var(--color-fg-primary);
		line-height: 1.1;
		margin-bottom: var(--space-lg);
	}

	.description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		max-width: 600px;
		margin: 0 auto var(--space-lg);
	}

	.date-badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-full);
	}

	.date-icon {
		font-size: var(--text-body);
	}

	.date-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
	}

	/* Value Props */
	.value-section {
		padding: var(--space-2xl) var(--space-lg);
	}

	.value-container {
		max-width: 1000px;
		margin: 0 auto;
	}

	.value-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	@media (max-width: 768px) {
		.value-grid {
			grid-template-columns: 1fr;
		}
	}

	.value-card {
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.value-card:hover {
		border-color: var(--color-border-emphasis);
	}

	.value-icon {
		font-size: 2rem;
		margin-bottom: var(--space-md);
	}

	.value-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.value-description {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	/* Learn Section */
	.learn-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border-default);
		border-bottom: 1px solid var(--color-border-default);
	}

	.learn-container {
		max-width: 700px;
		margin: 0 auto;
	}

	.section-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.learn-grid {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.learn-item {
		display: flex;
		gap: var(--space-lg);
		align-items: flex-start;
	}

	.learn-number {
		font-size: var(--text-h3);
		font-weight: 700;
		color: var(--color-fg-muted);
		font-family: monospace;
		min-width: 3rem;
	}

	.learn-content {
		flex: 1;
	}

	.learn-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.learn-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
	}

	.learn-description code {
		background: rgba(255, 255, 255, 0.1);
		padding: 2px 6px;
		border-radius: 4px;
		font-family: monospace;
		font-size: 0.9em;
	}

	/* Path Section */
	.path-section {
		padding: var(--space-2xl) var(--space-lg);
	}

	.path-container {
		max-width: 900px;
		margin: 0 auto;
	}

	.path-description {
		font-size: var(--text-body-lg);
		color: var(--color-fg-tertiary);
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.path-grid {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.path-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-lg);
		flex: 1;
		min-width: 200px;
		max-width: 280px;
		transition: all var(--duration-micro) var(--ease-standard);
	}

	.path-item.current {
		border-color: var(--color-fg-primary);
		background: var(--color-bg-elevated);
	}

	.path-item:hover {
		border-color: var(--color-border-emphasis);
	}

	.path-step {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fg-muted);
		color: var(--color-bg-pure);
		border-radius: 50%;
		font-weight: 700;
		font-size: var(--text-body-sm);
		flex-shrink: 0;
	}

	.path-item.current .path-step {
		background: var(--color-fg-primary);
	}

	.path-content {
		flex: 1;
	}

	.path-title {
		font-size: var(--text-body-lg);
		font-weight: 600;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-xs);
	}

	.path-text {
		font-size: var(--text-body-sm);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
	}

	.path-badge {
		display: inline-block;
		margin-top: var(--space-sm);
		padding: 2px 8px;
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		font-size: var(--text-caption);
		font-weight: 600;
		border-radius: var(--radius-full);
	}

	.path-connector {
		color: var(--color-fg-muted);
		font-size: var(--text-h3);
	}

	@media (max-width: 768px) {
		.path-grid {
			flex-direction: column;
		}

		.path-item {
			max-width: 100%;
		}

		.path-connector {
			transform: rotate(90deg);
		}
	}

	/* Register Section */
	.register-section {
		padding: var(--space-2xl) var(--space-lg);
	}

	.register-container {
		max-width: 500px;
		margin: 0 auto;
	}

	.register-content {
		text-align: center;
	}

	.register-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.register-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-xl);
	}

	.register-form {
		text-align: left;
	}

	.form-group {
		margin-bottom: var(--space-md);
	}

	.form-label {
		display: block;
		font-size: var(--text-body-sm);
		font-weight: 500;
		color: var(--color-fg-secondary);
		margin-bottom: var(--space-xs);
	}

	.form-input,
	.form-select {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		font-size: var(--text-body);
		color: var(--color-fg-primary);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-border-default);
		border-radius: var(--radius-md);
		transition: border-color var(--duration-micro) var(--ease-standard);
	}

	.form-input:focus,
	.form-select:focus {
		outline: none;
		border-color: var(--color-border-emphasis);
	}

	.form-input::placeholder {
		color: var(--color-fg-muted);
	}

	.form-select {
		cursor: pointer;
	}

	.form-error {
		padding: var(--space-sm) var(--space-md);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-md);
		color: #ef4444;
		font-size: var(--text-body-sm);
		margin-bottom: var(--space-md);
	}

	.form-button {
		width: 100%;
		padding: var(--space-sm) var(--space-lg);
		font-size: var(--text-body);
		font-weight: 600;
		color: var(--color-bg-pure);
		background: var(--color-fg-primary);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.form-button:hover:not(:disabled) {
		opacity: 0.9;
	}

	.form-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.form-note {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-align: center;
		margin-top: var(--space-md);
	}

	/* Success State */
	.success-message {
		text-align: center;
		padding: var(--space-xl);
	}

	.success-icon {
		width: 64px;
		height: 64px;
		margin: 0 auto var(--space-lg);
		background: var(--color-fg-primary);
		color: var(--color-bg-pure);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 700;
	}

	.success-title {
		font-size: var(--text-h2);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-sm);
	}

	.success-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		margin-bottom: var(--space-lg);
	}

	.back-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.back-link:hover {
		color: var(--color-fg-primary);
	}

	/* About Section */
	.about-section {
		padding: var(--space-2xl) var(--space-lg);
		background: var(--color-bg-elevated);
		border-top: 1px solid var(--color-border-default);
	}

	.about-container {
		max-width: 600px;
		margin: 0 auto;
	}

	.about-content {
		text-align: center;
	}

	.about-label {
		font-size: var(--text-caption);
		color: var(--color-fg-muted);
		text-transform: uppercase;
		letter-spacing: 0.1em;
		margin-bottom: var(--space-xs);
	}

	.about-title {
		font-size: var(--text-h1);
		font-weight: 700;
		color: var(--color-fg-primary);
		margin-bottom: var(--space-md);
	}

	.about-description {
		font-size: var(--text-body);
		color: var(--color-fg-tertiary);
		line-height: var(--leading-relaxed);
		margin-bottom: var(--space-lg);
	}

	.about-links {
		display: flex;
		gap: var(--space-lg);
		justify-content: center;
		flex-wrap: wrap;
	}

	.about-link {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		transition: color var(--duration-micro) var(--ease-standard);
	}

	.about-link:hover {
		color: var(--color-fg-primary);
	}

	/* Animations */
	.animate-reveal {
		opacity: 0;
		transform: translateY(16px);
		animation: reveal var(--duration-complex) var(--ease-standard) forwards;
		animation-delay: calc(var(--delay, 0) * 80ms);
	}

	@keyframes reveal {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.animate-reveal {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
