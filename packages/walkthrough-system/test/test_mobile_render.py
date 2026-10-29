import copy, hashlib, importlib.util, json, subprocess, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('render',ROOT/'render.py');render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)

def fixture():
    return {'title':'Mobile fixture','source':{'file':'screen.mp4','original':'source.mp4','sha256':'','in':0,'out':1,'duration':1,'crop':[320,240,0,0]},'scenes':[{'id':'watch','start':0,'end':1,'label':'Watch','title':'Follow the focus.','prompt':'Inspect the selected screen detail.','evidence':'A synthetic test.'}], 'mobile':{'file':'screen-mobile.mp4','poster':'poster-mobile.jpg','width':240,'height':240,'shots':[{'start':0,'end':.5,'crop':[160,160,0,0],'label':'Left detail'},{'start':.5,'end':1,'crop':[160,160,160,0],'label':'Right detail'}]}}

class MobileTests(unittest.TestCase):
    def test_mobile_rejects_invalid_geometry_timing_and_output(self):
        cases=[]
        for key,value in [('file','screen.mp4'),('poster','poster.jpg'),('width',241),('height',0)]:
            m=fixture();m['mobile'][key]=value;cases.append(m)
        for key,value in [('crop',[162,160,160,0]),('crop',[160,160,1,0]),('start',.1),('end',float('nan'))]:
            m=fixture();m['mobile']['shots'][0][key]=value;cases.append(m)
        for m in cases:
            with self.subTest(m=m),self.assertRaises(ValueError):render.validate(m)
    def test_nine_shots_keep_every_source_frame(self):
        import imageio_ffmpeg
        ff=imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);screen=root/'screen.mp4'
            render.run([ff,'-y','-f','lavfi','-i','color=c=red:s=320x240:r=30:d=1','-c:v','libx264','-pix_fmt','yuv420p',str(screen)])
            m=fixture();bounds=[i/10 for i in range(9)]+[1]
            m['mobile']['shots']=[{'start':a,'end':b,'crop':[160,160,0,0],'label':'Detail'} for a,b in zip(bounds,bounds[1:])]
            outputs=render.render_mobile(ff,m,screen,root,False)
            for name in ['screen-mobile.mp4','walkthrough-mobile.mp4']:
                count,duration=imageio_ffmpeg.count_frames_and_secs(str(root/name))
                self.assertEqual(count,30,name)
                self.assertAlmostEqual(duration,1,delta=1/30)
                self.assertAlmostEqual(render.inspect_source(ff,root/name)['duration'],1,delta=.01,msg=name)

    def test_inset_keeps_dimmed_context_and_enlarged_recorded_pixels(self):
        import imageio_ffmpeg
        ff=imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);screen=root/'screen.mp4'
            render.run([ff,'-y','-f','lavfi','-i','color=c=red:s=320x240:r=30:d=1,drawbox=x=160:y=0:w=160:h=240:color=blue:t=fill','-c:v','libx264','-pix_fmt','yuv420p',str(screen)])
            m=fixture();m['mobile']['presentation']='inset'
            render.render_mobile(ff,m,screen,root,False)
            raw=subprocess.run([ff,'-v','error','-i',str(root/'screen-mobile.mp4'),'-vf','select=eq(n\\,7)','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True,check=True).stdout
            def pixel(x,y):return tuple(raw[(y*240+x)*3:(y*240+x)*3+3])
            self.assertGreater(pixel(120,120)[0],200)
            self.assertGreater(pixel(230,120)[2],30)
            self.assertLess(pixel(230,120)[2],80)
            self.assertEqual(imageio_ffmpeg.count_frames_and_secs(str(root/'screen-mobile.mp4'))[0],30)

    def test_mobile_exports_preserve_audio_time_and_focused_pixels(self):
        import imageio_ffmpeg
        ff=imageio_ffmpeg.get_ffmpeg_exe()
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);source=root/'source.mp4'
            render.run([ff,'-y','-f','lavfi','-i','color=c=red:s=320x240:r=30:d=1,drawbox=x=160:y=0:w=160:h=240:color=blue:t=fill','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(source)])
            m=fixture();m['source']['sha256']=hashlib.sha256(source.read_bytes()).hexdigest();manifest=root/'manifest.json';manifest.write_text(json.dumps(m));render.build(manifest)
            for name,size in [('screen-mobile.mp4',(240,240)),('walkthrough-mobile.mp4',(720,1280))]:
                path=root/name;self.assertTrue(path.is_file(),name)
                metadata=render.inspect_source(ff,path);self.assertEqual((metadata['width'],metadata['height']),size);self.assertAlmostEqual(metadata['duration'],1,delta=.05);self.assertTrue(metadata['has_audio'])
                render.run([ff,'-v','error','-i',str(path),'-f','null','-'])
            for n,expected in [(7,0),(22,2)]:
                raw=subprocess.run([ff,'-v','error','-i',str(root/'screen-mobile.mp4'),'-vf',f'select=eq(n\\,{n})','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True,check=True).stdout
                offset=(120*240+120)*3;rgb=tuple(raw[offset:offset+3]);self.assertGreater(rgb[expected],200)
            receipt=json.loads((root/'render-receipt.json').read_text())
            for name in ['screen-mobile.mp4','walkthrough-mobile.mp4','poster-mobile.jpg']:
                self.assertEqual(receipt['output_sha256'][name],hashlib.sha256((root/name).read_bytes()).hexdigest())
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(),m['source']['sha256'])

if __name__=='__main__':unittest.main()
