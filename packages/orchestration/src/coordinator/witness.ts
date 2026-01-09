/**
 * @create-something/orchestration
 *
 * Witness pattern: Active health monitoring for background workers.
 * Monitors worker health and intervenes autonomously via three-tier escalation.
 */

import fs from 'fs/promises';
import path from 'path';
import { loadConvoy, updateConvoyStatus } from './convoy.js';
import { readWorkerSignal, terminateWorker } from './worker-pool.js';
import { createBlockerIssue } from '../integration/beads.js';
import type { Convoy, WorkerSignal, HealthReport, WorkerStatus } from '../types.js';

/**
 * Witness configuration.
 */
export interface WitnessConfig {
  convoyId: string;
  epicId?: string;
  pollInterval: number;         // Seconds between health checks (default: 60)
  staleThreshold: number;       // Minutes without checkpoint = stale (default: 20)
  escalationThreshold: number;  // Minutes without checkpoint = escalate (default: 40)
  terminationThreshold: number; // Minutes without checkpoint = terminate (default: 60)
}

/**
 * Worker health status.
 */
export type HealthStatus = 'healthy' | 'stale' | 'stuck';

/**
 * Worker command (coordinator → worker).
 */
export interface WorkerCommand {
  command: 'nudge' | 'escalate' | 'terminate';
  reason: string;
  timestamp: string;
}

/**
 * Default witness configuration.
 */
export const DEFAULT_WITNESS_CONFIG: Omit<WitnessConfig, 'convoyId'> = {
  pollInterval: 60,          // Check every minute
  staleThreshold: 20,        // Stale at 20 min
  escalationThreshold: 40,   // Escalate at 40 min
  terminationThreshold: 60   // Terminate at 60 min
};

/**
 * Witness monitoring class.
 *
 * Philosophy: Autonomous intervention. The witness runs independently,
 * monitoring worker health and taking corrective action without human input.
 */
export class Witness {
  private config: WitnessConfig;
  private running: boolean = false;

  constructor(config: WitnessConfig) {
    this.config = {
      ...DEFAULT_WITNESS_CONFIG,
      ...config
    };
  }

  /**
   * Start monitoring loop.
   *
   * Runs until convoy completes or monitor is stopped.
   */
  async monitor(): Promise<void> {
    this.running = true;

    console.log(`Witness monitoring convoy: ${this.config.convoyId}`);
    console.log(`Poll interval: ${this.config.pollInterval}s`);
    console.log(`Stale threshold: ${this.config.staleThreshold} min`);
    console.log(`Escalation threshold: ${this.config.escalationThreshold} min`);
    console.log(`Termination threshold: ${this.config.terminationThreshold} min`);
    console.log('');

    while (this.running) {
      try {
        await this.checkHealth();
      } catch (error) {
        console.error('Error in witness loop:', error);
      }

      // Sleep until next poll
      await this.sleep(this.config.pollInterval * 1000);
    }

    console.log('Witness monitoring stopped.');
  }

