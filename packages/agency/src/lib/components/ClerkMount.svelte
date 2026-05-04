<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { loadBrowserClerk } from '$lib/client/clerk';

	interface Props {
		mode: 'signIn' | 'signUp' | 'userProfile';
		publishableKey?: string | null;
		fallbackRedirectUrl?: string;
		forceRedirectUrl?: string;
	}

	let {
		mode,
		publishableKey = null,
		fallbackRedirectUrl = '/dashboard',
		forceRedirectUrl,
	}: Props = $props();

	let host = $state<HTMLDivElement | null>(null);

	const missingConfigMsg =
		'Authentication is not configured for this environment yet. Contact support if you need access.';

	let mountError = $state<string | null>(publishableKey ? null : missingConfigMsg);

	// .agency design-system aligned appearance
	const sharedVariables = {
		colorPrimary: 'var(--color-fg-primary, #f5f5f5)',
		colorBackground: 'var(--color-bg-surface, #1a1a1a)',
		colorNeutral: 'rgba(255, 255, 255, 0.12)',
		colorText: 'var(--color-fg-primary, #f5f5f5)',
		colorTextSecondary: 'var(--color-fg-tertiary, #999)',
		colorInputBackground: 'var(--color-bg-pure, #0a0a0a)',
		colorInputText: 'var(--color-fg-primary, #f5f5f5)',
		borderRadius: 'var(--radius-md, 0.5rem)',
		fontFamily: 'var(--font-family, system-ui, sans-serif)',
		fontFamilyButtons: 'var(--font-family, system-ui, sans-serif)',
	} as const;

	const sharedElements = {
		rootBox: { width: '100%' },
		card: {
			background: 'var(--color-bg-surface, #1a1a1a)',
			border: '1px solid var(--color-border-default, rgba(255,255,255,0.08))',
			boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
			borderRadius: 'var(--radius-lg, 0.75rem)',
		},
		headerTitle: { color: 'var(--color-fg-primary, #f5f5f5)' },
		headerSubtitle: { color: 'var(--color-fg-tertiary, #999)' },
		formFieldInput: {
			background: 'var(--color-bg-pure, #0a0a0a)',
			color: 'var(--color-fg-primary, #f5f5f5)',
			border: '1px solid var(--color-border-default, rgba(255,255,255,0.08))',
		},
		formFieldLabel: { color: 'var(--color-fg-secondary, #ccc)' },
		formButtonPrimary: {
			background: 'var(--color-fg-primary, #f5f5f5)',
			color: 'var(--color-bg-pure, #0a0a0a)',
			fontWeight: '600',
		},
		footerActionText: { color: 'var(--color-fg-tertiary, #999)' },
		footerActionLink: { color: 'var(--color-fg-primary, #f5f5f5)' },
	} as const;

	const authAppearance = {
		layout: { socialButtonsVariant: 'blockButton' },
		variables: sharedVariables,
		elements: {
			...sharedElements,
			cardBox: { width: '100%', maxWidth: '26rem', marginInline: 'auto' },
			socialButtonsBlockButton: {
				background: 'rgba(255, 255, 255, 0.04)',
				border: '1px solid var(--color-border-default, rgba(255,255,255,0.08))',
				color: 'var(--color-fg-primary, #f5f5f5)',
			},
			socialButtonsBlockButtonText: {
				color: 'var(--color-fg-primary, #f5f5f5)',
				fontWeight: '600',
			},
		},
	} as const;

	const profileAppearance = {
		variables: sharedVariables,
		elements: {
			...sharedElements,
			cardBox: { width: '100%', maxWidth: '100%', marginInline: '0' },
			card: { ...sharedElements.card, width: '100%' },
		},
	} as const;

	const appearance = $derived(mode === 'userProfile' ? profileAppearance : authAppearance);

	onMount(() => {
		if (!browser || !host || !publishableKey) return;

		let active = true;

		void (async () => {
			try {
				const clerk = await loadBrowserClerk(publishableKey);
				if (!active) return;

				if (mode === 'signIn') {
					clerk.mountSignIn(host, {
						routing: 'path',
						path: '/login',
						signUpUrl: '/signup',
						fallbackRedirectUrl,
						forceRedirectUrl,
						appearance,
					});
				} else if (mode === 'signUp') {
					clerk.mountSignUp(host, {
						routing: 'path',
						path: '/signup',
						signInUrl: '/login',
						fallbackRedirectUrl,
						forceRedirectUrl,
						appearance,
					});
				} else {
					clerk.mountUserProfile(host, {
						routing: 'path',
						path: '/settings',
						appearance,
					});
				}
			} catch (error) {
				console.error('Failed to mount Clerk component', error);
				if (active) mountError = missingConfigMsg;
			}
		})();

		return () => {
			active = false;
			if (host) host.innerHTML = '';
		};
	});
</script>

{#if mountError}
	<div class="mount-error" role="status" aria-live="polite">
		<p>{mountError}</p>
	</div>
{:else}
	<div class:profile-mode={mode === 'userProfile'} class="mount-host" bind:this={host}></div>
{/if}

<style>
	.mount-host {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.mount-error {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-error-border);
		background: var(--color-error-muted);
		color: var(--color-error);
		font-size: var(--text-body-sm);
	}

	.mount-error p {
		margin: 0;
	}

	:global(.mount-host .cl-rootBox) {
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.mount-host.profile-mode {
		align-items: stretch;
		justify-content: stretch;
	}

	:global(.mount-host.profile-mode .cl-rootBox) {
		justify-content: stretch;
	}

	:global(.mount-host.profile-mode .cl-cardBox) {
		width: 100%;
		max-width: 100%;
	}

	:global(.mount-host.profile-mode .cl-card) {
		width: 100%;
	}
</style>
