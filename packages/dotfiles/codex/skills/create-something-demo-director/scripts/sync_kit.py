"""Refresh the portable starter from the monorepo without copying client media."""
import argparse, json, shutil
from pathlib import Path
FILES=('index.html','player.js','style.css','render.py','requirements.txt','build.mjs','hosting-headers.mjs','serve.mjs','package.json')
p=argparse.ArgumentParser();p.add_argument('--package',required=True,type=Path);a=p.parse_args()
target=Path(__file__).resolve().parents[1]/'assets'/'director-kit'
for name in FILES:
    if not (a.package/name).is_file():p.error(f'Missing package tool {name}')
target.mkdir(parents=True,exist_ok=True)
for name in FILES:shutil.copy2(a.package/name,target/name)
# Starter has no test fixtures; do not advertise commands for omitted test files.
f=target/'package.json';m=json.loads(f.read_text());m['scripts']={k:v for k,v in m['scripts'].items() if not k.startswith('test')};f.write_text(json.dumps(m,indent=2)+'\n')
print('Synced portable director kit; no example media or manifests copied.')
