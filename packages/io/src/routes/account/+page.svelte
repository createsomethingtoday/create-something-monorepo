<script lang="ts">
	import { AccountPage } from '@create-something/components/auth/components';

	let { data } = $props();
</script>

<AccountPage
	user={data.user}
	pageTitle="Account | CREATE SOMETHING"
	currentProperty="io"
	logoutEndpoint="/api/public/auth/logout"
/>
