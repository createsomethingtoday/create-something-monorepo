<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Clipboard,
		ExternalLink,
		KeyRound,
		LogOut,
		Phone,
		QrCode,
		Search,
		Trash2
	} from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	type Contact = PageData['contacts'][number];

	let contacts = $state<Contact[]>([...data.contacts]);
	let query = $state('');
	let copiedKey = $state<string | null>(null);
	let deletingId = $state<string | null>(null);
	let error = $state<string | null>(null);

	const filteredContacts = $derived(
		query.trim()
			? contacts.filter((contact) => {
					const search = query.trim().toLowerCase();
					return (
						contact.name.toLowerCase().includes(search) ||
						contact.dob.includes(search) ||
						contact.phone.includes(search) ||
						(contact.insurance_group ?? '').toLowerCase().includes(search)
					);
				})
			: contacts
	);

	function formatDate(value: string): string {
		const parsed = new Date(value);
		if (Number.isNaN(parsed.getTime())) return value;
		return parsed.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	async function copy(value: string, key: string) {
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			const textarea = document.createElement('textarea');
			textarea.value = value;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand('copy');
			document.body.removeChild(textarea);
		}

		copiedKey = key;
		setTimeout(() => {
			if (copiedKey === key) copiedKey = null;
		}, 1500);
	}

	async function removeContact(contact: Contact) {
		if (!confirm(`Delete ${contact.name}?`)) return;
		deletingId = contact.id;
		error = null;

		try {
			const response = await fetch(`/api/contacts/${contact.id}`, { method: 'DELETE' });
			if (!response.ok) {
				const result = (await response.json()) as { error?: string };
				error = result.error || 'Delete failed.';
				return;
			}
			contacts = contacts.filter((row) => row.id !== contact.id);
		} catch {
			error = 'Delete failed.';
		} finally {
			deletingId = null;
		}
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await invalidateAll();
		goto('/admin');
	}
</script>

<svelte:head>
	<title>Admin Contacts | J AND J HOME HEALTH</title>
</svelte:head>

<main class="admin-shell">
	<header class="admin-header">
		<div>
			<p class="eyebrow">J and J Home Health</p>
			<h1>Contacts</h1>
			<p>{contacts.length} total</p>
		</div>
		<nav class="admin-actions" aria-label="Admin navigation">
			<a href={data.formUrl} target="_blank" rel="noreferrer" title="Open public form">
				<ExternalLink size={18} aria-hidden="true" />
				<span>Form</span>
			</a>
			<a href="/admin/qr" title="Open QR code">
				<QrCode size={18} aria-hidden="true" />
				<span>QR</span>
			</a>
			<a href="/admin/settings" title="Manage password">
				<KeyRound size={18} aria-hidden="true" />
				<span>Password</span>
			</a>
			<button type="button" onclick={logout} title="Logout">
				<LogOut size={18} aria-hidden="true" />
				<span>Logout</span>
			</button>
		</nav>
	</header>

	<section class="toolbar" aria-label="Search contacts">
		<Search size={18} aria-hidden="true" />
		<input type="search" bind:value={query} placeholder="Search contacts" />
	</section>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if contacts.length === 0}
		<p class="empty">No contacts yet.</p>
	{:else if filteredContacts.length === 0}
		<p class="empty">No matches for "{query}".</p>
	{:else}
		<ul class="contact-list">
			{#each filteredContacts as contact (contact.id)}
				<li class="contact-card">
					<div class="contact-heading">
						<h2>{contact.name}</h2>
						<time datetime={contact.created_at}>{formatDate(contact.created_at)}</time>
					</div>

					<div class="field-row">
						<div>
							<span>Date of Birth</span>
							<strong>{contact.dob}</strong>
						</div>
						<button
							type="button"
							aria-label="Copy date of birth"
							title="Copy date of birth"
							onclick={() => copy(contact.dob, `dob-${contact.id}`)}
						>
							<Clipboard size={16} aria-hidden="true" />
							{copiedKey === `dob-${contact.id}` ? 'Copied' : 'Copy'}
						</button>
					</div>

					<div class="field-row">
						<a href={`tel:${contact.phone}`} class="field-link">
							<Phone size={16} aria-hidden="true" />
							<div>
								<span>Phone</span>
								<strong>{contact.phone}</strong>
							</div>
						</a>
						<button
							type="button"
							aria-label="Copy phone"
							title="Copy phone"
							onclick={() => copy(contact.phone, `phone-${contact.id}`)}
						>
							<Clipboard size={16} aria-hidden="true" />
							{copiedKey === `phone-${contact.id}` ? 'Copied' : 'Copy'}
						</button>
					</div>

					{#if contact.insurance_group}
						<div class="field-row">
							<div>
								<span>Insurance Group</span>
								<strong>{contact.insurance_group}</strong>
							</div>
							<button
								type="button"
								aria-label="Copy insurance group"
								title="Copy insurance group"
								onclick={() => copy(contact.insurance_group ?? '', `insurance-${contact.id}`)}
							>
								<Clipboard size={16} aria-hidden="true" />
								{copiedKey === `insurance-${contact.id}` ? 'Copied' : 'Copy'}
							</button>
						</div>
					{/if}

					<button
						class="danger-action"
						type="button"
						onclick={() => removeContact(contact)}
						disabled={deletingId === contact.id}
					>
						<Trash2 size={16} aria-hidden="true" />
						{deletingId === contact.id ? 'Deleting...' : 'Delete'}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</main>
