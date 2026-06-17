<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	type ClerkLoadOptions = {
		ui?: { ClerkUI?: unknown };
		signInUrl?: string;
		signUpUrl?: string;
		signInForceRedirectUrl?: string;
		signUpForceRedirectUrl?: string;
		signInFallbackRedirectUrl?: string;
		signUpFallbackRedirectUrl?: string;
		satelliteAutoSync?: boolean;
	};

	type ClerkAppearance = Record<string, unknown>;

	type ClerkSignInProps = {
		appearance?: ClerkAppearance;
		routing?: 'hash' | 'path';
		forceRedirectUrl?: string;
		fallbackRedirectUrl?: string;
		signUpForceRedirectUrl?: string;
		signUpFallbackRedirectUrl?: string;
		signUpUrl?: string;
	};

	type ClerkBrowser = {
		isSignedIn?: boolean;
		load: (options?: ClerkLoadOptions) => Promise<void>;
		mountSignIn: (node: HTMLDivElement, props?: ClerkSignInProps) => void;
		unmountSignIn?: (node: HTMLDivElement) => void;
		redirectWithAuth?: (to: string) => Promise<unknown>;
	};

	type ClerkWindow = Window &
		typeof globalThis & {
			Clerk?: ClerkBrowser;
			__internal_ClerkUICtor?: unknown;
		};

	let { data }: { data: PageData } = $props();

	let signInMount: HTMLDivElement | null = $state(null);
	let status = $state(data.publishableKey ? 'loading' : 'missing');
	let errorMessage = $state<string | null>(
		data.publishableKey ? null : 'Clerk is not configured for this deployment.'
	);
	let mountedSignIn = false;
	const clerkAppearance: ClerkAppearance = {
		variables: {
			colorPrimary: '#0a0e19',
			colorPrimaryForeground: '#ffffff',
			colorBackground: '#ffffff',
			colorForeground: '#0a0e19',
			colorMuted: '#f2f2f2',
			colorMutedForeground: '#636363',
			colorInput: '#ffffff',
			colorInputForeground: '#0a0e19',
			colorBorder: '#e1e1e1',
			colorRing: '#afc1fd',
			colorDanger: '#c41e3a',
			fontFamily:
				'ABC Diatype, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif',
			fontFamilyButtons:
				'ABC Diatype, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif',
			fontFamilyMono: 'ABC Diatype Mono, SF Mono, Monaco, Cascadia Code, monospace',
			fontSize: '0.92rem',
			fontWeight: {
				normal: 400,
				medium: 500,
				semibold: 700,
				bold: 700
			},
			borderRadius: '4px',
			spacing: '1rem'
		},
		elements: {
			rootBox: {
				width: '100%'
			},
			cardBox: {
				width: '100%',
				border: '1px solid #e1e1e1',
				borderRadius: '8px',
				boxShadow: '0 18px 60px rgba(10, 14, 25, 0.08)'
			},
			card: {
				borderRadius: '8px',
				boxShadow: 'none'
			},
			headerTitle: {
				letterSpacing: '0',
				fontWeight: '400'
			},
			headerSubtitle: {
				color: '#636363',
				letterSpacing: '0'
			},
			formButtonPrimary: {
				borderRadius: '4px',
				boxShadow: 'none',
				fontWeight: '700',
				letterSpacing: '0'
			},
			socialButtonsBlockButton: {
				borderRadius: '4px',
				boxShadow: 'none',
				letterSpacing: '0'
			},
			formFieldInput: {
				borderRadius: '4px',
				boxShadow: 'none'
			},
			footerActionLink: {
				color: '#0a0e19',
				fontWeight: '700'
			}
		}
	};

	function getClerkWindow() {
		return window as ClerkWindow;
	}

	function normalizeFrontendApiUrl(value: string | null, publishableKey: string) {
		if (value) {
			const trimmed = value.trim().replace(/\/+$/, '');
			return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
		}

		const encodedDomain = publishableKey.split('_')[2];
		if (!encodedDomain) {
			throw new Error('Clerk publishable key is malformed.');
		}

		return `https://${atob(encodedDomain).slice(0, -1)}`;
	}

	function loadScript(src: string, attributes: Record<string, string> = {}) {
		return new Promise<void>((resolve, reject) => {
			const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
			if (existing?.dataset.loaded === 'true') {
				resolve();
				return;
			}

			const script = existing ?? document.createElement('script');
			for (const [name, value] of Object.entries(attributes)) {
				script.setAttribute(name, value);
			}

			script.defer = true;
			script.crossOrigin = 'anonymous';
			script.type = 'text/javascript';
			script.addEventListener('load', () => {
				script.dataset.loaded = 'true';
				resolve();
			});
			script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));

			if (!existing) {
				script.src = src;
				document.head.appendChild(script);
			}
		});
	}

	async function redirectWithClerk(clerk: ClerkBrowser, to: string) {
		if (clerk.redirectWithAuth) {
			await clerk.redirectWithAuth(to);
			return;
		}

		window.location.assign(to);
	}

	async function mountClerk() {
		if (!data.publishableKey || !signInMount) {
			return;
		}

		try {
			const clerkWindow = getClerkWindow();
			const frontendApiUrl = normalizeFrontendApiUrl(data.frontendApiUrl, data.publishableKey);

			await loadScript(`${frontendApiUrl}/npm/@clerk/ui@1/dist/ui.browser.js`);
			await loadScript(`${frontendApiUrl}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`, {
				'data-clerk-publishable-key': data.publishableKey
			});

			const clerk = clerkWindow.Clerk;
			if (!clerk) {
				throw new Error('Clerk did not initialize.');
			}

			await clerk.load({
				ui: { ClerkUI: clerkWindow.__internal_ClerkUICtor },
				signInUrl: '/sign-in',
				signUpUrl: data.signUpUrl ?? undefined,
				signInForceRedirectUrl: data.redirectUrl,
				signUpForceRedirectUrl: data.redirectUrl,
				signInFallbackRedirectUrl: data.redirectUrl,
				signUpFallbackRedirectUrl: data.redirectUrl,
				satelliteAutoSync: true
			});

			if (clerk.isSignedIn) {
				status = 'redirecting';
				await redirectWithClerk(clerk, data.redirectUrl);
				return;
			}

			clerk.mountSignIn(signInMount, {
				appearance: clerkAppearance,
				routing: 'hash',
				forceRedirectUrl: data.redirectUrl,
				fallbackRedirectUrl: data.redirectUrl,
				signUpForceRedirectUrl: data.redirectUrl,
				signUpFallbackRedirectUrl: data.redirectUrl,
				signUpUrl: data.signUpUrl ?? undefined
			});
			mountedSignIn = true;
			status = 'ready';
		} catch (error) {
			status = 'error';
			errorMessage = error instanceof Error ? error.message : 'Clerk sign-in failed to load.';
		}
	}

	onMount(() => {
		void mountClerk();

		return () => {
			const clerk = getClerkWindow().Clerk;
			if (mountedSignIn && signInMount && clerk?.unmountSignIn) {
				clerk.unmountSignIn(signInMount);
			}
		};
	});
