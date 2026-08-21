<script lang="ts">
	import { page } from '$app/state';
	import {
		ArrowRight,
		Check,
		CircleCheck,
		Clock3,
		HeartHandshake,
		Loader2,
		Mail,
		Menu,
		Phone,
		ShieldCheck,
		Sparkles,
		Stethoscope,
		Users,
		X
	} from 'lucide-svelte';

	let name = $state('');
	let email = $state('');
	let phone = $state('');
	let error = $state<string | null>(null);
	let isSubmitting = $state(false);
	let menuOpen = $state(false);

	const services = [
		{
			title: 'Skilled nursing',
			description: 'In-home clinical support including wound care, injections, vital monitoring, and ongoing health assessment.',
			icon: Stethoscope
		},
		{
			title: 'Personal care assistance',
			description: 'Respectful help with bathing, dressing, meals, light housekeeping, and the routines that support independence.',
			icon: HeartHandshake
		},
		{
			title: 'Therapy at home',
			description: 'Physical, occupational, and speech therapy shaped around personal goals, comfort, and progress.',
			icon: Sparkles
		},
		{
			title: 'Recovery support',
			description: 'Thoughtful follow-through after surgery and support for chronic conditions to help prevent avoidable setbacks.',
			icon: CircleCheck
		},
		{
			title: 'Medication support',
			description: 'Practical help keeping medications organized, understood, and taken safely and on schedule.',
			icon: ShieldCheck
		},
		{
			title: 'Family education',
			description: 'Clear guidance and useful resources so families feel informed, prepared, and supported between visits.',
			icon: Users
		}
	];

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		error = null;
		isSubmitting = true;

		try {
			const response = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, email: email || null, phone })
			});

			const result = (await response.json()) as { error?: string };
			if (!response.ok) {
				error = result.error || 'We could not send your request. Please call us instead.';
				return;
			}

			window.location.href = '/success';
		} catch {
			error = 'We could not send your request. Please call us instead.';
		} finally {
			isSubmitting = false;
		}
	}

	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:head>
	<title>J and J Home Health | Compassionate Care at Home</title>
	<meta
		name="description"
		content="Personalized skilled nursing, personal care assistance, therapy, and recovery support delivered with dignity at home."
	/>
	<meta name="theme-color" content="#002855" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="J and J Home Health | Compassionate Care at Home" />
	<meta
		property="og:description"
		content="Personalized skilled nursing, personal care assistance, therapy, and recovery support delivered with dignity at home."
	/>
	<meta property="og:image" content={`${page.url.origin}/og.jpg`} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="J and J Home Health | Compassionate Care at Home" />
	<meta
		name="twitter:description"
		content="Personalized support for health, recovery, and independence at home."
	/>
	<meta name="twitter:image" content={`${page.url.origin}/og.jpg`} />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>

