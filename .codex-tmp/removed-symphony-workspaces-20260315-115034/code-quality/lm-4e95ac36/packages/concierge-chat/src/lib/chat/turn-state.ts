export type TurnStage =
	| 'idle'
	| 'awaiting_confirmation'
	| 'awaiting_upload'
	| 'awaiting_tool_auth'
	| 'handoff_ready';

export interface TurnState {
	stage: TurnStage;
	summary: string;
	blockers: string[];
	nextActionLabel: string;
	policyRef: string;
}
