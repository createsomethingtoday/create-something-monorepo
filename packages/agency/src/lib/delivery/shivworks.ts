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

export const shivworksDeliverySummary = {
	client: 'ShivWorks',
	owner: 'CREATE SOMETHING',
	phase: 'Developer access / backend handoff',
	headline: 'ShivWorks Network access runbook.',
	description:
		'The ShivWorks team has a standalone backend repo, Cloudflare-hosted runtime, D1 database, Clerk/Stripe/Resend service boundary, Cloudflare Stream media path, and an Infisical-backed secret handoff for developer onboarding.'
};

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
			'Production member, entitlement, session, course, event, media, and progress data lives in the Cloudflare D1 database named shivworks-network-db. Local development falls back to SQLite unless a remote database is intentionally selected.'
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
		status: 'Approval-gated',
		body:
			'App admin access, production D1 access, and secret access are separate decisions. Most backend work should use dev Infisical secrets and local SQLite; production Cloudflare/D1 access should stay limited to named operational owners.'
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
		scope: 'Pages, D1, and Stream operations when backend production work requires it',
		action: 'Prefer personal Wrangler login. Use scoped API tokens only for non-interactive automation.'
	},
	{
		label: 'App Admin',
		owner: 'ShivWorks product admin',
		scope: 'Admin role inside the members table',
		action: 'After the person signs in through Clerk, set their member role to admin in D1 when product admin access is approved.'
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
		description: 'Use only after Cloudflare access is approved and Wrangler is logged into the correct account.',
		command:
			'wrangler login\n\nCLOUDFLARE_ACCOUNT_ID=9645bd52e640b8a4f40a3a55ff1dd75a \\\npnpm db:shell "SELECT name FROM sqlite_master WHERE type=\'table\';"'
	}
];

export const shivworksPrivateArtifacts = [
	'Credential values stay in Infisical and Cloudflare secrets. The delivery page publishes secret names and ownership boundaries only.',
	'Production D1 contains member, entitlement, session, admin, VIP, media, and progress data. Raw production access should be limited and intentional.',
	'Clerk, Stripe, Resend, Circle, and Cloudflare Stream credentials are runtime secrets, not GitHub artifacts or frontend handoff notes.',
	'Replit/front-end management is outside this developer runbook. The PM owns that workflow.'
];

export const shivworksNextReview = [
	'Confirm the developer GitHub invite for createsomethingtoday/shivworks-network.',
	'Grant Infisical dev access for the ShivWorks project/path and confirm they can run the app locally.',
	'Decide whether the developer needs Cloudflare access now or can stay on local/dev secrets for the first pass.',
	'Name the production D1 owner and decide whether any direct SQL work should start read-only.',
	'When app admin access is needed, have the user sign in and then set their D1 member role to admin.'
];
