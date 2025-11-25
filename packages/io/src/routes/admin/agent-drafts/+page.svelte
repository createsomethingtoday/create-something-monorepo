<script lang="ts">
	/**
	 * PM Agent Draft Review Interface
	 *
	 * Allows human reviewers to:
	 * - View pending drafts
	 * - See agent's reasoning
	 * - Approve or reject drafts
	 * - View escalations
	 * - Track metrics
	 */

	import { onMount } from 'svelte';

	interface Draft {
		contact_id: number;
		to_email: string;
		to_name: string;
		subject: string;
		body: string;
		reasoning: string;
		created_at: string;
		status: string;
	}

	interface ContactSubmission {
		id: number;
		name: string;
		email: string;
		message: string;
		submitted_at: string;
		status: string;
	}

	interface ContactWithDraft {
		contact: ContactSubmission;
		draft?: Draft;
		escalation?: any;
	}

	let contacts: ContactWithDraft[] = [];
	let loading = true;
	let error = '';
	let metrics = {
		approval_rate: 0,
		total_decisions: 0,
		escalation_rate: 0
	};

	onMount(async () => {
		await loadPendingReviews();
		await loadMetrics();
	});

	async function loadPendingReviews() {
		loading = true;
		error = '';

		try {
			// Get all contacts that need review (in_progress or escalated)
			const response = await fetch('/api/admin/agent-reviews');
			const data = await response.json();

			if (data.success) {
				contacts = data.contacts;
			} else {
				error = data.error || 'Failed to load reviews';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error loading reviews';
		} finally {
			loading = false;
		}
	}

	async function loadMetrics() {
		try {
			const response = await fetch('/api/admin/agent-metrics');
			const data = await response.json();

			if (data.success) {
				metrics = data.metrics;
			}
		} catch (err) {
			console.error('Failed to load metrics:', err);
		}
	}

	async function approveDraft(contactId: number) {
		try {
			const response = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'approve_draft',
					contact_id: contactId,
					approved: true
				})
			});

			const data = await response.json();

			if (data.success) {
				alert('Draft approved! Remember to actually send the email.');
				await loadPendingReviews();
				await loadMetrics();
			} else {
				alert(`Error: ${data.error || 'Failed to approve draft'}`);
			}
		} catch (err) {
			alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	async function rejectDraft(contactId: number) {
		try {
			const response = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action: 'approve_draft',
					contact_id: contactId,
					approved: false
				})
			});

			const data = await response.json();

			if (data.success) {
				alert('Draft rejected. You can manually respond to this contact.');
				await loadPendingReviews();
				await loadMetrics();
			} else {
				alert(`Error: ${data.error || 'Failed to reject draft'}`);
			}
		} catch (err) {
			alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	async function triggerTriage() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/agent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'triage' })
			});

			const data = await response.json();

			if (data.success) {
				alert('Triage completed! Check results below.');
				await loadPendingReviews();
			} else {
				error = data.error || 'Triage failed';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error during triage';
		} finally {
			loading = false;
		}
	}

	function formatDate(isoString: string): string {
		return new Date(isoString).toLocaleString();
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<header class="mb-8">
		<h1 class="text-3xl font-bold mb-2">PM Agent Draft Review</h1>
		<p class="text-gray-600">Experiment #3: AI PM Agent</p>
	</header>

	<!-- Metrics -->
	<div class="grid grid-cols-3 gap-4 mb-8">
		<div class="bg-white p-6 rounded-lg shadow">
			<div class="text-2xl font-bold text-blue-600">{metrics.approval_rate.toFixed(1)}%</div>
			<div class="text-sm text-gray-600">Approval Rate</div>
			<div class="text-xs text-gray-400 mt-1">{metrics.total_decisions} total decisions</div>
		</div>

		<div class="bg-white p-6 rounded-lg shadow">
			<div class="text-2xl font-bold text-orange-600">{metrics.escalation_rate.toFixed(1)}%</div>
			<div class="text-sm text-gray-600">Escalation Rate</div>
		</div>

		<div class="bg-white p-6 rounded-lg shadow">
			<div class="text-2xl font-bold text-green-600">{contacts.length}</div>
			<div class="text-sm text-gray-600">Pending Reviews</div>
		</div>
	</div>

	<!-- Actions -->
	<div class="mb-8 flex gap-4">
		<button
			on:click={triggerTriage}
			disabled={loading}
			class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
		>
			{loading ? 'Processing...' : 'Trigger Triage (Process New Submissions)'}
		</button>

		<button
			on:click={loadPendingReviews}
			disabled={loading}
			class="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400"
		>
			Refresh
		</button>
	</div>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
			{error}
		</div>
	{/if}

	<!-- Pending Reviews -->
	{#if loading}
		<div class="text-center py-12 text-gray-500">Loading reviews...</div>
	{:else if contacts.length === 0}
		<div class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
			<p class="text-lg mb-2">No pending reviews</p>
			<p class="text-sm">Trigger triage to process new contact submissions</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each contacts as { contact, draft, escalation }}
				<div class="bg-white rounded-lg shadow-lg overflow-hidden">
					<!-- Contact Info Header -->
					<div class="bg-gray-50 px-6 py-4 border-b">
						<div class="flex justify-between items-start">
							<div>
								<h3 class="text-lg font-bold">{contact.name}</h3>
								<p class="text-sm text-gray-600">{contact.email}</p>
								<p class="text-xs text-gray-500">
									Submitted: {formatDate(contact.submitted_at)}
								</p>
							</div>
							<div class="text-right">
								<span
									class="inline-block px-3 py-1 rounded-full text-sm font-medium"
									class:bg-yellow-100={contact.status === 'in_progress'}
									class:text-yellow-800={contact.status === 'in_progress'}
									class:bg-red-100={contact.status === 'escalated'}
									class:text-red-800={contact.status === 'escalated'}
								>
									{contact.status}
								</span>
							</div>
						</div>
					</div>

					<!-- Original Message -->
					<div class="px-6 py-4 bg-gray-50 border-b">
						<h4 class="text-sm font-semibold text-gray-700 mb-2">Original Inquiry:</h4>
						<p class="text-gray-800 whitespace-pre-wrap">{contact.message}</p>
					</div>

					{#if draft}
						<!-- Agent Draft -->
						<div class="px-6 py-4">
							<h4 class="text-sm font-semibold text-gray-700 mb-2">Agent's Draft Response:</h4>

							<div class="mb-4 p-4 bg-blue-50 rounded">
								<p class="text-xs text-gray-600 mb-1"><strong>To:</strong> {draft.to_email}</p>
								<p class="text-xs text-gray-600 mb-2"><strong>Subject:</strong> {draft.subject}</p>
								<div class="prose prose-sm max-w-none">
									<pre class="whitespace-pre-wrap text-sm">{draft.body}</pre>
								</div>
							</div>

							<div class="mb-4 p-4 bg-yellow-50 rounded">
								<h5 class="text-xs font-semibold text-gray-700 mb-1">Agent's Reasoning:</h5>
								<p class="text-sm text-gray-700">{draft.reasoning}</p>
							</div>

							<div class="flex gap-3">
								<button
									on:click={() => approveDraft(contact.id)}
									class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
								>
									✓ Approve & Send
								</button>
								<button
									on:click={() => rejectDraft(contact.id)}
									class="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
								>
									✗ Reject (Handle Manually)
								</button>
							</div>
						</div>
					{:else if escalation}
						<!-- Escalation -->
						<div class="px-6 py-4">
							<h4 class="text-sm font-semibold text-red-700 mb-2">Escalated to Human:</h4>

							<div class="p-4 bg-red-50 rounded">
								<p class="text-sm mb-2">
									<strong>Reason:</strong>
									{escalation.reason}
								</p>
								<p class="text-sm mb-2">
									<strong>Context:</strong>
									{escalation.context}
								</p>
								<p class="text-xs text-gray-600">
									<strong>Urgency:</strong>
									<span
										class="inline-block px-2 py-1 rounded text-xs"
										class:bg-yellow-200={escalation.urgency === 'medium'}
										class:bg-red-200={escalation.urgency === 'high'}
										class:bg-gray-200={escalation.urgency === 'low'}
									>
										{escalation.urgency}
									</span>
								</p>
							</div>

							<p class="text-sm text-gray-600 mt-4">
								This inquiry requires human attention. Handle manually.
							</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.prose pre {
		background: transparent;
		padding: 0;
		margin: 0;
		border: none;
	}
</style>
