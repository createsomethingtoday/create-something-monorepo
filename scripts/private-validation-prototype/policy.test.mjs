import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POLICY, validateImage, containerArgs, classify, assertIsolation } from './policy.mjs';

test('mutable tags and argument injection never reach Docker', () => {
  for (const image of ['node:24', 'node:latest', 'evil@sha256:' + 'a'.repeat(64), '--privileged']) {
    assert.throws(() => validateImage(image));
  }
  assert.throws(() => containerArgs('node@sha256:' + 'a'.repeat(64), '--privileged'));
});

test('cleanup failures override a nominally successful fixture', () => {
  assert.equal(classify({ exitCode: 0, output: 'ok', cleanup: false }, { expectedOutput: 'ok' }), 'cleanup-failed');
});

test('timeout and out-of-memory are distinct from generic failures', () => {
  assert.equal(classify({ exitCode: 1, cleanup: true }, { expect: 'timeout' }), 'failed');
  assert.equal(classify({ exitCode: 137, cleanup: true, oomKilled: false }, { expect: 'oom' }), 'failed');
  assert.equal(classify({ exitCode: 137, cleanup: true, timedOut: true }, { expect: 'timeout' }), 'watchdog-expired');
});

test('success requires the expected outcome, not merely a zero exit', () => {
  assert.equal(classify({ exitCode: 0, output: 'wrong', cleanup: true }, { expectedOutput: 'ok' }), 'failed');
});

test('configuration tampering is rejected before execution', () => {
  const config = {
    Config: { User: '1000:1000' }, Mounts: [],
    HostConfig: {
      NetworkMode: 'none', ReadonlyRootfs: true, CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'],
      Memory: POLICY.memoryMiB * 1048576, MemorySwap: POLICY.memoryMiB * 1048576,
      NanoCpus: POLICY.cpus * 1e9, PidsLimit: POLICY.pids,
      LogConfig: { Type: 'none' }, RestartPolicy: { Name: 'no' },
      Tmpfs: { '/tmp': `rw,noexec,nosuid,nodev,size=${POLICY.scratchMiB}m,mode=1777` },
    },
  };
  assert.doesNotThrow(() => assertIsolation(config));
  for (const change of [{ NetworkMode: 'host' }, { Privileged: true }, { Binds: ['/tmp:/host'] },
    { Memory: 0 }, { CapAdd: ['SYS_ADMIN'] }, { SecurityOpt: [] }, { PidsLimit: 0 }]) {
    assert.throws(() => assertIsolation({ ...config, HostConfig: { ...config.HostConfig, ...change } }));
  }
});
