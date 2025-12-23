<script lang="ts">
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

<UnsubscribePage {data} property="io" />
