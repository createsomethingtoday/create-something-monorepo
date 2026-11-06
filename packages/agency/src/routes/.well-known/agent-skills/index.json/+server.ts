import type { RequestHandler } from './$types';

const publicDiscoverySkill = {
	name: 'create-something-public-discovery',
	type: 'skill-md',
	description:
		'Discover CREATE SOMETHING public services and request bounded workflow mapping without attempting unapproved execution.',
	url: 'https://createsomething.agency/agent-skills/create-something-public-discovery/SKILL.md',
	digest: 'sha256:f120272b7667f5aaae1b46db91f2d7b6867d1c47c44f6d9ea742aefbffa64a9e'
} as const;

/** Agent Skills Discovery RFC v0.2.0 index for source-controlled public skills. */
export const GET: RequestHandler = async () =>
	Response.json(
		{
			$schema: 'https://schemas.agentskills.io/discovery/0.2.0/schema.json',
			skills: [publicDiscoverySkill, {
				name: 'create-something-agent-inquiry',
				type: 'skill-md',
				description: 'Evaluate public offers and prepare an inquiry for explicit visitor approval before contact submission.',
				url: 'https://createsomething.agency/agent-skills/create-something-agent-inquiry/SKILL.md',
				digest: 'sha256:9bb744b3b36a87368ff2107d4e0f986a23126438a7cec7a5309cc853e8663cd4'
			}]
		},
		{
			headers: { 'cache-control': 'public, max-age=300' }
		}
	);
