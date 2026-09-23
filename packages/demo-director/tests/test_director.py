import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('director',Path(__file__).parents[1]/'scripts/director.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d)
class DirectorTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','testsrc2=size=320x180:rate=30','-t','2','-c:v','libx264',str(self.root/'source.mp4')],check=True)
        subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1',str(self.root/'voice.wav')],check=True)
        self.plan={'version':1,'width':320,'height':180,'fps':30,'shots':[{'source':'source.mp4','start':0,'duration':2,'from':{'zoom':1,'x':.5,'y':.5},'to':{'zoom':1.4,'x':.6,'y':.4},'caption':"Literal %{text}: user's demo"}],'narration':{'source':'voice.wav','segments':[{'sourceStart':0,'duration':1,'at':.5}]}}
    def tearDown(self):self.temp.cleanup()
    def render(self):
        p=self.root/'edit.json';p.write_text(json.dumps(self.plan));return d.render(p,self.root/'final.mp4')
    def test_real_encode_has_both_streams_receipt_and_refuses_overwrite(self):
        self.plan['shots'][0]['duration']=1
        self.plan['shots'].append({**self.plan['shots'][0], 'start':1, 'from':{'zoom':1.4,'x':.6,'y':.4}, 'to':{'zoom':1,'x':.5,'y':.5}})
        result=self.render();self.assertEqual(result['fullDecode'],'passed')
        receipt=json.loads((self.root/'final.receipt.json').read_text())
        self.assertEqual({s['codec_type'] for s in receipt['probe']['streams']},{'video','audio'})
        self.assertEqual(receipt['ownerAudition'],'pending')
        with self.assertRaises(ValueError):self.render()
    def test_renders_multiple_narration_segments_with_silence(self):
        self.plan['narration']['segments']=[{'sourceStart':0,'duration':.4,'at':.1},{'sourceStart':.6,'duration':.4,'at':1.2}]
        self.assertEqual(self.render()['fullDecode'],'passed')
    def test_renders_short_boundary_shot(self):
        self.plan['shots'][0]['duration']=.2
        self.plan['narration']['segments']=[{'sourceStart':0,'duration':.1,'at':.05}]
        self.assertAlmostEqual(self.render()['duration'],.2)
    def test_refuses_narration_truncation(self):
        self.plan['narration']['segments'][0]['at']=1.5
        with self.assertRaisesRegex(ValueError,'truncated'):self.render()
        self.assertFalse((self.root/'final.mp4').exists())
    def test_refuses_source_overrun(self):
        self.plan['shots'][0]['start']=1
        with self.assertRaisesRegex(ValueError,'overruns'):self.render()
    def test_fractional_shot_sum_has_bounded_audio(self):
        shot=self.plan['shots'][0]
        self.plan['shots']=[{**shot,'duration':duration} for duration in [.3,.6,.7]]
        result=self.render()
        self.assertAlmostEqual(result['duration'],1.6)
        streams=d.probe(self.root/'final.mp4')['streams']
        self.assertTrue(all(float(s['duration'])<1.7 for s in streams))
    def test_rejects_picture_overrun_with_long_audio_track(self):
        subprocess.run(['ffmpeg','-v','error','-i',str(self.root/'source.mp4'),'-f','lavfi','-i','sine=frequency=440:duration=4','-c:v','copy','-c:a','aac',str(self.root/'long-audio.mp4')],check=True)
        self.plan['shots'][0].update(source='long-audio.mp4',duration=3)
        with self.assertRaisesRegex(ValueError,'overruns'):self.render()
    def test_rejects_changed_input_without_receipt(self):
        real_run=d.run
        def mutate(args,cwd=None):
            real_run(args,cwd)
            if '-xerror' in args:
                p=self.root/'edit.json';p.write_text(p.read_text()+' ')
        with patch.object(d,'run',side_effect=mutate):
            with self.assertRaisesRegex(ValueError,'Inputs changed'):self.render()
        self.assertFalse((self.root/'final.receipt.json').exists())
    def test_refuses_fractional_fps(self):
        self.plan['fps']=29.97
        with self.assertRaisesRegex(ValueError,'Integer fps'):self.render()
    def test_encodes_capture_with_late_final_frame(self):
        subprocess.run(['ffmpeg','-v','error','-i',str(self.root/'source.mp4'),'-frames:v','1',str(self.root/'frame-000000.jpg')],check=True)
        (self.root/'frame-000001.jpg').write_bytes((self.root/'frame-000000.jpg').read_bytes())
        (self.root/'capture.json').write_text(json.dumps({'seconds':1,'frames':[{'file':'frame-000000.jpg','receivedSeconds':.1},{'file':'frame-000001.jpg','receivedSeconds':1.05}]}))
        result=d.encode_capture(self.root,self.root/'captured.mp4')
        self.assertAlmostEqual(float(result['format']['duration']),1,places=1)
    def test_refuses_invalid_camera(self):
        self.plan['shots'][0]['to']['zoom']=float('nan')
        with self.assertRaises(ValueError):self.render()
if __name__=='__main__':unittest.main()
