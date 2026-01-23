<script lang="ts">
	import { SEO } from '@create-something/components';
	import { UnsubscribePage } from '@create-something/components/newsletter';

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
	description="Unsubscribe from CREATE SOMETHING newsletter"
	propertyName="io"
	noindex={true}
/>

<UnsubscribePage {data} property="io" />