</script>

<SEO
	title="Sign In"
	description="Sign in to CREATE SOMETHING with Clerk"
	propertyName="agency"
	noindex={true}
/>

<section class="ona-sign-in-shell" aria-labelledby="clerk-sign-in-title">
	<header class="ona-sign-in-header">
		<a class="brand-lockup" href={data.redirectUrl} aria-label="Ona Agents">
			<span class="cube-mark" aria-hidden="true"></span>
			<span>
				<strong>Ona Agents</strong>
				<small>CREATE SOMETHING operator surface</small>
			</span>
		</a>

		<span class="status-pill warn">Clerk Access</span>
	</header>

	<div class="ona-sign-in-main">
		<div class="clerk-sign-in-copy">
			<div class="eyebrow">Clerk Access</div>
			<h1 id="clerk-sign-in-title" class="section-title">
				Sign in with Clerk to use the Ona agent shell.
			</h1>
			<p class="muted">
				Agent keys stay server-side. Staff access is required before agent names,
				credentials, or chat actions are available.
			</p>
		</div>

		<div class="proof-strip" aria-label="Operator proof surfaces">
			<span>Proof surfaces</span>
			<article>
				<strong>Objects</strong>
				<small>Session, lane, state</small>
			</article>
			<article>
				<strong>Actions</strong>
				<small>Authenticate, redirect</small>
			</article>
			<article>
				<strong>Receipts</strong>
				<small>Clerk, Ona, Dify</small>
			</article>
		</div>
	</div>

	<div class="clerk-sign-in-panel">
		{#if status === 'missing' || status === 'error'}
			<div class="clerk-sign-in-message" role="alert">
				<strong>Sign-in unavailable</strong>
				<span>{errorMessage}</span>
			</div>
		{:else if status === 'redirecting'}
			<div class="clerk-sign-in-message">
				<strong>Session active</strong>
				<span>Redirecting...</span>
			</div>
		{:else if status === 'loading'}
			<div class="clerk-sign-in-loading">
				<span>Loading...</span>
			</div>
		{/if}

		<div class:hidden={status !== 'ready'} class="clerk-sign-in-mount" bind:this={signInMount}></div>
	</div>
</section>

<style>
	.ona-sign-in-shell {
		--ona-porcelain: var(--color-clear-porcelain, #f9f9f9);
		--ona-porcelain-soft: var(--color-clear-porcelain-soft, #f2f2f2);
		--ona-panel: var(--color-clear-panel, #ffffff);
		--ona-onyx: var(--color-clear-onyx, #0a0e19);
		--ona-grey: var(--color-clear-grey, #636363);
		--ona-grey-quiet: var(--color-clear-grey-quiet, #818181);
		--ona-border: var(--color-clear-border, #e1e1e1);
		--ona-border-strong: var(--color-clear-border-strong, #cecece);
		--ona-pastel-blue: var(--color-clear-pastel-blue, #afc1fd);
		--ona-radius-sm: var(--radius-clear-sm, 4px);
		--ona-radius-md: var(--radius-clear-md, 8px);
		--ona-content-width: var(--content-width-clear, 85rem);
		--ona-shadow: var(--shadow-clear-restraint, 0 18px 60px rgba(10, 14, 25, 0.08));
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(20rem, 28rem);
		align-items: stretch;
		gap: 1rem;
		min-height: 100svh;
		width: min(var(--ona-content-width), calc(100% - 2.5rem));
		margin-inline: auto;
		padding-block: 1.35rem 3rem;
		color: var(--ona-onyx);
		font-family: var(
			--font-sans,
			'ABC Diatype',
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			system-ui,
			sans-serif
		);
		letter-spacing: 0;
	}

	.ona-sign-in-header {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 4.9rem;
		padding-block: 0.8rem;
		border-bottom: 1px solid var(--ona-border);
	}

	.brand-lockup {
		display: inline-flex;
		align-items: center;
		gap: 0.72rem;
		color: var(--ona-onyx);
		text-decoration: none;
	}

	.brand-lockup strong,
	.brand-lockup small {
		display: block;
		letter-spacing: 0;
	}

	.brand-lockup strong {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1.1;
	}

	.brand-lockup small {
		margin-top: 0.18rem;
		color: var(--ona-grey);
		font-size: 0.78rem;
		line-height: 1.2;
	}

	.cube-mark {
		position: relative;
		width: 1.25rem;
		height: 1.25rem;
		flex: 0 0 auto;
		transform: rotate(45deg);
		border-radius: 2px;
		background: var(--ona-onyx);
		box-shadow:
			inset 0.34rem -0.34rem 0 rgba(255, 255, 255, 0.12),
			0 0 0 1px rgba(10, 14, 25, 0.08);
	}

	.cube-mark::after {
		content: '';
		position: absolute;
		inset: 0.22rem;
		border-radius: 1px;
		background: linear-gradient(135deg, rgba(175, 193, 253, 0.5), rgba(255, 255, 255, 0));
	}

	.status-pill {
		display: inline-flex;
		width: fit-content;
		align-items: center;
		gap: 0.35rem;
		min-height: 1.65rem;
		border: 1px solid var(--ona-border);
		border-radius: var(--ona-radius-sm);
		padding: 0.28rem 0.52rem;
		background: var(--ona-panel);
		color: var(--ona-grey);
		font-family: var(--font-mono, 'ABC Diatype Mono', 'SF Mono', Monaco, monospace);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.status-pill.warn {
		border-color: color-mix(in srgb, var(--ona-pastel-blue) 68%, var(--ona-border));
		background: color-mix(in srgb, var(--ona-pastel-blue) 26%, white);
		color: var(--ona-onyx);
	}

	.ona-sign-in-main {
		display: grid;
		align-content: end;
		gap: 1rem;
		min-height: 30rem;
		padding-block: 3rem 2rem;
		border-bottom: 1px solid var(--ona-border);
		background:
			linear-gradient(90deg, rgba(10, 14, 25, 0.035) 1px, transparent 1px) 0 0 / 4.25rem
				4.25rem,
			linear-gradient(180deg, var(--ona-panel) 0%, #fbfbfb 100%);
	}

	.clerk-sign-in-copy {
		display: grid;
		gap: 1rem;
		max-width: 48rem;
		padding-inline: 1rem;
	}

	.eyebrow {
		display: inline-flex;
		width: fit-content;
		max-width: 100%;
		min-height: 1.75rem;
		align-items: center;
		margin: 0;
		padding: 0.34rem 0.58rem;
		border: 1px solid var(--ona-border);
		border-radius: var(--ona-radius-sm);
		background: var(--ona-panel);
		color: var(--ona-grey);
		font-family: var(--font-mono, 'ABC Diatype Mono', 'SF Mono', Monaco, monospace);
		font-size: 0.74rem;
		font-weight: 500;
		letter-spacing: 0;
		line-height: 1.15;
		text-transform: uppercase;
	}

	.section-title {
		margin: 0;
		color: var(--ona-onyx);
		font-family: var(--font-heading, var(--font-sans));
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: 0;
		line-height: 1.08;
		text-wrap: balance;
	}

	.muted {
		max-width: 41rem;
		margin: 0;
		color: var(--ona-grey);
		font-size: 1.08rem;
		line-height: 1.55;
	}

	.proof-strip {
		display: grid;
		grid-template-columns: minmax(9rem, 0.22fr) repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
		align-items: center;
		padding: 1rem;
		border-top: 1px solid var(--ona-border);
	}

	.proof-strip > span {
		color: var(--ona-grey);
		font-family: var(--font-mono, 'ABC Diatype Mono', 'SF Mono', Monaco, monospace);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.proof-strip article {
		display: grid;
		gap: 0.16rem;
		min-height: 3.3rem;
		align-content: center;
		padding: 0.62rem 0.72rem;
		border: 1px solid var(--ona-border);
		border-radius: var(--ona-radius-sm);
		background: var(--ona-panel);
	}

	.proof-strip strong {
		font-size: 0.94rem;
		line-height: 1.16;
	}

	.proof-strip small {
		color: var(--ona-grey);
		font-size: 0.78rem;
		line-height: 1.25;
	}

	.clerk-sign-in-panel {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 30rem;
		align-self: center;
		padding-block: 2rem;
	}

	.clerk-sign-in-mount,
	.clerk-sign-in-panel :global(.cl-rootBox) {
		width: 100%;
	}

	.clerk-sign-in-message,
	.clerk-sign-in-loading {
		width: 100%;
		border: 1px solid var(--ona-border-strong);
		border-radius: var(--ona-radius-md);
		background: var(--ona-panel);
		box-shadow: var(--ona-shadow);
		padding: 1rem;
		color: var(--ona-grey);
	}

	.clerk-sign-in-message strong,
	.clerk-sign-in-message span,
	.clerk-sign-in-loading span {
		display: block;
		letter-spacing: 0;
	}

	.clerk-sign-in-message strong {
		margin-bottom: 0.35rem;
		color: var(--ona-onyx);
		font-size: 1rem;
	}

	.clerk-sign-in-loading {
		min-height: 12rem;
		display: grid;
		place-items: center;
	}

	.hidden {
		display: none;
	}

	.clerk-sign-in-panel :global(.cl-cardBox) {
		border-radius: var(--ona-radius-md);
	}

	@media (max-width: 820px) {
		.ona-sign-in-shell {
			grid-template-columns: 1fr;
			align-items: start;
			width: min(100% - 1.5rem, var(--ona-content-width));
		}

		.ona-sign-in-header {
			align-items: flex-start;
		}

		.ona-sign-in-main,
		.proof-strip {
			grid-template-columns: 1fr;
		}

		.ona-sign-in-main {
			min-height: auto;
			padding-block: 2rem 1rem;
		}

		.clerk-sign-in-panel {
			min-height: 26rem;
		}
	}

	@media (max-width: 560px) {
		.ona-sign-in-header {
			flex-direction: column;
		}

		.section-title {
			font-size: 1.55rem;
		}

		.muted {
			font-size: 0.98rem;
		}
	}
</style>
