#!/usr/bin/env node

/**
 * @create-something/harness
 *
 * gt-completion: Shell completions for Gas Town commands.
 * Upstream pattern from Gas Town v0.2.2+.
 *
 * Usage:
 *   gt-completion bash    # Output bash completions
 *   gt-completion zsh     # Output zsh completions
 *   gt-completion fish    # Output fish completions
 *
 * Installation:
 *   # Bash
 *   gt-completion bash >> ~/.bashrc
 *
 *   # Zsh
 *   gt-completion zsh >> ~/.zshrc
 *
 *   # Fish
 *   gt-completion fish > ~/.config/fish/completions/gt.fish
 */

// ─────────────────────────────────────────────────────────────────────────────
// Command Definitions
// ─────────────────────────────────────────────────────────────────────────────

interface CommandDef {
  name: string;
  description: string;
  subcommands?: CommandDef[];
  flags?: FlagDef[];
}

interface FlagDef {
  name: string;
  short?: string;
  description: string;
  takesArg?: boolean;
  argName?: string;
}

const GT_COMMANDS: CommandDef[] = [
  {
    name: 'start',
    description: 'Launch all sessions',
    flags: [
      { name: '--rig', short: '-r', description: 'Target rig', takesArg: true, argName: 'RIG' },
    ],
  },
  {
    name: 'shutdown',
    description: 'Stop everything',
    flags: [
      { name: '--force', short: '-f', description: 'Force shutdown' },
    ],
  },
  {
    name: 'status',
    description: 'Check what is running',
    flags: [
      { name: '--watch', short: '-w', description: 'Watch mode with auto-refresh' },
      { name: '--json', description: 'JSON output' },
    ],
  },
  {
    name: 'wake',
    description: 'Wake sleeping town',
  },
  {
    name: 'convoy',
    description: 'Convoy management',
    subcommands: [
      { name: 'create', description: 'Create a new convoy' },
      { name: 'list', description: 'List all convoys' },
      { name: 'show', description: 'Show convoy details' },
      { name: 'add', description: 'Add issues to convoy' },
      { name: 'refresh', description: 'Refresh convoy status' },
    ],
    flags: [
      { name: '--human', description: 'Human-readable output' },
      { name: '--notify', description: 'Send notifications' },
    ],
  },
  {
    name: 'sling',
    description: 'Assign work to agent',
    flags: [
      { name: '--agent', short: '-a', description: 'Agent preset', takesArg: true, argName: 'AGENT' },
      { name: '--model', short: '-m', description: 'Model override', takesArg: true, argName: 'MODEL' },
      { name: '--force', short: '-f', description: 'Force assignment' },
      { name: '--message', description: 'Custom message', takesArg: true, argName: 'MSG' },
    ],
  },
  {
    name: 'hook',
    description: 'Check current hook assignment',
  },
  {
    name: 'done',
    description: 'Mark work complete',
  },
  {
    name: 'mail',
    description: 'Mail operations',
    subcommands: [
      { name: 'inbox', description: 'Check inbox' },
      { name: 'check', description: 'Check for new mail' },
      { name: 'send', description: 'Send a message' },
    ],
    flags: [
      { name: '--inject', description: 'Inject mail into session' },
    ],
  },
  {
    name: 'rig',
    description: 'Rig lifecycle management',
    subcommands: [
      { name: 'park', description: 'Pause daemon auto-start' },
      { name: 'unpark', description: 'Resume daemon auto-start' },
      { name: 'dock', description: 'Stop all sessions' },
      { name: 'undock', description: 'Resume normal operation' },
      { name: 'status', description: 'Show rig state' },
      { name: 'add', description: 'Add a new rig' },
      { name: 'list', description: 'List all rigs' },
    ],
    flags: [
      { name: '--reason', description: 'Reason for action', takesArg: true, argName: 'REASON' },
    ],
  },
  {
    name: 'mayor',
    description: 'Mayor (coordinator) operations',
    subcommands: [
      { name: 'attach', description: 'Start/attach to mayor session' },
      { name: 'detach', description: 'Detach from mayor session' },
      { name: 'start', description: 'Start mayor with specific agent' },
    ],
    flags: [
      { name: '--agent', short: '-a', description: 'Agent preset', takesArg: true, argName: 'AGENT' },
    ],
  },
  {
    name: 'prime',
    description: 'Context recovery',
    flags: [
      { name: '--issue', description: 'Specific issue', takesArg: true, argName: 'ISSUE' },
      { name: '--inject', description: 'Also inject mail' },
      { name: '--verbose', short: '-v', description: 'Verbose output' },
    ],
  },
  {
    name: 'nudge',
    description: 'Poke an agent to check state',
    flags: [
      { name: '--force', short: '-f', description: 'Force nudge' },
    ],
  },
  {
    name: 'handoff',
    description: 'Graceful session restart',
  },
  {
    name: 'doctor',
    description: 'Diagnose issues',
  },
  {
    name: 'agents',
    description: 'List active agents',
    flags: [
      { name: '--all', short: '-a', description: 'Show all agents' },
    ],
  },
  {
    name: 'config',
    description: 'Configuration management',
    subcommands: [
      { name: 'show', description: 'Show current config' },
      { name: 'agent', description: 'Agent configuration' },
      { name: 'default-agent', description: 'Set default agent' },
    ],
  },
  {
    name: 'hooks',
    description: 'Hook management',
    subcommands: [
      { name: 'list', description: 'List all hooks' },
      { name: 'repair', description: 'Repair hooks' },
    ],
  },
  {
    name: 'dashboard',
    description: 'Web dashboard',
    flags: [
      { name: '--port', short: '-p', description: 'Port number', takesArg: true, argName: 'PORT' },
    ],
  },
  {
    name: 'completion',
    description: 'Generate shell completions',
    subcommands: [
      { name: 'bash', description: 'Bash completions' },
      { name: 'zsh', description: 'Zsh completions' },
      { name: 'fish', description: 'Fish completions' },
    ],
  },
];

