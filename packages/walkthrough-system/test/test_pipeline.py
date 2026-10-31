"""Failure-boundary regressions; mocked encoding keeps these checks deterministic."""
import hashlib, importlib.util, json, os, shutil, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('pipeline_render',Path(__file__).parents[1]/'render.py')
render=importlib.util.module_from_spec(spec);spec.loader.exec_module(render)

class PipelineTests(unittest.TestCase):
    def fixture(self,root):
        source=root/'original.mp4';source.write_bytes(b'original recording')
        m={'title':'Fixture','source':{'file':'screen.mp4','original':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'duration':1,'in':0,'out':1,'crop':[320,240,0,0]},'scenes':[{'id':'one','start':0,'end':1,'label':'One','title':'Observe','prompt':'Watch.','evidence':'Original recording.'}]}
        manifest=root/'manifest.json';manifest.write_text(json.dumps(m))
        names=['screen.mp4','walkthrough.mp4','poster.jpg','render-receipt.json']
        for n in names:(root/n).write_bytes(('previous '+n).encode())
        return manifest,{n:(root/n).read_bytes() for n in names}
    def run_mocked(self,manifest,on_run=None):
        def run(args):
            if on_run:on_run()
            if args[-1]!='-':Path(args[-1]).write_bytes(b'new rendered artifact')
        with patch.object(render,'run',run),patch.object(render,'inspect_source',return_value={'width':320,'height':240,'duration':1,'has_audio':False}),patch.object(render,'panel',side_effect=lambda m,i,p:p.write_bytes(b'panel')):
            render.build(manifest)
    def test_manifest_edit_during_render_preserves_previous_generation(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);manifest,old=self.fixture(root);changed=False
            def mutate():
                nonlocal changed
                if not changed:
                    m=json.loads(manifest.read_text());m['scenes'][0]['prompt']='Edited while rendering.';manifest.write_text(json.dumps(m));changed=True
            with self.assertRaisesRegex(ValueError,'manifest.*changed|Manifest.*changed'):
                self.run_mocked(manifest,mutate)
            self.assertEqual({n:(root/n).read_bytes() for n in old},old)
    def test_promotion_failure_restores_outputs_and_receipt(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);manifest,old=self.fixture(root);failed=False
            real_copy=shutil.copy2;real_replace=os.replace
            def inject(fn,src,dst,*args,**kwargs):
                nonlocal failed
                if Path(dst).resolve()==(root/'walkthrough.mp4').resolve() and not failed:
                    failed=True;raise OSError('injected promotion failure')
                return fn(src,dst,*args,**kwargs)
            with patch.object(render.shutil,'copy2',side_effect=lambda *a,**k:inject(real_copy,*a,**k)),patch.object(render.os,'replace',side_effect=lambda *a,**k:inject(real_replace,*a,**k)):
                with self.assertRaisesRegex(OSError,'injected promotion failure'):self.run_mocked(manifest)
            self.assertTrue(failed)
            self.assertEqual({n:(root/n).read_bytes() for n in old},old)

    def test_render_rejects_concurrent_operation_and_keeps_other_lock(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);manifest,old=self.fixture(root)
            lock=root/'.walkthrough-operation.lock';lock.mkdir()
            with self.assertRaisesRegex(RuntimeError,'in progress'):self.run_mocked(manifest)
            self.assertTrue(lock.is_dir())
            self.assertEqual({n:(root/n).read_bytes() for n in old},old)
    def test_successful_generation_has_matching_receipt_and_releases_lock(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d);manifest,old=self.fixture(root);self.run_mocked(manifest)
            receipt=json.loads((root/'render-receipt.json').read_text())
            self.assertEqual(receipt['manifest_sha256'],hashlib.sha256(manifest.read_bytes()).hexdigest())
            for name,value in receipt['output_sha256'].items():
                self.assertEqual(value,hashlib.sha256((root/name).read_bytes()).hexdigest())
            self.assertFalse((root/'.walkthrough-operation.lock').exists())
            self.assertFalse(list(root.glob('.render-backup-*')))

if __name__=='__main__':unittest.main()
