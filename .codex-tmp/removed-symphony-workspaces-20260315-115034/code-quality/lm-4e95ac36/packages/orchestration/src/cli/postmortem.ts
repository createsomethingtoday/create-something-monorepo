/**
 * @create-something/orchestration
 *
 * CLI commands for postmortem analysis and prevention rule generation.
 *
 * Philosophy: Incidents are learning opportunities. This CLI provides
 * commands to create postmortems, analyze root causes, and apply
 * prevention rules to .claude/rules/ files.
 */

import { Command } from 'commander';
import { formatDate } from '../utils/format.js';
import {
  createPostmortem,
  analyzeRootCause,
  generatePreventionRules,
  savePostmortem,
  loadPostmortem,
  listPostmortems,
  updatePostmortemStatus,
  applyAllRules,
  formatPostmortemReport,
  DEFAULT_POSTMORTEM_CONFIG,
} from '../postmortem/index.js';
import type { PostmortemConfig, PostmortemStatus } from '../postmortem/index.js';

/**
 * Create the postmortem command.
 */
export function createPostmortemCommand(): Command {
  const postmortem = new Command('postmortem')
    .description('Incident postmortem analysis and prevention rules');

  // orch postmortem create
  postmortem
    .command('create')
    .description('Create a postmortem from an incident issue')
    .argument('<issue-id>', 'Issue ID to create postmortem from')
    .option('--auto-analyze', 'Automatically analyze root cause', false)
    .option('--auto-rules', 'Automatically generate prevention rules', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (issueId: string, options) => {
      try {
        console.log(`📋 Creating postmortem for issue: ${issueId}`);
        console.log('');

        const config: PostmortemConfig = {
          ...DEFAULT_POSTMORTEM_CONFIG,
          autoGenerateRules: options.autoRules,
        };

        // Create postmortem
        const pm = await createPostmortem(issueId, config, options.cwd);
        console.log(`✓ Postmortem created: ${pm.id}`);

        // Auto-analyze if requested
        if (options.autoAnalyze) {
          console.log('');
          console.log('Analyzing root cause...');
          pm.rootCause = await analyzeRootCause(pm, options.cwd);
          pm.status = 'analyzing';
          console.log(`  Category: ${pm.rootCause.category}`);
          console.log(`  Files: ${pm.rootCause.files.length}`);
          console.log(`  Contributing factors: ${pm.rootCause.contributingFactors.length}`);
        }

        // Auto-generate rules if requested
        if (options.autoRules) {
          console.log('');
          console.log('Generating prevention rules...');
          pm.preventionRules = generatePreventionRules(pm, config);
          pm.status = 'review';
          console.log(`  Rules generated: ${pm.preventionRules.length}`);
        }

        // Save postmortem
        const stored = await savePostmortem(pm, config, options.cwd);

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Postmortem: ${pm.id}`);
        console.log(`  Status: ${pm.status}`);
        console.log(`  Rules: ${pm.preventionRules.length}`);
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        console.log('Next steps:');
        if (pm.status === 'draft') {
          console.log(`  1. Analyze: orch postmortem analyze ${pm.id}`);
        }
        if (pm.status === 'analyzing' || pm.status === 'draft') {
          console.log(`  2. Generate rules: orch postmortem rules ${pm.id}`);
        }
        if (pm.preventionRules.length > 0) {
          console.log(`  3. Review: orch postmortem show ${pm.id}`);
          console.log(`  4. Approve: orch postmortem approve ${pm.id}`);
          console.log(`  5. Apply: orch postmortem apply ${pm.id}`);
        }
      } catch (error) {
        console.error('Failed to create postmortem:', error);
        process.exit(1);
      }
    });

  // orch postmortem analyze
  postmortem
    .command('analyze')
    .description('Analyze root cause of a postmortem')
    .argument('<postmortem-id>', 'Postmortem ID')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (postmortemId: string, options) => {
      try {
        console.log(`🔍 Analyzing postmortem: ${postmortemId}`);
        console.log('');

        const stored = await loadPostmortem(postmortemId, options.cwd);

        if (!stored) {
          console.error(`Postmortem not found: ${postmortemId}`);
          process.exit(1);
        }

        const pm = stored.postmortem;

        // Analyze root cause
        pm.rootCause = await analyzeRootCause(pm, options.cwd);
        pm.status = 'analyzing';

        // Update stored
        stored.updatedAt = new Date().toISOString();
        await savePostmortem(pm, stored.config, options.cwd);

        console.log('Root Cause Analysis');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');
        console.log(`Category: ${pm.rootCause.category}`);
        console.log('');
        console.log(pm.rootCause.description);
        console.log('');

        if (pm.rootCause.codePattern) {
          console.log('Code pattern:');
          console.log(`  ${pm.rootCause.codePattern}`);
          console.log('');
        }

        if (pm.rootCause.files.length > 0) {
          console.log('Files involved:');
          for (const file of pm.rootCause.files) {
            console.log(`  - ${file}`);
          }
          console.log('');
        }

        if (pm.rootCause.contributingFactors.length > 0) {
          console.log('Contributing factors:');
          for (const factor of pm.rootCause.contributingFactors) {
            console.log(`  - ${factor}`);
          }
          console.log('');
        }

        if (pm.rootCause.safeguardGaps.length > 0) {
          console.log('Safeguard gaps:');
          for (const gap of pm.rootCause.safeguardGaps) {
            console.log(`  - ${gap}`);
          }
          console.log('');
        }

        console.log('');
        console.log(`Next: orch postmortem rules ${postmortemId}`);
      } catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
      }
    });

  // orch postmortem rules
  postmortem
    .command('rules')
    .description('Generate prevention rules from postmortem')
    .argument('<postmortem-id>', 'Postmortem ID')
    .option('--min-confidence <n>', 'Minimum confidence threshold (0-1)', parseFloat)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (postmortemId: string, options) => {
      try {
        console.log(`📜 Generating rules for: ${postmortemId}`);
        console.log('');

        const stored = await loadPostmortem(postmortemId, options.cwd);

        if (!stored) {
          console.error(`Postmortem not found: ${postmortemId}`);
          process.exit(1);
        }

        const pm = stored.postmortem;
        const config: PostmortemConfig = {
          ...stored.config,
          minConfidence: options.minConfidence ?? stored.config.minConfidence,
        };

        // Generate rules
        pm.preventionRules = generatePreventionRules(pm, config);
        pm.status = 'review';

        // Update stored
        stored.pendingRules = pm.preventionRules.map((r) => r.id);
        stored.updatedAt = new Date().toISOString();
        await savePostmortem(pm, config, options.cwd);

        console.log('Prevention Rules Generated');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        if (pm.preventionRules.length === 0) {
          console.log('No rules generated (below confidence threshold).');
          console.log(`Try lowering --min-confidence (current: ${config.minConfidence})`);
          return;
        }

        for (const rule of pm.preventionRules) {
          const confidence = (rule.confidence * 100).toFixed(0);
          console.log(`[${confidence}%] ${rule.title}`);
          console.log(`  Target: ${rule.targetRuleFile}`);
          console.log(`  Pattern: ${rule.pattern.slice(0, 60)}...`);
          console.log('');
        }

        console.log('');
        console.log('Next steps:');
        console.log(`  Review: orch postmortem show ${postmortemId}`);
        console.log(`  Approve: orch postmortem approve ${postmortemId}`);
        console.log(`  Apply: orch postmortem apply ${postmortemId}`);
      } catch (error) {
        console.error('Rule generation failed:', error);
        process.exit(1);
      }
    });

  // orch postmortem show
  postmortem
    .command('show')
    .description('Show postmortem details')
    .argument('<postmortem-id>', 'Postmortem ID')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (postmortemId: string, options) => {
      try {
        const stored = await loadPostmortem(postmortemId, options.cwd);

        if (!stored) {
          console.error(`Postmortem not found: ${postmortemId}`);
          process.exit(1);
        }

        console.log(formatPostmortemReport(stored.postmortem));
      } catch (error) {
        console.error('Failed to show postmortem:', error);
        process.exit(1);
      }
    });

  // orch postmortem approve
  postmortem
    .command('approve')
    .description('Approve postmortem for rule application')
    .argument('<postmortem-id>', 'Postmortem ID')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (postmortemId: string, options) => {
      try {
        console.log(`✓ Approving postmortem: ${postmortemId}`);

        const stored = await updatePostmortemStatus(postmortemId, 'approved', options.cwd);

        if (!stored) {
          console.error(`Postmortem not found: ${postmortemId}`);
          process.exit(1);
        }

        console.log('');
        console.log(`Status: ${stored.postmortem.status}`);
        console.log(`Pending rules: ${stored.pendingRules.length}`);
        console.log('');
        console.log(`Next: orch postmortem apply ${postmortemId}`);
      } catch (error) {
        console.error('Approval failed:', error);
        process.exit(1);
      }
    });

  // orch postmortem apply
  postmortem
    .command('apply')
    .description('Apply prevention rules to rule files')
    .argument('<postmortem-id>', 'Postmortem ID')
    .option('--force', 'Apply without approval check', false)
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (postmortemId: string, options) => {
      try {
        console.log(`📝 Applying rules from: ${postmortemId}`);
        console.log('');

        const stored = await loadPostmortem(postmortemId, options.cwd);

        if (!stored) {
          console.error(`Postmortem not found: ${postmortemId}`);
          process.exit(1);
        }

        // Check approval
        if (!options.force && stored.postmortem.status !== 'approved') {
          console.error(`Postmortem not approved. Current status: ${stored.postmortem.status}`);
          console.error(`Run: orch postmortem approve ${postmortemId}`);
          console.error('Or use --force to skip approval check.');
          process.exit(1);
        }

        if (stored.pendingRules.length === 0) {
          console.log('No pending rules to apply.');
          return;
        }

        console.log(`Pending rules: ${stored.pendingRules.length}`);
        console.log('');

        const { applied, skipped } = await applyAllRules(stored, options.cwd);

        console.log('');
        console.log(`✓ Applied: ${applied}`);
        console.log(`- Skipped: ${skipped}`);

        if (applied > 0) {
          console.log('');
          console.log('Prevention rules have been added to .claude/rules/ files.');
          console.log('Review and commit the changes.');
        }
      } catch (error) {
        console.error('Apply failed:', error);
        process.exit(1);
      }
    });

  // orch postmortem list
  postmortem
    .command('list')
    .description('List all postmortems')
    .option('--status <status>', 'Filter by status')
    .option('--cwd <path>', 'Working directory', process.cwd())
    .action(async (options) => {
      try {
        let postmortems = await listPostmortems(options.cwd);

        if (options.status) {
          postmortems = postmortems.filter(
            (pm) => pm.postmortem.status === options.status
          );
        }

        if (postmortems.length === 0) {
          console.log('No postmortems found.');
          console.log('');
          console.log('Create one: orch postmortem create <issue-id>');
          return;
        }

        console.log('Postmortems');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('');

        for (const stored of postmortems) {
          const pm = stored.postmortem;
          const statusIcon = getStatusIcon(pm.status);

          console.log(`${statusIcon} ${pm.id}`);
          console.log(`  Issue: ${pm.issueId}`);
          console.log(`  Title: ${pm.title.slice(0, 50)}...`);
          console.log(`  Status: ${pm.status}`);
          console.log(`  Rules: ${pm.preventionRules.length} (${stored.pendingRules.length} pending)`);
          console.log(`  Date: ${formatDate(pm.createdAt)}`);
          console.log('');
        }

        // Summary
        const pending = postmortems.filter((pm) => pm.pendingRules.length > 0);
        if (pending.length > 0) {
          console.log('───────────────────────────────────────────────────────────────');
          console.log(`${pending.length} postmortem(s) with pending rules`);
        }
      } catch (error) {
        console.error('List failed:', error);
        process.exit(1);
      }
    });

  return postmortem;
}

/**
 * Get status icon.
 */
function getStatusIcon(status: PostmortemStatus): string {
  const icons: Record<PostmortemStatus, string> = {
    draft: '○',
    analyzing: '◐',
    review: '◑',
    approved: '◕',
    applied: '●',
    closed: '✓',
  };
  return icons[status] || '?';
}
