import importlib.util,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('adapter',Path(__file__).with_name('draw-agent.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Adapter(unittest.TestCase):
    def test_run_sends_exactly_one_command_and_preserves_uncertain_receipt(self):
        with tempfile.TemporaryDirectory() as folder:
            a=m.DrawAgent(state=Path(folder)/'state.json');a.connections={'p':{'sessionId':'s','agentToken':'not-real'}}
            requests=[]
            def request(action,payload=None,connection=None):
                requests.append((action,payload))
                if action=='enqueue':raise OSError('transport interrupted')
                raise AssertionError('Must not retry')
            a.request=request
            result=a.call('draw_agent_run',{'projectId':'p','expectedRevision':'r','commands':[{'type':'transform','ids':['n'],'x':2}],'commandId':'id'})
            self.assertEqual(result['state'],'unconfirmed');self.assertEqual(len(requests),1)
            self.assertEqual(requests[0][1]['tool'],'draw_execute');self.assertEqual(result['commandId'],'id')
    def test_run_preserves_applied_but_unverified_result(self):
        with tempfile.TemporaryDirectory() as folder:
            a=m.DrawAgent(state=Path(folder)/'state.json');a.connections={'p':{'sessionId':'s','agentToken':'not-real'}}
            calls=[]
            def request(action,payload=None,connection=None):
                calls.append(action)
                return {} if action=='enqueue' else {'state':'completed','result':{'ok':False,'applied':True,'mutation':{'changeId':'change'}}}
            a.request=request
            result=a.call('draw_agent_run',{'projectId':'p','expectedRevision':'r','commands':[]})
            self.assertTrue(result['result']['applied']);self.assertFalse(result['result']['ok']);self.assertEqual(calls,['enqueue','receipt'])
if __name__=='__main__':unittest.main()
