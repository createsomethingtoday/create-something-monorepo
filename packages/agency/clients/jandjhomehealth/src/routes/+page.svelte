<script lang="ts">
	import { CheckCircle, Loader2 } from 'lucide-svelte';

	let name = $state('');
	let dob = $state('');
	let phone = $state('');
	let insuranceGroup = $state('');
	let error = $state<string | null>(null);
	let isSubmitting = $state(false);

	async function submit(event: Event) {
		event.preventDefault();
		error = null;
		isSubmitting = true;

		try {
			const response = await fetch('/api/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					dob,
					phone,
					insurance_group: insuranceGroup || null
				})
			});

			const result = (await response.json()) as { error?: string };
			if (!response.ok) {
				error = result.error || 'Submission failed.';
				return;
			}

			window.location.href = '/success';
		} catch {
			error = 'Submission failed.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>J AND J HOME HEALTH</title>
	<meta name="description" content="J and J Home Health assistance request form." />
</svelte:head>

<main class="public-shell">
	<section class="public-card">
		<p class="eyebrow">J and J Home Health</p>
		<h1>Assistance Request</h1>
		<p class="lede">Please complete the requested information.</p>

		<form class="form-stack" onsubmit={submit}>
			<label>
				<span>Name</span>
				<input
					type="text"
					bind:value={name}
					required
					autocomplete="name"
					placeholder="Enter first and last name"
				/>
			</label>

			<label>
				<span>Date of Birth</span>
				<input type="date" bind:value={dob} required autocomplete="bday" />
			</label>

			<label>
				<span>Phone</span>
				<input
					type="tel"
					bind:value={phone}
					required
					autocomplete="tel"
					placeholder="(555) 555-5555"
				/>
			</label>

			<label>
				<span>Insurance Group <small>(optional)</small></span>
				<input type="text" bind:value={insuranceGroup} placeholder="Medicaid" />
			</label>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<button class="primary-action" type="submit" disabled={isSubmitting}>
				{#if isSubmitting}
					<Loader2 size={18} class="spin" aria-hidden="true" />
					Sending...
				{:else}
					<CheckCircle size={18} aria-hidden="true" />
					Send
				{/if}
			</button>
		</form>
	</section>
</main>