  /**
   * Stop monitoring.
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Check worker health and intervene if needed.
   */
  private async checkHealth(): Promise<void> {
    const convoy = await this.loadConvoy();

    if (!convoy) {
      console.warn(`Convoy ${this.config.convoyId} not found, stopping witness`);
      this.stop();
      return;
    }

    // Check if convoy complete
    if (convoy.status === 'completed' || convoy.status === 'failed') {
      console.log(`Convoy ${this.config.convoyId} finished (${convoy.status}). Witness exiting.`);
      this.stop();
      return;
    }

    // Check each worker
    let healthyCount = 0;
    let staleCount = 0;
    let stuckCount = 0;

    for (const [issueId, workerId] of convoy.workers.entries()) {
      const health = await this.checkWorkerHealth(workerId, issueId);

      if (health === 'healthy') {
        healthyCount++;
      } else if (health === 'stale') {
        staleCount++;
        await this.handleStaleWorker(workerId, issueId, convoy);
      } else if (health === 'stuck') {
        stuckCount++;
        await this.handleStuckWorker(workerId, issueId, convoy);
      }
    }

    // Log health summary
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Health check: ${healthyCount} healthy, ${staleCount} stale, ${stuckCount} stuck`);
  }

  /**
   * Check individual worker health.
   */
  private async checkWorkerHealth(workerId: string, issueId: string): Promise<HealthStatus> {
    try {
      const signal = await readWorkerSignal(workerId);

      if (!signal) {
        // No signal file = worker hasn't started or crashed
        return 'stuck';
      }

      // Worker already completed or failed
      if (signal.status === 'completed' || signal.status === 'failed') {
        return 'healthy'; // Terminal state, no intervention needed
      }

      // Check staleness based on last update time
      const now = Date.now();
      const lastUpdate = new Date(signal.updatedAt).getTime();
      const minutesStale = (now - lastUpdate) / (1000 * 60);

      if (minutesStale > this.config.terminationThreshold) {
        return 'stuck';
      } else if (minutesStale > this.config.staleThreshold) {
        return 'stale';
      }

      return 'healthy';
    } catch (error) {
      console.error(`Error checking worker ${workerId} health:`, error);
      return 'stuck'; // Assume stuck if we can't read signal
    }
  }

  /**
   * Handle stale worker (Tier 1 & 2: nudge or escalate).
   */
  private async handleStaleWorker(
    workerId: string,
    issueId: string,
    convoy: Convoy
  ): Promise<void> {
    const signal = await readWorkerSignal(workerId);

    if (!signal) return;

    const now = Date.now();
    const lastUpdate = new Date(signal.updatedAt).getTime();
    const minutesStale = (now - lastUpdate) / (1000 * 60);

    if (minutesStale > this.config.escalationThreshold) {
      // Tier 2: Escalate to blocker (40+ min)
      console.log(`⚠️  Worker ${workerId} stale for ${minutesStale.toFixed(1)} min, escalating to blocker`);

      await this.escalateToBlocker(workerId, issueId, convoy, minutesStale);
    } else if (minutesStale > this.config.staleThreshold) {
      // Tier 1: Auto-nudge (20+ min)
      console.log(`⏰ Worker ${workerId} stale for ${minutesStale.toFixed(1)} min, sending nudge`);

      await this.nudgeWorker(workerId, issueId, minutesStale);
    }
  }

  /**
   * Handle stuck worker (Tier 3: terminate).
   */
  private async handleStuckWorker(
    workerId: string,
    issueId: string,
    convoy: Convoy
  ): Promise<void> {
    const signal = await readWorkerSignal(workerId);

    const staleDuration = signal
      ? (Date.now() - new Date(signal.updatedAt).getTime()) / (1000 * 60)
      : this.config.terminationThreshold + 1;

    console.log(`🛑 Worker ${workerId} stuck (${staleDuration.toFixed(1)} min), terminating`);

    // Create blocker issue before termination
    await createBlockerIssue(
      workerId,
      issueId,
      `Worker stuck for ${staleDuration.toFixed(1)} minutes, terminated by witness`,
      convoy.id
    );

    // Terminate worker
    await terminateWorker(workerId);
  }

  /**
   * Tier 1: Auto-nudge worker.
   *
   * Writes a command file that the worker checks on next loop.
   */
  private async nudgeWorker(
    workerId: string,
    issueId: string,
    minutesStale: number
  ): Promise<void> {
    const command: WorkerCommand = {
      command: 'nudge',
      reason: `Stale for ${minutesStale.toFixed(1)} minutes, checking in`,
      timestamp: new Date().toISOString()
    };

    await this.writeWorkerCommand(workerId, command);
  }

  /**
   * Tier 2: Escalate to blocker issue.
   *
   * Creates a Beads blocker issue for human intervention.
   */
  private async escalateToBlocker(
    workerId: string,
    issueId: string,
    convoy: Convoy,
    minutesStale: number
  ): Promise<void> {
    const blockerId = await createBlockerIssue(
      workerId,
      issueId,
      `Worker stale for ${minutesStale.toFixed(1)} minutes`,
      convoy.id
    );

    if (blockerId) {
      console.log(`  Created blocker issue: ${blockerId}`);
    }

    // Also write escalate command
    const command: WorkerCommand = {
      command: 'escalate',
      reason: `Stale for ${minutesStale.toFixed(1)} minutes, blocker issue created`,
      timestamp: new Date().toISOString()
    };

    await this.writeWorkerCommand(workerId, command);
  }

  /**
   * Write command file for worker.
   *
   * File-based bidirectional communication: coordinator → worker.
   */
  private async writeWorkerCommand(workerId: string, command: WorkerCommand): Promise<void> {
    const workerDir = path.join(process.cwd(), '.orchestration', 'workers', workerId);
    const commandPath = path.join(workerDir, 'commands.json');

    try {
      await fs.mkdir(workerDir, { recursive: true });
      await fs.writeFile(commandPath, JSON.stringify(command, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to write command for worker ${workerId}:`, error);
    }
  }

  /**
   * Load convoy with error handling.
   */
  private async loadConvoy(): Promise<Convoy | null> {
    try {
      const loaded = await loadConvoy(this.config.convoyId, this.config.epicId);
      return loaded ? loaded.convoy : null;
    } catch (error) {
      console.error('Failed to load convoy:', error);
      return null;
    }
  }

  /**
   * Sleep helper.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Check if worker should be nudged based on command history.
 *
 * Prevents excessive nudging (max once per poll interval).
 */
