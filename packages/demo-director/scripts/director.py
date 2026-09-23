#!/usr/bin/env python3
"""Reproducible real-footage edits. Python standard library + FFmpeg/FFprobe."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import tempfile


def run(args, cwd=None):
    subprocess.run(args, cwd=cwd, check=True, stdout=subprocess.DEVNULL)


def probe(path):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)]))


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def number(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'Expected finite number in [{low}, {high}], got {value!r}')
    return value


def encode_capture(folder, output):
    folder = Path(folder).resolve(); output = Path(output).resolve()
    data = json.loads((folder / 'capture.json').read_text()); frames = data['frames']
    if output.exists() or not frames:
        raise ValueError('Use a new output and a nonempty capture')
    lines = []
    for i, frame in enumerate(frames):
        name = frame['file']
        if Path(name).name != name or not name.startswith('frame-') or not name.endswith('.jpg'):
            raise ValueError('Invalid capture frame name')
        next_time = frames[i+1]['receivedSeconds'] if i+1 < len(frames) else data['seconds']
        current = 0 if i == 0 else frame['receivedSeconds']
        duration = number(next_time-current, 0, 120)
        if duration > 0:
            lines += [f"file '{name}'", f'duration {duration:.9f}']
    lines.append(f"file '{frames[-1]['file']}'")
    listing = folder / 'frames.ffconcat'; listing.write_text('\n'.join(lines)+'\n')
    run(['ffmpeg','-hide_banner','-loglevel','error','-n','-f','concat','-safe','1','-i',str(listing),'-t',str(data['seconds']),'-vf','fps=30','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(output)])
    return probe(output)


def render(manifest_path, output):
    manifest_path = Path(manifest_path).resolve(); base = manifest_path.parent
    output = Path(output).resolve()
    if output.exists() or output.with_suffix('.receipt.json').exists():
        raise ValueError('Output or receipt exists; choose a new output')
    plan = json.loads(manifest_path.read_text())
    if plan.get('version') != 1: raise ValueError('Unsupported manifest version')
    width = int(number(plan.get('width',1920),320,3840)); height = int(number(plan.get('height',1080),180,2160))
    fps = int(number(plan.get('fps',30),24,60))
    if width % 2 or height % 2: raise ValueError('Even output dimensions required')
    shots = plan['shots']; narration = plan['narration']
    if not shots: raise ValueError('No shots')
    sources = {}; total = 0
    def source(value):
        path = (base/value).resolve()
        if not path.is_file(): raise ValueError(f'Missing source: {path}')
        if path not in sources: sources[path] = probe(path)
        return path, sources[path]
    for shot in shots:
        path, media = source(shot['source']); duration = number(shot['duration'],0.1,120); start = number(shot.get('start',0),0,86400)
        video = next(s for s in media['streams'] if s['codec_type']=='video')
        if abs(video['width']/video['height']-width/height)>0.01: raise ValueError('Source aspect ratio must match output; prepare a deliberate crop first')
        if start+duration > float(media['format']['duration'])+0.04: raise ValueError('Shot overruns real footage; record more or shorten it')
        for key in ['from','to']:
            camera=shot[key]
            number(camera['zoom'],1,3);number(camera['x'],0,1);number(camera['y'],0,1)
        total += round(duration*fps)/fps
    audio, media = source(narration['source'])
    if not any(s['codec_type']=='audio' for s in media['streams']):raise ValueError('Narration has no audio')
    previous_end=0
    for segment in narration['segments']:
        start=number(segment['sourceStart'],0,86400); duration=number(segment['duration'],0.01,3600); at=number(segment['at'],0,total)
        if start+duration > float(media['format']['duration'])+0.04: raise ValueError('Narration source overrun')
        if at < previous_end or at+duration > total+0.001: raise ValueError('Narration overlaps or is truncated')
        previous_end=at+duration
    if not narration['segments']:raise ValueError('No narration segments')
    output.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='demo-director-',dir=output.parent) as temp:
        work=Path(temp); clips=[]
        for i,shot in enumerate(shots):
            frames=round(shot['duration']*fps); u=f'min(on/{max(1,frames-1)},1)'; ease=f'({u}*{u}*(3-2*{u}))'
            def interp(k):return f"({shot['from'][k]}+({shot['to'][k]}-{shot['from'][k]})*{ease})"
            filters=f"fps={fps},scale={width*2}:{height*2}:flags=lanczos,zoompan=z='{interp('zoom')}':x='max(0,min(iw-iw/zoom,iw*{interp('x')}-iw/zoom/2))':y='max(0,min(ih-ih/zoom,ih*{interp('y')}-ih/zoom/2))':d=1:s={width}x{height}:fps={fps}"
            if shot.get('caption'):
                textfile=work/f'caption-{i}.txt';textfile.write_text(shot['caption'])
                filters+=f",drawtext=textfile={textfile.name}:expansion=none:fontcolor=white:fontsize={round(height*.028)}:x=(w-text_w)/2:y=h*0.88:box=1:boxcolor=black@0.8:boxborderw=18"
            if i==0:filters+=',fade=t=in:st=0:d=0.5'
            if i==len(shots)-1:filters+=f",fade=t=out:st={frames/fps-0.7}:d=0.7"
            clip=work/f'shot-{i:03}.mp4';clips.append(clip)
            run(['ffmpeg','-hide_banner','-loglevel','error','-n','-ss',str(shot.get('start',0)),'-i',str((base/shot['source']).resolve()),'-an','-vf',filters,'-frames:v',str(frames),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',str(clip)],cwd=work)
        listing=work/'shots.ffconcat';listing.write_text('\n'.join(f"file '{p.name}'" for p in clips)+'\n')
        silent=work/'picture.mp4'
        run(['ffmpeg','-hide_banner','-loglevel','error','-n','-f','concat','-safe','1','-i',str(listing),'-c','copy',str(silent)])
        filters=[];labels=[]
        for i,seg in enumerate(narration['segments']):
            filters.append(f"[1:a]atrim=start={seg['sourceStart']}:duration={seg['duration']},asetpts=PTS-STARTPTS,adelay={round(seg['at']*1000)}:all=1[a{i}]");labels.append(f'[a{i}]')
        filters.append(''.join(labels)+f"amix=inputs={len(labels)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration={total}[voice]")
        run(['ffmpeg','-hide_banner','-loglevel','error','-n','-i',str(silent),'-i',str(audio),'-filter_complex',';'.join(filters),'-map','0:v','-map','[voice]','-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',str(output)])
    run(['ffmpeg','-v','error','-xerror','-i',str(output),'-f','null','-'])
    result=probe(output)
    if abs(float(result['format']['duration'])-total)>0.15:raise ValueError('Output duration mismatch')
    receipt={'manifestSha256':digest(manifest_path),'outputSha256':digest(output),'sources':{str(p):digest(p) for p in sources},'duration':total,'probe':result,'fullDecode':'passed','ownerAudition':'pending','publication':'not_requested'}
    output.with_suffix('.receipt.json').write_text(json.dumps(receipt,indent=2))
    return {'output':str(output),'duration':total,'fullDecode':'passed'}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__); sub=parser.add_subparsers(dest='command',required=True)
    for name in ['encode-capture','render']:
        p=sub.add_parser(name);p.add_argument('source');p.add_argument('output')
    args=parser.parse_args()
    print(json.dumps(encode_capture(args.source,args.output) if args.command=='encode-capture' else render(args.source,args.output),indent=2))