const SMART_SLING_COMMANDS: CommandDef[] = [
  {
    name: 'gt-smart-sling',
    description: 'Smart model routing for sling',
    flags: [
      { name: '--force', short: '-f', description: 'Force assignment' },
      { name: '--message', description: 'Custom message', takesArg: true, argName: 'MSG' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Bash Completions
// ─────────────────────────────────────────────────────────────────────────────

function generateBashCompletions(): string {
  const lines: string[] = [];

  lines.push('# gt completion for bash');
  lines.push('# Generated by gt-completion');
  lines.push('');
  lines.push('_gt_completions() {');
  lines.push('  local cur prev commands');
  lines.push('  COMPREPLY=()');
  lines.push('  cur="${COMP_WORDS[COMP_CWORD]}"');
  lines.push('  prev="${COMP_WORDS[COMP_CWORD-1]}"');
  lines.push('');
  
  // Top-level commands
  const topLevelCmds = GT_COMMANDS.map(c => c.name).join(' ');
  lines.push(`  commands="${topLevelCmds}"`);
  lines.push('');
  lines.push('  if [[ ${COMP_CWORD} == 1 ]]; then');
  lines.push('    COMPREPLY=( $(compgen -W "${commands}" -- ${cur}) )');
  lines.push('    return 0');
  lines.push('  fi');
  lines.push('');

  // Subcommands for each command
  for (const cmd of GT_COMMANDS) {
    if (cmd.subcommands) {
      const subcmds = cmd.subcommands.map(s => s.name).join(' ');
      lines.push(`  if [[ \${prev} == "${cmd.name}" ]]; then`);
      lines.push(`    COMPREPLY=( $(compgen -W "${subcmds}" -- \${cur}) )`);
      lines.push('    return 0');
      lines.push('  fi');
      lines.push('');
    }
  }

  lines.push('}');
  lines.push('');
  lines.push('complete -F _gt_completions gt');
  lines.push('');

  // gt-smart-sling completion
  lines.push('_gt_smart_sling_completions() {');
  lines.push('  local cur prev');
  lines.push('  COMPREPLY=()');
  lines.push('  cur="${COMP_WORDS[COMP_CWORD]}"');
  lines.push('  prev="${COMP_WORDS[COMP_CWORD-1]}"');
  lines.push('');
  lines.push('  if [[ ${cur} == -* ]]; then');
  lines.push('    COMPREPLY=( $(compgen -W "--force --message --help" -- ${cur}) )');
  lines.push('    return 0');
  lines.push('  fi');
  lines.push('}');
  lines.push('');
  lines.push('complete -F _gt_smart_sling_completions gt-smart-sling');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Zsh Completions
// ─────────────────────────────────────────────────────────────────────────────

function generateZshCompletions(): string {
  const lines: string[] = [];

  lines.push('#compdef gt');
  lines.push('# gt completion for zsh');
  lines.push('# Generated by gt-completion');
  lines.push('');
  lines.push('_gt() {');
  lines.push('  local -a commands');
  lines.push('  commands=(');
  
  for (const cmd of GT_COMMANDS) {
    lines.push(`    '${cmd.name}:${cmd.description}'`);
  }
  
  lines.push('  )');
  lines.push('');
  lines.push('  _arguments -C \\');
  lines.push('    "1: :->command" \\');
  lines.push('    "*::arg:->args"');
  lines.push('');
  lines.push('  case "$state" in');
  lines.push('    command)');
  lines.push('      _describe -t commands "gt commands" commands');
  lines.push('      ;;');
  lines.push('    args)');
  lines.push('      case ${words[1]} in');
  
  for (const cmd of GT_COMMANDS) {
    if (cmd.subcommands) {
      lines.push(`        ${cmd.name})`);
      lines.push('          local -a subcommands');
      lines.push('          subcommands=(');
      for (const sub of cmd.subcommands) {
        lines.push(`            '${sub.name}:${sub.description}'`);
      }
      lines.push('          )');
      lines.push('          _describe -t subcommands "subcommand" subcommands');
      lines.push('          ;;');
    }
  }
  
  lines.push('      esac');
  lines.push('      ;;');
  lines.push('  esac');
  lines.push('}');
  lines.push('');
  lines.push('_gt "$@"');
  lines.push('');
  
  // gt-smart-sling
  lines.push('#compdef gt-smart-sling');
  lines.push('_gt_smart_sling() {');
  lines.push('  _arguments \\');
  lines.push('    "--force[Force assignment]" \\');
  lines.push('    "--message[Custom message]:message:" \\');
  lines.push('    "--help[Show help]"');
  lines.push('}');
  lines.push('');
  lines.push('_gt_smart_sling "$@"');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Fish Completions
// ─────────────────────────────────────────────────────────────────────────────

function generateFishCompletions(): string {
  const lines: string[] = [];

  lines.push('# gt completion for fish');
  lines.push('# Generated by gt-completion');
  lines.push('');

  // Disable file completions for gt
  lines.push('complete -c gt -f');
  lines.push('');

  // Top-level commands
  for (const cmd of GT_COMMANDS) {
    lines.push(`complete -c gt -n "__fish_use_subcommand" -a "${cmd.name}" -d "${cmd.description}"`);
  }
  lines.push('');

  // Subcommands
  for (const cmd of GT_COMMANDS) {
    if (cmd.subcommands) {
      for (const sub of cmd.subcommands) {
        lines.push(`complete -c gt -n "__fish_seen_subcommand_from ${cmd.name}" -a "${sub.name}" -d "${sub.description}"`);
      }
    }
    
    if (cmd.flags) {
      for (const flag of cmd.flags) {
        const short = flag.short ? `-s ${flag.short.replace('-', '')} ` : '';
        const long = flag.name.replace('--', '');
        const arg = flag.takesArg ? ` -r` : '';
        lines.push(`complete -c gt -n "__fish_seen_subcommand_from ${cmd.name}" ${short}-l ${long}${arg} -d "${flag.description}"`);
      }
    }
    lines.push('');
  }

  // gt-smart-sling
  lines.push('# gt-smart-sling completions');
  lines.push('complete -c gt-smart-sling -f');
  lines.push('complete -c gt-smart-sling -l force -s f -d "Force assignment"');
  lines.push('complete -c gt-smart-sling -l message -r -d "Custom message"');
  lines.push('complete -c gt-smart-sling -l help -s h -d "Show help"');
  lines.push('');

  // gt-prime
  lines.push('# gt-prime completions');
  lines.push('complete -c gt-prime -f');
  lines.push('complete -c gt-prime -l issue -r -d "Specific issue"');
  lines.push('complete -c gt-prime -l inject -d "Also inject mail"');
  lines.push('complete -c gt-prime -l verbose -s v -d "Verbose output"');
  lines.push('complete -c gt-prime -l help -s h -d "Show help"');
  lines.push('');

  // gt-status
  lines.push('# gt-status completions');
  lines.push('complete -c gt-status -f');
  lines.push('complete -c gt-status -l watch -s w -d "Watch mode"');
  lines.push('complete -c gt-status -l json -d "JSON output"');
  lines.push('complete -c gt-status -l convoy -r -d "Focus on convoy"');
  lines.push('complete -c gt-status -l help -s h -d "Show help"');
  lines.push('');

  // gt-rig
  lines.push('# gt-rig completions');
  lines.push('complete -c gt-rig -f');
  lines.push('complete -c gt-rig -n "__fish_use_subcommand" -a "park" -d "Pause daemon"');
  lines.push('complete -c gt-rig -n "__fish_use_subcommand" -a "unpark" -d "Resume daemon"');
  lines.push('complete -c gt-rig -n "__fish_use_subcommand" -a "dock" -d "Stop sessions"');
  lines.push('complete -c gt-rig -n "__fish_use_subcommand" -a "undock" -d "Resume operation"');
  lines.push('complete -c gt-rig -n "__fish_use_subcommand" -a "status" -d "Show state"');
  lines.push('complete -c gt-rig -l reason -r -d "Reason for action"');

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const shell = args[0];

  if (!shell || args.includes('--help') || args.includes('-h')) {
    console.log(`
gt-completion: Generate shell completions

Usage:
  gt-completion bash    # Output bash completions
  gt-completion zsh     # Output zsh completions
  gt-completion fish    # Output fish completions

Installation:
  # Bash (add to ~/.bashrc)
  gt-completion bash >> ~/.bashrc
  source ~/.bashrc

  # Zsh (add to ~/.zshrc)
  gt-completion zsh >> ~/.zshrc
  source ~/.zshrc

  # Fish (create completions file)
  gt-completion fish > ~/.config/fish/completions/gt.fish

Commands completed:
  gt              - Main Gas Town CLI
  gt-smart-sling  - Smart model routing
  gt-prime        - Context recovery
  gt-status       - Status dashboard
  gt-rig          - Rig lifecycle
`);
    process.exit(0);
  }

  switch (shell.toLowerCase()) {
    case 'bash':
      console.log(generateBashCompletions());
      break;
    case 'zsh':
      console.log(generateZshCompletions());
      break;
    case 'fish':
      console.log(generateFishCompletions());
      break;
    default:
      console.error(`Unknown shell: ${shell}`);
      console.error('Supported: bash, zsh, fish');
      process.exit(1);
  }
}

main();
