<script lang="ts">
	import { SEO } from '@create-something/components';
	import { AccountPage } from '@create-something/components/auth/components';
	import { UserInteractionsPanel } from '@create-something/components/analytics';

	let { data } = $props();
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING account"
	propertyName="ltd"
	noindex={true}
/>

<AccountPage
	user={data.user}
	pageTitle="Account | CREATE SOMETHING"
	currentProperty="ltd"
>
	{#snippet analytics()}
		<UserInteractionsPanel
			analytics={data.analytics}
			optedOut={data.user?.analytics_opt_out ?? false}
		/>
	{/snippet}
</AccountPage>
