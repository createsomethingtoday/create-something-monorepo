/**
 * @create-something/delivery-schema
 *
 * Canonical types for the delivery surface — the client-facing operational UI
 * for governed workflows. Single source of truth for shapes previously
 * duplicated between:
 *
 *   - packages/agency/src/lib/canon/workflow-context.ts (Canon Control API, D1-backed)
 *   - packages/webflow-components/src/components/control/ControlComponents.tsx (render skin)
 *
 * Optionality follows the server's invariants (the API constructs complete
 * objects; renderers may still apply display fallbacks). Types only — no
 * runtime code, so `import type` consumers (including the Webflow CLI bundle)
 * carry zero weight from this package. Executable Build release validation is
 * isolated behind the `@create-something/delivery-schema/build-release`
 * subpath so this browser-facing root remains types-only.
 *
 * Context assembly (`CanonWorkflowContext`) currently lives in the agency
 * package; it migrates here in step 3 of docs/DELIVERY_SURFACE_SPEC.md.
 */

// ── Primitives ───────────────────────────────────────────────────────────────

export type TriadTier = 'Database' | 'Automation' | 'Judgment';
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export type CheckStatus = 'ok' | 'warning' | 'blocked' | 'idle';
export type ApprovalState = 'review' | 'approved' | 'blocked';
export type ActionStatus = 'draft' | 'requires_approval' | 'allowed' | 'blocked';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Visibility = 'public' | 'private' | 'internal';

// ── Items ────────────────────────────────────────────────────────────────────

/** A receipt: evidence attached to a handoff, deploy, or decision. */
export interface EvidenceItem {
	id?: string;
	label: string;
	detail?: string;
	source?: string;
	href?: string;
	tone?: StatusTone;
	timestamp?: string;
	visibility?: Visibility;
	status?: 'draft' | 'approved' | 'review' | 'blocked';
	owner?: string;
}

/** One tier of the Three-Tier Framework as applied to an engagement. */
export interface OperatingLayer {
	tier: TriadTier;
	title: string;
	status: string;
	description: string;
	evidence?: string[];
	tone?: StatusTone;
}

export interface ArtifactItem {
	title: string;
	type?: string;
	description?: string;
	href?: string;
	visibility?: Visibility;
	tone?: StatusTone;
}

export interface DecisionItem {
	id?: string;
	title: string;
	description?: string;
	owner?: string;
	due?: string;
	state?: ApprovalState | 'open' | 'ready';
	tier?: TriadTier;
}

/** A previewed action with its policy posture, before any execution. */
export interface ActionPreviewItem {
	id: string;
	label: string;
	description: string;
	status?: ActionStatus;
	risk?: RiskLevel;
	policyChecks?: string[];
	evidence?: string[];
}

export interface AgentMessage {
	role: 'agent' | 'operator';
	body: string;
	grounding?: string[];
}

export interface SuggestedPrompt {
	label: string;
	prompt: string;
}

export interface RuntimeCheck {
	label: string;
	status?: CheckStatus;
	detail?: string;
}

export interface BusinessContextItem {
	id: string;
	client: string;
	project: string;
	workflow: string;
	environment: string;
	status: 'active' | 'review' | 'blocked' | 'idle';
	owner: string;
	detail?: string;
}

export interface WorkflowMetricItem {
	label: string;
	value: string;
	detail?: string;
	tone?: StatusTone;
	trend?: string;
}

export interface SourceStatusItem {
	system: string;
	status: CheckStatus;
	detail: string;
	lastSynced?: string;
	owner?: string;
	tier?: TriadTier;
}

export interface ApprovalQueueItem {
	id: string;
	actionId?: string;
	title: string;
	requester?: string;
	requiredApprover: string;
	status: ApprovalState;
	risk?: RiskLevel;
	due?: string;
	evidence?: string[];
	policyChecks?: string[];
	updatedBy?: string;
	updatedAt?: string;
}

export interface ActionExecutionItem {
	id: string;
	actionId?: string;
	title: string;
	status: 'preview' | 'queued' | 'approved' | 'blocked' | 'executed';
	owner?: string;
	system?: string;
	risk?: RiskLevel;
	rollback?: string;
	lastUpdated?: string;
}

export interface ActivityEventItem {
	id: string;
	eventType: 'context' | 'approval' | 'preview' | 'agent' | 'deploy' | 'evidence' | 'decision';
	label: string;
	detail?: string;
	actor?: string;
	timestamp?: string;
	tone?: StatusTone;
}

// ── Context-level shapes ─────────────────────────────────────────────────────

export interface WorkflowRuntime {
	label: string;
	status: CheckStatus;
	environment: string;
	lastChecked: string;
	checks: RuntimeCheck[];
}

export interface WorkflowApproval {
	title: string;
	description: string;
	approvalState: ApprovalState;
	requiredApprover: string;
	primaryActionLabel: string;
	secondaryActionLabel: string;
}

export interface WorkflowAgent {
	title: string;
	placeholder: string;
	suggestedPrompts: SuggestedPrompt[];
	initialMessages: AgentMessage[];
}

// ── Engagement extensions (docs/DELIVERY_SURFACE_SPEC.md, step 3) ───────────
// Shapes the static delivery pages already use, lifted here so engagements
// can migrate from hand-authored $lib/delivery/*.ts modules to D1 rows.

export type EngagementLane =
	| 'trust_map'
	| 'workflow_pilot'
	| 'trust_layer'
	| 'enterprise_extension';

/** Engagement identity beyond businessContexts — from the delivery pages' deliverySummary. */
export interface EngagementMeta {
	client: string;
	owner: string;
	phase: string;
	recipient?: string;
	lane: EngagementLane;
}

/** A copy-paste-ready handoff command (ShivWorks runbook shape). */
export interface RunbookCommand {
	label: string;
	description: string;
	command: string;
}

/** Who can reach which system, and how (ShivWorks handoff shape). */
export interface AccessLaneItem {
	label: string;
	owner: string;
	scope: string;
	action: string;
}

/** One deliverable in a handoff package: what, for whom, and how it transfers. */
export interface HandoffPackageItem {
	label: string;
	audience: string;
	deliverable: string;
	how: string;
}

export interface ReviewItem {
	label: string;
	due: string;
	owner?: string;
	state?: 'open' | 'done';
}

export interface EngagementMember {
	email: string;
	role: 'owner' | 'approver' | 'viewer';
}

/** The standalone app's auth boundary for one engagement. */
export interface EngagementAccess {
	publicSlug?: string;
	members: EngagementMember[];
}
