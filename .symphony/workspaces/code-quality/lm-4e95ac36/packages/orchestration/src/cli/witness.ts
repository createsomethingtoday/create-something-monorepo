/**
 * @create-something/orchestration
 *
 * CLI commands for witness management.
 */

import { spawn } from 'node:child_process';
import { Command } from 'commander';
import {
  Witness,
  generateHealthReport,
  loadWitnessDefaults,
  readWitnessRuntimeState,
  removeWitnessRuntimeState,
  saveWitnessDefaults,
  stopWitnessProcess,
  writeWitnessRuntimeState,
  type WitnessConfig,
  validateWitnessThresholds,
} from '../coordinator/witness.js';
import { loadConvoy } from '../coordinator/convoy.js';

function parseNumberOption(
  value: string | undefined,
  fallback: number,
  name: string
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return parsed;
}

function buildDetachedWitnessArgs(convoyId: string, witnessConfig: WitnessConfig): string[] {
  const args = [
    'witness',
    'start',
    convoyId,
    '--poll-interval',
    String(witnessConfig.pollInterval),
    '--stale-threshold',
    String(witnessConfig.staleThreshold),
    '--escalation-threshold',
    String(witnessConfig.escalationThreshold),
    '--termination-threshold',
    String(witnessConfig.terminationThreshold),
  ];
  if (witnessConfig.epicId) {
    args.push('--epic', witnessConfig.epicId);
  }
  return args;
}

/**
 * Create witness CLI command group.
 */
