import unittest
from draw_intent import route, execute_intent

SNAPSHOT = {'revision': 'r1', 'summary': {'selectedIds': []}, 'objects': [{'id': 'n1', 'kind': 'note', 'x': 100, 'y': 200, 'text': 'Inspect'}]}
def decision(action='move_right', target='object_0', confidence=.99):
    return {'model': 'test', 'answers': {key: {'type': 'choice', 'choice': value, 'confidence': confidence, 'probabilities': {value: confidence}} for key, value in [('action', action), ('target', target)]}}
class Routing(unittest.TestCase):
    def test_bounded_move_compiles_existing_ids_and_revision(self):
        result = route(SNAPSHOT, 'Move Inspect right 32 units', evaluator=lambda *_: decision())
        self.assertEqual(result['commands'], [{'type': 'transform', 'ids': ['n1'], 'x': 132}])
        self.assertEqual(result['expectedRevision'], 'r1')
    def test_uncertain_unsupported_and_invalid_decisions_never_execute(self):
        for response in [decision('fallback'), decision('delete_everything'), decision(target='invented'), decision(confidence=.5), decision(confidence=float('nan')), {}]:
            self.assertEqual(route(SNAPSHOT, 'Do something', evaluator=lambda *_, r=response: r)['state'], 'needs_reasoning')
    def test_truncated_or_locked_context_never_calls_model(self):
        def forbidden(*_): raise AssertionError('Must not call model')
        for snapshot in [{**SNAPSHOT, 'truncated': True}, {**SNAPSHOT, 'objects': [{**SNAPSHOT['objects'][0], 'locked': True}]}]:
            self.assertEqual(route(snapshot, 'Move it', evaluator=forbidden)['state'], 'needs_reasoning')
    def test_single_selection_does_not_duplicate_target_choices(self):
        def evaluator(state, questions):
            self.assertNotIn('selection', questions['target']['criteria'])
            self.assertEqual(state['selectedIds'], ['n1'])
            return decision()
        snapshot={**SNAPSHOT, 'summary': {'selectedIds': ['n1']}}
        self.assertEqual(route(snapshot, 'Move the selected note right', evaluator=evaluator)['state'], 'routed')
    def test_no_model_generated_tools_or_fields(self):
        result=route(SNAPSHOT,'Color the note amber',evaluator=lambda *_: decision('color_amber'))
        self.assertEqual(result['state'],'needs_reasoning')
    def test_provider_failure_falls_back(self):
        def unavailable(*_): raise TimeoutError('secret provider detail')
        result=route(SNAPSHOT,'Move it',evaluator=unavailable)
        self.assertEqual(result['state'],'needs_reasoning');self.assertNotIn('secret',str(result))
    def test_one_routed_request_executes_once_and_preserves_uncertainty(self):
        class Agent:
            calls=[]
            def call(self,name,args):
                self.calls.append((name,args))
                if name=='draw_agent_tools':return {'online':True,'mode':'canvas','tools':[{'name':'draw_execute'}]}
                if name=='draw_agent_call':return {'state':'completed','result':SNAPSHOT}
                return {'state':'unknown','commandId':'receipt'}
        a=Agent();result=execute_intent(a,{'projectId':'p','request':'Move Inspect right'},lambda *_:decision())
        self.assertEqual(result['state'],'unknown');self.assertEqual([n for n,_ in a.calls].count('draw_agent_run'),1)
if __name__=='__main__':unittest.main()
