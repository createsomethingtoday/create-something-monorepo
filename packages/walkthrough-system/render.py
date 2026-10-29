"""Build the screen asset and a branded MP4, preserving source audio by default from one scene manifest."""
import argparse, hashlib, json, math, os, re, shutil, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent

def validate(m):
    s = m['source']; scenes = m['scenes']
    duration = s['duration']
    if s.get('file') != 'screen.mp4': raise ValueError('Output filename must be screen.mp4')
    if not all(type(s.get(k)) in (int,float) and math.isfinite(s[k]) for k in ['in','out']): raise ValueError('Trim values must be finite numbers')
    if s.get('audio', 'preserve') not in ['preserve','mute']: raise ValueError('source.audio must be preserve or mute')
    if not isinstance(s.get('credit','Supplied screen recording'),str) or not s.get('credit','Supplied screen recording').strip(): raise ValueError('Source credit must be nonempty text')
    if not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
        raise ValueError('duration must be positive and finite')
    if not scenes or len(scenes) > 5:
        raise ValueError('This layout supports 1–5 scenes')
    cursor = 0
    ids = set()
    for scene in scenes:
        a,b = scene['start'],scene['end']
        if not all(isinstance(t,(int,float)) and math.isfinite(t) for t in [a,b]) or abs(a-cursor) > .001 or b <= a:
            raise ValueError('Scenes must cover the timeline continuously without overlap')
        if scene['id'] in ids: raise ValueError('Duplicate scene id')
        ids.add(scene['id'])
        for key in ['id','label','title','prompt','evidence']:
            if not isinstance(scene[key],str) or not scene[key].strip(): raise ValueError(f'Missing {key}')
        cursor = b
    if abs(cursor-duration) > .001 or abs(s['out']-s['in']-duration) > .001:
        raise ValueError('Scene and source durations must agree')
    if s['in'] < 0 or len(s['crop']) != 4 or any(type(v) is not int or v < 0 for v in s['crop']) or min(s['crop'][:2]) <= 0:
        raise ValueError('Invalid trim or crop')
    if any(v % 2 for v in s['crop']): raise ValueError('Crop dimensions and offsets must be even for H.264')
    for key in ['file','original']:
        if Path(s[key]).name != s[key]: raise ValueError('Media must be a filename inside this kit')
    if s['original'] in ['screen.mp4','walkthrough.mp4','poster.jpg','screen-mobile.mp4','walkthrough-mobile.mp4','poster-mobile.jpg','render-receipt.json']: raise ValueError('Original must not be overwritten')
    if 'mobile' in m: validate_mobile(m)
    return m

def validate_mobile(m):
    mobile=m['mobile']; duration=m['source']['duration']
    if not isinstance(mobile,dict) or mobile.get('file')!='screen-mobile.mp4' or mobile.get('poster')!='poster-mobile.jpg': raise ValueError('Mobile outputs must be screen-mobile.mp4 and poster-mobile.jpg')
    if any(type(mobile.get(k)) is not int or not 2<=mobile[k]<=1920 or mobile[k]%2 for k in ['width','height']): raise ValueError('Mobile dimensions must be positive even integers at most 1920')
    if mobile.get('presentation','crop') not in ['crop','inset']: raise ValueError('Mobile presentation must be crop or inset')
    if mobile.get('presentation')=='inset' and min(mobile['width'],mobile['height'])<=48: raise ValueError('Inset mobile dimensions must exceed 48 pixels')
    shots=mobile.get('shots')
    if not isinstance(shots,list) or not shots: raise ValueError('Mobile shots are required')
    cursor=0; source_w,source_h=m['source']['crop'][:2]
    for shot in shots:
        if not isinstance(shot,dict): raise ValueError('Invalid mobile shot')
        a,b=shot.get('start'),shot.get('end')
        if not all(type(t) in (int,float) and math.isfinite(t) for t in [a,b]) or abs(a-cursor)>.001 or b<=a: raise ValueError('Mobile shots must cover the timeline continuously')
        if any(abs(t*30-round(t*30))>.001 for t in [a,b]): raise ValueError('Mobile shot boundaries must align to 30 fps frames')
        crop=shot.get('crop')
        if not isinstance(crop,list) or len(crop)!=4 or any(type(v) is not int or v<0 or v%2 for v in crop) or min(crop[:2])<=0: raise ValueError('Mobile crop must contain positive even dimensions and nonnegative even offsets')
        w,h,x,y=crop
        if x+w>source_w or y+h>source_h: raise ValueError('Mobile crop exceeds the trimmed screen')
        if not isinstance(shot.get('label'),str) or not shot['label'].strip(): raise ValueError('Mobile shot needs a focus label')
        cursor=b
    if abs(cursor-duration)>.001: raise ValueError('Mobile shots must end with the recording')

