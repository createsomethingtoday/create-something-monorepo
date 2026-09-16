#!/usr/bin/env python3
"""Build the exact client handoff; private server/operator files are allowlist-excluded."""
from pathlib import Path
import base64
import hashlib
import json
import shutil
import urllib.request
import zipfile

SOURCE = Path(__file__).resolve().parent / 'client'
DEST = Path.home() / '.codex/artifacts/rustdesk-grant-production'
KIT = DEST / 'CREATE-SOMETHING-Support-Apple-Silicon'
DMG = 'rustdesk-1.4.9-aarch64.dmg'
SHA = 'f7935597b247d42c8f2a2ed71176a9f5868018cd9e1a33b8096418a668c8caf0'
URL = f'https://github.com/rustdesk/rustdesk/releases/download/1.4.9/{DMG}'

def build():
    config = (SOURCE / 'server-config.txt').read_text().strip()
    assert json.loads(base64.b64decode(config[::-1])) == {
        'host': 'support.createsomething.io', 'relay': 'support.createsomething.io:21117',
        'api': '', 'key': '7SYSc0h6a+0ibKDmAwDXwZo9dkvNOMMSvGtZbU2BT+Q='}
    assert 'server-config.txt' in (SOURCE / 'START-HERE.html').read_text()
    KIT.mkdir(parents=True, exist_ok=True)
    expected = {'START-HERE.html', 'server-config.txt', DMG, 'SHA256SUMS.txt'}
    unexpected = {p.name for p in KIT.iterdir()} - expected
    if unexpected:
        raise RuntimeError(f'Refusing to package unexpected files: {unexpected}')
    for name in ('START-HERE.html', 'server-config.txt'):
        shutil.copyfile(SOURCE / name, KIT / name)
    installer = KIT / DMG
    if not installer.exists():
        partial = DEST / f'{DMG}.partial'
        urllib.request.urlretrieve(URL, partial)
        if hashlib.sha256(partial.read_bytes()).hexdigest() != SHA:
            raise RuntimeError('Official DMG checksum mismatch; do not distribute')
        partial.replace(installer)
    if hashlib.sha256(installer.read_bytes()).hexdigest() != SHA:
        raise RuntimeError('Existing DMG checksum mismatch; do not distribute')
    checksums = ''.join(f'{hashlib.sha256((KIT / n).read_bytes()).hexdigest()}  {n}\n'
                        for n in sorted(expected - {'SHA256SUMS.txt'}))
    (KIT / 'SHA256SUMS.txt').write_text(checksums)
    archive = DEST / f'{KIT.name}.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as z:
        for name in sorted(expected):
            z.write(KIT / name, arcname=f'{KIT.name}/{name}')
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None
        assert len(z.namelist()) == 4
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (DEST / 'SHA256SUMS.txt').write_text(f'{digest}  {archive.name}\n')
    print(f'{archive}\nSHA256 {digest}')

if __name__ == '__main__':
    build()
