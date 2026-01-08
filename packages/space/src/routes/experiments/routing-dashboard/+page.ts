import type { PageLoad } from './$types';
import experiments from '$lib/data/routing-experiments.json';

interface RoutingExperiment {
	id: string;
	timestamp: number;
	taskId: string;
	description: string;
	modelUsed: 'opus' | 'haiku' | 'sonnet';
	routingStrategy: string;
	routingConfidence: number;
	success: boolean;
	cost: number;
	notes: string;
}

export const load: PageLoad = async () => {
	return {
		success: true,
		data: experiments as RoutingExperiment[],
		count: experiments.length,
		error: undefined
	};
};
