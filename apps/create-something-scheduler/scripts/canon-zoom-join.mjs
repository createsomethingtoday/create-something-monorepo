#!/usr/bin/env node
// Scheduled runner adapter. Never prints private navigation URLs or browser errors.
import { readFile, writeFile, rename, open, unlink, stat } from 'node:fs/promises';
import { runParticipant, verifyScheduledSelection } from './canon-participant.mjs';
const requireValue = (v, m) => {
  if (!v) throw Error(m);
  return v;
};
async function main() {
  const selectionPath = requireValue(
    process.env.CANON_OCCURRENCE_SELECTION,
    'Occurrence selection required'
  );
  const outer = JSON.parse(
    await readFile(
      requireValue(process.env.CANON_OCCURRENCE_CONFIG, 'Occurrence config required'),
      'utf8'
    )
  );
  const config = { ...(outer.participant ?? outer) };
  let selection = JSON.parse(await readFile(selectionPath, 'utf8'));
  if (config.camera_pilot?.enabled === true) {
    requireValue(
      outer.cameraVerification?.scope === 'internal-zoom-occurrence',
      'Internal Zoom camera verification config required'
    );
    selection = await verifyScheduledSelection(selection, outer.cameraVerification, {
      token: process.env.GOOGLE_PILOT_ACCESS_TOKEN,
      expires_at: process.env.GOOGLE_PILOT_TOKEN_EXPIRES_AT
    });
  }
  requireValue(selection.platform === 'zoom', 'Zoom selection required');
  const invitationFile = outer.zoomInvitationFile ?? config.zoom_invitation_file;
  if (invitationFile) {
    const info = await stat(invitationFile);
    requireValue(
      info.isFile() && (info.mode & 0o077) === 0,
      'Invitation file must be private (0600)'
    );
    config.zoom_invitation_url = (await readFile(invitationFile, 'utf8')).trim();
  }
  config.zoom_invitation_url = process.env.CANON_ZOOM_INVITATION_URL ?? config.zoom_invitation_url;
  const ledgerPath = selectionPath + '.participant.json';
  const lock = await open(ledgerPath + '.lock', 'wx', 0o600);
  try {
    let state = {};
    try {
      state = JSON.parse(await readFile(ledgerPath, 'utf8'));
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    const save = async (value) => {
      await writeFile(ledgerPath + '.tmp', JSON.stringify(value), { mode: 0o600 });
      await rename(ledgerPath + '.tmp', ledgerPath);
    };
    const result = await runParticipant({ selection, config, state, execute: true, save });
    console.log(JSON.stringify(result));
    if (!result.join_result?.audio_connected) process.exitCode = 2;
  } finally {
    await lock.close();
    await unlink(ledgerPath + '.lock');
    if (invitationFile) await unlink(invitationFile);
  }
}
main().catch(() => {
  console.error(
    'Zoom participant paused or failed; inspect the private visible browser and participant ledger. No capture started.'
  );
  process.exitCode = 1;
});
