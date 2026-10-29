import copy, importlib.util, json, tempfile, unittest, hashlib, subprocess
from unittest.mock import patch
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('render',ROOT/'render.py');render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)
class ManifestTests(unittest.TestCase):
    def setUp(self): self.m=json.loads((ROOT/'manifest.json').read_text())
    def test_reference_valid(self): render.validate(self.m)
    def test_overlap_and_gap_rejected(self):
        for delta in [-1,1]:
            m=copy.deepcopy(self.m);m['scenes'][1]['start']+=delta
            with self.assertRaises(ValueError):render.validate(m)
    def test_duplicate_rejected(self):
        self.m['scenes'][1]['id']=self.m['scenes'][0]['id']
        with self.assertRaises(ValueError):render.validate(self.m)
    def test_end_must_match_source(self):
        self.m['source']['out']+=1
        with self.assertRaises(ValueError):render.validate(self.m)
    def test_source_cannot_be_overwritten(self):
        self.m['source']['file']=self.m['source']['original']
        with self.assertRaises(ValueError):render.validate(self.m)
    def test_nonfinite_rejected(self):
        self.m['scenes'][1]['end']=float('nan')
        with self.assertRaises(ValueError):render.validate(self.m)
    def test_overflow_rejected_before_export(self):
        self.m['scenes'][0]['prompt']='A long instruction. '*100
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):render.panel(self.m,0,Path(d)/'panel.png')
    def test_all_reference_panels_fit(self):
        with tempfile.TemporaryDirectory() as d:
            for i in range(len(self.m['scenes'])):render.panel(self.m,i,Path(d)/f'{i}.png')
    def test_output_filename_is_fixed(self):
        for name in ['walkthrough.mp4', 'poster.jpg', 'manifest.json', 'another.mp4']:
            m=copy.deepcopy(self.m);m['source']['file']=name
            with self.subTest(name=name), self.assertRaises(ValueError):render.validate(m)
    def test_even_crop_and_finite_trim_required(self):
        for key,value in [('in',float('nan')),('out',float('inf')),('crop',[319,240,0,0]),('crop',[320,241,0,0]),('crop',[320,240,1,0])]:
            m=copy.deepcopy(self.m);m['source'][key]=value
            with self.subTest(key=key,value=value), self.assertRaises(ValueError):render.validate(m)
    def test_generic_credit_is_rendered_without_webflow_claim(self):
        self.m['source']['credit']='Independent source recording'
        seen=[];original=render.ImageDraw.ImageDraw.text
        def spy(draw,xy,text,*args,**kwargs):
            seen.append(text);return original(draw,xy,text,*args,**kwargs)
        with tempfile.TemporaryDirectory() as d, patch.object(render.ImageDraw.ImageDraw,'text',spy):
            render.panel(self.m,0,Path(d)/'panel.png')
        self.assertIn('Independent source recording',seen)
        self.assertFalse(any('WEBFLOW' in text for text in seen))

class RuntimeTests(unittest.TestCase):
    def test_alternate_source_preserves_audio_and_supports_explicit_mute(self):
        import imageio_ffmpeg
        ff=imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'alternate.mp4'
            render.run([ff,'-y','-f','lavfi','-i','color=c=red:s=320x240:r=30:d=1.5','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1.5','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(source)])
            m={'title':'Alternate recording','source':{'file':'screen.mp4','original':'alternate.mp4','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'duration':1,'in':.25,'out':1.25,'crop':[320,240,0,0],'credit':'Independent source recording'},'scenes':[{'id':'observe','start':0,'end':1,'label':'Observe','title':'Read the result.','prompt':'Watch this screen.','evidence':'A red test screen.'}]}
            manifest=root/'manifest.json';manifest.write_text(json.dumps(m))
            render.build(manifest)
            for name in ['screen.mp4','walkthrough.mp4']:
                info=subprocess.run([ff,'-hide_banner','-i',str(root/name)],capture_output=True,text=True).stderr
                self.assertIn('Audio:',info,name)
                pcm=subprocess.run([ff,'-v','error','-i',str(root/name),'-map','0:a:0','-f','s16le','-'],capture_output=True,check=True).stdout
                self.assertGreater(len(pcm),80000)
                self.assertTrue(any(pcm))
            render.run([ff,'-y','-i',str(root/'walkthrough.mp4'),'-frames:v','1',str(root/'frame.png')])
            frame=render.Image.open(root/'frame.png').convert('RGB')
            # A 4:3 input fits as 1200x900, centered in the 1344x900 screen region.
            self.assertLess(max(frame.getpixel((530,500))),20)
            self.assertGreater(frame.getpixel((600,500))[0],200)
            self.assertLess(max(frame.getpixel((1840,500))),20)
            receipt=json.loads((root/'render-receipt.json').read_text())
            self.assertIn('preserved',receipt['audio'])
            m['source']['audio']='mute';manifest.write_text(json.dumps(m));render.build(manifest)
            for name in ['screen.mp4','walkthrough.mp4']:
                info=subprocess.run([ff,'-hide_banner','-i',str(root/name)],capture_output=True,text=True).stderr
                self.assertNotIn('Audio:',info,name)
            self.assertIn('explicit',json.loads((root/'render-receipt.json').read_text())['audio'])
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),m['source']['sha256'])
if __name__=='__main__':unittest.main()
