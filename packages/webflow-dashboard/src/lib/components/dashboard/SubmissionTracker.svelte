<script lang="ts">
	import Badge from '$lib/components/ui/badge.svelte';

	interface Props {
		submissionsThisMonth: number;
		submissionLimit?: number;
	}

	let { submissionsThisMonth, submissionLimit = 10 }: Props = $props();

	const isOverLimit = $derived(submissionsThisMonth >= submissionLimit);
	const variant = $derived(isOverLimit ? 'error' : 'success');
</script>

<Badge {variant}>
	{submissionsThisMonth}/{submissionLimit} this month
</Badge>
