import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { canonicalizeRecoveryFenceSql, readRecoveryFenceDefinitions } from '../worker/linked-recovery-fence.ts';

const initialMigration = fileURLToPath(new URL('../worker/migrations/0001_connections.sql', import.meta.url));
const fenceMigration = fileURLToPath(new URL('../worker/migrations/0002_exact_linked_recovery_fence.sql', import.meta.url));

test('released reviewed Gmail attempt resists historical writes while new attempts remain usable', () => {
  const script = `
import json, sqlite3, sys

db = sqlite3.connect(':memory:')
for path in sys.argv[1:]:
    with open(path, encoding='utf-8') as source:
        db.executescript(source.read())

target = ('owner', 'gmail', 'request-old', 'linked', 'ca_lb1WbyU07_b-', 0,
          'https://connect.composio.dev/session/old', '2026-09-30T15:01:57.505Z',
          '2026-09-30T14:51:57.225Z')
db.execute('INSERT INTO gigi_connection_attempts VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', target)
release = db.execute("UPDATE gigi_connection_attempts SET status='attention', reconnectable=1 WHERE subject='owner' AND provider='gmail' AND request_id='request-old' AND status='linked' AND connected_account_id='ca_lb1WbyU07_b-' AND reconnectable=0 AND created_at='2026-09-30T14:51:57.225Z'").rowcount

def rejected(statement):
    try:
        db.execute(statement)
        return False
    except sqlite3.IntegrityError:
        return True

late_link = rejected("UPDATE gigi_connection_attempts SET connected_account_id='ca_lb1WbyU07_b-', redirect_url='https://connect.composio.dev/session/late', expires_at='2026-10-01T00:00:00Z', status='linked' WHERE subject='owner' AND provider='gmail' AND request_id='request-old'")
late_active = rejected("UPDATE gigi_connection_attempts SET status='active' WHERE subject='owner' AND provider='gmail' AND connected_account_id='ca_lb1WbyU07_b-'")
late_delete = rejected("DELETE FROM gigi_connection_attempts WHERE subject='owner' AND provider='gmail' AND request_id='request-old'")
unchanged = db.execute("SELECT status, reconnectable, redirect_url FROM gigi_connection_attempts WHERE subject='owner' AND provider='gmail' AND request_id='request-old'").fetchone() == ('attention', 1, target[6])

db.execute("INSERT INTO gigi_connection_attempts (subject, provider, request_id, status, created_at) VALUES ('owner','gmail','request-new','dispatched','2026-09-30T16:00:00Z')")
new_link = db.execute("UPDATE gigi_connection_attempts SET status='linked', connected_account_id='ca_new' WHERE subject='owner' AND provider='gmail' AND request_id='request-new'").rowcount
db.execute("INSERT INTO gigi_connection_attempts (subject, provider, request_id, status, connected_account_id, created_at) VALUES ('other','gmail','request-other','attention','ca_other','2026-09-30T14:51:57.225Z')")
other_delete = db.execute("DELETE FROM gigi_connection_attempts WHERE subject='other' AND provider='gmail'").rowcount
fences = db.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'gigi_removed_gmail_attempt_%_fence' ORDER BY name").fetchall()
print(json.dumps(dict(release=release, late_link=late_link, late_active=late_active,
                      late_delete=late_delete, unchanged=unchanged,
                      new_link=new_link, other_delete=other_delete, fences=fences)))
`;
  const run = spawnSync('python3', ['-c', script, initialMigration, fenceMigration], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const { fences, ...behavior } = JSON.parse(run.stdout) as {
    fences: [string, string][]; release: number; late_link: boolean; late_active: boolean;
    late_delete: boolean; unchanged: boolean; new_link: number; other_delete: number;
  };
  assert.deepEqual(behavior, {
    release: 1, late_link: true, late_active: true, late_delete: true,
    unchanged: true, new_link: 1, other_delete: 1,
  });
  assert.deepEqual(fences.map(([name, sql]) => ({ name, sql: canonicalizeRecoveryFenceSql(sql) })),
    readRecoveryFenceDefinitions().sort((left, right) => left.name.localeCompare(right.name)));
});
