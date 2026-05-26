import type { DeliveryArtifact, DeliveryLayer } from './abundance';

export type RunbookCommand = {
	label: string;
	description: string;
	command: string;
};

export type AccessLane = {
	label: string;
	owner: string;
	scope: string;
	action: string;
};

export type DeliveryPackageItem = {
	label: string;
	audience: string;
	deliverable: string;
	how: string;
};

export const shivworksDeliverySummary = {
	client: 'ShivWorks',
	owner: 'CREATE SOMETHING',
	phase: 'Developer access / backend handoff',
	headline: 'ShivWorks Network access runbook.',
	description:
		'This is the handoff artifact for the PM to forward to the technical owner or developer. Access can be granted now to any named ShivWorks recipient who needs to take ownership of the backend, secrets, CLI workflow, or database operations.'
};

export const shivworksDeliveryPackage: DeliveryPackageItem[] = [
	{
		label: 'Runbook URL',
		audience: 'PM and ShivWorks lead',
		deliverable:
			'This delivery page is the shareable source of truth for the backend handoff. The PM does not need to run the commands.',
		how:
			'Send the page URL to the developer or technical owner who will take over the repo, secrets, and database workflow.'
	},
	{
		label: 'Developer identity',
		audience: 'PM and backend developer',
		deliverable:
			'The receiving developer needs a name, email, GitHub username, and Infisical account identity before access can be granted.',
		how:
			'Collect those identities in one thread, then grant access through GitHub, Infisical, Cloudflare, and app admin as needed for that recipient.'
	},
	{
		label: 'Repository access',
		audience: 'Backend developer',
		deliverable:
			'Contributor access to createsomethingtoday/shivworks-network, which is the standalone application repository.',
		how:
			'Invite the developer through the CREATE SOMETHING GitHub organization with the minimum role needed for active work.'
	},
	{
		label: 'Secret access',
		audience: 'Backend developer',
		deliverable:
			'Infisical access for development secrets and the names of any production secrets that exist. Secret values are not sent in chat.',
		how:
			'Grant dev environment access in Infisical first. Add production access only for the named person taking production responsibility.'
	},
	{
		label: 'Database path',
		audience: 'Technical owner',
		deliverable:
			'CLI ownership of the ShivWorks data path through Cloudflare D1 and the repo scripts when the developer needs to inspect, query, migrate, or update data.',
		how:
			'Grant Cloudflare D1 access to the named technical owner. They use Wrangler plus the repo commands for direct database work.'
	},
	{
		label: 'CREATE SOMETHING boundary',
		audience: 'PM and technical owner',
		deliverable:
			'No access to the CREATE SOMETHING monorepo, agency site, or internal operating stack is required for the ShivWorks handoff.',
		how:
			'Grant only ShivWorks-specific surfaces. For zero long-term crossover, transfer the repo, Cloudflare project, Infisical project, and vendor accounts into ShivWorks-owned accounts.'
	},
	{
		label: 'Acceptance check',
		audience: 'Developer and PM',
		deliverable:
			'Confirmation that the developer can clone the repo, inject dev secrets, run the app, and run the validation commands.',
		how:
			'The developer sends back pass/fail evidence. The PM can mark the handoff accepted once the technical recipient confirms setup.'
	}
];

export const shivworksArtifactLinks: DeliveryArtifact[] = [
	{
		label: 'ShivWorks Network repo',
		href: 'https://github.com/createsomethingtoday/shivworks-network',
		meta: 'Main GitHub repository',
		visibility: 'client-safe'
	},
	{
		label: 'Production member network',
		href: 'https://network.shivworks.com',
		meta: 'Cloudflare Pages app',
		visibility: 'client-safe'
	},
	{
		label: 'Pages fallback URL',
		href: 'https://shivworks-network.pages.dev',
		meta: 'Cloudflare Pages generated domain',
		visibility: 'client-safe'
	},
	{
		label: 'Infisical secret vault',
		meta: 'Secret delivery path; values not published here',
		visibility: 'private-reference'
	},
	{
		label: 'Cloudflare D1 database',
		meta: 'shivworks-network-db via Wrangler',
		visibility: 'private-reference'
	}
];

