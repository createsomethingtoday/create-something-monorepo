#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = process.cwd();

const laneConfig = {
  'code-quality': {
    claimAgent: 'pi-code-quality',
    docsPath: 'automation/pi/code-quality/README.md',
    promptPath: '.pi/prompts/code-quality-lane.md',
  },
  policy: {
    claimAgent: 'pi-policy',
    docsPath: 'automation/pi/policy/README.md',
    promptPath: '.pi/prompts/policy-lane.md',
  },
};

function usage() {
  console.log(`Usage:
  node scripts/pi/run-lane.mjs <lane> --task-id <id> [options]

Lanes:
  code-quality
  policy

Options:
  --task-id <id>       Remote Loom task id
  --claim              Claim the Loom task before launching Pi
  --agent <name>       Override Loom claim agent name
  --mode <mode>        interactive | print | json (default: interactive)
  --provider <name>    Override the Pi provider for this run
  --model <name>       Override the Pi model for this run
  --thinking <level>   Override Pi thinking level for this run
  --tools <list>       Restrict Pi to a comma-separated tool allowlist
  --no-tools           Disable Pi tools for this run
  --session-dir <dir>  Override the Pi session directory for this run
  --smoke              Run a narrow lane smoke test prompt instead of the full task prompt
  --pi-bin <path>      Pi executable to launch (default: PI_BIN env or "pi")
  --dry-run            Print the generated command and prompt, do not launch Pi
  -h, --help           Show help
`);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return { help: true };
  }

  const lane = args[0];
  const options = {
    lane,
    mode: 'interactive',
    claim: false,
    dryRun: false,
    piBin: process.env.PI_BIN || 'pi',
  };

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--') {
      continue;
    }
    if (arg === '--task-id' && args[index + 1]) {
      options.taskId = args[++index];
      continue;
    }
    if (arg === '--claim') {
      options.claim = true;
      continue;
    }
    if (arg === '--agent' && args[index + 1]) {
      options.agent = args[++index];
      continue;
    }
    if (arg === '--mode' && args[index + 1]) {
      options.mode = args[++index];
      continue;
    }
    if (arg === '--provider' && args[index + 1]) {
      options.provider = args[++index];
      continue;
    }
    if (arg === '--model' && args[index + 1]) {
      options.model = args[++index];
      continue;
    }
    if (arg === '--thinking' && args[index + 1]) {
      options.thinking = args[++index];
      continue;
    }
    if (arg === '--tools' && args[index + 1]) {
      options.tools = args[++index];
      continue;
    }
    if (arg === '--no-tools') {
      options.noTools = true;
      continue;
    }
    if (arg === '--session-dir' && args[index + 1]) {
      options.sessionDir = args[++index];
      continue;
    }
    if (arg === '--smoke') {
      options.smoke = true;
      continue;
    }
    if (arg === '--pi-bin' && args[index + 1]) {
      options.piBin = args[++index];
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required option: ${name}`);
  }
  return value;
}

function runRemoteLoom(args) {
  const loomScript = resolve(repoRoot, 'scripts/loom/remote.mjs');
  const result = spawnSync(process.execPath, [loomScript, ...args], {
    cwd: repoRoot,
    env: process.env,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Remote Loom command failed: ${args.join(' ')}`);
  }

  return JSON.parse(result.stdout);
}

function buildTaskPrompt(lane, task, options) {
  const nonInteractive = options.mode !== 'interactive';
  if (nonInteractive) {
    return [
      `You are starting the ${lane} lane for Loom task ${task.id}.`,
      'This is a non-interactive kickoff response, not the full execution session.',
      'Read AGENTS.md, the attached lane README, and the attached Pi prompt before acting.',
      'Restate the task, identify the primary tier, name the smallest defensible change, and name the first validation command.',
      'Do not claim files were changed, commands were run, or validations passed unless you actually did them in this response.',
      'If no files were changed, say "Changed Files: none". If no commands were run, say "Commands Run: none".',
      'Keep the answer short and use exactly these sections: Task, Tier, Smallest Change, First Validation, Changed Files, Commands Run, Risks.',
      '',
      'Loom task:',
      JSON.stringify(task, null, 2),
    ].join('\n');
  }

  return [
    `You are working the ${lane} lane for Loom task ${task.id}.`,
    'Read AGENTS.md, the attached lane README, and the attached Pi prompt before acting.',
    'Use repo-local Pi skills from .pi/skills when they match the task.',
    'Keep Loom as the task source of truth and preserve unrelated worktree changes.',
    'Start by restating the task, identifying the primary tier, and choosing the smallest defensible change.',
    '',
    'Loom task:',
    JSON.stringify(task, null, 2),
    '',
    'Before finishing, summarize the changed files, commands run, and remaining risks so the operator can record evidence back to Loom.',
  ].join('\n');
}

