<script lang="ts">
	import { SEO } from '@create-something/components';
	import { AccountPage } from '@create-something/components/auth/components';

	let { data } = $props();
</script>

<SEO
	title="Account"
	description="Manage your CREATE SOMETHING AGENCY account"
	propertyName="agency"
	noindex={true}
/>

<AccountPage
	user={data.user}
	pageTitle="Account | CREATE SOMETHING AGENCY"
	currentProperty="agency"
/>
