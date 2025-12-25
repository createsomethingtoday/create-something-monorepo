<script lang="ts">
	import { AccountPage } from '@create-something/components/auth/components';
	import { UserInteractionsPanel } from '@create-something/components/analytics';

	let { data } = $props();
</script>

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
