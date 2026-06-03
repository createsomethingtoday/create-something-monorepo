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
	phase: 'Automated eval workflow / Testing handoff',
	headline: 'Half Dozen agent eval workflow.',
	description:
		'Half Dozen now has a Notion-triggered instruction-readiness eval path for agent drafts: Updating creates a versioned Test Reports item, appends final instructions and review evidence to the source page, moves passing drafts to Testing, and preserves the human runtime gate before validation.'
};

export const halfdozenAgentEvalArtifacts: DeliveryArtifact[] = [
	{
		label: 'Agent review webhook',
		href: 'https://halfdozen-agent-review-webhook.createsomething.workers.dev/webhook',
		meta: 'Cloudflare Worker protected webhook surface',
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
		label: 'Latest verified Test Report',
		meta: 'Internal Agent Builder / request 432f68e8 / 2026-06-03 05:21 UTC',
		visibility: 'private-reference'
	},
	{
		label: 'Linear evidence lane',
		meta: 'CRE-469, CRE-501, and CRE-502 completed with compact evidence',
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
		title: 'External eval is bounded',
		status: 'Fallback-safe',
		body:
			'Dify can review the submitted instructions and return structured JSON, but the Worker does not depend on an unbounded model call. If Dify times out or fails, the deterministic Worker rubric still produces the versioned handoff and records the caveat.'
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
		status: 'Verified',
		body:
			'AI Agents [HD] stays the source page for draft instructions, while Test Reports [OS] stores each eval as a new historical record. The latest run created a new report, appended final instructions, archived the submitted instructions, and moved the source page to Testing.'
	},
	{
		tier: 'Automation',
		title: 'Worker + Queue writeback',
		status: 'Production verified',
		body:
			'The Cloudflare Worker accepts the Notion webhook, enqueues the long-running job, reuses or creates Linear follow-up issues, publishes Notion report evidence, owns source-page mutations, and records compact completion evidence.'
	},
	{
		tier: 'Judgment',
		title: 'External instruction eval',
		status: 'Ready for human testing',
		body:
			'The external reviewer is useful as an independent instruction-quality check, but it is not the promotion authority. The Worker rubric and the live human Testing checklist are the gates before Validated or Active.'
	}
];

export const halfdozenAgentEvalPrivateArtifacts = [
	'Webhook secrets, Notion integration tokens, Dify Service API keys, and Linear tokens stay in Cloudflare secrets or Infisical. They are not published in this delivery page.',
	'Private Notion source pages, Test Reports records, and Linear comments are operational evidence, not public artifacts.',
	'The Dify import file is repo-owned so the app instructions can be rebuilt or re-imported without copying sensitive runtime keys.',
	'The verified 2026-06-03 run used the deterministic fallback because Dify did not return before the configured timeout. The handoff still completed and recorded the caveat.',
	'The eval is an instruction-readiness review. It does not prove that the live Notion agent runtime behaves correctly.'
];

export const halfdozenAgentEvalNextReview = [
	'Completed: a fresh post-deploy Updating transition fired webhook request 432f68e8-71a2-4013-b57a-50dc36904cd0 and generated a new Test Reports [OS] item.',
	'Completed: the source Internal Agent Builder page was updated with the versioned handoff and moved to Testing.',
	'Completed: Linear intake, build, and eval issues were completed with compact evidence comments.',
	'Remaining gate: run the Live Testing Handoff prompts in the actual Notion agent. Paste only the text after each "Prompt to paste" label, then record pass/fail and actual response on the Test Report.',
	'Improvement candidate: shorten or pre-bake the Dify eval contract if the team wants the external Dify response to be present on every run instead of relying on the deterministic fallback.'
];
