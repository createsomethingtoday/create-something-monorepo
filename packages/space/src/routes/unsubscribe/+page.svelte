<script lang="ts">
	import { SEO } from '@create-something/canon';
	import { UnsubscribePage } from '@create-something/canon/newsletter';

	interface Props {
		data: {
			success: boolean;
			error: string | null;
			email: string | null;
		};
	}

	let { data }: Props = $props();
</script>

<SEO
	title="Unsubscribe"
	description="Unsubscribe from CREATE SOMETHING SPACE newsletter"
	propertyName="space"
	noindex={true}
/>

<UnsubscribePage {data} property="space" />
