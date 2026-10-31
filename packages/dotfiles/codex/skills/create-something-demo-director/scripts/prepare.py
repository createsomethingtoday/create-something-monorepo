"""Create an isolated authoring project; scene direction remains the agent's job."""
import argparse, hashlib, json, shutil, sys
from pathlib import Path
from media_inspect import inspect  # sibling helper when invoked as a script

KIT=Path(__file__).resolve().parents[1]/'assets'/'director-kit'
FILES=('index.html','player.js','style.css','render.py','requirements.txt','build.mjs','hosting-headers.mjs','serve.mjs','package.json')

def sha(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
    return h.hexdigest()

def prepare(source,out,outcome):
    source=Path(source).resolve();out=Path(out).resolve()
    if not source.is_file():raise ValueError('Source must be an existing file')
    if out.exists():raise ValueError('Project already exists; choose a new directory')
    if not outcome.strip():raise ValueError('Provide a viewer outcome')
    for name in FILES:
        if not (KIT/name).is_file():raise ValueError(f'Missing bundled tool: {name}')
    before=sha(source);out.mkdir(parents=True)
    for name in FILES:shutil.copy2(KIT/name,out/name)
    suffix=source.suffix.lower()
    if suffix not in ('.mp4','.mov','.mkv','.webm','.m4v','.avi'):suffix='.media'
    original='reference'+suffix;shutil.copy2(source,out/original)
    meta=inspect(out/original,out/'inspection')
    if sha(source)!=before or sha(out/original)!=before:raise ValueError('Source copy verification failed')
    m={'version':1,'title':'','description':outcome.strip(),'source':{'file':'screen.mp4','original':original,'sha256':before,
       'in':0,'out':meta['duration'],'duration':meta['duration'],
       'crop':[meta['width']//2*2,meta['height']//2*2,0,0],'audio':'preserve',
       'credit':'Supplied screen recording','attribution':'Adapted from the supplied screen recording.'},'scenes':[]}
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    (out/'brief.json').write_text(json.dumps({'outcome':outcome.strip(),'source_name':source.name,'media':meta,'status':'needs_visual_inspection_and_scene_authoring'},indent=2)+'\n')
    print(json.dumps({'project':str(out),'manifest':'manifest.json','inspection':'inspection/contact-sheet.jpg','has_audio':meta['has_audio'],'next':'View frames, choose cut/crop, author title and scenes, then render and review.'},indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',required=True,type=Path);p.add_argument('--out',required=True,type=Path);p.add_argument('--outcome',required=True);a=p.parse_args()
    try:prepare(a.source,a.out,a.outcome)
    except Exception as e:p.exit(1,f'Preparation failed: {e}\n')