export function createWitnessCommand(): Command {
  const witness = new Command('witness');
  witness.description('Manage witness monitoring for convoys');

  // orch witness start <convoy-id>
  witness
    .command('start <convoyId>')
    .description('Start witness monitoring for a convoy')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .option('--poll-interval <seconds>', 'Seconds between health checks')
    .option('--stale-threshold <minutes>', 'Minutes without checkpoint = stale')
    .option('--escalation-threshold <minutes>', 'Minutes without checkpoint = escalate')
    .option('--termination-threshold <minutes>', 'Minutes without checkpoint = terminate')
    .option('--detach', 'Run witness monitor as a detached background process')
    .action(async (convoyId: string, options) => {
      try {
        const loaded = await loadConvoy(convoyId, options.epic);
        if (!loaded) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;
        if (convoy.status !== 'active') {
          console.error(`Cannot start witness for ${convoy.status} convoy`);
          console.error(`Convoy must be active (current: ${convoy.status})`);
          process.exit(1);
        }

        const defaults = await loadWitnessDefaults();
        const witnessConfig: WitnessConfig = {
          convoyId,
          epicId: options.epic || convoy.epicId,
          pollInterval: parseNumberOption(options.pollInterval, defaults.pollInterval, 'poll-interval'),
          staleThreshold: parseNumberOption(options.staleThreshold, defaults.staleThreshold, 'stale-threshold'),
          escalationThreshold: parseNumberOption(options.escalationThreshold, defaults.escalationThreshold, 'escalation-threshold'),
          terminationThreshold: parseNumberOption(options.terminationThreshold, defaults.terminationThreshold, 'termination-threshold'),
        };
        validateWitnessThresholds(witnessConfig);

        if (options.detach) {
          const cliEntry = process.argv[1];
          if (!cliEntry) {
            throw new Error('Unable to determine CLI entrypoint for detach mode.');
          }
          const child = spawn(process.execPath, [cliEntry, ...buildDetachedWitnessArgs(convoyId, witnessConfig)], {
            detached: true,
            stdio: 'ignore',
            cwd: process.cwd(),
            env: process.env,
          });
          child.unref();
          console.log(`Detached witness started for convoy ${convoyId} (pid ${child.pid ?? 'unknown'}).`);
          return;
        }

        const existing = await readWitnessRuntimeState(convoyId);
        if (existing) {
          try {
            process.kill(existing.pid, 0);
            console.error(`Witness already running for ${convoyId} (pid ${existing.pid}).`);
            process.exit(1);
          } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ESRCH') {
              await removeWitnessRuntimeState(convoyId);
            }
          }
        }

        console.log(`\nStarting witness for convoy: ${convoy.name}`);
        console.log(`Convoy ID: ${convoyId}`);
        console.log(`Workers: ${convoy.workers.size}`);
        console.log('');
        console.log('Configuration:');
        console.log(`  Poll interval: ${witnessConfig.pollInterval}s`);
        console.log(`  Stale threshold: ${witnessConfig.staleThreshold} min`);
        console.log(`  Escalation threshold: ${witnessConfig.escalationThreshold} min`);
        console.log(`  Termination threshold: ${witnessConfig.terminationThreshold} min`);
        console.log('');

        await removeWitnessRuntimeState(convoyId);
        await writeWitnessRuntimeState({
          convoyId,
          epicId: witnessConfig.epicId,
          pid: process.pid,
          startedAt: new Date().toISOString(),
          config: {
            pollInterval: witnessConfig.pollInterval,
            staleThreshold: witnessConfig.staleThreshold,
            escalationThreshold: witnessConfig.escalationThreshold,
            terminationThreshold: witnessConfig.terminationThreshold,
          },
        });

        const runningWitness = new Witness(witnessConfig);
        const onTerminate = () => {
          runningWitness.stop();
        };
        process.on('SIGTERM', onTerminate);
        process.on('SIGINT', onTerminate);

        try {
          await runningWitness.monitor();
        } finally {
          process.off('SIGTERM', onTerminate);
          process.off('SIGINT', onTerminate);
          await removeWitnessRuntimeState(convoyId);
        }
      } catch (error) {
        console.error('Error starting witness:', error);
        process.exit(1);
      }
    });

  // orch witness stop <convoy-id>
  witness
    .command('stop <convoyId>')
    .description('Stop witness monitoring for a convoy')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .action(async (convoyId: string) => {
      try {
        const result = await stopWitnessProcess(convoyId);
        if (!result.stopped) {
          console.error(result.message);
          process.exit(1);
        }
        console.log(result.message);
      } catch (error) {
        console.error('Error stopping witness:', error);
        process.exit(1);
      }
    });

  // orch witness status <convoy-id>
  witness
    .command('status <convoyId>')
    .description('Show convoy health status from witness perspective')
    .option('--epic <id>', 'Epic ID (for faster lookup)')
    .action(async (convoyId: string, options) => {
      try {
        const report = await generateHealthReport(convoyId, options.epic);
        const loaded = await loadConvoy(convoyId, options.epic);
        if (!loaded) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;
        const state = await readWitnessRuntimeState(convoyId);

        console.log(`\n=== Witness Health Report ===`);
        console.log(`Convoy: ${convoy.name} (${convoy.id})`);
        console.log(`Status: ${convoy.status}`);
        if (state) {
          console.log(`Witness PID: ${state.pid}`);
          console.log(`Witness Started: ${state.startedAt}`);
        } else {
          console.log(`Witness PID: not running`);
        }
        console.log('');

        console.log(`--- Worker Health ---`);
        console.log(`Healthy: ${report.healthy}`);
        console.log(`Completed: ${report.completed}`);
        console.log(`Failed: ${report.failed}`);
        console.log(`Stale: ${report.stale}`);

        if (report.staleWorkerIds.length > 0) {
          console.log('');
          console.log('Stale Workers:');
          for (const workerId of report.staleWorkerIds) {
            console.log(`  - ${workerId}`);
          }
        }
      } catch (error) {
        console.error('Error checking witness status:', error);
        process.exit(1);
      }
    });

  // orch witness config
  witness
    .command('config')
    .description('Show or update default witness configuration')
    .option('--show', 'Show current default configuration')
    .option('--poll-interval <seconds>', 'Set default poll interval')
    .option('--stale-threshold <minutes>', 'Set default stale threshold')
    .option('--escalation-threshold <minutes>', 'Set default escalation threshold')
    .option('--termination-threshold <minutes>', 'Set default termination threshold')
    .action(async (options) => {
      try {
        const current = await loadWitnessDefaults();
        const hasUpdate =
          Boolean(options.pollInterval) ||
          Boolean(options.staleThreshold) ||
          Boolean(options.escalationThreshold) ||
          Boolean(options.terminationThreshold);

        if (options.show || !hasUpdate) {
          console.log('\n=== Default Witness Configuration ===');
          console.log(`Poll interval: ${current.pollInterval}s`);
          console.log(`Stale threshold: ${current.staleThreshold} min`);
          console.log(`Escalation threshold: ${current.escalationThreshold} min`);
          console.log(`Termination threshold: ${current.terminationThreshold} min`);
          return;
        }

        const updated = {
          pollInterval: parseNumberOption(options.pollInterval, current.pollInterval, 'poll-interval'),
          staleThreshold: parseNumberOption(options.staleThreshold, current.staleThreshold, 'stale-threshold'),
          escalationThreshold: parseNumberOption(options.escalationThreshold, current.escalationThreshold, 'escalation-threshold'),
          terminationThreshold: parseNumberOption(options.terminationThreshold, current.terminationThreshold, 'termination-threshold'),
        };
        validateWitnessThresholds(updated);
        await saveWitnessDefaults(updated);
        console.log('Updated witness defaults.');
      } catch (error) {
        console.error('Error managing witness config:', error);
        process.exit(1);
      }
    });

  return witness;
}
