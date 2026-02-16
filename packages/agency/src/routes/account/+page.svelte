<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AccountPage } from '@create-something/canon/auth/components';

	let { data } = $props();
	type AccountUser = { email?: string; name?: string; tier?: string } | null;
	const accountUser = $derived(data.user as AccountUser);
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING AGENCY account"
	propertyName="agency"
	noindex={true}
/>

<AccountPage
	user={accountUser}
	pageTitle="Account | CREATE SOMETHING AGENCY"
	currentProperty="agency"
/>
