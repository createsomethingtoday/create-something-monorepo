import type { CanonWorkflowContext } from '$lib/canon/workflow-context';

export const ABUNDANCE_CONTEXT_ID = 'abundance-npg-delivery';

/**
 * Abundance (The NP Group) delivery engagement as a Canon workflow context —
 * tenant #1 on the shared delivery surface (docs/DELIVERY_SURFACE_SPEC.md, step 2).
 *
 * This object is the deploy-time fallback and the seed source for the
 * `canon_workflow_contexts` D1 row (migration 0025). Once the row exists,
 * D1 wins and content edits happen there; keep this fallback in sync only
 * for cold-start behavior. Client-safe content only — no secrets, tokens,
 * raw employee rows, or contact data.
 */
export const abundanceWorkflowContext: CanonWorkflowContext = {
	contextId: ABUNDANCE_CONTEXT_ID,
	title: 'Abundance nurse staffing system',
	summary:
		'The NP Group now has a live concierge app, a repo-backed database, hardened Abundance API routes, production-smoked Staff and Jobs MCPs, an NPG scoped hub, Braintrust/Langfuse eval evidence for the Dify agent path, walkthrough artifacts, and a clear agent boundary for recruiter-led review.',
	source: 'fallback',
	updatedAt: null,
	engagement: {
		client: 'The NP Group / NPG',
		owner: 'CREATE SOMETHING',
		phase: 'Build / delivery review',
		lane: 'workflow_pilot'
	},
	runtime: {
		label: 'Abundance Delivery Runtime',
		status: 'ok',
		environment: 'Concierge app + Cloudflare + Dify + MCPs',
		lastChecked: 'Production smoke pass',
		checks: [
			{
				label: 'Concierge live app',
				status: 'ok',
				detail: 'The nurse-facing intake surface is live on Cloudflare Pages.'
			},
			{
				label: 'Staff and Jobs MCPs',
				status: 'ok',
				detail: 'Staff headcount, Jobs public listing, and Dify jobs-tool usage passed production smoke checks.'
			},
			{
				label: 'NPG scoped hub',
				status: 'warning',
				detail: 'Hub status calls are reachable, but Jotform, Mailchimp, and WhatsApp report connected=false pending account-owner authorization.'
			},
			{
				label: 'WhatsApp webhook',
				status: 'idle',
				detail: 'WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET still need provisioning before the Meta webhook is enabled.'
			}
		]
	},
	layers: [
		{
			tier: 'Database',
			title: 'Created DB',
			status: 'Created',
			description:
				'The Abundance data layer captures profile context, intake history, matching state, and private source artifacts for the next staff/operator integration pass.',
			evidence: ['Repo-backed database', 'Public jobs D1 contract', 'Paylocity source artifact (private)'],
			tone: 'info'
		},
		{
			tier: 'Automation',
			title: 'Staff, Jobs, and NPG Hub',
			status: 'Production-smoked',
			description:
				'Staff MCP, Jobs MCP, the NPG scoped hub, and Dify Abundance Hub have passed production smoke checks. The Abundance Dify agent also has a published Braintrust eval suite with Langfuse trace join keys. Credentials stay in secret storage and are not published in the delivery surface.',
			evidence: ['Staff MCP', 'Jobs MCP', 'NPG scoped hub', 'Braintrust eval suite'],
			tone: 'success'
		},
		{
			tier: 'Judgment',
			title: 'Agent Boundary',
			status: 'Ready for review',
			description:
				'The agent supports intake, shortlist, missing-information flags, and recruiter review. It does not autonomously make staffing decisions.',
			evidence: ['Recruiter review gate', 'No speculative funnel writes', 'Secret-refusal eval'],
			tone: 'warning'
		}
	],
	actions: [
		{
			id: 'draft-recruiter-shortlist',
			label: 'Draft recruiter shortlist',
			description: 'Prepare a candidate shortlist with missing-information flags for recruiter review.',
			summary:
				'The agent can draft a shortlist from intake and matching state, flag missing information, and stage it for recruiter review. It cannot contact candidates or clients.',
			status: 'allowed',
			risk: 'low',
			policyChecks: [
				'Uses sanitized intake and matching state only.',
				'Output goes to recruiter review, never directly to candidates or clients.',
				'No contact-level data appears on the public delivery surface.'
			],
			evidence: ['Agent boundary', 'Braintrust eval suite'],
			allowedNextActions: ['Draft shortlist', 'Flag missing information', 'Stage for recruiter review']
		},
		{
			id: 'send-job-to-funnel',
			label: 'Send job to funnel',
			description: 'Push a discovered job into the candidate funnel after explicit confirmation.',
			summary:
				'Funnel writes require explicit confirmation and stay outside the public delivery page. The embedded jobs panel is read-only by guardrail.',
			status: 'requires_approval',
			risk: 'medium',
			policyChecks: [
				'Read-only job discovery from the public delivery page.',
				'Funnel writes require explicit operator confirmation.',
				'Eval suite verifies no speculative send_job_to_funnel calls.'
			],
			evidence: ['Read-only guardrail', 'Eval: forbidden writes'],
			allowedNextActions: ['Request confirmation', 'Keep discovery read-only']
		},
		{
			id: 'enable-write-automation',
			label: 'Enable write-capable automation',
			description: 'Blocked until NPG account owners reauthorize Jotform, Mailchimp, and WhatsApp.',
			summary:
				'Jotform, Mailchimp, and WhatsApp currently report connected=false on the NPG scoped hub. Write-capable automation stays blocked until account owners review and reauthorize those connections.',
			status: 'blocked',
			risk: 'high',
			policyChecks: [
				'Account-owner authorization required for each connected system.',
				'WhatsApp webhook secrets must be provisioned in Cloudflare Pages production first.',
				'Credentials stay in Infisical; no token values on the delivery surface.'
			],
			evidence: ['NPG hub status', 'Governance rule'],
			allowedNextActions: ['Request account-owner review', 'Provision webhook secrets']
		}
	],
	approval: {
		title: 'Recruiter Review Gate',
		description:
			'The agent can draft shortlists and flag gaps, but a recruiter or NPG account owner approves matches before anything reaches a candidate or client.',
		approvalState: 'review',
		requiredApprover: 'NPG recruiter / account owner',
		primaryActionLabel: 'Mark approved',
		secondaryActionLabel: 'Keep in review'
	},
	evidence: [
		{
			id: 'paylocity-export',
			label: 'Paylocity active-headcount CSV',
			detail: 'Received for private staff/operator context. Raw employee rows are not part of this public delivery surface.',
			source: 'Private source artifact',
			visibility: 'private',
			tone: 'warning'
		},
		{
			id: 'dify-hub-config',
			label: 'Dify Abundance Hub configuration',
			detail: 'Tracked as an external operational artifact and production-smoked through the Service API.',
			source: 'External operational artifact',
			visibility: 'private',
			tone: 'info'
		},
		{
			id: 'braintrust-evals',
			label: 'Braintrust eval coverage',
			detail:
				'Published under create-something-dify-agents / abundance_hub: verifies Dify API health, Jobs MCP tool routing, forbidden writes, secret refusal, latency, and trace IDs for Langfuse inspection.',
			source: 'create-something-dify-agents / abundance_hub',
			visibility: 'private',
			tone: 'success'
		},
		{
			id: 'mcp-credentials',
			label: 'MCP credentials in Infisical',
			detail: 'Staff MCP, Jobs MCP, and the NPG scoped hub were smoked without exposing token values.',
			source: 'Infisical',
			visibility: 'private',
			tone: 'success'
		},
		{
			id: 'public-jobs-contract',
			label: 'Public job ingestion contract',
			detail:
				'Provider-independent D1 contract and Bright Data adapter path exist; the deployed Jobs MCP remains the serving surface until its backing source points at the normalized table.',
			source: 'D1 migration 0024',
			visibility: 'private',
			tone: 'info'
		},
		{
			id: 'whatsapp-secrets-gap',
			label: 'WhatsApp webhook secrets gap',
			detail:
				'Cloudflare Pages production has AGENCY_INTERNAL_API_KEY, but WHATSAPP_VERIFY_TOKEN and WHATSAPP_APP_SECRET still need provisioning before enabling the Meta webhook.',
			source: 'Cloudflare Pages production',
			visibility: 'private',
			tone: 'warning'
		},
		{
			id: 'npg-hub-connections',
			label: 'NPG hub connection status',
			detail:
				'Hub status calls are reachable, but Jotform, Mailchimp, and WhatsApp report connected=false and need account-owner authorization before write-capable automation.',
			source: 'NPG scoped hub',
			visibility: 'private',
			tone: 'warning'
		}
	],
	decisions: [
		{
			id: 'whatsapp-secrets',
			title: 'Provision WhatsApp webhook secrets in Cloudflare Pages production.',
			owner: 'CREATE SOMETHING',
			state: 'open',
			tier: 'Automation'
		},
		{
			id: 'promote-secure-build',
			title: 'Promote the secured Abundance API build from a clean release branch or clean deployment workspace.',
			owner: 'CREATE SOMETHING',
			state: 'open',
			tier: 'Automation'
		},
		{
			id: 'reauthorize-connections',
			title: 'Have NPG account owners review or reauthorize Jotform, Mailchimp, and WhatsApp before write-capable automation.',
			owner: 'NPG account owners',
			state: 'review',
			tier: 'Judgment'
		},
		{
			id: 'paylocity-mapping',
			title: 'Confirm how Paylocity fields map into staff/operator records.',
			owner: 'NPG + CREATE SOMETHING',
			state: 'open',
			tier: 'Database'
		},
		{
			id: 'jobs-mcp-backing-source',
			title:
				'Point the Abundance Jobs MCP backing source at the normalized public jobs table after Bright Data credentials and dataset IDs are provisioned.',
			owner: 'CREATE SOMETHING',
			state: 'open',
			tier: 'Database'
		},
		{
			id: 'operator-roster-access',
			title: 'Decide which operator roster receives MCP/database access.',
			owner: 'NPG account owners',
			state: 'review',
			tier: 'Judgment'
		}
	],
	artifacts: [
		{
			title: 'Abundance Concierge live app',
			type: 'Live nurse-facing intake surface',
			href: 'https://abundance-concierge-chat.pages.dev/',
			visibility: 'public',
			tone: 'success'
		},
		{
			title: 'Abundance Jobs Agent',
			type: 'Embedded read-only Dify job discovery agent',
			href: 'https://createsomething.agency/delivery/abundance#job-agent',
			visibility: 'public',
			tone: 'info'
		},
		{
			title: 'Progress walkthrough',
			type: 'Current job/database workflow walkthrough',
			href: 'https://share.descript.com/view/RWYv3CqKbEC',
			visibility: 'public',
			tone: 'info'
		},
		{
			title: 'Pilot overview',
			type: 'Concierge pilot walkthrough',
			href: 'https://share.descript.com/view/0wxPcYQzl8G',
			visibility: 'public',
			tone: 'info'
		},
		{
			title: 'Generated delivery package',
			type: 'Portable monorepo-generated delivery page',
			href: 'https://create-something-deliveries.pages.dev/projects/abundance/',
			visibility: 'public',
			tone: 'info'
		}
	],
	agent: {
		title: 'Ask This Delivery',
		placeholder: 'Example: What is safe to send to our team?',
		suggestedPrompts: [
			{ label: 'What changed', prompt: 'Explain what changed in plain English.' },
			{ label: 'Decisions needed', prompt: 'What decisions do you need from us?' },
			{ label: 'Safe to forward', prompt: 'What is safe to forward to our team?' },
			{ label: 'How it fits', prompt: 'How do the DB, MCP, and agent fit together?' }
		],
		initialMessages: [
			{
				role: 'agent',
				body: 'Ask about what changed, what is private, what needs a decision, or how the database, MCP, and agent pieces fit together.',
				grounding: ['Sanitized delivery context']
			}
		]
	},
	businessContexts: [
		{
			id: ABUNDANCE_CONTEXT_ID,
			client: 'The NP Group / NPG',
			project: 'Abundance nurse staffing system',
			workflow: 'Concierge intake → matching → recruiter review',
			environment: 'Production pilot',
			status: 'review',
			owner: 'CREATE SOMETHING',
			detail: 'Build / delivery review phase with recruiter-gated agent boundary.'
		}
	],
	activeBusinessContextId: ABUNDANCE_CONTEXT_ID,
	metrics: [
		{ label: 'MCP surfaces smoked', value: '3', detail: 'Staff MCP, Jobs MCP, NPG scoped hub', tone: 'success' },
		{ label: 'Open decisions', value: '6', detail: 'Secrets, reauthorization, mapping, access', tone: 'warning' },
		{ label: 'Agent boundary', value: 'Recruiter-gated', detail: 'No autonomous staffing decisions', tone: 'info' },
		{ label: 'Eval coverage', value: 'Published', detail: 'Braintrust suite with Langfuse trace keys', tone: 'success' }
	],
	sourceStatuses: [
		{
			system: 'Abundance Concierge app',
			status: 'ok',
			detail: 'Live nurse-facing intake surface on Cloudflare Pages.',
			tier: 'Automation'
		},
		{
			system: 'Staff MCP and Jobs MCP',
			status: 'ok',
			detail: 'Production-smoked; credentials stay in Infisical.',
			tier: 'Automation'
		},
		{
			system: 'NPG scoped hub',
			status: 'warning',
			detail: 'Reachable, but Jotform, Mailchimp, and WhatsApp need account-owner reauthorization.',
			tier: 'Automation'
		},
		{
			system: 'Abundance database',
			status: 'ok',
			detail: 'Repo-backed data layer with a provider-independent public jobs contract.',
			tier: 'Database'
		},
		{
			system: 'WhatsApp / Meta webhook',
			status: 'blocked',
			detail: 'Webhook secrets not yet provisioned in production.',
			tier: 'Automation'
		}
	],
	approvalQueue: [
		{
			id: 'approval-operator-roster',
			actionId: 'enable-write-automation',
			title: 'Approve operator roster for MCP/database access',
			requester: 'Delivery system',
			requiredApprover: 'NPG account owner',
			status: 'review',
			risk: 'medium',
			due: 'Before operator integration pass',
			evidence: ['NPG hub status', 'Agent boundary'],
			policyChecks: ['Named account-owner approval required', 'Access scoped to the operator roster']
		}
	],
	executionQueue: [],
	activityEvents: [],
	guardrails: [
		'Answers use the sanitized Abundance delivery context only.',
		'Safe to share: the live app, walkthrough links, and the generated delivery page.',
		'Keep private: token-bearing MCP URLs, raw Paylocity rows, local file paths, private Notion links, contact names or emails, and credential values.',
		'If a token was shared outside secret storage, rotate it before relying on it in production.'
	]
};
