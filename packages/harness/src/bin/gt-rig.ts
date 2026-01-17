#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * gt-rig: Rig lifecycle management commands.
 * Upstream pattern from Gas Town v0.2.2+.
 *
 * Philosophy: Control rig lifecycle without losing work.
 * Park pauses work, dock stops everything.
 *
 * Usage:
 *   gt-rig park <rig>      # Pause daemon auto-start (keeps sessions)
 *   gt-rig unpark <rig>    # Resume daemon auto-start
 *   gt-rig dock <rig>      # Stop all sessions, prevent auto-start
 *   gt-rig undock <rig>    # Resume normal operation
 *   gt-rig status <rig>    # Show rig state
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RigState {
  parked: boolean;
  docked: boolean;
  parkedAt: string | null;
  dockedAt: string | null;
  parkedBy: string | null;
  dockedBy: string | null;
  reason: string | null;
}

const DEFAULT_RIG_STATE: RigState = {
  parked: false,
  docked: false,
  parkedAt: null,
  dockedAt: null,
  parkedBy: null,
  dockedBy: null,
  reason: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// State Management
// ─────────────────────────────────────────────────────────────────────────────

function getStatePath(cwd: string): string {
  return join(cwd, '.gastown', 'rig-state.json');
}

function ensureDir(cwd: string): void {
  const gastown = join(cwd, '.gastown');
  if (!existsSync(gastown)) {
    mkdirSync(gastown, { recursive: true });
  }
}

function loadRigState(cwd: string): RigState {
  const statePath = getStatePath(cwd);
  if (existsSync(statePath)) {
    try {
      const content = readFileSync(statePath, 'utf-8');
      return { ...DEFAULT_RIG_STATE, ...JSON.parse(content) };
    } catch {
      return DEFAULT_RIG_STATE;
    }
  }
  return DEFAULT_RIG_STATE;
}

function saveRigState(cwd: string, state: RigState): void {
  ensureDir(cwd);
  const statePath = getStatePath(cwd);
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function getUsername(): string {
  try {
    return execSync('whoami', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Commands
// ─────────────────────────────────────────────────────────────────────────────

function parkRig(cwd: string, rig: string, reason?: string): void {
  const state = loadRigState(cwd);
  
  if (state.docked) {
    console.error(`❌ Rig ${rig} is docked. Undock before parking.`);
    process.exit(1);
  }
  
  if (state.parked) {
    console.log(`ℹ️  Rig ${rig} is already parked.`);
    return;
  }

  state.parked = true;
  state.parkedAt = new Date().toISOString();
  state.parkedBy = getUsername();
  state.reason = reason ?? null;
  
  saveRigState(cwd, state);
  
  console.log(`🟡 Rig ${rig} parked.`);
  console.log(`   Sessions preserved. Daemon auto-start disabled.`);
  if (reason) {
    console.log(`   Reason: ${reason}`);
  }
  console.log(`   Run 'gt-rig unpark ${rig}' to resume.`);
}

function unparkRig(cwd: string, rig: string): void {
  const state = loadRigState(cwd);
  
  if (state.docked) {
    console.error(`❌ Rig ${rig} is docked. Undock instead.`);
    process.exit(1);
  }
  
  if (!state.parked) {
    console.log(`ℹ️  Rig ${rig} is not parked.`);
    return;
  }

  const parkedFor = state.parkedAt 
    ? formatDuration(Date.now() - new Date(state.parkedAt).getTime())
    : 'unknown';

  state.parked = false;
  state.parkedAt = null;
  state.parkedBy = null;
  state.reason = null;
  
  saveRigState(cwd, state);
  
  console.log(`🟢 Rig ${rig} unparked.`);
  console.log(`   Was parked for ${parkedFor}.`);
  console.log(`   Daemon auto-start resumed.`);
}

function dockRig(cwd: string, rig: string, reason?: string): void {
  const state = loadRigState(cwd);
  
  if (state.docked) {
    console.log(`ℹ️  Rig ${rig} is already docked.`);
    return;
  }

  // Stop any running sessions
  console.log(`⏳ Stopping sessions for ${rig}...`);
  try {
    execSync(`gt shutdown 2>/dev/null || true`, { cwd, stdio: 'inherit' });
  } catch {
    // Shutdown may fail if nothing is running
  }

  state.parked = false;
  state.docked = true;
  state.parkedAt = null;
  state.dockedAt = new Date().toISOString();
  state.parkedBy = null;
  state.dockedBy = getUsername();
  state.reason = reason ?? null;
  
  saveRigState(cwd, state);
  
  console.log(`🔴 Rig ${rig} docked.`);
  console.log(`   All sessions stopped. Auto-start disabled.`);
  if (reason) {
    console.log(`   Reason: ${reason}`);
  }
  console.log(`   Run 'gt-rig undock ${rig}' to resume.`);
}

function undockRig(cwd: string, rig: string): void {
  const state = loadRigState(cwd);
  
  if (!state.docked) {
    console.log(`ℹ️  Rig ${rig} is not docked.`);
    return;
  }

  const dockedFor = state.dockedAt 
    ? formatDuration(Date.now() - new Date(state.dockedAt).getTime())
    : 'unknown';

  state.parked = false;
  state.docked = false;
  state.parkedAt = null;
  state.dockedAt = null;
  state.parkedBy = null;
  state.dockedBy = null;
  state.reason = null;
  
  saveRigState(cwd, state);
  
  console.log(`🟢 Rig ${rig} undocked.`);
  console.log(`   Was docked for ${dockedFor}.`);
  console.log(`   Normal operation resumed.`);
  console.log(`   Run 'gt start' to launch sessions.`);
}

function showStatus(cwd: string, rig: string): void {
  const state = loadRigState(cwd);
  
  console.log(`Rig: ${rig}`);
  console.log('');
  
  if (state.docked) {
    const duration = state.dockedAt 
      ? formatDuration(Date.now() - new Date(state.dockedAt).getTime())
      : 'unknown';
    console.log(`🔴 State: DOCKED`);
    console.log(`   Docked at: ${state.dockedAt}`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Docked by: ${state.dockedBy ?? 'unknown'}`);
    if (state.reason) {
      console.log(`   Reason: ${state.reason}`);
    }
  } else if (state.parked) {
    const duration = state.parkedAt 
      ? formatDuration(Date.now() - new Date(state.parkedAt).getTime())
      : 'unknown';
    console.log(`🟡 State: PARKED`);
    console.log(`   Parked at: ${state.parkedAt}`);
    console.log(`   Duration: ${duration}`);
    console.log(`   Parked by: ${state.parkedBy ?? 'unknown'}`);
    if (state.reason) {
      console.log(`   Reason: ${state.reason}`);
    }
  } else {
    console.log(`🟢 State: ACTIVE`);
    console.log(`   Daemon auto-start enabled.`);
  }
  
  console.log('');
  console.log('Commands:');
  if (!state.parked && !state.docked) {
    console.log(`  gt-rig park ${rig}     # Pause daemon auto-start`);
    console.log(`  gt-rig dock ${rig}     # Full stop`);
  } else if (state.parked) {
    console.log(`  gt-rig unpark ${rig}   # Resume daemon`);
    console.log(`  gt-rig dock ${rig}     # Full stop`);
  } else {
    console.log(`  gt-rig undock ${rig}   # Resume operation`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const cwd = process.cwd();

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
gt-rig: Rig lifecycle management

Usage:
  gt-rig park <rig> [--reason "..."]    # Pause daemon auto-start
  gt-rig unpark <rig>                   # Resume daemon auto-start
  gt-rig dock <rig> [--reason "..."]    # Stop all sessions, prevent auto-start
  gt-rig undock <rig>                   # Resume normal operation
  gt-rig status <rig>                   # Show rig state

States:
  🟢 ACTIVE   Normal operation, daemon auto-starts
  🟡 PARKED   Sessions preserved, daemon won't auto-start
  🔴 DOCKED   All stopped, daemon won't auto-start

Use cases:
  park    Temporarily pause work while keeping sessions alive
  dock    Full stop for maintenance or debugging
  
Examples:
  gt-rig park csm --reason "Taking a break"
  gt-rig dock csm --reason "Debugging convoy issue"
  gt-rig status csm
`);
    process.exit(0);
  }

  const command = args[0];
  const rig = args[1] || 'csm';
  
  // Parse reason flag
  let reason: string | undefined;
  const reasonIdx = args.indexOf('--reason');
  if (reasonIdx !== -1 && args[reasonIdx + 1]) {
    reason = args[reasonIdx + 1];
  }

  switch (command) {
    case 'park':
      parkRig(cwd, rig, reason);
      break;
    case 'unpark':
      unparkRig(cwd, rig);
      break;
    case 'dock':
      dockRig(cwd, rig, reason);
      break;
    case 'undock':
      undockRig(cwd, rig);
      break;
    case 'status':
      showStatus(cwd, rig);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error(`Run 'gt-rig --help' for usage.`);
      process.exit(1);
  }
}

main();
