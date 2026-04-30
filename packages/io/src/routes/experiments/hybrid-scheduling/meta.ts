import type { ExperimentMeta } from '../types';

export const meta: ExperimentMeta = {
	slug: 'hybrid-scheduling',
	title: 'Hybrid Scheduling: Modal + Cloudflare',
	subtitle: 'Separate lightweight scheduling from heavyweight compute',
	description:
		'An architecture experiment showing how Cloudflare Workers cron triggers can schedule Modal compute jobs without coupling orchestration to execution.',
	category: 'methodology',
	readingTime: 10,
	difficulty: 'intermediate',
	date: '2026-01-10',
	keywords: [
		'Cloudflare Workers',
		'Modal',
		'Cron Triggers',
		'Serverless Architecture',
		'Automation'
	]
};
