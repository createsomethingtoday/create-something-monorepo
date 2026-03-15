/**
 * WASM Simulation Loader
 * 
 * Loads the Rust simulation engine. Works in both Workers and Node.
 */

// Re-export types
export interface SimItem {
  id: string;
  title: string;
  body: string;
  sourceType: string;
  category: string;
  score: number;
  status: string;
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

// Cached simulation instance
let simulationInstance: any = null;
let lastTimestamp = 0;

/**
 * Get or create simulation instance
 * Reuses instance within the same minute for consistency
 */
export async function getSimulation(scenario: string = 'dental') {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);
  const lastMinute = Math.floor(lastTimestamp / 60000);
  
  // Reuse if same minute
  if (simulationInstance && currentMinute === lastMinute) {
    return simulationInstance;
  }
  
  try {
    // Dynamic import of WASM module
    const { Simulation } = await import('@create-something/simulation');
    simulationInstance = Simulation.fromTimestamp(BigInt(now), scenario);
    lastTimestamp = now;
    return simulationInstance;
  } catch (error) {
    console.error('Failed to load WASM simulation:', error);
    return null;
  }
}

/**
 * Generate simulation state using WASM
 */
export async function generateSimulationState(timestampMs: number = Date.now()): Promise<SimState | null> {
  const sim = await getSimulation('dental');
  if (!sim) return null;
  
  try {
    return sim.stateAt(BigInt(timestampMs)) as SimState;
  } catch (error) {
    console.error('Simulation state generation failed:', error);
    return null;
  }
}

/**
 * Convert SimState to TEND's expected format
 */
export function toTendFormat(state: SimState, timestampMs: number = Date.now()) {
  const items = state.items.map(item => ({
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
    sourceTimestamp: new Date(timestampMs - item.minutesAgo * 60000),
    ingestedAt: new Date(timestampMs),
    metadata: item.metadata || {},
  }));

  const metrics = {
    today: {
      appointments: state.metrics.appointmentsTotal,
      completed: state.metrics.appointmentsCompleted,
      remaining: Math.max(0, state.metrics.appointmentsTotal - state.metrics.appointmentsCompleted),
      avgWaitTime: `${state.metrics.avgWaitMinutes} min`,
      onTimeRate: state.metrics.onTimeRate,
    },
    automations: {
      today: state.metrics.automationsToday,
      callsProcessed: state.metrics.callsProcessed,
      confirmationsSent: state.metrics.confirmationsSent,
      eligibilityChecked: state.metrics.eligibilityChecked,
      recallsContacted: state.metrics.recallsContacted,
    },
    agents: {
      completed: state.metrics.agentsCompleted,
      awaitingApproval: state.metrics.agentsAwaiting,
    },
    humanActions: {
      today: state.metrics.humanDecisions,
    },
    health: {
      waitingRoom: state.metrics.waitingRoom,
      noShowRate: state.metrics.noShowRate,
    },
  };

  const activityLog = state.activityLog.map(entry => ({
    minutesAgo: entry.minutesAgo,
    text: entry.text,
  }));

  return { items, metrics, activityLog, timeOfDay: state.timeOfDay };
}
