import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const migrations = ['0001_connections.sql', '0002_exact_linked_recovery_fence.sql',
  '0003_selected_gmail_insert_guard.sql'].map((name) =>
  fileURLToPath(new URL(`../worker/migrations/${name}`, import.meta.url)));

test('old Gmail Worker cannot journal a distinct attempt before its provider POST', () => {
  const script = `
import json, sqlite3, sys

db = sqlite3.connect(':memory:')
for path in sys.argv[1:3]:
    with open(path, encoding='utf-8') as source:
        db.executescript(source.read())

db.execute("INSERT INTO gigi_connection_attempts (subject, provider, request_id, status, connected_account_id, reconnectable, redirect_url, expires_at, created_at) VALUES ('owner', 'gmail', 'request-old', 'linked', 'ca_lb1WbyU07_b-', 0, 'https://connect.composio.dev/session/old', '2026-09-30T15:01:57.505Z', '2026-09-30T14:51:57.225Z')")
db.execute("INSERT INTO gigi_connection_attempts (subject, provider, request_id, status, connected_account_id, reconnectable, created_at) VALUES ('owner', 'gmail', 'request-prior-a', 'attention', 'ca_SxsCATucITe6', 1, '2026-09-30T12:35:42.285Z')")
db.execute("INSERT INTO gigi_connection_attempts (subject, provider, request_id, status, connected_account_id, reconnectable, created_at) VALUES ('owner', 'gmail', 'request-prior-b', 'attention', 'ca_KaleAgnEjp5-', 1, '2026-09-30T12:52:07.504Z')")
with open(sys.argv[3], encoding='utf-8') as source:
    db.executescript(source.read())

release = db.execute("UPDATE gigi_connection_attempts SET status='attention', reconnectable=1 WHERE subject='owner' AND provider='gmail' AND request_id='request-old' AND status='linked' AND connected_account_id='ca_lb1WbyU07_b-' AND reconnectable=0").rowcount

def rejected(statement):
    try:
        db.execute(statement)
        return False
    except sqlite3.IntegrityError:
        return True

old_insert_rejected = rejected("INSERT OR IGNORE INTO gigi_connection_attempts (subject, provider, request_id, status, created_at) VALUES ('owner', 'gmail', 'request-late', 'dispatched', '2026-09-30T20:00:00Z')")
wrong_config_rejected = rejected("INSERT OR IGNORE INTO gigi_connection_attempts (subject, provider, request_id, status, created_at, auth_config_id) VALUES ('owner', 'gmail', 'request-wrong', 'dispatched', '2026-09-30T20:00:00Z', 'ac_s2YEkh21bMT8')")
prior_a_reactivation_rejected = rejected("UPDATE gigi_connection_attempts SET status='active' WHERE subject='owner' AND provider='gmail' AND request_id='request-prior-a'")
prior_b_reactivation_rejected = rejected("UPDATE gigi_connection_attempts SET status='linked' WHERE subject='owner' AND provider='gmail' AND request_id='request-prior-b'")
selected_insert = db.execute("INSERT OR IGNORE INTO gigi_connection_attempts (subject, provider, request_id, status, created_at, auth_config_id) VALUES ('owner', 'gmail', 'request-selected', 'dispatched', '2026-09-30T20:00:00Z', 'ac_qXoEQURadG-h')").rowcount
selected_update = db.execute("UPDATE gigi_connection_attempts SET status='linked', connected_account_id='ca_selected' WHERE subject='owner' AND provider='gmail' AND request_id='request-selected'").rowcount
calendar_insert = db.execute("INSERT OR IGNORE INTO gigi_connection_attempts (subject, provider, request_id, status, created_at) VALUES ('owner', 'googlecalendar', 'request-calendar', 'dispatched', '2026-09-30T20:00:00Z')").rowcount
late_update_rejected = rejected("UPDATE gigi_connection_attempts SET status='active' WHERE subject='owner' AND provider='gmail' AND request_id='request-old'")
print(json.dumps(dict(release=release, old_insert_rejected=old_insert_rejected,
    wrong_config_rejected=wrong_config_rejected, selected_insert=selected_insert,
    selected_update=selected_update, calendar_insert=calendar_insert,
    late_update_rejected=late_update_rejected,
    prior_a_reactivation_rejected=prior_a_reactivation_rejected,
    prior_b_reactivation_rejected=prior_b_reactivation_rejected)))
`;
  const run = spawnSync('python3', ['-c', script, ...migrations], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout), {
    release: 1, old_insert_rejected: true, wrong_config_rejected: true,
    selected_insert: 1, selected_update: 1, calendar_insert: 1,
    late_update_rejected: true, prior_a_reactivation_rejected: true,
    prior_b_reactivation_rejected: true,
  });
});
