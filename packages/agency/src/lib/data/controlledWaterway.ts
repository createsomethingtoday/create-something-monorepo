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

const WATERWAY_PRESENTATION: Record<PublicProductId, WaterwayPresentation> = {
	map: {
		step: '01',
		verb: 'Define the channel',
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
		ledger: {
			owner: 'Named operator',
			authority: 'Policy-bounded tools',
			validation: 'Signal, decision gate, receipt',
			state: 'Run / Wait / Stop',
			evidence: 'Proof record and owner approval',
			recovery: 'Pause, route, or roll back'
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
	{ id: 'signal', label: 'Signal', detail: 'Requirements and current context enter the lane.' },
	{ id: 'decision', label: 'Decision', detail: 'Policy and approval determine what can happen.' },
	{ id: 'proof', label: 'Proof', detail: 'A receipt records the outcome and recovery path.' }
];

export const WATERWAY_STATES: WaterwayState[] = [
	{ id: 'run', label: 'Run', detail: 'Inside the approved lane' },
	{ id: 'wait', label: 'Wait', detail: 'Named owner reviews' },
	{ id: 'stop', label: 'Stop', detail: 'Reason logged; work contained' }
];