export const shivworksOperatingLayers: DeliveryLayer[] = [
	{
		tier: 'Database',
		title: 'Cloudflare D1',
		status: 'Live',
		body:
			'Production member, entitlement, session, course, event, media, and progress data lives in the Cloudflare D1 database named shivworks-network-db. With Cloudflare access, the named developer can own read, write, migration, and repair work through Wrangler and the repo CLI.'
	},
	{
		tier: 'Automation',
		title: 'CLI and runtime access',
		status: 'Ready to provision',
		body:
			'Developers use the standalone GitHub repo, Infisical-injected environment variables, Wrangler login for Cloudflare operations, and repo scripts for checks, tests, migrations, and guarded D1 queries.'
	},
	{
		tier: 'Judgment',
		title: 'Access boundary',
		status: 'Ready for named recipient',
		body:
			'Access can be granted now to whichever developer or technical owner ShivWorks names. GitHub, Infisical, Cloudflare, and app admin access are still separate grants so ownership stays clear.'
	}
];

export const shivworksAccessLanes: AccessLane[] = [
	{
		label: 'GitHub',
		owner: 'CREATE SOMETHING GitHub org',
		scope: 'Contributor access to createsomethingtoday/shivworks-network',
		action: 'Invite the developer with the minimum role needed for active backend work.'
	},
	{
		label: 'Infisical',
		owner: 'CREATE SOMETHING / ShivWorks secret vault',
		scope: 'dev path for normal development; prod only by exception',
		action: 'Share secret names and environment access through Infisical, never in chat or repo files.'
	},
	{
		label: 'Cloudflare',
		owner: 'Create Something Cloudflare account',
		scope: 'Pages, D1, Stream, and direct database CLI operations when backend production work requires it',
		action:
			'Grant named-user access for the handoff recipient so D1 data work is attributable. Use scoped API tokens only for non-interactive automation.'
	},
	{
		label: 'App Admin',
		owner: 'ShivWorks product admin',
		scope: 'Admin role inside the members table',
		action: 'After the person signs in through Clerk, set their member role to admin in D1 when they need product admin access.'
	}
];

export const shivworksRunbookCommands: RunbookCommand[] = [
	{
		label: 'Local setup',
		description: 'Clone the standalone repo and start the app with dev secrets injected by Infisical.',
		command:
			'git clone https://github.com/createsomethingtoday/shivworks-network.git\ncd shivworks-network\npnpm install\ninfisical login\ninfisical init\ninfisical run --env=dev --path=/ -- pnpm dev'
	},
	{
		label: 'Validation',
		description: 'Run the package checks with the same dev secret context.',
		command:
			'infisical run --env=dev --path=/ -- pnpm check\ninfisical run --env=dev --path=/ -- pnpm test'
	},
	{
		label: 'D1 read check',
		description:
			'Use after Cloudflare access is granted to confirm the named recipient can reach the production D1 database.',
		command:
			'wrangler login\n\nCLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \\\npnpm db:shell "SELECT name FROM sqlite_master WHERE type=\'table\';"'
	},
	{
		label: 'D1 ownership path',
		description:
			'Use the repo migration and database scripts for intentional data ownership work. Production writes should be named and logged.',
		command:
			'pnpm migrate:list\npnpm migrate\n\nCLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \\\npnpm db:shell "SELECT COUNT(*) FROM members;"'
	}
];

export const shivworksPrivateArtifacts = [
	'Credential values stay in Infisical and Cloudflare secrets. The delivery page publishes secret names and ownership boundaries only.',
	'Production D1 contains member, entitlement, session, admin, VIP, media, and progress data. The named technical owner can be granted CLI ownership for data work as needed.',
	'Clerk, Stripe, Resend, Circle, and Cloudflare Stream credentials are runtime secrets, not GitHub artifacts or frontend handoff notes.',
	'The ShivWorks developer does not need CREATE SOMETHING monorepo, agency-site, or internal operating-stack access.',
	'If ShivWorks wants no CREATE SOMETHING account dependency long term, move the repo, Cloudflare project, Infisical project, and vendor accounts into ShivWorks-owned accounts.',
	'Replit/front-end management is outside this developer runbook. The PM owns that workflow.'
];

export const shivworksNextReview = [
	'Collect the recipient name, email, GitHub username, Infisical identity, and Cloudflare account email if Cloudflare access is needed.',
	'Invite the named recipient to createsomethingtoday/shivworks-network.',
	'Grant Infisical dev access for the ShivWorks project/path and confirm they can run the app locally.',
	'Grant Cloudflare access to the named production owner if they will own D1 data, Pages, or Stream operations.',
	'Choose scoped CREATE SOMETHING-managed access for now or transfer the ShivWorks surfaces into ShivWorks-owned accounts for full separation.',
	'When app admin access is needed, have the user sign in and then set their D1 member role to admin.'
];
