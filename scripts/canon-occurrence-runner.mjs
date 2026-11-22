#!/usr/bin/env node
/** Bounded per-occurrence executor. Browser/connector verification is an explicit adapter. */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function assertVerification(config, actual, now = Date.now()) {
  for (const key of ['identity_email', 'event_id', 'starts_at', 'organizer_email', 'meeting_url']) {
    if (!config[key] || actual[key] !== config[key]) throw new Error(`Calendar ${key} mismatch`);
  }
  const meetingUrl = new URL(actual.meeting_url);
  if (
    meetingUrl.protocol !== 'https:' ||
    meetingUrl.search ||
    meetingUrl.hash ||
    !/(^|\.)zoom\.us$/.test(meetingUrl.hostname)
  )
    throw new Error('Canonical Zoom URL required');
  if (actual.status !== 'confirmed') throw new Error('Calendar occurrence is not confirmed');
  const age = now - Date.parse(actual.verified_at);
  if (!Number.isFinite(age) || age < -5000 || age > 60000)
    throw new Error('Calendar verification is stale');
  if (
    actual.platform !== 'zoom' ||
    actual.selection_scope !== 'halfdozen-guest-occurrence' ||
    actual.invitation_verified !== true ||
    !actual.invited_emails?.includes(config.identity_email)
  )
    throw new Error('Calendar guest invitation not verified');
  if (config.ends_at && actual.ends_at !== config.ends_at) throw new Error('Calendar end mismatch');
}
function command(argv, configPath, json = false, timeoutMs = 180000) {
  if (!Array.isArray(argv) || !argv.length || argv.some((x) => typeof x !== 'string'))
    throw new Error('Explicit command argv is required');
  const result = spawnSync(argv[0], argv.slice(1), {
    encoding: 'utf8',
    timeout: json ? 45000 : timeoutMs,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, CANON_OCCURRENCE_CONFIG: configPath },
    stdio: json ? 'pipe' : 'inherit'
  });
  if (result.error || result.status !== 0)
    throw new Error(`Adapter failed (${result.status ?? result.error?.code})`);
  return json ? JSON.parse(result.stdout) : undefined;
}
export function run(configPath, stage, { now = () => Date.now(), execute = command } = {}) {
  configPath = resolve(configPath);
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  if (!['join', 'postcall'].includes(stage)) throw new Error('Stage must be join or postcall');
  const start = Date.parse(config.starts_at),
    end = Date.parse(config.ends_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error('Invalid occurrence window');
  if (
    !config.stateDirectory ||
    !config.occurrenceId ||
    !/^[a-zA-Z0-9_-]+$/.test(config.occurrenceId)
  )
    throw new Error('Explicit safe occurrence identity and state directory required');
  const scheduled = stage === 'join' ? start : end + (config.postcallDelayMinutes ?? 10) * 60000;
  // Prevent annual launchd recurrence, missed wakeups and stale configuration from acting later.
  if (now() < scheduled - (stage === 'join' ? 5 : 0) * 60000 || now() > scheduled + 15 * 60000)
    throw new Error('Outside authorized occurrence window');
  mkdirSync(config.stateDirectory, { recursive: true, mode: 0o700 });
  const base = resolve(config.stateDirectory, config.occurrenceId);
  const marker = `${base}.${stage}.json`,
    lock = `${base}.${stage}.lock`;
  if (existsSync(marker)) return { status: 'already-completed' };
  mkdirSync(lock, { mode: 0o700 });
  try {
    if (stage === 'join') {
      const verified = execute(config.verifyCommand, configPath, true);
      assertVerification(config, verified, now());
      const selectionPath = `${base}.selection.json`;
      writeFileSync(selectionPath, JSON.stringify(verified) + '\n', { mode: 0o600 });
      const previousSelection = process.env.CANON_OCCURRENCE_SELECTION;
      process.env.CANON_OCCURRENCE_SELECTION = selectionPath;
      try {
        execute(config.joinCommand, configPath);
      } finally {
        if (previousSelection === undefined) delete process.env.CANON_OCCURRENCE_SELECTION;
        else process.env.CANON_OCCURRENCE_SELECTION = previousSelection;
      }
    } else {
      if (!existsSync(`${base}.join.json`)) {
        if (!existsSync(`${base}.selection.json`))
          throw new Error('No verified selection; postcall blocked');
        const selection = JSON.parse(readFileSync(`${base}.selection.json`, 'utf8'));
        assertVerification(config, selection, Date.parse(selection.verified_at));
      }
      execute(config.postcallCommand, configPath, false, 7 * 60 * 60 * 1000);
    }
    const receipt = {
      occurrenceId: config.occurrenceId,
      stage,
      completedAt: new Date(now()).toISOString()
    };
    writeFileSync(marker, JSON.stringify(receipt) + '\n', { flag: 'wx', mode: 0o600 });
    return receipt;
  } finally {
    rmSync(lock, { recursive: true });
  }
}
const xml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function launchdPlist({ configPath, runnerPath, nodePath, stage, config }) {
  if (![configPath, runnerPath, nodePath].every((x) => typeof x === 'string' && x.startsWith('/')))
    throw new Error('Absolute paths required');
  if (!['join', 'postcall'].includes(stage)) throw new Error('Invalid stage');
  const scheduled =
    stage === 'join'
      ? Date.parse(config.starts_at)
      : Date.parse(config.ends_at) + (config.postcallDelayMinutes ?? 10) * 60000;
  // launchd schedules whole minutes. Use the first minute at or after the stage.
  const date = new Date(Math.ceil(scheduled / 60000) * 60000);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid schedule');
  const label = `com.createsomething.canon.${config.occurrenceId}.${stage}`;
  const args = [nodePath, runnerPath, 'run', configPath, stage];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>Label</key><string>${xml(label)}</string><key>ProgramArguments</key><array>${args.map((x) => `<string>${xml(x)}</string>`).join('')}</array><key>StartCalendarInterval</key><dict>${Object.entries(
    {
      Month: date.getMonth() + 1,
      Day: date.getDate(),
      Hour: date.getHours(),
      Minute: date.getMinutes()
    }
  )
    .map(([key, value]) => `<key>${key}</key><integer>${value}</integer>`)
    .join('')}</dict><key>ProcessType</key><string>Interactive</string></dict></plist>\n`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [action, configPath, stage] = process.argv.slice(2);
    if (action === 'run') console.log(JSON.stringify(run(configPath, stage)));
    else if (action === 'plist') {
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      process.stdout.write(
        launchdPlist({
          configPath: resolve(configPath),
          runnerPath: resolve(process.argv[1]),
          nodePath: process.execPath,
          stage,
          config
        })
      );
    } else
      throw new Error('Usage: canon-occurrence-runner.mjs run|plist config.json join|postcall');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
