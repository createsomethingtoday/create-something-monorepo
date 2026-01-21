/**
 * TypeScript types for the Simulation WASM module
 * 
 * These types match the Rust structures serialized via serde.
 * Use these for type-safe consumption of simulation data.
 */

/** A simulated data item */
export interface SimItem {
  id: string;
  title: string;
  body: string;
  sourceType: string;
  category: string;
  score: number;
  status: 'inbox' | 'approved' | 'dismissed' | 'snoozed' | 'archived';
  /** Minutes ago relative to simulation time */
  minutesAgo: number;
  metadata?: Record<string, unknown>;
}

/** A log entry for the activity feed */
export interface SimLogEntry {
  minutesAgo: number;
  text: string;
  entryType: string;
}

/** Real-time metrics snapshot */
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

/** Complete simulation state at a point in time */
export interface SimState {
  items: SimItem[];
  activityLog: SimLogEntry[];
  metrics: SimMetrics;
  timeOfDay: string;
  simulationTime: number;
}

/** Simulation class interface (matches WASM exports) */
export interface Simulation {
  /** Create from explicit seed */
  new(seed: bigint, scenario: string): Simulation;
  
  /** Get complete state at timestamp */
  stateAt(timestampMs: number): SimState;
  
  /** Get just items at timestamp */
  itemsAt(timestampMs: number): SimItem[];
  
  /** Get just metrics at timestamp */
  metricsAt(timestampMs: number): SimMetrics;
  
  /** Get activity log at timestamp */
  activityLogAt(timestampMs: number, count: number): SimLogEntry[];
  
  /** Current seed (for debugging) */
  readonly seed: bigint;
}

/** Factory function interface */
export interface SimulationModule {
  Simulation: {
    new(seed: bigint, scenario: string): Simulation;
    fromTimestamp(timestampMs: number, scenario: string): Simulation;
  };
}

/**
 * Helper to create a simulation for the current time
 */
export function createSimulation(scenario: string = 'dental'): Promise<Simulation> {
  // This would be implemented by the consuming code after loading WASM
  throw new Error('Use initSimulation() from the WASM module first');
}

/**
 * Convert SimItem to the format expected by Sieve
 */
export function toSieveItem(item: SimItem, baseTime: number): {
  id: string;
  tenantId: string;
  sourceId: string;
  title: string;
  body: string;
  sourceType: string;
  category: string;
  score: number;
  status: string;
  sourceTimestamp: Date;
  ingestedAt: Date;
  metadata: Record<string, unknown>;
} {
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
    status: item.status,
    sourceTimestamp: timestamp,
    ingestedAt: new Date(),
    metadata: item.metadata || {},
  };
}

/**
 * Convert SimMetrics to the format expected by Sieve
 */
export function toSieveMetrics(metrics: SimMetrics): {
  today: {
    appointments: number;
    completed: number;
    avgWaitTime: string;
    onTimeRate: number;
  };
  automations: {
    today: number;
    callsProcessed: number;
    confirmationsSent: number;
    eligibilityChecked: number;
    recallsContacted: number;
  };
  agents: {
    completed: number;
    awaitingApproval: number;
  };
  humanActions: {
    today: number;
  };
  health: {
    waitingRoom: number;
    noShowRate: number;
  };
} {
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
