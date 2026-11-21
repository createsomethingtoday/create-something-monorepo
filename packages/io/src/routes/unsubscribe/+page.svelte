<script lang="ts">
  import '$lib/styles/newsletter-editorial.css';
  import '$lib/styles/newsletter-readers.css';
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
	description="Unsubscribe from CREATE SOMETHING newsletter"
	propertyName="io"
	noindex={true}
/>

<div class="newsletter-editorial newsletter-state unsubscribe-reader"><UnsubscribePage {data} property="io" /></div>
