#!/usr/bin/env node
// First-party visible Meet pilot. Guarded normal Join; no automatic capture.
import {
  readFile,
  writeFile,
  open,
  mkdir,
  rename,
  unlink,
  readdir,
  access,
  realpath
} from 'node:fs/promises';
import { dirname, resolve, basename } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { runPilot } from './canon-pilot.mjs';
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
export const CHROME_BINARY = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export function validateProfile(profile) {
  assert(
    typeof profile === 'string' && profile.startsWith('/'),
    'An absolute dedicated Chrome profile directory is required'
  );
  const normalized = resolve(profile);
  const main = resolve(homedir(), 'Library/Application Support/Google/Chrome');
  assert(
    !normalized.startsWith(main) && basename(normalized) === 'canon-meet-pilot',
    'Use a separate directory named canon-meet-pilot, never the main Chrome profile'
  );
  return normalized;
}
export function planParticipant(selection, config, state = {}, now = Date.now()) {
  const profile = validateProfile(config.profile_dir);
  assert(
    selection.internal_test === true && selection.event_id,
    'Explicit internal test event selection required'
  );
  assert(
    selection.identity_email && selection.identity_email === config.identity_email,
    'Selection identity must match the dedicated Google account'
  );
  assert(
    selection.invitation_verified === true &&
      selection.invited_emails?.includes(config.identity_email),
    'Verified invitation to the dedicated account required'
  );
  assert(
    !state.event_id || state.event_id === selection.event_id,
    'Ledger belongs to another event'
  );
  assert(!state.profile_dir || state.profile_dir === profile, 'Ledger profile mismatch');
  assert(
    !state.identity_email || state.identity_email === config.identity_email,
    'Ledger identity mismatch'
  );
  if (selection.status === 'cancelled') return { action: 'cancel', participant_removed: false };
  const age = now - Date.parse(selection.verified_at);
  assert(age >= 0 && age <= 15 * 60_000, 'Fresh invitation readback within 15 minutes required');
  assert(selection.status === 'confirmed', 'Only confirmed events allowed');
  assert(
    /^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(selection.meeting_url),
    'Exact Google Meet URL required'
  );
  const start = Date.parse(selection.starts_at);
  assert(Number.isFinite(start), 'Valid start required');
  assert(!state.cancelled, 'Cancelled pilot cannot be relaunched with this ledger');
  if (state.opening || state.opened)
    return {
      action: 'manual-check',
      opened: !!state.opened,
      admitted: false,
      message:
        'Dedicated Meet window may already exist. Verify identity, camera/mic off, normal Join/admission, or Leave manually. Do not open a duplicate.'
    };
  assert(start >= now - 5 * 60_000, 'Selected event is too old');
  return {
    action: start > now ? 'scheduled' : 'open-prejoin',
    starts_at: new Date(start).toISOString(),
    profile_dir: profile,
    meeting_url: selection.meeting_url,
    chrome_args: [`--user-data-dir=${profile}`, '--new-window', selection.meeting_url],
    admitted: false,
    media_state: 'unverified: human must turn camera and microphone off before Join'
  };
}
export async function assertCanonicalProfile(profile) {
  const canonical = await realpath(validateProfile(profile));
  assert(
    canonical === resolve(profile),
    'Profile path must be canonical with no symlink aliases; use its realpath'
  );
  const main = await realpath(
    resolve(homedir(), 'Library/Application Support/Google/Chrome')
  ).catch(() => resolve(homedir(), 'Library/Application Support/Google/Chrome'));
  assert(
    canonical !== main && !canonical.startsWith(`${main}/`),
    'Main Chrome profile and aliases are prohibited'
  );
  return canonical;
}
export async function verifyScheduledSelection(
  selection,
  options,
  { token, expires_at, now = Date.now(), verify = runPilot } = {}
) {
  assert(
    token,
    'GOOGLE_PILOT_ACCESS_TOKEN required for live launch verification; reauthorize the host Google account'
  );
  const expires = Date.parse(expires_at);
  assert(
    Number.isFinite(expires) && expires > now + 30_000,
    'Set GOOGLE_PILOT_TOKEN_EXPIRES_AT from OAuth token issuance; refresh the host token before waiting'
  );
  assert(
    options.eventId === selection.event_id && options.canonEmail === selection.identity_email,
    'Verify config must match exactly the selected event and identity'
  );
  const result = await verify({
    action: 'verify',
    options,
    token,
    save: () => {
      throw Error('Read-only verification must not write');
    }
  });
  if (result.cancelled === true)
    return { ...selection, status: 'cancelled', verified_at: new Date(now).toISOString() };
  assert(
    result.inviteVerified === true && result.participantSelection,
    'Fresh Google invitation/notice verification failed; no Join attempted'
  );
  const fresh = result.participantSelection;
  assert(
    fresh.event_id === selection.event_id && fresh.identity_email === selection.identity_email,
    'Google verification changed selected event or identity'
  );
  assert(
    Date.parse(fresh.starts_at) < expires - 30_000,
    'Meeting starts after token validity; reauthorize the host Google account before waiting'
  );
  return fresh;
}
export async function waitForPrejoin(
  ui,
  { attempts = 20, sleep = (ms) => new Promise((ok) => setTimeout(ok, ms)) } = {}
) {
  for (let i = 0; i < attempts; i++) {
    const nodes = await ui.snapshot();
    if (nodes.some((n) => n.name === 'Ready to join?')) return true;
    if (nodes.some((n) => /^(Sign in|Verify it.s you|Verify your identity)$/.test(n.name)))
      return false;
    if (i + 1 < attempts) await sleep(1_000);
  }
  return false;
}
export async function initializeProfile(profile) {
  profile = validateProfile(profile);
  await mkdir(profile, { recursive: true, mode: 0o700 });
  await assertCanonicalProfile(profile);
  const entries = await readdir(profile);
  assert(
    entries.length === 0,
    'Profile setup requires an empty dedicated directory; never adopt an existing browser profile'
  );
  await writeFile(
    `${profile}/canon-pilot-profile.json`,
    JSON.stringify({
      purpose: 'single internal Canon Meet pilot',
      created_at: new Date().toISOString()
    }),
    { flag: 'wx', mode: 0o600 }
  );
}
export async function runParticipant({
  selection,
  config,
  state = {},
  execute = false,
  save = async () => {},
  launch = launchChrome,
  now = Date.now()
}) {
  const plan = planParticipant(selection, config, state, now);
  if (!execute) return { dry_run: true, ...plan };
  if (plan.action === 'cancel') {
    await save({
      ...state,
      event_id: selection.event_id,
      profile_dir: validateProfile(config.profile_dir),
      identity_email: config.identity_email,
      cancelled: true
    });
    return {
      ...plan,
      message:
        'Local launch cancelled. If already open/admitted, host must use normal Meet Leave and close the dedicated window. Removal is unverified.'
    };
  }
  if (plan.action === 'manual-check') return plan;
  const next = {
    ...state,
    event_id: selection.event_id,
    profile_dir: plan.profile_dir,
    identity_email: config.identity_email,
    meeting_url: plan.meeting_url,
    starts_at: plan.starts_at
  };
  if (plan.action === 'scheduled') {
    await save(next);
    return plan;
  }
  await save({ ...next, opening: true }); // An interrupted/ambiguous launch blocks duplicate opens.
  const join_result = await launch(plan, config);
  await save({ ...next, opening: false, opened: true, opened_at: new Date(now).toISOString() });
  return {
    ...plan,
    action: 'prejoin-opened',
    admitted: join_result?.admitted === true,
    join_submitted: join_result?.join_submitted === true,
    media_state: join_result?.join_submitted
      ? 'microphone and camera off verified immediately before Join; current state requires readback'
      : plan.media_state,
    join_result: join_result ?? { admitted: false, human_required: true },
    next_step: join_result?.join_submitted
      ? 'Normal Join submitted with verified account/media guards. Host must verify visible participant and actual admission in Meet.'
      : 'Human handling required: confirm account, media off, sign-in/challenges and normal Join. No admission verified.'
  };
}
export async function guardedJoin(ui, identity) {
  const fallback = (reason) => ({
    join_submitted: false,
    admitted: false,
    human_required: true,
    reason
  });
  let nodes = await ui.snapshot();
  const matchesIdentity = (n) => {
    const label = n.name.replace(/\s+/g, ' ').trim();
    return (
      label === `Google Account: ${identity.name} (${identity.email})` ||
      label === `Google Account: ${identity.name} ${identity.email}`
    );
  };
  const buttons = () => nodes.filter((n) => n.role === 'button' && !n.disabled);
  const named = (regex) => buttons().filter((n) => regex.test(n.name));
  const account = buttons().filter(matchesIdentity);
  if (account.length !== 1)
    return fallback('Signed-in account email and display name not uniquely verified');
  if (!nodes.some((n) => n.name === 'Ready to join?'))
    return fallback('Normal Meet prejoin not verified; handle sign-in/challenge manually');
  for (const device of ['microphone', 'camera']) {
    const on = named(new RegExp(`^Turn off ${device}(?: [(].*[)])?$`));
    const off = named(new RegExp(`^Turn on ${device}(?: [(].*[)])?$`));
    if (on.length === 1 && off.length === 0) {
      await ui.click(on[0].name);
      nodes = await ui.snapshot();
    } else if (on.length !== 0 || off.length !== 1)
      return fallback(`${device} control ambiguous; no Join attempted`);
  }
  // Re-read identity, prejoin and both media controls immediately before clicking.
  nodes = await ui.snapshot();
  const safeAccount = buttons().filter(matchesIdentity);
  if (
    safeAccount.length !== 1 ||
    !nodes.some((n) => n.name === 'Ready to join?') ||
    named(/^Turn on microphone(?: \(.*\))?$/).length !== 1 ||
    named(/^Turn on camera(?: \(.*\))?$/).length !== 1 ||
    named(/^Turn off (microphone|camera)/).length
  )
    return fallback('Final identity/media readback failed');
  const join = named(/^(Join now|Ask to join)$/);
  if (join.length !== 1) return fallback('Normal Join control missing or ambiguous');
  await ui.click(join[0].name);
  nodes = await ui.snapshot();
  return {
    join_submitted: true,
    admitted: named(/^Leave call(?: \(.*\))?$/).length === 1,
    human_required: !named(/^Leave call(?: \(.*\))?$/).length,
    identity_verified: true,
    microphone_off_before_join: true,
    camera_off_before_join: true
  };
}
export function chromeLaunchOptions(profile) {
  return {
    executablePath: CHROME_BINARY,
    userDataDir: profile,
    headless: false,
    defaultViewport: null,
    enableExtensions: true,
    // Installed Puppeteer enables extension debugging with this option. Keep
    // operator-installed extensions usable without exposing extension debugging.
    ignoreDefaultArgs: ['--enable-unsafe-extension-debugging'],
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    args: ['--new-window']
  };
}
export async function launchChrome(plan, config) {
  assert(
    config.identity_name,
    'CANON_PARTICIPANT_NAME required for positive visible account verification'
  );
  await access(CHROME_BINARY);
  await assertCanonicalProfile(plan.profile_dir);
  const marker = JSON.parse(await readFile(`${plan.profile_dir}/canon-pilot-profile.json`, 'utf8'));
  assert(marker.purpose === 'single internal Canon Meet pilot', 'Dedicated profile marker missing');
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch(chromeLaunchOptions(plan.profile_dir));
  try {
    const page = (await browser.pages())[0] ?? (await browser.newPage());
    await page.goto(plan.meeting_url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.bringToFront();
    const cdp = await page.createCDPSession();
    const ui = {
      snapshot: async () => {
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        return nodes
          .filter((n) => !n.ignored)
          .map((n) => ({
            role: n.role?.value,
            name: n.name?.value ?? '',
            disabled: n.properties?.some((p) => p.name === 'disabled' && p.value.value === true)
          }));
      },
      click: async (name) => {
        const matches = await page.$$(`::-p-aria([name=${JSON.stringify(name)}][role="button"])`);
        assert(matches.length === 1, 'Accessible control not unique at click time');
        assert(await matches[0].isVisible(), 'Accessible control is not visible');
        await matches[0].click();
      }
    };
    if (!(await waitForPrejoin(ui)))
      return {
        join_submitted: false,
        admitted: false,
        human_required: true,
        reason: 'Normal prejoin did not render within 20 seconds or sign-in requires a human'
      };
    return await guardedJoin(ui, { email: config.identity_email, name: config.identity_name });
  } finally {
    browser.disconnect();
  } // Keep ordinary visible Chrome open for host admission/human handling.
}
async function main() {
  const args = process.argv.slice(2);
  const config = {
    profile_dir: process.env.CANON_CHROME_PROFILE_DIR,
    identity_email: process.env.CANON_PARTICIPANT_EMAIL,
    identity_name: process.env.CANON_PARTICIPANT_NAME
  };
  if (args.length === 1 && args[0] === '--initialize-profile') {
    await initializeProfile(config.profile_dir);
    console.log(
      'Created empty dedicated profile marker. Sign in manually when the pilot opens Chrome.'
    );
    return;
  }
  const flags = args.slice(2);
  let verifyConfigPath;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === '--verify-config') {
      assert(flags[i + 1], '--verify-config requires a private JSON path');
      verifyConfigPath = resolve(flags[++i]);
    } else assert(['--execute', '--wait', '--stop'].includes(flags[i]), 'Unknown participant flag');
  }
  assert(
    args.length >= 2,
    'Usage: node canon-participant.mjs SELECTION.json LEDGER.json [--execute --wait --verify-config PRIVATE_CONFIG.json | --stop]'
  );
  assert(!args.includes('--wait') || args.includes('--execute'), '--wait requires --execute');
  assert(
    !args.includes('--wait') || verifyConfigPath,
    'Autonomous --wait requires --verify-config for fresh read-only Google verification'
  );
  const verifyOptions = verifyConfigPath
    ? JSON.parse(await readFile(verifyConfigPath, 'utf8'))
    : null;
  const [selectionPath, ledgerPath] = args.slice(0, 2).map((p) => resolve(p));
  await mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  const lockPath = `${ledgerPath}.lock`;
  const lock = await open(lockPath, 'wx', 0o600);
  try {
    let state = {};
    try {
      state = JSON.parse(await readFile(ledgerPath, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const save = async (value) => {
      await writeFile(`${ledgerPath}.tmp`, JSON.stringify(value, null, 2), { mode: 0o600 });
      await rename(`${ledgerPath}.tmp`, ledgerPath);
      state = value;
    };
    let interrupted = false;
    process.once('SIGINT', () => {
      interrupted = true;
    });
    process.once('SIGTERM', () => {
      interrupted = true;
    });
    const deadline = Date.now() + 24 * 60 * 60_000;
    while (true) {
      let selection = JSON.parse(await readFile(selectionPath, 'utf8'));
      if (args.includes('--stop') || interrupted) selection.status = 'cancelled';
      else if (verifyOptions && args.includes('--execute'))
        selection = await verifyScheduledSelection(selection, verifyOptions, {
          token: process.env.GOOGLE_PILOT_ACCESS_TOKEN,
          expires_at: process.env.GOOGLE_PILOT_TOKEN_EXPIRES_AT
        });
      const result = await runParticipant({
        selection,
        config,
        state,
        execute: args.includes('--execute'),
        save
      });
      console.log(JSON.stringify(result, null, 2));
      if (result.action !== 'scheduled' || !args.includes('--wait')) break;
      assert(
        Date.now() < deadline,
        '24-hour wait bound reached; refresh selection and restart with same ledger'
      );
      // Read-only Google verification runs again every tick and immediately before launch.
      await new Promise((ok) =>
        setTimeout(ok, Math.min(60_000, Math.max(1, Date.parse(result.starts_at) - Date.now())))
      );
    }
  } finally {
    await lock.close();
    await unlink(lockPath);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
