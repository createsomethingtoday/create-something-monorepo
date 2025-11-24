<script lang="ts">
	import { page } from '$app/stores';
	import { ArrowRight } from 'lucide-svelte';

	let email = '';
	let submitted = false;
	let error = '';

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		try {
			const response = await fetch('/api/newsletter', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to subscribe');
			}

			submitted = true;
			email = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		}
	}
</script>

<svelte:head>
	<title>{$page.status} | CREATE SOMETHING.io</title>
</svelte:head>

<div class="min-h-screen bg-black text-white flex items-center justify-center px-6">
	<div class="max-w-2xl w-full text-center">
		<!-- Error Code -->
		<h1 class="text-8xl md:text-9xl font-bold mb-4 text-white/90">{$page.status}</h1>

		<!-- Error Message -->
		<h2 class="text-2xl md:text-3xl font-medium mb-6 text-white/80">
			{$page.error?.message || 'Not Found'}
		</h2>

		<!-- Description -->
		<p class="text-white/60 mb-12 max-w-md mx-auto">
			{#if $page.status === 404}
				The page you're looking for doesn't exist. Maybe it was moved, or maybe it never existed.
			{:else if $page.status === 500}
				Something went wrong on our end. We've been notified and are looking into it.
			{:else}
				An unexpected error occurred.
			{/if}
		</p>

		<!-- Action Buttons -->
		<div class="flex gap-4 justify-center mb-16">
			<a
				href="/"
				class="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors"
			>
				Go Home
			</a>
			<a
				href="/experiments"
				class="px-6 py-3 bg-white/10 border border-white/20 font-medium rounded-lg hover:bg-white/20 transition-colors"
			>
				View Experiments
			</a>
		</div>

		<!-- Newsletter Signup -->
		<div
			class="pt-12 border-t border-white/10 max-w-xl mx-auto"
		>
			<h3 class="text-xl font-bold mb-3">Stay updated with new experiments</h3>
			<p class="text-white/60 text-sm mb-6">
				Get notified when new research is published. Real metrics, tracked experiments, honest
				learnings.
			</p>

			{#if submitted}
				<div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
					<p class="text-green-400 font-medium">Thanks for subscribing!</p>
				</div>
			{:else}
				<form on:submit={handleSubmit} class="flex gap-3">
					<input
						type="email"
						bind:value={email}
						placeholder="Enter your email address"
						required
						class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-white/40"
					/>
					<button
						type="submit"
						class="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap inline-flex items-center gap-2"
					>
						Subscribe
						<ArrowRight class="w-4 h-4" />
					</button>
				</form>

				{#if error}
					<p class="text-red-400 text-sm mt-3">{error}</p>
				{/if}
			{/if}
		</div>
	</div>
</div>