function buildSmokePrompt(lane, task) {
  return [
    `You are running a smoke test for the ${lane} lane for Loom task ${task.id}.`,
    'Treat this as repo-context and prompt-wiring validation, not full task execution.',
    'Do not edit files, do not broaden scope, and do not mark the task complete.',
    'Use only the attached artifacts unless the operator explicitly enabled tools for this smoke run.',
    'Use the repo framework exactly when naming the primary tier: Database, Automation, or Judgment.',
    'For lane-runner, prompt-wiring, Pi host, or workflow validation tasks, prefer Automation unless the task is explicitly about data or policy artifacts.',
    'For Smallest Validation, name the narrowest trustworthy repo command for this task; prefer lane-specific smoke or doctor commands before repo-wide checks like pnpm check, pnpm lint, or pnpm test.',
    'Respond with exactly four short sections titled: Task, Tier, Smallest Validation, Risks.',
    'If you mention a validation command, name only one smallest defensible command and do not run it unless tools were explicitly enabled.',
    '',
    'Loom task:',
    JSON.stringify(task, null, 2),
  ].join('\n');
}

function resolveSessionOptions(options) {
  if (options.mode === 'interactive') {
    const sessionDir = resolve(repoRoot, options.sessionDir || '.pi/sessions');
    mkdirSync(sessionDir, { recursive: true });
    return { sessionDir, noSession: false };
  }

  if (options.sessionDir) {
    const sessionDir = resolve(repoRoot, options.sessionDir);
    mkdirSync(sessionDir, { recursive: true });
    return { sessionDir, noSession: false };
  }

  return { sessionDir: null, noSession: true };
}

function launchPi(piBin, args) {
  const child = spawn(piBin, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(error.message);
    process.exit(1);
  });
}

async function main() {
  const options = parseArgs(process.argv);
  if (options.help) {
    usage();
    process.exit(0);
  }
  if (options.noTools && options.tools) {
    throw new Error('Use either --tools or --no-tools, not both');
  }

  const lane = required('<lane>', options.lane);
  const config = laneConfig[lane];
  if (!config) {
    throw new Error(`Unknown lane: ${lane}`);
  }

  const taskId = required('--task-id', options.taskId);
  const docsPath = resolve(repoRoot, config.docsPath);
  const promptPath = resolve(repoRoot, config.promptPath);
  if (!existsSync(docsPath)) {
    throw new Error(`Lane README not found: ${docsPath}`);
  }
  if (!existsSync(promptPath)) {
    throw new Error(`Pi prompt not found: ${promptPath}`);
  }

  const claimAgent = options.agent || config.claimAgent;
  if (options.claim && !options.dryRun) {
    runRemoteLoom(['claim', '--task-id', taskId, '--agent', claimAgent]);
  }

  const task = runRemoteLoom(['get', '--task-id', taskId]);
  const taskPrompt = options.smoke ? buildSmokePrompt(lane, task) : buildTaskPrompt(lane, task, options);
  const piArgs = [];
  const nonInteractive = options.mode !== 'interactive';
  const thinking = options.thinking || (options.smoke || nonInteractive ? 'low' : undefined);
  const sessionOptions = resolveSessionOptions(options);

  if (options.mode === 'print') {
    piArgs.push('-p');
  } else if (options.mode === 'json') {
    piArgs.push('--mode', 'json');
  } else if (options.mode !== 'interactive') {
    throw new Error(`Unknown mode: ${options.mode}`);
  }

  if (options.provider) {
    piArgs.push('--provider', options.provider);
  }
  if (options.model) {
    piArgs.push('--model', options.model);
  }
  if (thinking) {
    piArgs.push('--thinking', thinking);
  }
  if (sessionOptions.noSession) {
    piArgs.push('--no-session');
  } else if (sessionOptions.sessionDir) {
    piArgs.push('--session-dir', sessionOptions.sessionDir);
  }
  if (options.noTools || ((options.smoke || nonInteractive) && !options.tools)) {
    piArgs.push('--no-tools');
  } else if (options.tools) {
    piArgs.push('--tools', options.tools);
  }

  piArgs.push('@AGENTS.md', `@${config.docsPath}`, `@${config.promptPath}`, taskPrompt);

  if (options.dryRun) {
    console.log(
      JSON.stringify(
        {
          lane,
          taskId,
          claim: options.claim,
          claimAgent,
          piBin: options.piBin,
          smoke: Boolean(options.smoke),
          provider: options.provider || null,
          model: options.model || null,
          thinking: thinking || null,
          sessionDir: sessionOptions.sessionDir,
          noSession: sessionOptions.noSession,
          tools: options.tools || null,
          noTools: Boolean(options.noTools || ((options.smoke || nonInteractive) && !options.tools)),
          piArgs,
          taskTitle: task.title,
        },
        null,
        2,
      ),
    );
    console.log('\n--- prompt ---\n');
    console.log(taskPrompt);
    return;
  }

  launchPi(options.piBin, piArgs);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
