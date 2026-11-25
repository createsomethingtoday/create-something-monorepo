// Verify the selected occurrence from the signed-in, rendered Calendar guest list.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function calendarLabels(config) {
  const start = new Date(config.starts_at),
    end = new Date(config.ends_at);
  const format = (value, options) =>
    new Intl.DateTimeFormat('en-US', { timeZone: config.timeZone, ...options }).format(value);
  const clock = (value) =>
    format(value, { hour: 'numeric', minute: '2-digit', hour12: true })
      .replace(/:00/, '')
      .replace(/\s/g, '')
      .toLowerCase();
  const date = format(start, { year: 'numeric', month: 'long', day: 'numeric' });
  if (date !== format(end, { year: 'numeric', month: 'long', day: 'numeric' }))
    throw Error('Same-day occurrence required');
  const zone = new Intl.DateTimeFormat('en-US', {
    timeZone: config.timeZone,
    timeZoneName: 'shortOffset'
  })
    .formatToParts(start)
    .find((p) => p.type === 'timeZoneName').value;
  return {
    calendarZoneLabel: zone,
    calendarChip:
      clock(start) +
      ' to ' +
      clock(end) +
      ', ' +
      config.title +
      ', ' +
      config.calendarGuestName +
      ', Accepted, No location, ' +
      date
  };
}

async function inspectCalendar(config) {
  const task = await taskSpace('Verify Canon Calendar occurrence');
  const page = task.page('p1');
  try {
    const date = config.starts_at.slice(0, 10);
    await page.goto(
      'https://calendar.google.com/calendar/r/week/' +
        date.replaceAll('-', '/') +
        '?authuser=' +
        encodeURIComponent(config.calendar_id)
    );
    const key = Buffer.from(config.event_id + ' ' + config.calendar_id).toString('base64url');
    const selector = '[role=button][data-eventid="' + key + '"]';
    const waitFor = async (probe) => {
      for (let attempt = 0; attempt < 40; attempt++) {
        const result = await probe();
        if (result) return result;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw Error('Expected Calendar view unavailable');
    };
    await waitFor(() => page.evaluate((s) => !!document.querySelector(s), selector));
    const chip = await page.evaluate(
      ({ selector, config }) => {
        const account = document
          .querySelector('[aria-label^="Google Account:"]')
          ?.getAttribute('aria-label');
        const calendarChip = document.querySelector(selector)?.innerText.split('\n')[0];
        return (
          account?.endsWith('(' + config.calendar_id + ')') &&
          document.body.innerText.split('\n').includes(config.calendarZoneLabel) &&
          calendarChip === config.calendarChip
        );
      },
      { selector, config }
    );
    if (!chip) throw Error('Calendar identity or schedule changed');
    await page.click(selector);
    await waitFor(() =>
      page.evaluate(() => !!document.querySelector('[role=dialog] [role=treeitem]'))
    );
    const link = await page.evaluate((cfg) => {
      const dialog = document.querySelector('[role=dialog]');
      const rows = [...dialog.querySelectorAll('[role=treeitem][data-email]')];
      const attending = rows.some(
        (e) => e.dataset.email === cfg.identity_email && /, Attending$/.test(e.ariaLabel)
      );
      const organizer = rows.some(
        (e) => e.dataset.email === cfg.organizer_email && /, Organizer$/.test(e.ariaLabel)
      );
      if (
        /\b(cancelled|canceled)\b/i.test(dialog.innerText.split('Weekly on')[0]) ||
        !attending ||
        !organizer ||
        !dialog.innerText.split('\n').includes(cfg.title)
      )
        return null;
      const links = new Set();
      for (const a of dialog.querySelectorAll('a[href]')) {
        const wrapper = new URL(a.href);
        const candidate =
          wrapper.origin === 'https://www.google.com' && wrapper.pathname === '/url'
            ? wrapper.searchParams.get('q')
            : a.href;
        if (!candidate || !candidate.startsWith('https://')) continue;
        const url = new URL(candidate);
        if (
          /(^|\.)zoom\.us$/.test(url.hostname) &&
          /^\/j\/\d+$/.test(url.pathname) &&
          !url.username &&
          !url.password
        )
          links.add(url.href);
      }
      if (links.size !== 1) return null;
      const url = new URL([...links][0]);
      return url.origin + url.pathname === cfg.meeting_url ? url.href : null;
    }, config);
    if (!link) throw Error('Calendar attendees or conference changed');
    if (!config.checkOnly) {
      const fs = await import('node:fs/promises');
      const staging = config.zoomInvitationFile + '.tmp-' + process.pid;
      await fs.writeFile(staging, link, { mode: 0o600, flag: 'wx' });
      await fs.rename(staging, config.zoomInvitationFile);
    }
    const fields = [
      'event_id',
      'starts_at',
      'ends_at',
      'identity_email',
      'organizer_email',
      'calendar_id',
      'meeting_url'
    ];
    return JSON.stringify({
      ...Object.fromEntries(fields.map((k) => [k, config[k]])),
      status: 'confirmed',
      platform: 'zoom',
      canon_rsvp: 'accepted',
      selection_scope: 'halfdozen-guest-occurrence',
      invitation_verified: true,
      invited_emails: [config.identity_email],
      capture_authorized: false,
      verified_at: new Date().toISOString()
    });
  } finally {
    await task.finish({ keep: [] });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = JSON.parse(readFileSync(process.env.CANON_OCCURRENCE_CONFIG, 'utf8'));
    Object.assign(config, calendarLabels(config));
    config.checkOnly = process.argv.includes('--check-only');
    const output = spawnSync(config.egoBrowser, ['nodejs'], {
      input:
        inspectCalendar.toString() +
        '\nconsole.log(await inspectCalendar(' +
        JSON.stringify(config) +
        '));\n',
      encoding: 'utf8',
      timeout: 42000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (output.status !== 0 || output.error) throw Error();
    const receipt = (output.stdout + '\n' + output.stderr)
      .split('\n')
      .find((line) => line.startsWith('{"event_id":'));
    if (!receipt) throw Error();
    console.log(JSON.stringify(JSON.parse(receipt)));
  } catch {
    console.error(
      'Unable to verify exact Calendar occurrence, schedule, signed-in guest, Canon RSVP and Zoom destination.'
    );
    process.exitCode = 1;
  }
}
