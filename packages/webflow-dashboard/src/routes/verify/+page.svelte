<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { CheckCircle2, Lock, XCircle } from 'lucide-svelte';
	import WebflowLogo from '$lib/components/WebflowLogo.svelte';

	type VerifyStatus =
		| 'no-token'
		| 'session-created'
		| 'rate-limited'
		| 'invalid'
		| 'not-found'
		| 'expired'
		| 'error';

	interface PageData {
		status: VerifyStatus;
		error: string | null;
		retryAfter?: number;
		handoffUrl?: string;
	}

	interface VerifyResponse {
		error?: string;
		handoffUrl?: string;
	}

	type StorageAccessDocument = Document & {
		hasStorageAccess?: () => Promise<boolean>;
		requestStorageAccess?: () => Promise<void>;
	};

	type UIStatus = 'verifying' | 'success' | 'error' | 'blocked' | 'no-token' | 'action-required';
	type ContinueMode = 'verify' | 'dashboard';

	let { data } = $props<{ data: PageData }>();

	function getInitialStatus(serverStatus: VerifyStatus, serverError: string | null): UIStatus {
		if (serverStatus === 'no-token') return 'no-token';
		if (serverError) return 'error';
		return 'verifying';
	}

	const serverStatus = $derived(data.status);
	const serverError = $derived(data.error);
	let status = $state<UIStatus>('verifying');
	let errorMessage = $state<string | null>(null);
	let fallbackUrl = $state<string | null>(null);
	let actionMessage = $state<string | null>(null);
	let continueMode = $state<ContinueMode>('verify');
	let isEmbedded = $state(false);
	let canRequestStorageAccess = $state(false);
	let pendingToken = $state<string | null>(null);
	let tokenInput = $state('');

	$effect(() => {
		status = getInitialStatus(serverStatus, serverError);
		errorMessage = serverError;
		actionMessage = null;
		continueMode = 'verify';
		pendingToken = null;
	});

	function setActionRequired(mode: ContinueMode, message: string, token: string | null = null) {
		status = 'action-required';
		actionMessage = message;
		errorMessage = null;
		continueMode = mode;
		pendingToken = token;
	}

	async function waitForAuthenticatedSession(maxAttempts = 5, delayMs = 250): Promise<boolean> {
		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			try {
				const response = await fetch('/api/auth/check-session', {
					method: 'GET',
					cache: 'no-store',
					credentials: 'include'
				});

				if (response.ok) {
					return true;
				}
			} catch {
				// Ignore transient network failures and retry.
			}

			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
		}

		return false;
	}

	function buildAbsolutePath(pathname: string): string {
		return new URL(pathname, window.location.origin).toString();
	}

	function navigateToTopLevel(pathname: string) {
		const absoluteUrl = buildAbsolutePath(pathname);

		if (window.self === window.top) {
			window.location.assign(absoluteUrl);
			return;
		}

		try {
			window.top?.location.assign(absoluteUrl);
			return;
		} catch {
			window.open(absoluteUrl, '_top');
		}
	}

	function buildVerifyPath(token: string): string {
		return `/verify?token=${encodeURIComponent(token)}`;
	}

	async function getEmbeddedStorageAccessState(): Promise<boolean | null> {
		if (!isEmbedded) return true;

		const storageDocument = document as StorageAccessDocument;
		if (typeof storageDocument.hasStorageAccess !== 'function') {
			return null;
		}

		try {
			return await storageDocument.hasStorageAccess();
		} catch {
			return false;
		}
	}

	async function requestEmbeddedStorageAccess(): Promise<boolean | null> {
		if (!isEmbedded) return true;

		const accessState = await getEmbeddedStorageAccessState();
		if (accessState === true) {
			return true;
		}

		const storageDocument = document as StorageAccessDocument;
		if (typeof storageDocument.requestStorageAccess !== 'function') {
			return null;
		}

		try {
			await storageDocument.requestStorageAccess();
			return true;
		} catch {
			return false;
		}
	}

	function navigateToDashboard() {
		window.location.assign('/dashboard');
	}

	function getRecoveryUrl(): string {
		return fallbackUrl || '/login';
	}

	function persistRecoveryUrl(nextHandoffUrl?: string) {
		if (!nextHandoffUrl) return;

		fallbackUrl = nextHandoffUrl;

		const handoff = new URL(nextHandoffUrl, window.location.origin).searchParams.get('handoff');
		if (!handoff) return;

		const currentUrl = new URL(window.location.href);
		currentUrl.searchParams.delete('token');
		currentUrl.searchParams.set('handoff', handoff);
		window.history.replaceState(
			window.history.state,
			'',
			`${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
		);
	}

	function showSessionRecovery() {
		status = 'blocked';
		actionMessage = null;
		errorMessage = isEmbedded
			? 'Safari blocked the embedded sign-in cookie. Allow sign-in in Safari or continue in a new tab to finish logging in.'
			: 'Verification succeeded, but your session was not available yet. Continue to the dashboard to finish signing in.';
	}

	async function finalizeAuthenticatedSession(nextHandoffUrl?: string) {
		persistRecoveryUrl(nextHandoffUrl);

		const sessionReady = await waitForAuthenticatedSession();
		if (!sessionReady) {
			showSessionRecovery();
			return;
		}

		status = 'success';
		setTimeout(() => {
			navigateToDashboard();
		}, 750);
	}

	async function handleBlockedRecovery() {
		status = 'verifying';
		errorMessage = null;

		if ((await requestEmbeddedStorageAccess()) === true) {
			await finalizeAuthenticatedSession();
			return;
		}

		showSessionRecovery();
	}

	async function verifyToken(token: string) {
		status = 'verifying';
		errorMessage = null;
		actionMessage = null;
		pendingToken = token;

		try {
			const response = await fetch('/api/auth/verify-token', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});

			const responseData = (await response.json().catch(() => ({}))) as VerifyResponse;

			if (response.ok) {
				await finalizeAuthenticatedSession(responseData.handoffUrl);
			} else {
				status = 'error';
				errorMessage = responseData.error || 'Verification failed';
			}
		} catch {
			status = 'error';
			errorMessage = 'An error occurred during verification';
		}
	}

	async function handleActionRequired() {
		const token = pendingToken || tokenInput.trim();

		if (continueMode === 'verify' && token) {
			if ((await requestEmbeddedStorageAccess()) === true) {
				await verifyToken(token);
				return;
			}

			navigateToTopLevel(buildVerifyPath(token));
			return;
		}

		navigateToTopLevel(getRecoveryUrl());
	}

	onMount(async () => {
		fallbackUrl = data.handoffUrl ?? null;
		isEmbedded = window.self !== window.top;
		canRequestStorageAccess =
			isEmbedded && typeof (document as StorageAccessDocument).requestStorageAccess === 'function';

		const token = $page.url.searchParams.get('token');

		if (serverStatus === 'session-created') {
			persistRecoveryUrl(data.handoffUrl);
			await finalizeAuthenticatedSession(data.handoffUrl);
			return;
		}

		if (token && status === 'verifying') {
			pendingToken = token;

			if (isEmbedded && (await getEmbeddedStorageAccessState()) === false) {
				setActionRequired(
					'verify',
					'Safari and other browsers may block dashboard cookies inside the embedded Webflow frame. Continue in a full page to finish signing in.',
					token
				);
				return;
			}

			await verifyToken(token);
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		const token = tokenInput.trim();

		if (token) {
			pendingToken = token;

			if (isEmbedded && (await requestEmbeddedStorageAccess()) === false) {
				navigateToTopLevel(buildVerifyPath(token));
				return;
			}

			await verifyToken(token);
		}
	}
</script>

<svelte:head>
	<title>Verify | Webflow Asset Dashboard</title>
</svelte:head>

<main class="container">
	<div class="verify-card">
		<div class="logo">
			<WebflowLogo />
		</div>

		{#if status === 'verifying'}
			<div class="status-message">
				<div class="spinner"></div>
				<h1>Verifying your email</h1>
				<p class="subtitle">Please wait while we verify your login...</p>
			</div>
		{:else if status === 'success'}
			<div class="status-message success">
				<CheckCircle2 size={48} />
				<h1>Verification successful</h1>
				<p class="subtitle">Redirecting to dashboard...</p>
			</div>
		{:else if status === 'blocked'}
			<div class="status-message error">
				<XCircle size={48} />
				<h1>Continue sign-in</h1>
				<p class="subtitle">{errorMessage}</p>
				<div class="action-group">
					{#if canRequestStorageAccess}
						<button type="button" class="verify-button" onclick={handleBlockedRecovery}>
							Allow sign-in in Safari
						</button>
					{/if}
					<a
						href={getRecoveryUrl()}
						class="verify-button verify-button--secondary"
						target="_blank"
						rel="noopener noreferrer"
					>
						Open dashboard in a new tab
					</a>
				</div>
				<a href="/login" class="retry-link">Try logging in again</a>
			</div>
		{:else if status === 'action-required'}
			<div class="status-message">
				<Lock size={48} />
				<h1>{continueMode === 'verify' ? 'Continue sign in' : 'Open your dashboard'}</h1>
				<p class="subtitle">{actionMessage}</p>
				<button type="button" class="verify-button" onclick={handleActionRequired}>
					{continueMode === 'verify' ? 'Continue in full page' : 'Open dashboard in full page'}
				</button>
				<a href="/login" class="retry-link">
					{continueMode === 'verify' ? 'Request a new verification email' : 'Try logging in again'}
				</a>
			</div>
		{:else if status === 'no-token'}
			<div class="status-message">
				<Lock size={48} />
				<h1>Enter verification token</h1>
				<p class="subtitle">Paste your verification token from the email</p>
				<form class="token-form" onsubmit={handleSubmit}>
					<input
						type="text"
						class="token-input"
						bind:value={tokenInput}
						placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
						autocomplete="off"
						spellcheck="false"
					/>
					<button type="submit" class="verify-button" disabled={!tokenInput.trim()}>
						Verify
					</button>
				</form>
				<a href="/login" class="retry-link">Request a new verification email</a>
			</div>
		{:else}
			<div class="status-message error">
				<XCircle size={48} />
				<h1>Verification failed</h1>
				<p class="subtitle">{errorMessage}</p>
				<a href="/login" class="retry-link">Try logging in again</a>
			</div>
		{/if}
	</div>
</main>

<style>
	.container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-lg);
	}

	.verify-card {
		width: 100%;
		max-width: 400px;
		padding: var(--space-lg);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: var(--radius-xl);
		text-align: center;
		box-shadow: var(--shadow-lg);
	}

	.logo {
		display: flex;
		justify-content: center;
		margin-bottom: var(--space-lg);
	}

	.status-message {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.status-message :global(svg) {
		margin-bottom: var(--space-sm);
	}

	.status-message.success :global(svg) {
		color: var(--color-success);
	}

	.status-message.error :global(svg) {
		color: var(--color-error);
	}

	h1 {
		font-family: var(--font-heading);
		font-size: var(--text-h2);
		font-weight: var(--font-semibold);
		letter-spacing: 0.01em;
		color: var(--color-fg-primary);
		margin: 0;
	}

	.subtitle {
		font-size: var(--text-body-sm);
		color: var(--color-fg-secondary);
		margin: 0;
	}

	.spinner {
		width: 48px;
		height: 48px;
		border: 3px solid var(--color-border-default);
		border-top-color: var(--color-info);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-bottom: var(--space-sm);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.retry-link {
		margin-top: var(--space-md);
		color: var(--color-info);
		text-decoration: none;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		transition: opacity var(--duration-micro) var(--ease-standard);
	}

	.retry-link:hover {
		color: #0055d4;
	}

	.token-form {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
		margin-top: var(--space-md);
	}

	.action-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		width: 100%;
		margin-top: var(--space-md);
	}

	.token-input {
		width: 100%;
		padding: var(--space-sm);
		background: var(--color-bg-surface);
		border: 1px solid var(--color-shell-border-default);
		border-radius: 999px;
		box-shadow: var(--shadow-sm);
		color: var(--color-fg-primary);
		font-family: monospace;
		font-size: 1rem;
		text-align: center;
		transition:
			border-color var(--duration-micro) var(--ease-standard),
			box-shadow var(--duration-micro) var(--ease-standard);
	}

	.token-input::placeholder {
		color: var(--color-fg-muted);
	}

	.token-input:focus {
		outline: none;
		border-color: var(--color-info);
		box-shadow: 0 0 0 4px var(--color-info-muted);
	}

	.token-input:focus-visible {
		outline: none;
	}

	.verify-button {
		width: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-sm);
		background: var(--color-info);
		border: 1px solid var(--color-info);
		border-radius: 999px;
		color: #ffffff;
		font-size: var(--text-body-sm);
		font-weight: var(--font-medium);
		box-shadow: 0 8px 18px rgba(20, 110, 245, 0.16);
		cursor: pointer;
		transition:
			transform var(--duration-micro) var(--ease-standard),
			background-color var(--duration-micro) var(--ease-standard);
	}

	.verify-button:hover:not(:disabled) {
		background: #0055d4;
		transform: translateY(-1px);
	}

	.verify-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.verify-button--secondary {
		background: var(--color-bg-surface);
		color: var(--color-info);
		text-decoration: none;
	}

	.verify-button--secondary:hover {
		background: var(--color-info-muted);
		color: #0055d4;
	}

	@media (max-width: 640px) {
		.container {
			align-items: flex-start;
			padding: var(--space-md);
		}

		.verify-card {
			margin: auto 0;
			padding: var(--space-md);
			border-radius: var(--radius-lg);
		}

		h1 {
			font-size: var(--text-h3);
		}

		.token-input,
		.verify-button {
			min-height: 2.75rem;
		}
	}
</style>
