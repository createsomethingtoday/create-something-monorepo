#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * gt-status: CLI status dashboard for Gas Town orchestration.
 * Upstream pattern from Gas Town v0.2.2+.
 *
 * Philosophy: Operational visibility without context switching.
 * The dashboard shows what matters; details are a command away.
 *
 * Usage:
 *   gt-status                    # Show current status
 *   gt-status --watch            # Live updates (refresh every 2s)
 *   gt-status --json             # JSON output for scripting
 *   gt-status --convoy <id>      # Focus on specific convoy
 */

import { execSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WorkerStatus {
  id: string;
  issueId: string | null;
  status: 'idle' | 'working' | 'blocked' | 'completed' | 'error';
  runtime: string;
  startedAt: string | null;
  lastActivity: string | null;
}

interface ConvoyStatus {
  id: string;
  name: string;
  totalIssues: number;
  completed: number;
  inProgress: number;
  failed: number;
  pending: number;
  createdAt: string;
}

interface RigStatus {
  name: string;
  state: 'active' | 'parked' | 'docked';
  workers: WorkerStatus[];
  convoys: ConvoyStatus[];
}

interface DashboardState {
  timestamp: string;
  rigs: RigStatus[];
  activeConvoys: number;
  totalWorkers: number;
  workersActive: number;
  workersIdle: number;
  recentActivity: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Collection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Collect worker statuses from orchestration directories.
 */
function collectWorkers(cwd: string): WorkerStatus[] {
  const workers: WorkerStatus[] = [];
  
  const workerDirs = [
    join(cwd, '.orchestration', 'workers'),
    join(cwd, '.gastown', 'workers'),
  ];

  for (const workerDir of workerDirs) {
    if (existsSync(workerDir)) {
      try {
        const dirs = readdirSync(workerDir);
        for (const dir of dirs) {
          const statusFile = join(workerDir, dir, 'status.json');
          if (existsSync(statusFile)) {
            try {
              const content = readFileSync(statusFile, 'utf-8');
              const status = JSON.parse(content);
              workers.push({
                id: status.workerId ?? dir,
                issueId: status.issueId ?? null,
                status: mapStatus(status.status),
                runtime: status.runtime ?? 'claude',
                startedAt: status.startedAt ?? null,
                lastActivity: status.completedAt ?? status.updatedAt ?? null,
              });
            } catch {
              // Skip malformed status files
            }
          }
        }
      } catch {
        // Directory not readable
      }
    }
  }

  return workers;
}

/**
 * Map various status strings to normalized status.
 */
function mapStatus(status: string): WorkerStatus['status'] {
  const normalized = status?.toLowerCase();
  if (!normalized) return 'idle';
  if (normalized === 'completed' || normalized === 'done') return 'completed';
  if (normalized === 'working' || normalized === 'in_progress' || normalized === 'active') return 'working';
  if (normalized === 'blocked' || normalized === 'stuck') return 'blocked';
  if (normalized === 'error' || normalized === 'failed') return 'error';
  return 'idle';
}

/**
 * Collect convoy statuses.
 */
function collectConvoys(cwd: string): ConvoyStatus[] {
  const convoys: ConvoyStatus[] = [];
  
  const convoyDirs = [
    join(cwd, '.orchestration', 'convoys'),
    join(cwd, '.gastown', 'convoys'),
  ];

  for (const convoyDir of convoyDirs) {
    if (existsSync(convoyDir)) {
      try {
        const files = readdirSync(convoyDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
          try {
            const content = readFileSync(join(convoyDir, file), 'utf-8');
            const convoy = JSON.parse(content);
            convoys.push({
              id: convoy.id ?? file.replace('.json', ''),
              name: convoy.name ?? 'Unnamed',
              totalIssues: convoy.issues?.length ?? 0,
              completed: convoy.completed?.length ?? 0,
              inProgress: convoy.inProgress?.length ?? 0,
              failed: convoy.failed?.length ?? 0,
              pending: (convoy.issues?.length ?? 0) - (convoy.completed?.length ?? 0) - (convoy.inProgress?.length ?? 0) - (convoy.failed?.length ?? 0),
              createdAt: convoy.createdAt ?? new Date().toISOString(),
            });
          } catch {
            // Skip malformed convoy files
          }
        }
      } catch {
        // Directory not readable
      }
    }
  }

  return convoys;
}

/**
 * Get recent activity from various sources.
 */
function getRecentActivity(cwd: string): string[] {
  const activity: string[] = [];

  // Recent git commits
  try {
    const commits = execSync('git log --oneline -3 --no-decorate 2>/dev/null', {
      cwd,
      encoding: 'utf-8',
    }).trim().split('\n').filter(Boolean);
    
    for (const commit of commits) {
      activity.push(`[git] ${commit}`);
    }
  } catch {
    // Git not available
  }

  // Recent mail (if any)
  const mailDirs = [
    join(cwd, '.orchestration', 'mail'),
    join(cwd, '.gastown', 'mail', 'inbox'),
  ];

  for (const mailDir of mailDirs) {
    if (existsSync(mailDir)) {
      try {
        const files = readdirSync(mailDir)
          .filter(f => f.endsWith('.json'))
          .slice(0, 3);
        
        for (const file of files) {
          try {
            const content = readFileSync(join(mailDir, file), 'utf-8');
            const msg = JSON.parse(content);
            activity.push(`[mail] ${msg.type ?? 'MSG'}: ${msg.subject ?? file}`);
          } catch {
            // Skip
          }
        }
      } catch {
        // Directory not readable
      }
    }
  }

  return activity.slice(0, 5);
}

/**
 * Get rig state (parked/docked).
 */
function getRigState(cwd: string): 'active' | 'parked' | 'docked' {
  const stateFile = join(cwd, '.gastown', 'rig-state.json');
  if (existsSync(stateFile)) {
    try {
      const content = readFileSync(stateFile, 'utf-8');
      const state = JSON.parse(content);
      if (state.docked) return 'docked';
      if (state.parked) return 'parked';
    } catch {
      // Fall through to active
    }
  }
  return 'active';
}

/**
 * Collect full dashboard state.
 */
function collectDashboardState(cwd: string): DashboardState {
  const workers = collectWorkers(cwd);
  const convoys = collectConvoys(cwd);
  const rigState = getRigState(cwd);
  const activity = getRecentActivity(cwd);

  return {
    timestamp: new Date().toISOString(),
    rigs: [{
      name: 'csm',
      state: rigState,
      workers,
      convoys,
    }],
    activeConvoys: convoys.filter(c => c.inProgress > 0 || c.pending > 0).length,
    totalWorkers: workers.length,
    workersActive: workers.filter(w => w.status === 'working').length,
    workersIdle: workers.filter(w => w.status === 'idle').length,
    recentActivity: activity,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function statusColor(status: WorkerStatus['status']): string {
  switch (status) {
    case 'working': return COLORS.green;
    case 'completed': return COLORS.blue;
    case 'blocked': return COLORS.yellow;
    case 'error': return COLORS.red;
    default: return COLORS.dim;
  }
}

function statusIcon(status: WorkerStatus['status']): string {
  switch (status) {
    case 'working': return '●';
    case 'completed': return '✓';
    case 'blocked': return '!';
    case 'error': return '✗';
    default: return '○';
  }
}

function rigStateIcon(state: 'active' | 'parked' | 'docked'): string {
  switch (state) {
    case 'active': return '🟢';
    case 'parked': return '🟡';
    case 'docked': return '🔴';
  }
}

function formatDashboard(state: DashboardState): string {
  const lines: string[] = [];

  // Header
  lines.push(`${COLORS.bold}╭─────────────────────────────────────────────────╮${COLORS.reset}`);
  lines.push(`${COLORS.bold}│  Gas Town Status Dashboard                      │${COLORS.reset}`);
  lines.push(`${COLORS.bold}╰─────────────────────────────────────────────────╯${COLORS.reset}`);
  lines.push('');

  // Summary
  lines.push(`${COLORS.bold}Summary${COLORS.reset}`);
  lines.push(`  Workers: ${state.workersActive} active, ${state.workersIdle} idle (${state.totalWorkers} total)`);
  lines.push(`  Convoys: ${state.activeConvoys} active`);
  lines.push(`  Updated: ${new Date(state.timestamp).toLocaleTimeString()}`);
  lines.push('');

  // Rigs
  for (const rig of state.rigs) {
    lines.push(`${COLORS.bold}Rig: ${rig.name}${COLORS.reset} ${rigStateIcon(rig.state)} ${rig.state}`);
    lines.push('');

    // Workers
    if (rig.workers.length > 0) {
      lines.push(`  ${COLORS.bold}Workers${COLORS.reset}`);
      for (const worker of rig.workers) {
        const color = statusColor(worker.status);
        const icon = statusIcon(worker.status);
        const issue = worker.issueId ? ` → ${worker.issueId}` : '';
        lines.push(`    ${color}${icon}${COLORS.reset} ${worker.id}${issue} [${worker.runtime}]`);
      }
      lines.push('');
    }

    // Convoys
    if (rig.convoys.length > 0) {
      lines.push(`  ${COLORS.bold}Convoys${COLORS.reset}`);
      for (const convoy of rig.convoys) {
        const progress = convoy.totalIssues > 0 
          ? Math.round((convoy.completed / convoy.totalIssues) * 100)
          : 0;
        const progressBar = createProgressBar(progress, 20);
        lines.push(`    ${convoy.name} (${convoy.id})`);
        lines.push(`      ${progressBar} ${progress}% (${convoy.completed}/${convoy.totalIssues})`);
        if (convoy.inProgress > 0) {
          lines.push(`      ${COLORS.green}${convoy.inProgress} in progress${COLORS.reset}`);
        }
        if (convoy.failed > 0) {
          lines.push(`      ${COLORS.red}${convoy.failed} failed${COLORS.reset}`);
        }
      }
      lines.push('');
    }
  }

  // Recent activity
  if (state.recentActivity.length > 0) {
    lines.push(`${COLORS.bold}Recent Activity${COLORS.reset}`);
    for (const activity of state.recentActivity) {
      lines.push(`  ${COLORS.dim}${activity}${COLORS.reset}`);
    }
    lines.push('');
  }

  // Footer
  lines.push(`${COLORS.dim}Press Ctrl+C to exit${COLORS.reset}`);

  return lines.join('\n');
}

function createProgressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${COLORS.green}${'█'.repeat(filled)}${COLORS.reset}${COLORS.dim}${'░'.repeat(empty)}${COLORS.reset}]`;
}

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  // Parse arguments
  const options = {
    watch: false,
    json: false,
    convoy: null as string | null,
    help: false,
    interval: 2000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--watch' || arg === '-w') {
      options.watch = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--convoy' && args[i + 1]) {
      options.convoy = args[++i];
    } else if (arg === '--interval' && args[i + 1]) {
      options.interval = parseInt(args[++i], 10) || 2000;
    }
  }

  if (options.help) {
    console.log(`
gt-status: CLI status dashboard for Gas Town orchestration

Usage:
  gt-status                    # Show current status
  gt-status --watch            # Live updates (refresh every 2s)
  gt-status --json             # JSON output for scripting
  gt-status --convoy <id>      # Focus on specific convoy
  gt-status --interval <ms>    # Custom refresh interval (default: 2000)

Dashboard shows:
- Worker status (idle, working, blocked, error, completed)
- Convoy progress with visual progress bars
- Rig state (active, parked, docked)
- Recent activity from git and mail

Related commands:
  gt-prime    # Context recovery
  gt hook     # Check current hook assignment
  gt convoy list  # Detailed convoy listing
`);
    process.exit(0);
  }

  if (options.watch) {
    // Watch mode with live updates
    const update = () => {
      const state = collectDashboardState(cwd);
      
      if (options.json) {
        clearScreen();
        console.log(JSON.stringify(state, null, 2));
      } else {
        clearScreen();
        console.log(formatDashboard(state));
      }
    };

    // Initial render
    update();

    // Set up interval
    const intervalId = setInterval(update, options.interval);

    // Handle exit
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log('\n\nExiting...');
      process.exit(0);
    });
  } else {
    // Single snapshot
    const state = collectDashboardState(cwd);
    
    if (options.json) {
      console.log(JSON.stringify(state, null, 2));
    } else {
      console.log(formatDashboard(state));
    }
  }
}

main();
