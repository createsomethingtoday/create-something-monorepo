<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { AccountPage } from '@create-something/canon/auth/components';

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
