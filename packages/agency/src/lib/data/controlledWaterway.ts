import {
	PUBLIC_PRODUCT_SEQUENCE,
	getPublicProduct,
	type PublicProductId
} from './productFamily';

export type WaterwayStateId = 'run' | 'wait' | 'stop';

export interface WaterwayLedger {
	owner: string;
	authority: string;
	validation: string;
	state: string;
	evidence: string;
	recovery: string;
}

interface WaterwayPresentation {
	step: string;
	verb: string;
	flowStatus: string;
	ledger: WaterwayLedger;
}

export interface WaterwayStage extends WaterwayPresentation {
	id: PublicProductId;
	name: string;
	shortName: string;
	route: string;
	customerJob: string;
	outcome: string;
}

export interface ControlGate {
	id: 'signal' | 'decision' | 'proof';
	label: string;
	detail: string;
}

export interface WaterwayState {
	id: WaterwayStateId;
	label: string;
	detail: string;
}

export interface WorkflowTrigger {
	id: 'human' | 'system' | 'agent';
	label: string;
	detail: string;
	source: string;
}

export interface WorkPacketField {
	label: string;
	value: string;
}

export interface AgentWorkStep {
	id: 'connect' | 'inspect' | 'verify' | 'receipt';
	label: string;
	detail: string;
}

export interface PauseStation {
	label: string;
	protectedState: string;
	protectedAction: string;
	safeState: string;
	safeWork: string;
	decisionOwner: string;
	resume: string;
	recovery: string;
}

export interface BusinessOutcome {
	label: string;
	operationalResult: string;
	measure: string;
}

const WATERWAY_PRESENTATION: Record<PublicProductId, WaterwayPresentation> = {
	map: {
		step: '01',
		verb: 'Define the channel',
		flowStatus: 'Inputs and governed context are being defined.',
		ledger: {
			owner: 'Workflow owner',
			authority: 'Read-only discovery',
			validation: 'Owner, systems, approval, stop condition',
			state: 'Definition ready',
			evidence: 'Versioned workflow map',
			recovery: 'Return to discovery'
		}
	},
	build: {
		step: '02',
		verb: 'Construct the boundary',
		flowStatus: 'The governed handoff is moving through bounded work.',
		ledger: {
			owner: 'Implementation lead',
			authority: 'Approved scope only',
			validation: 'Connections, permissions, handoff',
			state: 'System verified',
			evidence: 'Test and handoff receipts',
			recovery: 'Roll back to last verified version'
		}
	},
	control: {
		step: '03',
		verb: 'Operate the gate',
		flowStatus: 'The full line is open through policy, proof, and outcome.',
		ledger: {
			owner: 'Named operator',
			authority: 'Policy-bounded tools',
			validation: 'Typed trigger, bounded work, policy gate, readback',
			state: 'Run / Prepare + Wait / Stop',
			evidence: 'Receipt chain, approval, and business outcome',
			recovery: 'Resume, contain, or roll back'
		}
	}
};

export const CONTROLLED_WATERWAY_STAGES: WaterwayStage[] = PUBLIC_PRODUCT_SEQUENCE.map((id) => {
	const product = getPublicProduct(id);
	return {
		id,
		name: product.name,
		shortName: product.shortName,
		route: product.route,
		customerJob: product.customerJob,
		outcome: product.outcome,
		...WATERWAY_PRESENTATION[id]
	};
});

export const CONTROL_GATE: ControlGate[] = [
	{ id: 'signal', label: 'Signal', detail: 'A typed trigger and current context enter the lane.' },
	{ id: 'decision', label: 'Decision', detail: 'Policy and human authority determine what can happen.' },
	{ id: 'proof', label: 'Proof', detail: 'Resolved work leaves a receipt with recovery lineage.' }
];

export const WATERWAY_STATES: WaterwayState[] = [
	{ id: 'run', label: 'Run', detail: 'Approved action proceeds' },
	{ id: 'wait', label: 'Wait', detail: 'Safe work continues; protected action held' },
	{ id: 'stop', label: 'Stop', detail: 'Mutation contained; recovery recorded' }
];

export const WORKFLOW_TRIGGERS: WorkflowTrigger[] = [
	{
		id: 'human',
		label: 'Human request',
		detail: 'A person asks for a business result.',
		source: 'Conversation or operator action'
	},
	{
		id: 'system',
		label: 'System event',
		detail: 'A schedule, webhook, or state change creates work.',
		source: 'Event or recurrence'
	},
	{
		id: 'agent',
		label: 'Agent handoff',
		detail: 'Another agent transfers a bounded next action.',
		source: 'Proof-carrying work packet'
	}
];

export const GOVERNED_WORK_PACKET: WorkPacketField[] = [
	{ label: 'Source', value: 'Typed trigger + case ID' },
	{ label: 'State', value: 'Current work and completed receipts' },
	{ label: 'Owner', value: 'Named operating owner' },
	{ label: 'Authority', value: 'Allowed tools and mutation scope' },
	{ label: 'Next', value: 'Required action or decision' },
	{ label: 'Recovery', value: 'Resume, contain, or roll back' }
];

export const AGENT_WORK_TRACE: AgentWorkStep[] = [
	{ id: 'connect', label: 'Connect', detail: 'Open only approved systems and context.' },
	{ id: 'inspect', label: 'Inspect', detail: 'Read state, constraints, and prior evidence.' },
	{ id: 'verify', label: 'Verify', detail: 'Run deterministic requirements and read back.' },
	{ id: 'receipt', label: 'Receipt', detail: 'Stamp the resolved result into the proof chain.' }
];

export const PAUSE_STATION: PauseStation = {
	label: 'Prepare + Wait',
	protectedState: 'Protected action held',
	protectedAction: 'External send or consequential mutation remains blocked.',
	safeState: 'Safe work continues',
	safeWork: 'The agent assembles context, validates dependencies, and prepares the next handoff.',
	decisionOwner: 'Named human owner',
	resume: 'Approval adds authority and resumes the protected lane with a decision receipt.',
	recovery: 'Rejection or timeout contains the action and preserves a resumable checkpoint.'
};

export const BUSINESS_OUTCOME: BusinessOutcome = {
	label: 'Proof + business outcome',
	operationalResult: 'Approved work reaches the next owner or system with evidence attached.',
	measure: 'Measure cycle time, exception rate, and value delivered from the receipt chain.'
};
