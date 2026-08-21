#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { chmod, mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const RELAY_LAUNCH_LABEL = 'agency.createsomething.calm-operator-codex-relay';

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xmlString(value, indent) {
  return `${' '.repeat(indent)}<string>${xml(value)}</string>`;
}

export function buildRelayLaunchAgentPlist(options) {
  const args = [
    options.infisicalExecutable,
    'run',
    '--env=prod',
    '--path=/',
    '--include-imports=true',
    '--',
    options.pnpmExecutable,
    '--dir',
    options.packageDirectory,
    'agent:relay'
  ];
  const environment = {
    HOME: options.homeDirectory,
    PATH: options.path,
    NO_COLOR: '1',
    INK_RELAY_PROVIDERS: 'codex',
    INK_AGENT_WORKDIR: options.workspaceDirectory,
    OPERATOR_TRANSCRIBE_EXECUTABLE: options.transcriberExecutable
  };
  const argumentLines = args.map((value) => xmlString(value, 8)).join('\n');
  const environmentLines = Object.entries(environment)
    .map(
      ([key, value]) =>
        `${xmlString(key, 8).replace('<string>', '<key>').replace('</string>', '</key>')}\n${xmlString(value, 8)}`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${RELAY_LAUNCH_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
${argumentLines}
    </array>
    <key>EnvironmentVariables</key>
    <dict>
${environmentLines}
    </dict>
    <key>WorkingDirectory</key>
    <string>${xml(options.workspaceDirectory)}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>ProcessType</key>
    <string>Background</string>
    <key>ThrottleInterval</key>
    <integer>10</integer>
    <key>StandardOutPath</key>
    <string>${xml(options.stdoutPath)}</string>
    <key>StandardErrorPath</key>
    <string>${xml(options.stderrPath)}</string>
</dict>
</plist>
`;
}

function executable(name) {
  const result = spawnSync('/usr/bin/which', [name], { encoding: 'utf8' });
  const value = result.stdout?.trim();
  if (result.status !== 0 || !value) throw new Error(`${name} is required to install the relay.`);
  return value;
}

function launchctl(args, allowFailure = false) {
  const result = spawnSync('/bin/launchctl', args, { encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `launchctl ${args[0]} failed.`).trim());
  }
  return result;
}

export async function installRelayLaunchAgent() {
  const homeDirectory = homedir();
  const packageDirectory = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
  const workspaceDirectory = fileURLToPath(new URL('../../..', import.meta.url)).replace(/\/$/, '');
  const transcriberExecutable = fileURLToPath(
    new URL('./transcribe-local-whisper.mjs', import.meta.url)
  );
  const appDirectory = `${homeDirectory}/Library/Application Support/CREATE SOMETHING/Calm Operator`;
  const plistPath = `${homeDirectory}/Library/LaunchAgents/${RELAY_LAUNCH_LABEL}.plist`;
  const service = `gui/${process.getuid()}/${RELAY_LAUNCH_LABEL}`;
  await mkdir(dirname(plistPath), { recursive: true });
  await mkdir(`${appDirectory}/logs`, { recursive: true });
  await chmod(transcriberExecutable, 0o755);
  const plist = buildRelayLaunchAgentPlist({
    infisicalExecutable: executable('infisical'),
    pnpmExecutable: executable('pnpm'),
    packageDirectory,
    workspaceDirectory,
    transcriberExecutable,
    homeDirectory,
    path: process.env.PATH || '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
    stdoutPath: `${appDirectory}/logs/codex-relay.log`,
    stderrPath: `${appDirectory}/logs/codex-relay.error.log`
  });
  await writeFile(plistPath, plist, { mode: 0o600 });
  launchctl(['bootout', service], true);
  launchctl(['bootstrap', `gui/${process.getuid()}`, plistPath]);
  launchctl(['enable', service]);
  launchctl(['kickstart', '-k', service]);
  return { plistPath, service, workspaceDirectory };
}

export async function uninstallRelayLaunchAgent() {
  const plistPath = `${homedir()}/Library/LaunchAgents/${RELAY_LAUNCH_LABEL}.plist`;
  const service = `gui/${process.getuid()}/${RELAY_LAUNCH_LABEL}`;
  launchctl(['bootout', service], true);
  await rm(plistPath, { force: true });
  return { plistPath, service };
}

async function main() {
  const action = process.argv[2] || 'install';
  if (action === 'install') {
    process.stdout.write(`${JSON.stringify(await installRelayLaunchAgent())}\n`);
    return;
  }
  if (action === 'uninstall') {
    process.stdout.write(`${JSON.stringify(await uninstallRelayLaunchAgent())}\n`);
    return;
  }
  if (action === 'status') {
    const service = `gui/${process.getuid()}/${RELAY_LAUNCH_LABEL}`;
    const result = launchctl(['print', service], true);
    process.stdout.write(result.stdout || result.stderr);
    process.exitCode = result.status ?? 1;
    return;
  }
  throw new Error('Use install, status, or uninstall.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
