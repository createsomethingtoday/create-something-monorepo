/**
 * Simulation Engine Integration
 * 
 * Loads the Rust WASM simulation engine and provides
 * typed access to the simulation API.
 */

// Types from the simulation engine (matches Rust serde output)
export interface SimItem {
  id: string;
  title: string;
  body: string;
  sourceType: string;
  category: string;
  score: number;
  status: 'inbox' | 'approved' | 'dismissed' | 'snoozed' | 'archived';
  minutesAgo: number;
  metadata?: Record<string, unknown>;
}

export interface SimLogEntry {
  minutesAgo: number;
  text: string;
  entryType: string;
}

export interface SimMetrics {
  waitingRoom: number;
  avgWaitMinutes: number;
  onTimeRate: number;
  noShowRate: number;
  appointmentsTotal: number;
  appointmentsCompleted: number;
  automationsToday: number;
  callsProcessed: number;
  confirmationsSent: number;
  eligibilityChecked: number;
  recallsContacted: number;
  agentsCompleted: number;
  agentsAwaiting: number;
  humanDecisions: number;
}

export interface SimState {
  items: SimItem[];
  activityLog: SimLogEntry[];
  metrics: SimMetrics;
  timeOfDay: string;
  simulationTime: number;
}

// WASM module types
interface SimulationWasm {
  stateAt(timestamp_ms: bigint): SimState;
  itemsAt(timestamp_ms: bigint): SimItem[];
  metricsAt(timestamp_ms: bigint): SimMetrics;
  activityLogAt(timestamp_ms: bigint, count: number): SimLogEntry[];
  readonly seed: bigint;
  free(): void;
}

interface SimulationModule {
  default: (input?: unknown) => Promise<unknown>;
  Simulation: {
    new(seed: bigint, scenario: string): SimulationWasm;
    fromTimestamp(timestamp: bigint, scenario: string): SimulationWasm;
  };
}

let wasmModule: SimulationModule | null = null;
let simulation: SimulationWasm | null = null;

/**
 * Initialize the simulation engine
 * Must be called before using other functions
 */
export async function initSimulation(scenario: string = 'dental'): Promise<void> {
  if (simulation) return; // Already initialized
  
  try {
    // Dynamic import of the WASM module
    const module = await import('@create-something/simulation') as unknown as SimulationModule;
    await module.default();
    
    wasmModule = module;
    simulation = module.Simulation.fromTimestamp(BigInt(Date.now()), scenario);
  } catch (error) {
    console.warn('WASM simulation not available, using fallback:', error);
  }
}

/**
 * Check if simulation is available
 */
export function isSimulationAvailable(): boolean {
  return simulation !== null;
}

/**
 * Get the complete simulation state at the current time
 */
export function getSimulationState(): SimState | null {
  if (!simulation) return null;
  return simulation.stateAt(BigInt(Date.now()));
}

/**
 * Get simulation state at a specific timestamp
 */
export function getSimulationStateAt(timestampMs: number): SimState | null {
  if (!simulation) return null;
  return simulation.stateAt(BigInt(timestampMs));
}

/**
 * Get just the items at current time
 */
export function getSimulationItems(): SimItem[] {
  if (!simulation) return [];
  return simulation.itemsAt(BigInt(Date.now()));
}

/**
 * Get just the metrics at current time
 */
export function getSimulationMetrics(): SimMetrics | null {
  if (!simulation) return null;
  return simulation.metricsAt(BigInt(Date.now()));
}

/**
 * Get the activity log at current time
 */
export function getSimulationActivityLog(count: number = 10): SimLogEntry[] {
  if (!simulation) return [];
  return simulation.activityLogAt(BigInt(Date.now()), count);
}

/**
 * Convert SimItem to TEND's DataItem format
 */
export function toDataItem(item: SimItem, baseTime: number = Date.now()) {
  const timestamp = new Date(baseTime - item.minutesAgo * 60 * 1000);
  
  return {
    id: item.id,
    tenantId: 'demo',
    sourceId: item.sourceType,
    title: item.title,
    body: item.body,
    sourceType: item.sourceType,
    category: item.category,
    score: item.score,
    scoreBreakdown: {},
    status: item.status,
    sourceTimestamp: timestamp,
    ingestedAt: new Date(),
    metadata: item.metadata || {},
  };
}

/**
 * Convert SimMetrics to TEND's metrics format
 */
export function toTendMetrics(metrics: SimMetrics) {
  return {
    today: {
      appointments: metrics.appointmentsTotal,
      completed: metrics.appointmentsCompleted,
      avgWaitTime: `${metrics.avgWaitMinutes} min`,
      onTimeRate: metrics.onTimeRate,
    },
    automations: {
      today: metrics.automationsToday,
      callsProcessed: metrics.callsProcessed,
      confirmationsSent: metrics.confirmationsSent,
      eligibilityChecked: metrics.eligibilityChecked,
      recallsContacted: metrics.recallsContacted,
    },
    agents: {
      completed: metrics.agentsCompleted,
      awaitingApproval: metrics.agentsAwaiting,
    },
    humanActions: {
      today: metrics.humanDecisions,
    },
    health: {
      waitingRoom: metrics.waitingRoom,
      noShowRate: metrics.noShowRate,
    },
  };
}

/**
 * Convert SimLogEntry to TEND's activity log format
 */
export function toActivityLogEntry(entry: SimLogEntry) {
  return {
    minutesAgo: entry.minutesAgo,
    text: entry.text,
    type: entry.entryType,
  };
}
