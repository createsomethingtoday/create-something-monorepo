/**
 * @create-something/orchestration
 *
 * CLI commands for witness management.
 */

import { Command } from 'commander';
import { startWitness, stopWitness, generateHealthReport, type Witness, type WitnessConfig, DEFAULT_WITNESS_CONFIG } from '../coordinator/witness.js';
import { loadConvoy } from '../coordinator/convoy.js';

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
    .option('--poll-interval <seconds>', 'Seconds between health checks', String(DEFAULT_WITNESS_CONFIG.pollInterval))
    .option('--stale-threshold <minutes>', 'Minutes without checkpoint = stale', String(DEFAULT_WITNESS_CONFIG.staleThreshold))
    .option('--escalation-threshold <minutes>', 'Minutes without checkpoint = escalate', String(DEFAULT_WITNESS_CONFIG.escalationThreshold))
    .option('--termination-threshold <minutes>', 'Minutes without checkpoint = terminate', String(DEFAULT_WITNESS_CONFIG.terminationThreshold))
    .action(async (convoyId: string, options) => {
      try {
        // Verify convoy exists
        const loaded = await loadConvoy(convoyId, options.epic);
        if (!loaded) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;

        // Validate convoy is active
        if (convoy.status !== 'active') {
          console.error(`Cannot start witness for ${convoy.status} convoy`);
          console.error(`Convoy must be active (current: ${convoy.status})`);
          process.exit(1);
        }

        // Build witness config
        const witnessConfig: WitnessConfig = {
          convoyId,
          epicId: options.epic || convoy.epicId,
          pollInterval: parseInt(options.pollInterval, 10),
          staleThreshold: parseInt(options.staleThreshold, 10),
          escalationThreshold: parseInt(options.escalationThreshold, 10),
          terminationThreshold: parseInt(options.terminationThreshold, 10),
        };

        // Validate thresholds
        if (witnessConfig.staleThreshold >= witnessConfig.escalationThreshold) {
          console.error('Error: stale-threshold must be less than escalation-threshold');
          process.exit(1);
        }
        if (witnessConfig.escalationThreshold >= witnessConfig.terminationThreshold) {
          console.error('Error: escalation-threshold must be less than termination-threshold');
          process.exit(1);
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

        // Start witness (blocks until convoy completes or witness is stopped)
        await startWitness(witnessConfig);

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
    .action(async (convoyId: string, options) => {
      try {
        // Note: In practice, this would need to track running witness instances
        // For Phase 3, this is a placeholder
        console.log(`Stopping witness for convoy ${convoyId}...`);
        console.log('');
        console.log('Note: Witness stop requires process management not yet implemented.');
        console.log('For now, use Ctrl+C to stop a running witness.');

        // TODO: Implement witness process tracking and termination
        // This would require storing witness PIDs or using Task API for termination

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
        // Generate health report
        const report = await generateHealthReport(convoyId, options.epic);

        // Load convoy for context
        const loaded = await loadConvoy(convoyId, options.epic);
        if (!loaded) {
          console.error(`Convoy ${convoyId} not found`);
          process.exit(1);
        }

        const { convoy } = loaded;

        console.log(`\n=== Witness Health Report ===`);
        console.log(`Convoy: ${convoy.name} (${convoy.id})`);
        console.log(`Status: ${convoy.status}`);
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

        // Provide action recommendations
        console.log('');
        if (report.stale > 0) {
          console.log('⚠️  Recommendations:');
          console.log('  - Check worker logs for blocked tasks');
          console.log(`  - Consider starting witness: orch witness start ${convoyId}`);
          console.log('  - Manually nudge stale workers if needed');
        } else if (report.healthy > 0) {
          console.log('✓ All workers are healthy');
        } else if (report.completed === convoy.workers.size) {
          console.log('✓ All workers have completed');
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
        // Show current defaults
        if (options.show || Object.keys(options).length === 0) {
          console.log('\n=== Default Witness Configuration ===');
          console.log(`Poll interval: ${DEFAULT_WITNESS_CONFIG.pollInterval}s`);
          console.log(`Stale threshold: ${DEFAULT_WITNESS_CONFIG.staleThreshold} min`);
          console.log(`Escalation threshold: ${DEFAULT_WITNESS_CONFIG.escalationThreshold} min`);
          console.log(`Termination threshold: ${DEFAULT_WITNESS_CONFIG.terminationThreshold} min`);
          console.log('');
          console.log('Use --poll-interval, --stale-threshold, etc. to update defaults');
          return;
        }

        // Update configuration (Phase 4: would persist to config file)
        console.log('Note: Configuration updates not yet persisted.');
        console.log('For now, pass options to `orch witness start` command.');

        // TODO: Implement config file persistence
        // This would save to .orchestration/config.json or similar

      } catch (error) {
        console.error('Error managing witness config:', error);
        process.exit(1);
      }
    });

  return witness;
}
