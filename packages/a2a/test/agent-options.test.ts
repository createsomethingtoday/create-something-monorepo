import test from 'node:test';
import assert from 'node:assert/strict';
import { agentLabel, agentOptions, membershipOptions } from '../web/agent-options';

test('display labels match native options for distinct agents sharing a name', () => {
  const input = [
    { value: 'agent-north-12345678', label: 'Atlas' },
    { value: 'agent-south-12345678', label: 'Atlas' }
  ];
  for (const option of agentOptions(input)) {
    assert.equal(agentLabel(option.value, input), option.label);
  }
});

test('duplicate records use the first exact identity and do not create false collisions', () => {
  const input = [
    { value: 'a', label: 'Atlas' },
    { value: 'a', label: 'Old name' },
    { value: 'b', label: 'Old name' }
  ];
  assert.equal(agentLabel('a', input), 'Atlas');
  assert.equal(agentLabel('b', input), 'Old name');
  assert.deepEqual(input[1], { value: 'a', label: 'Old name' });
});

test('historical names override the target record and disambiguate unknown authors', () => {
  const input = [{ value: 'current-12345678', label: 'Atlas' }];
  assert.equal(agentLabel('current-12345678', input, 'Earlier'), 'Earlier');
  const expected = agentOptions([...input, { value: 'historical-87654321', label: 'Atlas' }]);
  assert.equal(agentLabel('historical-87654321', input, 'Atlas'), expected[1].label);
});

test('unknown identities retain their complete ID without inferring a matching name', () => {
  const id = 'unknown-' + '1234567890'.repeat(8);
  assert.equal(agentLabel(id, [{ value: 'other', label: 'Atlas' }]), id);
});

test('display labels format long and suffix-like raw names only once', () => {
  const input = [
    { value: 'a-12345678', label: 'A'.repeat(100) },
    { value: 'b-87654321', label: 'A'.repeat(100) },
    { value: 'c-abcdefgh', label: 'Atlas · 12345678' }
  ];
  for (const option of agentOptions(input)) {
    assert.equal(agentLabel(option.value, input), option.label);
  }
});

test('duplicate agent names are distinguishable before selection and preserve exact values', () => {
  const input = [
    { value: 'agent-north-12345678', label: 'Research' },
    { value: 'agent-south-12345678', label: 'Research' }
  ];
  const result = agentOptions(input);
  assert.equal(new Set(result.map((o) => o.label)).size, 2);
  assert.deepEqual(
    result.map((o) => o.value),
    input.map((o) => o.value)
  );
  assert.ok(result.every((o) => o.label.includes('Research') && o.label.includes('12345678')));
});

test('unique short names stay unchanged, unnamed agents retain their ID', () => {
  assert.deepEqual(
    agentOptions([
      { value: 'a', label: 'Research' },
      { value: 'agent-b', label: '' }
    ]),
    [
      { value: 'a', label: 'Research' },
      { value: 'agent-b', label: 'agent-b' }
    ]
  );
});

test('long names and collisions with literal suffix-like names remain unique and compact', () => {
  const input = [
    { value: 'prefix-A-12345678', label: 'A'.repeat(150) },
    { value: 'prefix-B-12345678', label: 'A'.repeat(149) + 'B' },
    { value: 'third-abcdefgh', label: 'Research' },
    { value: 'fourth-ijklmnop', label: 'Research' },
    { value: 'fifth-qrstuvwx', label: 'Research · abcdefgh' }
  ];
  const result = agentOptions(input);
  assert.equal(new Set(result.map((o) => o.label)).size, input.length);
  assert.ok(result.every((o) => o.label.length < 80));
  assert.deepEqual(
    result.map((o) => o.value),
    input.map((o) => o.value)
  );
});

test('membership choices are empty when every owned agent is already active', () => {
  assert.deepEqual(
    membershipOptions(
      [
        { id: 'agent-north', name: 'North', paused: 0, deleted_at: null },
        { id: 'agent-south', name: 'South', paused: 0, deleted_at: null }
      ],
      ['agent-north', 'agent-south']
    ),
    []
  );
});

test('membership choices exclude paused and deleted agents, including zero deletion timestamps', () => {
  assert.deepEqual(
    membershipOptions(
      [
        { id: 'eligible', name: 'Ready', paused: 0, deleted_at: null },
        { id: 'paused', name: 'Paused', paused: 1, deleted_at: null },
        { id: 'nonzero-paused', name: 'Paused twice', paused: 2, deleted_at: null },
        { id: 'deleted', name: 'Deleted', paused: 0, deleted_at: 123 },
        { id: 'deleted-at-zero', name: 'Deleted at epoch', paused: 0, deleted_at: 0 }
      ],
      []
    ),
    [{ value: 'eligible', label: 'Ready' }]
  );
});

test('a revoked member can rejoin when its ID is absent from the active membership IDs', () => {
  assert.deepEqual(
    membershipOptions(
      [
        { id: 'active-member', name: 'Current', paused: 0, deleted_at: null },
        { id: 'revoked-member', name: 'Returning', paused: 0, deleted_at: null }
      ],
      ['active-member']
    ),
    [{ value: 'revoked-member', label: 'Returning' }]
  );
});

test('membership choices preserve source order, exact IDs, and raw duplicate names for formatting', () => {
  const agents = [
    { id: 'z-north-12345678', name: ' Research ', paused: 0, deleted_at: null },
    { id: 'active-12345678', name: 'Already joined', paused: 0, deleted_at: null },
    { id: 'a-south-12345678', name: ' Research ', paused: 0, deleted_at: null },
    { id: 'unnamed-agent', name: '', paused: 0, deleted_at: null }
  ] as const;
  const result = membershipOptions(agents, ['active-12345678']);
  assert.deepEqual(result, [
    { value: 'z-north-12345678', label: ' Research ' },
    { value: 'a-south-12345678', label: ' Research ' },
    { value: 'unnamed-agent', label: '' }
  ]);
  const formatted = agentOptions(result);
  assert.equal(new Set(formatted.map((option) => option.label)).size, 3);
  assert.deepEqual(
    formatted.map((option) => option.value),
    result.map((option) => option.value)
  );
  assert.ok(formatted.slice(0, 2).every((option) => option.label.startsWith('Research · ')));
});