export async function shouldNudgeWorker(workerId: string): Promise<boolean> {
  const commandPath = path.join(
    process.cwd(),
    '.orchestration',
    'workers',
    workerId,
    'commands.json'
  );

  try {
    const content = await fs.readFile(commandPath, 'utf-8');
    const command: WorkerCommand = JSON.parse(content);

    // Don't nudge if we already nudged in the last 5 minutes
    const lastNudge = new Date(command.timestamp).getTime();
    const now = Date.now();
    const minutesSinceNudge = (now - lastNudge) / (1000 * 60);

    if (command.command === 'nudge' && minutesSinceNudge < 5) {
      return false; // Too soon
    }

    return true;
  } catch (error) {
    // No command file or invalid = OK to nudge
    return true;
  }
}

/**
 * Generate health report for convoy.
 *
 * Useful for CLI status display.
 */
export async function generateHealthReport(
  convoyId: string,
  epicId?: string
): Promise<HealthReport> {
  const loaded = await loadConvoy(convoyId, epicId);

  if (!loaded) {
    return {
      healthy: 0,
      completed: 0,
      failed: 0,
      stale: 0,
      staleWorkerIds: []
    };
  }

  const report: HealthReport = {
    healthy: 0,
    completed: 0,
    failed: 0,
    stale: 0,
    staleWorkerIds: []
  };

  const now = Date.now();
  const staleThresholdMs = DEFAULT_WITNESS_CONFIG.staleThreshold * 60 * 1000;

  for (const [issueId, workerId] of loaded.convoy.workers.entries()) {
    try {
      const signal = await readWorkerSignal(workerId);

      if (!signal) {
        report.stale++;
        report.staleWorkerIds.push(workerId);
        continue;
      }

      if (signal.status === 'completed') {
        report.completed++;
      } else if (signal.status === 'failed') {
        report.failed++;
      } else {
        // Check if stale
        const lastUpdate = new Date(signal.updatedAt).getTime();
        if (now - lastUpdate > staleThresholdMs) {
          report.stale++;
          report.staleWorkerIds.push(workerId);
        } else {
          report.healthy++;
        }
      }
    } catch (error) {
      report.stale++;
      report.staleWorkerIds.push(workerId);
    }
  }

  return report;
}

/**
 * Start witness monitoring (convenience wrapper).
 */
export async function startWitness(config: WitnessConfig): Promise<Witness> {
  const witness = new Witness(config);

  // Start monitoring in background (non-blocking)
  witness.monitor().catch(error => {
    console.error('Witness monitoring error:', error);
  });

  return witness;
}

/**
 * Stop witness monitoring for a convoy.
 *
 * Useful for cleanup or manual intervention.
 */
export async function stopWitness(witness: Witness): Promise<void> {
  witness.stop();
}
