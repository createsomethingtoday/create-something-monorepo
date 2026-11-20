import test from 'node:test';
import assert from 'node:assert/strict';
import { groupMessages } from '../web/message-groups';

const notice = (id: string) => ({
  id, kind: 'notice', author_agent_id: null, author_name: '',
  text: `Full notice ${id}`, created_at: 1000, state: 'posted'
});

test('consecutive authorless notices become one counted run without losing any message data', () => {
  const input = [notice('a'), notice('b'), notice('c'), notice('d'), notice('e')];
  const snapshot = structuredClone(input);
  const result = groupMessages(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].kind, 'notices');
  if (result[0].kind !== 'notices') assert.fail('Expected a notice run');
  assert.equal(result[0].id, 'a');
  assert.equal(result[0].messages.length, 5);
  assert.deepEqual(result[0].messages, input);
  assert.ok(result[0].messages.every((message, index) => message === input[index]));
  assert.deepEqual(input, snapshot);
});

test('single notices stay visible; two notices group, including a trailing run', () => {
  const authored = { ...notice('post'), kind: 'conversation', author_name: 'Owner' };
  const result = groupMessages([notice('single'), authored, notice('b'), notice('c')]);
  assert.deepEqual(result, [
    { kind: 'message', message: notice('single') },
    { kind: 'message', message: authored },
    { kind: 'notices', id: 'b', messages: [notice('b'), notice('c')] }
  ]);
  assert.deepEqual(groupMessages([]), []);
});

test('authored notices, conversations, work requests and results each break a run', () => {
  const boundaries = [
    { ...notice('agent-notice'), author_agent_id: 'agent-a' },
    { ...notice('owner-notice'), author_name: 'Owner' },
    { ...notice('post'), kind: 'conversation' },
    { ...notice('request'), kind: 'request' },
    { ...notice('result'), kind: 'result' }
  ];
  for (const boundary of boundaries) {
    const input = [notice('a'), notice('b'), boundary, notice('c'), notice('d')];
    const result = groupMessages(input);
    assert.deepEqual(result.map((group) => group.kind), ['notices', 'message', 'notices']);
    assert.deepEqual(result[1], { kind: 'message', message: boundary });
    const flattened = result.flatMap((group) => group.kind === 'notices' ? group.messages : [group.message]);
    assert.deepEqual(flattened, input);
  }
});

test('source chronology is preserved, independent of repeated text or nonmonotonic timestamps', () => {
  const input = [
    { ...notice('a'), text: 'Same membership notice', created_at: 2000 },
    { ...notice('b'), text: 'Same membership notice', created_at: 2000 },
    { ...notice('c'), text: 'A different update', created_at: 1000 }
  ];
  const result = groupMessages(input);
  assert.deepEqual(result, [{ kind: 'notices', id: 'a', messages: input }]);
  const extended = groupMessages([...input, notice('d')])[0];
  if (extended.kind !== 'notices') assert.fail('Expected the extended notice run');
  assert.equal(extended.id, 'a');
  assert.equal(extended.messages.length, 4);
});
