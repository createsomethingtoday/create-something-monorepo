<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AccountPage } from '@create-something/canon/auth/components';
	import { UserInteractionsPanel } from '@create-something/canon/analytics';

	let { data } = $props();
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING SPACE account"
	propertyName="space"
	noindex={true}
/>

<AccountPage
	user={data.user}
	pageTitle="Account | CREATE SOMETHING SPACE"
	currentProperty="space"
>
	{#snippet analytics()}
		<UserInteractionsPanel
			analytics={data.analytics}
			optedOut={data.user?.analytics_opt_out ?? false}
		/>
	{/snippet}
</AccountPage>
