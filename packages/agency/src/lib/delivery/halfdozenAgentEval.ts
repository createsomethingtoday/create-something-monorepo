import type { DeliveryArtifact, DeliveryLayer } from './abundance';

export type EvalWorkflowStep = {
	label: string;
	title: string;
	body: string;
	status: string;
};

export const halfdozenAgentEvalSummary = {
	client: 'Half Dozen',
	owner: 'CREATE SOMETHING',
	phase: 'Automated eval workflow / delivery review',
	headline: 'Half Dozen agent eval workflow.',
	description:
		'Half Dozen now has a Notion-triggered external instruction-readiness eval path for agent drafts: Updating creates a versioned Test Reports item, appends final instructions and review evidence to the source page, moves passing drafts to Testing, and preserves the human runtime gate before validation.'
};

export const halfdozenAgentEvalArtifacts: DeliveryArtifact[] = [
	{
		label: 'Agent review webhook',
		href: 'https://halfdozen-agent-review-webhook.createsomething.workers.dev/webhook',
		meta: 'Cloudflare Worker health surface',
		visibility: 'client-safe'
	},
	{
		label: 'Implementation PR',
		href: 'https://github.com/createsomethingtoday/create-something-monorepo/pull/269',
		meta: 'Repo-backed source and review trail',
		visibility: 'private-reference'
	},
	{
		label: 'Dify eval import',
		meta: 'config/dify-agents/halfdozen-agent-builder-eval.dify.yml',
		visibility: 'private-reference'
	},
	{
		label: 'Test Reports [OS]',
		meta: 'Versioned Notion eval records',
		visibility: 'private-reference'
	},
	{
		label: 'Linear evidence lane',
		meta: 'Intake, build, and eval completion comments',
		visibility: 'private-reference'
	}
];

export const halfdozenAgentEvalWorkflow: EvalWorkflowStep[] = [
	{
		label: 'Trigger',
		title: 'Status changes to Updating',
		status: 'Live',
		body:
			'The Notion database automation sends selected agent properties and a source page URL to the Worker when a draft is intentionally moved into Updating.'
	},
	{
		label: 'Automation',
		title: 'Worker queues the long run',
		status: 'Deployed',
		body:
			'The Worker returns a fast 2xx to Notion, then Cloudflare Queues owns the Dify, Notion, and Linear writeback work outside the webhook request lifecycle.'
	},
	{
		label: 'Judgment',
		title: 'Dify reviews instructions',
		status: 'Bounded',
		body:
			'Dify reads the submitted instructions and returns structured JSON: result, review summary, recommended upgrades, final instructions, patch intent, checks, and caveats. It does not write to Notion or Linear.'
	},
	{
		label: 'Writeback',
		title: 'Worker applies the handoff',
		status: 'Versioned',
		body:
			'The Worker validates the Dify output with a deterministic rubric, creates a new Test Reports item, appends the eval handoff to the source page, and moves passing drafts to Testing.'
	},
	{
		label: 'Human gate',
		title: 'Team runs live Notion testing',
		status: 'Required',
		body:
			'Testing is not Validated. The team pastes only the prompt text from the Live Testing Handoff into the actual Notion agent and records pass/fail evidence before promotion.'
	}
];

export const halfdozenAgentEvalOperatingLayers: DeliveryLayer[] = [
	{
		tier: 'Database',
		title: 'Notion source and reports',
		status: 'Versioned',
		body:
			'AI Agents [HD] stays the source page for draft instructions, while Test Reports [OS] stores each eval as a new historical record. Linked Notion pages and databases are preserved as references instead of copied into long prompt blobs.'
	},
	{
		tier: 'Automation',
		title: 'Worker + Queue writeback',
		status: 'Production deployed',
		body:
			'The Cloudflare Worker accepts the Notion webhook, enqueues the long-running job, reuses or creates Linear follow-up issues, publishes Notion report evidence, and owns all status/page mutations.'
	},
	{
		tier: 'Judgment',
		title: 'External instruction eval',
		status: 'Ready for testing',
		body:
			'The Dify app is a separate reviewer for instruction quality. Its output is advisory until the Worker rubric and the live human Testing checklist both pass.'
	}
];

export const halfdozenAgentEvalPrivateArtifacts = [
	'Webhook secrets, Notion integration tokens, Dify Service API keys, and Linear tokens stay in Cloudflare secrets or Infisical. They are not published in this delivery page.',
	'Private Notion source pages, Test Reports records, and Linear comments are operational evidence, not public artifacts.',
	'The Dify import file is repo-owned so the app instructions can be rebuilt or re-imported without copying sensitive runtime keys.',
	'The Worker fallback runner is intentionally deterministic so the Notion handoff can complete even if Dify fails or times out.',
	'The eval is an instruction-readiness review. It does not prove that the live Notion agent runtime behaves correctly.'
];

export const halfdozenAgentEvalNextReview = [
	'Run one fresh post-deploy Updating transition and confirm the Linear receipt appears after the compact Dify contract deployment.',
	'Confirm whether the full original instructions now complete through Dify, or whether Dify still needs a smaller input contract for long pages.',
	'Inspect the new Test Reports item for final instructions, full review JSON, raw Dify response when available, and clear Live Testing Handoff paste boundaries.',
	'Have the Half Dozen team run the live Notion prompts before moving any agent from Testing to Validated or Active.',
	'After the final replay is clean, update this page from readiness review to completed delivery evidence.'
];