<header class="site-header">
	<div class="header-inner">
		<a class="brand" href="#top" aria-label="J and J Home Health, home">
			<img class="brand-logo" src="/jandj-logo.avif" alt="" width="232" height="100" />
			<span class="brand-name">Home Health</span>
		</a>

		<nav class="desktop-nav" aria-label="Primary navigation">
			<a href="#services">Services</a>
			<a href="#why-us">Why J&amp;J</a>
			<a href="#about">About</a>
			<a href="#referrals">Referrals</a>
		</nav>

		<a class="header-call" href="tel:+18179993839">
			<Phone size={17} aria-hidden="true" />
			<span>(817) 999-3839</span>
		</a>

		<button
			class="menu-button"
			type="button"
			aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
			aria-expanded={menuOpen}
			aria-controls="mobile-navigation"
			onclick={() => (menuOpen = !menuOpen)}
		>
			{#if menuOpen}<X size={23} aria-hidden="true" />{:else}<Menu size={23} aria-hidden="true" />{/if}
		</button>
	</div>

	{#if menuOpen}
		<nav id="mobile-navigation" class="mobile-nav" aria-label="Mobile navigation">
			<a href="#services" onclick={closeMenu}>Services</a>
			<a href="#why-us" onclick={closeMenu}>Why J&amp;J</a>
			<a href="#about" onclick={closeMenu}>About</a>
			<a href="#referrals" onclick={closeMenu}>Referrals</a>
			<a class="mobile-call" href="tel:+18179993839" onclick={closeMenu}>
				<Phone size={17} aria-hidden="true" /> Call (817) 999-3839
			</a>
		</nav>
	{/if}
</header>

<main id="main-content">
	<section id="top" class="hero section-shell">
		<div class="hero-copy">
			<p class="eyebrow">Care that feels close to home</p>
			<h1>Helping you live well, right where you belong.</h1>
			<p class="hero-lede">
				J and J Home Health brings skilled, compassionate support to your door—so recovery,
				independence, and everyday life can move forward with confidence.
			</p>

			<div class="hero-actions">
				<a class="button button-primary" href="#contact">
					Request a call <ArrowRight size={18} aria-hidden="true" />
				</a>
				<a class="button button-secondary" href="tel:+18179993839">
					<Phone size={17} aria-hidden="true" /> Call our care team
				</a>
			</div>

			<ul class="hero-points" aria-label="Primary services">
				<li><Check size={17} aria-hidden="true" /> Skilled nursing</li>
				<li><Check size={17} aria-hidden="true" /> Personal care</li>
				<li><Check size={17} aria-hidden="true" /> In-home therapy</li>
			</ul>
		</div>

		<div class="hero-visual">
			<img
				src="/hero-care.avif"
				alt="A home health professional listening attentively to an older adult"
				width="980"
				height="998"
			/>
			<div class="care-card">
				<HeartHandshake size={22} aria-hidden="true" />
				<span>Start with a conversation</span>
			</div>
		</div>
	</section>

	<div class="proof-bar" aria-label="How to begin care">
		<ol class="section-shell proof-grid">
			<li><span class="proof-step">01</span><strong>Contact the care team</strong></li>
			<li><span class="proof-step">02</span><strong>Confirm needs and availability</strong></li>
			<li><span class="proof-step">03</span><strong>Plan the next step together</strong></li>
		</ol>
	</div>

	<section id="services" class="content-section section-shell">
		<div class="section-intro">
			<p class="eyebrow">How we can help</p>
			<h2>Support for health, recovery, and everyday independence.</h2>
			<p>
				Every plan starts by listening. We coordinate the right mix of clinical and personal
				care around your needs, goals, and daily routine.
			</p>
		</div>

		<div class="service-grid">
			{#each services as service}
				<article class="service-card">
					<div class="service-icon"><service.icon size={22} aria-hidden="true" /></div>
					<h3>{service.title}</h3>
					<p>{service.description}</p>
				</article>
			{/each}
		</div>
	</section>

	<section id="why-us" class="why-section">
		<div class="section-shell why-grid">
			<div class="why-heading">
				<p class="eyebrow eyebrow-light">From first call to next step</p>
				<h2>A clear conversation before care begins.</h2>
				<p>
					Families and referring professionals can start in the same place: tell us how to
					reach you, then speak directly with the care team about fit and availability.
				</p>
			</div>

			<div class="care-journey">
				<ol class="care-steps">
					<li>
						<span>01</span>
						<div>
							<h3>Share what support is needed</h3>
							<p>Request a callback with basic contact details, or call the care team directly.</p>
						</div>
					</li>
					<li>
						<span>02</span>
						<div>
							<h3>Confirm needs and availability</h3>
							<p>The care team will discuss the situation and confirm what support may be available.</p>
						</div>
					</li>
					<li>
						<span>03</span>
						<div>
							<h3>Plan the next step together</h3>
							<p>The care team will explain the appropriate next action based on the conversation.</p>
						</div>
					</li>
				</ol>

				<div id="referrals" class="referral-actions" aria-label="Referral contact options">
					<a href="tel:+18179993839">
						<Phone size={21} aria-hidden="true" />
						<span><small>Call our team</small>(817) 999-3839</span>
						<ArrowRight size={19} aria-hidden="true" />
					</a>
					<a href="mailto:jandjhomehealth@gmail.com">
						<Mail size={21} aria-hidden="true" />
						<span><small>Email us</small>jandjhomehealth@gmail.com</span>
						<ArrowRight size={19} aria-hidden="true" />
					</a>
				</div>
			</div>
		</div>
	</section>

	<section id="about" class="content-section section-shell about-grid">
		<div class="about-copy">
			<p class="eyebrow">Our commitment</p>
			<h2>Community care, practiced with dignity.</h2>
			<p class="about-lede">
				J and J Home Health supports people working toward recovery, independence, and a
				more manageable life in the place they know best.
			</p>
			<p>
				We believe trust is built in the details: arriving prepared, explaining what comes
				next, respecting the rhythms of each home, and treating every client like family.
			</p>
		</div>

		<figure class="about-visual">
			<div class="about-photo-frame">
				<img
					class="about-photo"
					src="/caregiver-selfie.avif"
					alt="A home health professional smiling with an older adult"
					width="656"
					height="440"
				/>
			</div>
			<figcaption class="promise-strip">
				<span>Our promise</span>
				<p>Every visit. Every plan. Every family.</p>
			</figcaption>
		</figure>
	</section>

	<section id="contact" class="contact-section section-shell">
		<div class="contact-copy">
			<p class="eyebrow">Request a conversation</p>
			<h2>Tell us how to reach you.</h2>
			<p>
				Share your contact information and a member of our care team will follow up to learn
				more. Contact us to confirm service availability in your area.
			</p>

			<div class="response-note">
				<Clock3 size={20} aria-hidden="true" />
				<span><strong>Prefer to talk now?</strong> Call <a href="tel:+18179993839">(817) 999-3839</a>.</span>
			</div>
		</div>

		<form class="contact-form" onsubmit={submit}>
			<label>
				<span>Full name</span>
				<input type="text" bind:value={name} required autocomplete="name" placeholder="First and last name" />
			</label>

			<div class="form-row">
				<label>
					<span>Phone number</span>
					<input type="tel" bind:value={phone} required autocomplete="tel" placeholder="(555) 555-5555" />
				</label>
				<label>
					<span>Email <small>(optional)</small></span>
					<input type="email" bind:value={email} autocomplete="email" placeholder="you@example.com" />
				</label>
			</div>

			{#if error}<p class="error" role="alert">{error}</p>{/if}

			<button class="button button-primary submit-button" type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 size={18} class="spin" aria-hidden="true" /> Sending…
				{:else}
					Request a call <ArrowRight size={18} aria-hidden="true" />
				{/if}
			</button>

			<p class="form-privacy">
				Please do not include medical details here. We’ll continue the conversation directly
				and handle care information through the appropriate secure process.
			</p>
		</form>
	</section>
</main>

<footer class="site-footer">
	<div class="section-shell footer-grid">
		<div>
			<a class="brand brand-footer" href="#top" aria-label="J and J Home Health, back to top">
				<img class="brand-logo" src="/jandj-logo.avif" alt="" width="232" height="100" />
				<span class="brand-name">Home Health</span>
			</a>
			<p>Compassionate support for health, recovery, and independence at home.</p>
		</div>
		<div>
			<strong>Contact</strong>
			<a href="tel:+18179993839">(817) 999-3839</a>
			<a href="mailto:jandjhomehealth@gmail.com">jandjhomehealth@gmail.com</a>
		</div>
		<div>
			<strong>Explore</strong>
			<a href="#services">Services</a>
			<a href="#about">About</a>
			<a href="#referrals">Referrals</a>
		</div>
	</div>
	<div class="section-shell footer-bottom">
		<span>© {new Date().getFullYear()} J and J Home Health</span>
		<span>If you are experiencing a medical emergency, call 911.</span>
	</div>
</footer>
