import json,pathlib,subprocess,sys
name=sys.argv[1];d=pathlib.Path('/private/tmp/client-recordings')/name
f=json.loads((d/'frames.json').read_text());lines=[]
for i,x in enumerate(f):
 dt=max(.001,f[i+1]['time']-x['time']) if i+1<len(f) else .1
 lines += ["file '"+x['file']+"'",f'duration {dt:.6f}']
lines += ["file '"+f[-1]['file']+"'"]
(d/'capture.ffconcat').write_text('\n'.join(lines))
subprocess.run(['ffmpeg','-y','-v','error','-f','concat','-safe','0','-i',str(d/'capture.ffconcat'),'-vf','fps=30,scale=1440:900:flags=lanczos,setsar=1','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(d/'capture.mp4')],check=True)
print(name,len(f),'frames',round(f[-1]['time']-f[0]['time'],2),'seconds')
