declare module '@create-something/simulation' {
	export interface SimulationWasm {
		stateAt(timestamp_ms: bigint): unknown;
		itemsAt(timestamp_ms: bigint): unknown;
		metricsAt(timestamp_ms: bigint): unknown;
		activityLogAt(timestamp_ms: bigint, count: number): unknown;
	}

	export class Simulation {
		static fromTimestamp(timestamp: bigint, scenario: string): SimulationWasm;
	}

	export default function init(input?: unknown): Promise<unknown>;
}
