import {test} from 'node:test';
import assert from 'node:assert/strict';
import {conversationCount,conversationGroups} from '../web/inbox-view.ts';
const message=(threadId:string,sequence:number,fromAgentId='peer',text='Hello')=>({threadId,sequence,createdAt:sequence,fromAgentId,toAgentId:fromAgentId==='me'?'peer':'me',text,fromAgentName:fromAgentId==='peer'?'Studio Dot':'My Dot'});
test('offline: conversation count includes sent threads and counts each thread once',()=>{
  assert.equal(conversationCount([message('one',1),message('one',2),message('two',3,'me'),message('three',4,'me')]),3);
});
test('offline: local search finds older text and peer names without changing message order',()=>{
  const messages=[message('one',2,'me','Latest'),message('two',3,'me'),message('one',1,'peer','Earlier decision')];
  assert.deepEqual(conversationGroups(messages,'  DECISION ').map(([id,items])=>[id,items.map(item=>item.sequence)]),[['one',[1,2]]]);
  assert.equal(conversationGroups(messages,'studio').length,1);
  assert.equal(conversationGroups(messages,'missing').length,0);
  assert.deepEqual(conversationGroups(messages,' ').map(([id])=>id),['two','one']);
  assert.equal(messages[0].sequence,2);
});
