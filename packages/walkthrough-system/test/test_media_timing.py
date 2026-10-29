"""Real media regressions for portable preparation and source A/V timing."""
import hashlib, importlib.util, json, re, subprocess, sys, tempfile, unittest
from pathlib import Path
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
SCRIPTS=ROOT.parent/'dotfiles/codex/skills/create-something-demo-director/scripts'
spec=importlib.util.spec_from_file_location('render',ROOT/'render.py');render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)
FF=imageio_ffmpeg.get_ffmpeg_exe()

def manifest(source, duration=1, start=0):
    return {'title':'Synthetic timing regression','source':{'original':source.name,'file':'screen.mp4','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'in':start,'out':start+duration,'duration':duration,'crop':[320,240,0,0]},'scenes':[{'id':'inspect','label':'Inspect','title':'Inspect the fixture.','prompt':'Synthetic media only.','evidence':'Generated regression fixture.','start':0,'end':duration}]}

class MediaTimingTests(unittest.TestCase):
    def test_rotated_recording_prepare_then_render_uses_display_dimensions(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);base=root/'base.mp4'
            render.run([FF,'-y','-f','lavfi','-i','testsrc2=s=320x240:r=30:d=1','-c:v','libx264','-pix_fmt','yuv420p',str(base)])
            for angle in (90,270):
                with self.subTest(angle=angle):
                    source=root/f'rotated-{angle}.mp4';out=root/f'project-{angle}'
                    render.run([FF,'-y','-display_rotation:v:0',str(angle),'-i',str(base),'-c','copy',str(source)])
                    probe=subprocess.run([FF,'-hide_banner','-i',str(source)],capture_output=True,text=True).stderr
                    self.assertIn('displaymatrix: rotation of',probe)
                    before=hashlib.sha256(source.read_bytes()).hexdigest()
                    subprocess.run([sys.executable,str(SCRIPTS/'prepare.py'),'--source',str(source),'--out',str(out),'--outcome','Inspect a synthetic rotated recording.'],check=True,capture_output=True)
                    m=json.loads((out/'manifest.json').read_text())
                    self.assertEqual(m['source']['crop'],[240,320,0,0])
                    self.assertEqual((render.inspect_source(FF,source)['width'],render.inspect_source(FF,source)['height']),(240,320))
                    directed=manifest(out/'reference.mp4');directed['source']=m['source'];directed['source']['duration']=1
                    (out/'manifest.json').write_text(json.dumps(directed))
                    subprocess.run([sys.executable,str(out/'render.py'),'--manifest',str(out/'manifest.json')],check=True,capture_output=True)
                    info=render.inspect_source(FF,out/'screen.mp4')
                    self.assertEqual((info['width'],info['height']),(240,320))
                    render.verify_frame_count(FF,out/'screen.mp4',30)
                    self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),before)

    def test_delayed_audio_remains_delayed_relative_to_video_after_trim(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'delayed.mp4'
            render.run([FF,'-y','-f','lavfi','-i','color=c=red:s=320x240:r=30:d=2','-itsoffset','0.5','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1.5','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',str(source)])
            m=manifest(source,duration=1.5,start=.25)
            m['mobile']={'file':'screen-mobile.mp4','poster':'poster-mobile.jpg','width':240,'height':240,'shots':[{'start':0,'end':1.5,'crop':[240,240,0,0],'label':'Synthetic timing'}]}
            p=root/'manifest.json';p.write_text(json.dumps(m));render.build(p)
            for name in ('screen.mp4','walkthrough.mp4','screen-mobile.mp4','walkthrough-mobile.mp4'):
                result=subprocess.run([FF,'-hide_banner','-i',str(root/name),'-map','0:a:0','-af','ashowinfo','-frames:a','1','-f','null','-'],capture_output=True,text=True,check=True)
                match=re.search(r'ashowinfo[^\n]*pts_time:([\d.]+)',result.stderr)
                self.assertIsNotNone(match,result.stderr)
                # Preserve the intentional half-second source offset minus the quarter-second cut.
                # AAC priming and frame alignment may differ by one codec/video frame.
                self.assertAlmostEqual(float(match[1]),.25,delta=.05,msg=name)
                render.verify_frame_count(FF,root/name,45)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),m['source']['sha256'])

if __name__=='__main__':unittest.main()
