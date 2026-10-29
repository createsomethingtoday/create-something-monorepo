"""Inspect source media and create timestamped evidence frames without changing it."""
import argparse, json, math, os, re, shutil, subprocess
from pathlib import Path
import imageio_ffmpeg
from PIL import Image, ImageDraw

def ffmpeg():
    return os.environ.get('FFMPEG') or shutil.which('ffmpeg') or imageio_ffmpeg.get_ffmpeg_exe()

def probe(source):
    reader=imageio_ffmpeg.read_frames(str(source))
    try: meta=next(reader)
    finally: reader.close()
    result=subprocess.run([ffmpeg(),'-hide_banner','-i',str(source)],capture_output=True,text=True)
    return {'duration':meta['duration'],'width':meta['source_size'][0],'height':meta['source_size'][1],
            'fps':meta['fps'],'has_audio':bool(re.search(r'Stream[^\n]*Audio:',result.stderr)), 'rotation':meta.get('rotate',0)}

def inspect(source,out,times=None):
    source=Path(source).resolve();out=Path(out).resolve()
    if out.exists(): raise ValueError('Inspection output already exists; choose a new directory')
    meta=probe(source);duration=meta['duration']
    if not math.isfinite(duration) or duration<=0: raise ValueError('Source duration unavailable or invalid')
    if times is None: times=[round(i*max(0,duration-max(.1,2/max(meta['fps'],1)))/8,4) for i in range(9)]
    if any(not math.isfinite(t) or t<0 or t>=duration for t in times): raise ValueError('Frame times must be inside the source duration')
    out.mkdir(parents=True)
    records=[];sheet=Image.new('RGB',(960,206*math.ceil(len(times)/3)), '#090909');d=ImageDraw.Draw(sheet)
    for i,t in enumerate(times):
        target=out/f'frame-{i:02}-{t:.3f}.jpg'
        # Decode by timestamp; do not infer frames from potentially inaccurate input seeking.
        cmd=[ffmpeg(),'-v','error','-i',str(source),'-vf',f'trim=start={t},setpts=PTS-STARTPTS','-frames:v','1','-q:v','2',str(target)]
        subprocess.run(cmd,check=True,capture_output=True)
        with Image.open(target) as im:
            im.thumbnail((320,180));x=(i%3)*320;y=(i//3)*206;sheet.paste(im,(x+(320-im.width)//2,y))
        d.text((x+8,y+184),f'Source {t:.3f}s',fill='white')
        records.append({'time':t,'file':target.name})
    sheet.save(out/'contact-sheet.jpg')
    (out/'probe.json').write_text(json.dumps({'media':meta,'frames':records},indent=2)+'\n')
    return meta

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--source',required=True,type=Path);p.add_argument('--out',required=True,type=Path);p.add_argument('--at',nargs='+',type=float);a=p.parse_args()
    try: print(json.dumps(inspect(a.source,a.out,a.at),indent=2))
    except Exception as e: p.exit(1,f'Inspection failed: {e}\n')
