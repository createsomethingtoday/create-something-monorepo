<script lang="ts">
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import { Header } from '$lib/components';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	let isProfileOpen = $state(false);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let EditProfileModal = $state<any>(null);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/login';
	}

	async function handleProfileClick() {
		if (!EditProfileModal) {
			const module = await import('$lib/components/EditProfileModal.svelte');
			EditProfileModal = module.default;
		}
		isProfileOpen = true;
	}
</script>

<Header
	onLogout={handleLogout}
	onProfileClick={handleProfileClick}
	showMarketplace={data.hasTemplateAsset}
/>

{@render children()}

{#if isProfileOpen && EditProfileModal}
	{@const ProfileModal = EditProfileModal}
	<ProfileModal onClose={() => (isProfileOpen = false)} />
{/if}
