<script lang="ts">
	import type { Asset } from '$lib/types';
	import { Badge } from '$lib/components/ui';
	import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from 'lucide-svelte';

	interface Props {
		status: Asset['status'];
	}

	let { status }: Props = $props();

	const statusConfig: Record<Asset['status'], { variant: 'success' | 'warning' | 'error' | 'info' | 'default'; icon: typeof CheckCircle }> = {
		'Published': { variant: 'success', icon: CheckCircle },
		'Scheduled': { variant: 'info', icon: Clock },
		'Draft': { variant: 'default', icon: FileText },
		'Upcoming': { variant: 'info', icon: Clock },
		'Delisted': { variant: 'warning', icon: AlertCircle },
		'Rejected': { variant: 'error', icon: XCircle }
	};

	const config = $derived(statusConfig[status] || statusConfig['Draft']);
</script>

<Badge variant={config.variant}>
	<span class="status-content">
		<svelte:component this={config.icon} size={12} />
		{status}
	</span>
</Badge>

<style>
	.status-content {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
	}
</style>