def font(size, bold=False):
    override = os.environ.get('WALKTHROUGH_FONT_BOLD' if bold else 'WALKTHROUGH_FONT')
    candidates = [override, '/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',
                  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']
    for p in candidates:
        if p and Path(p).exists(): return ImageFont.truetype(p,size)
    raise RuntimeError('Set WALKTHROUGH_FONT and WALKTHROUGH_FONT_BOLD to local TTF files')

def wrap(draw, text, f, width):
    lines=[]; line=''
    for word in text.split():
        if draw.textlength(word,font=f)>width: raise ValueError('An unbreakable word exceeds the rail width')
        candidate=(line+' '+word).strip()
        if draw.textlength(candidate,font=f)>width:
            lines.append(line); line=word
        else: line=candidate
    if line: lines.append(line)
    return lines

def panel(m,index,path):
    # Canon Performance tokens, snapshotted 2026-10-28. Arial is the Canon fallback.
    ink='#090909'; paper='#f3f3f0'; muted='#b6b6ae'; signal='#0057b8'
    im=Image.new('RGBA',(1920,1080),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.rectangle((0,0,511,1080),fill=ink)
    d.text((52,48),'CREATE SOMETHING',font=font(24,True),fill=paper)
    d.text((52,85),'WALKTHROUGHS / 001',font=font(16),fill=muted)
    credit=m['source'].get('credit','Supplied screen recording')
    if d.textlength(m['title'],font=font(22))>1344 or d.textlength(credit,font=font(17))>1344: raise ValueError('Title or source credit exceeds the screen region; shorten copy')
    d.text((512,45),m['title'],font=font(22),fill=paper)
    d.text((512,1020),credit,font=font(17),fill=muted)
    for j,s in enumerate(m['scenes']):
        y=162+j*53
        if j==index: d.rectangle((52,y,56,y+31),fill=signal)
        d.text((73,y+3),f"{j+1:02}  {s['label']}",font=font(23,j==index),fill=paper if j==index else muted)
        d.text((394,y+7),f"{int(s['start']):02}s",font=font(17),fill=muted)
    scene=m['scenes'][index]; y=180+len(m['scenes'])*53
    for line in wrap(d,scene['title'],font(36,True),390):
        d.text((52,y),line,font=font(36,True),fill=paper); y+=44
    y+=25
    for line in wrap(d,scene['prompt'],font(24),390):
        d.text((52,y),line,font=font(24),fill=paper); y+=33
    y+=30
    d.text((52,y),'WHAT TO NOTICE',font=font(16,True),fill=muted); y+=29
    for line in wrap(d,scene['evidence'],font(20),390):
        d.text((52,y),line,font=font(20),fill=muted); y+=27
    if y>990: raise ValueError(f"Scene {scene['id']} overflows; shorten copy")
    im.save(path)

def run(args):
    result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if result.returncode: raise RuntimeError(result.stderr[-6000:])

def inspect_source(ff, path):
    result=subprocess.run([ff,'-hide_banner','-i',str(path)],capture_output=True,text=True)
    text=result.stderr
    video=next((line for line in text.splitlines() if 'Video:' in line), '')
    size=re.search(r'[, ](\d+)x(\d+)(?:[ ,\[])',video)
    duration=re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)',text)
    if not size or not duration: raise ValueError('Could not inspect source dimensions and duration')
    return {'width':int(size[1]),'height':int(size[2]),'duration':int(duration[1])*3600+int(duration[2])*60+float(duration[3]),'has_audio':any('Audio:' in line for line in text.splitlines())}


def mobile_panel(m, scene, shot, path):
    ink='#090909';paper='#f3f3f0';muted='#b6b6ae'
    im=Image.new('RGBA',(720,1280),(0,0,0,0));d=ImageDraw.Draw(im)
    d.rectangle((0,0,719,99),fill=ink);d.rectangle((0,820,719,1279),fill=ink)
    d.text((32,20),'CREATE SOMETHING',font=font(24,True),fill=paper)
    label='FOCUS / '+shot['label']
    if d.textlength(label,font=font(26))>656: raise ValueError('Mobile focus label overflows; shorten copy')
    d.text((32,58),label,font=font(26),fill=muted)
    d.text((32,842),scene['label'].upper(),font=font(22,True),fill=muted)
    y=882
    for line in wrap(d,scene['title'],font(38,True),656):
        d.text((32,y),line,font=font(38,True),fill=paper);y+=46
    y+=18
    for line in wrap(d,scene['prompt'],font(28),656):
        d.text((32,y),line,font=font(28),fill=paper);y+=37
    if y>1204: raise ValueError('Mobile guidance overflows; shorten scene title or prompt')
    d.text((32,1232),'Focused crop · full recording in player',font=font(22),fill=muted)
    im.save(path)

def verify_frame_count(ff,path,expected):
    result=subprocess.run([ff,'-v','error','-nostats','-i',str(path),'-map','0:v:0','-progress','pipe:1','-f','null','-'],capture_output=True,text=True)
    frames=re.findall(r'^frame=(\d+)$',result.stdout,re.MULTILINE)
    if result.returncode or not frames or int(frames[-1])!=expected:
        raise ValueError(f'{path.name} frame count differs from timeline: expected {expected}, got {frames[-1] if frames else "unknown"}')

def render_mobile(ff,m,screen,temp,keep_audio):
    mobile=m['mobile'];shots=mobile['shots'];mw,mh=mobile['width'],mobile['height']
    mobile_screen=temp/'screen-mobile.mp4';master=temp/'walkthrough-mobile.mp4';poster=temp/'poster-mobile.jpg'
    labels=''.join(f'[s{i}]' for i in range(len(shots)))
    filters=[f'[0:v]split={len(shots)}{labels}']
    for i,shot in enumerate(shots):
        w,h,x,y=shot['crop']
        first,last=round(shot['start']*30),round(shot['end']*30)
        base=f"[s{i}]trim=start_frame={first}:end_frame={last},setpts=N/(30*TB)"
        if mobile.get('presentation')=='inset':
            filters.append(base+f',split=2[bg{i}][fg{i}]')
            filters.append(f'[bg{i}]scale={mw}:{mh}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,pad={mw}:{mh}:(ow-iw)/2:(oh-ih)/2:color=0x090909,colorchannelmixer=rr=.22:gg=.22:bb=.22[context{i}]')
            filters.append(f'[fg{i}]crop={w}:{h}:{x}:{y},scale={mw-48}:{mh-48}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,drawbox=x=0:y=0:w=iw:h=ih:color=0x5e6268:t=2[detail{i}]')
            filters.append(f'[context{i}][detail{i}]overlay=(W-w)/2:(H-h)/2:shortest=1[c{i}]')
        else:
            filters.append(base+f',crop={w}:{h}:{x}:{y},scale={mw}:{mh}:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,pad={mw}:{mh}:(ow-iw)/2:(oh-ih)/2:color=0x090909[c{i}]')
    filters.append(''.join(f'[c{i}]' for i in range(len(shots)))+f'concat=n={len(shots)}:v=1:a=0[mobile]')
    run([ff,'-y','-i',str(screen),'-filter_complex',';'.join(filters),'-map','[mobile]','-r','30',*(['-map','0:a?','-c:a','copy'] if keep_audio else ['-an']),'-t',str(m['source']['duration']),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(mobile_screen)])
    cmd=[ff,'-y','-i',str(mobile_screen)]
    intervals=[]
    for scene in m['scenes']:
        for shot in shots:
            start=max(scene['start'],shot['start']);end=min(scene['end'],shot['end'])
            if start>=end: continue
            panel_path=temp/f'mobile-panel-{len(intervals)}.png';mobile_panel(m,scene,shot,panel_path)
            cmd+=['-i',str(panel_path)];intervals.append((start,end))
    filters=['[0:v]scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,pad=720:720:(ow-iw)/2:(oh-ih)/2:color=0x090909,pad=720:1280:0:100:color=0x090909[base]'];prev='base'
    for i,(start,end) in enumerate(intervals):
        out=f'm{i}';filters.append(f"[{prev}][{i+1}:v]overlay=0:0:enable='gte(t,{start})*lt(t,{end})'[{out}]");prev=out
    cmd+=['-filter_complex',';'.join(filters),'-map',f'[{prev}]',*(['-map','0:a?','-c:a','copy'] if keep_audio else ['-an']),'-t',str(m['source']['duration']),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(master)]
    run(cmd)
    for path in [mobile_screen,master]:
        verify_frame_count(ff,path,round(m['source']['duration']*30))
    run([ff,'-y','-i',str(mobile_screen),'-frames:v','1',str(poster)])
    return [mobile_screen,master,poster]

def promote_outputs(root, staged, names):
    """Roll back caught promotion failures; retain backups if recovery itself fails."""
    backup=Path(tempfile.mkdtemp(prefix='.render-backup-',dir=root))
    existed=set(); promoted=[]; preserve_backup=False
    try:
        for name in names:
            dst=root/name
            if dst.is_symlink() or (dst.exists() and not dst.is_file()):
                raise ValueError(f'Output must be a regular file: {name}')
            if dst.exists():
                shutil.copy2(dst,backup/name);existed.add(name)
        try:
            for name in names:
                os.replace(staged/name,root/name);promoted.append(name)
        except BaseException as error:
            failures=[]
            for name in reversed(promoted):
                try:
                    if name in existed:os.replace(backup/name,root/name)
                    else:(root/name).unlink()
                except OSError as rollback_error:failures.append(str(rollback_error))
            if failures:
                preserve_backup=True
                raise RuntimeError(f'Output rollback incomplete. Preserve and recover from {backup}: {failures}') from error
            raise
    finally:
        if not preserve_backup:shutil.rmtree(backup)

def build(manifest):
    manifest=Path(manifest).resolve()
    lock=manifest.parent/'.walkthrough-operation.lock'
    try:lock.mkdir()
    except FileExistsError:
        raise RuntimeError(f'A render or build is in progress. If interrupted, inspect prior outputs before removing stale lock {lock}')
    try:return _build_locked(manifest)
    finally:lock.rmdir()

def _build_locked(manifest):
    manifest_bytes=manifest.read_bytes()
    m=validate(json.loads(manifest_bytes)); root=manifest.parent; s=m['source']
    original=root/s['original']; before=hashlib.sha256(original.read_bytes()).hexdigest()
    if before!=s['sha256']: raise ValueError('Source hash differs; review source and update manifest explicitly')
    import imageio_ffmpeg
    ff=os.environ.get('FFMPEG') or shutil.which('ffmpeg') or imageio_ffmpeg.get_ffmpeg_exe()
    metadata=inspect_source(ff,original)
    w,h,x,y=s['crop']
    if x+w>metadata['width'] or y+h>metadata['height']: raise ValueError('Crop extends outside the source frame')
    if s['out']>metadata['duration']+.02: raise ValueError('Trim extends beyond the source recording')
    if any((root/name).resolve()==original.resolve() for name in ['screen.mp4','walkthrough.mp4','poster.jpg','screen-mobile.mp4','walkthrough-mobile.mp4','poster-mobile.jpg','render-receipt.json']): raise ValueError('An output would overwrite the source')
    keep_audio=metadata['has_audio'] and s.get('audio','preserve')!='mute'
    audio_mode='muted by explicit source.audio setting' if s.get('audio')=='mute' else 'preserved from source (AAC)' if keep_audio else 'none; source has no audio stream'
    with tempfile.TemporaryDirectory(prefix='.walkthrough-render-', dir=root) as temp:
        temp=Path(temp); screen=temp/'screen.mp4'; master=temp/'walkthrough.mp4'
        w,h,x,y=s['crop']
        audio_args=['-map','0:a?','-af',f"atrim=start={s['in']}:end={s['out']},asetpts=PTS-{s['in']}/TB",'-c:a','aac','-b:a','192k'] if keep_audio else ['-an']
        run([ff,'-y','-i',str(original),'-map','0:v:0','-vf',f"trim=start={s['in']}:end={s['out']},setpts=PTS-STARTPTS,crop={w}:{h}:{x}:{y}",*audio_args,'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',str(screen)])
        cmd=[ff,'-y','-i',str(screen)]
        for i in range(len(m['scenes'])):
            p=temp/f'panel-{i}.png'; panel(m,i,p); cmd+=['-i',str(p)]
        filters=['[0:v]scale=1344:900:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1,pad=1344:900:(ow-iw)/2:(oh-ih)/2:color=0x090909,pad=1920:1080:512:90:color=0x090909[base]']
        prev='base'
        for i,scene in enumerate(m['scenes']):
            out=f'p{i}'
            filters.append(f"[{prev}][{i+1}:v]overlay=0:0:enable='gte(t,{scene['start']})*lt(t,{scene['end']})'[{out}]")
            prev=out
        cmd+=['-filter_complex',';'.join(filters),'-map',f'[{prev}]',*(['-map','0:a?','-c:a','copy'] if keep_audio else ['-an']),'-t',str(s['duration']),'-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(master)]
        run(cmd)
        mobile_outputs=render_mobile(ff,m,screen,temp,keep_audio) if 'mobile' in m else []
        # Decode complete video files before replacing deliverables.
        for p in [screen,master]+[p for p in mobile_outputs if p.suffix=='.mp4']: run([ff,'-v','error','-i',str(p),'-f','null','-'])
        run([ff,'-y','-i',str(screen),'-frames:v','1',str(temp/'poster.jpg')])
        if manifest.read_bytes()!=manifest_bytes:
            raise ValueError('Manifest changed during rendering; outputs were not replaced. Render again.')
        if hashlib.sha256(original.read_bytes()).hexdigest()!=before:
            raise ValueError('Source changed during rendering; outputs were not replaced.')
        names=[s['file'],'walkthrough.mp4','poster.jpg']+[p.name for p in mobile_outputs]
        receipt={'source_sha256':before,'manifest_sha256':hashlib.sha256(manifest_bytes).hexdigest(),'duration':s['duration'],'renderer':ff,'audio':audio_mode,'decoded_without_errors':True,'published':False,'output_sha256':{name:hashlib.sha256((temp/name).read_bytes()).hexdigest() for name in names}}
        (temp/'render-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
        promote_outputs(root,temp,names+['render-receipt.json'])
    outputs='screen.mp4, walkthrough.mp4, poster.jpg'+(', screen-mobile.mp4, walkthrough-mobile.mp4, poster-mobile.jpg' if 'mobile' in m else '')
    print(f'Built {outputs}; complete decode passed; source preserved.')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--manifest',type=Path,default=ROOT/'manifest.json');p.add_argument('--validate-only',action='store_true');a=p.parse_args()
    if a.validate_only: validate(json.loads(a.manifest.read_text()));print('Manifest valid')
    else: build(a.manifest.resolve())
