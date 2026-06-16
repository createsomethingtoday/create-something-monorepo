// Engagement content lives in the canon workflow context — see
// ./abundance-context.ts and docs/DELIVERY_SURFACE_SPEC.md. This module keeps
// only the Dify job-agent panel prompts, which belong to the embedded live
// jobs feature rather than the delivery context.

export const abundanceJobAgentPrompts = [
	'Show current public nursing jobs.',
	'Search for travel nurse roles.',
	'Find med surg roles with the strongest matches.',
	'What confirmation is needed before sending a job to the funnel?'
];
