import type { RequestHandler } from './$types';

const publicDiscoverySkill = {
	name: 'create-something-public-discovery',
	type: 'skill-md',
	description:
		'Discover CREATE SOMETHING public services and request bounded workflow mapping without attempting unapproved execution.',
	url: 'https://createsomething.agency/agent-skills/create-something-public-discovery/SKILL.md',
	digest: 'sha256:1d4d71005e1fadb3c5df015e74c041ec1818a7220d2ca65625f1ddabefa7ce7c'
} as const;

/** Agent Skills Discovery RFC v0.2.0 index for source-controlled public skills. */
export const GET: RequestHandler = async () =>
	Response.json(
		{
			$schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
			skills: [publicDiscoverySkill]
		},
		{
			headers: { 'cache-control': 'public, max-age=300' }
		}
	);
