#!/usr/bin/env python3
"""Consistent online SQLite snapshot, encrypted to an off-host age identity."""
import datetime
import fcntl
import os
from pathlib import Path
import sqlite3
import subprocess
import tarfile
import tempfile

os.umask(0o077)
ROOT = Path('/opt/rustdesk')
DEST = Path('/var/backups/rustdesk')
DEST.mkdir(mode=0o700, parents=True, exist_ok=True)
lock = (DEST / '.lock').open('w')
fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
target = DEST / f'rustdesk-{stamp}.tar.age'
with tempfile.TemporaryDirectory(prefix='rustdesk-backup-', dir='/run') as temp:
    temp = Path(temp)
    with sqlite3.connect(f'file:{ROOT}/data/db_v2.sqlite3?mode=ro', uri=True) as source:
        with sqlite3.connect(temp / 'db_v2.sqlite3') as snapshot:
            source.backup(snapshot)
            if snapshot.execute('PRAGMA integrity_check').fetchone() != ('ok',):
                raise RuntimeError('SQLite integrity check failed')
    with tarfile.open(temp / 'backup.tar', 'w') as archive:
        for name in ('compose.yaml', 'data/id_ed25519', 'data/id_ed25519.pub'):
            archive.add(ROOT / name, arcname=name)
        archive.add(temp / 'db_v2.sqlite3', arcname='data/db_v2.sqlite3')
    subprocess.run(['/usr/bin/age', '-R', '/etc/rustdesk-backup.recipient',
                    '-o', str(target) + '.partial', str(temp / 'backup.tar')], check=True)
    Path(str(target) + '.partial').rename(target)
for old in sorted(DEST.glob('rustdesk-*.tar.age'))[:-120]:
    old.unlink()
print(f'Encrypted backup ready: {target.name}', flush=True)
