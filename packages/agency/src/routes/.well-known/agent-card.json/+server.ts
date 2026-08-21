import type { RequestHandler } from './$types';

const publicWorkflowMapAgentCard = {
	name: 'CREATE SOMETHING Workflow Map Agent',
	description:
		'Creates bounded workflow-map artifacts and preserves explicit approval, payment, and external-write boundaries.',
	version: '1.0.0',
	supportedInterfaces: [
		{
			url: 'https://createsomething.agency/a2a',
			protocolBinding: 'JSONRPC',
			protocolVersion: '1.0'
		}
	],
	provider: {
		organization: 'CREATE SOMETHING',
		url: 'https://createsomething.agency'
	},
	capabilities: { streaming: false, pushNotifications: false },
	defaultInputModes: ['text/plain'],
	defaultOutputModes: ['text/plain', 'application/json'],
	skills: [
		{
			id: 'bounded-workflow-mapping',
			name: 'Bounded workflow mapping',
			description:
				'Maps an operating workflow and identifies data, automation, judgment, approval, and receipt boundaries.',
			tags: ['workflow', 'mapping', 'governance'],
			examples: ['Map our qualified-lead handoff and show where human approval belongs.']
		}
	]
} as const;

export const GET: RequestHandler = async () =>
	Response.json(publicWorkflowMapAgentCard, {
		headers: {
			'access-control-allow-origin': '*',
			'cache-control': 'public, max-age=300'
		}
	});
