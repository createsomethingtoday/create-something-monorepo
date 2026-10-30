// Prototype policy: trusted fixtures only. Not a paid-publication authority.
export const POLICY = Object.freeze({
  version: 'private-validation-prototype/v1',
  nodeMajor: 24,
  cpus: 0.5,
  memoryMiB: 256,
  pids: 32,
  scratchMiB: 16,
  outputBytes: 65536,
  fixtureBytes: 32768,
  executionSeconds: 5,
  watchdogSeconds: 8,
  suiteSeconds: 120,
  maxRuns: 12,
  concurrency: 1,
  modelCalls: 0,
  network: 'none',
});

export function validateImage(image) {
  if (!/^(node@)?sha256:[a-f0-9]{64}$/.test(image)) {
    throw new Error('A digest-pinned official node image or immutable local toolchain image ID is required');
  }
  return image;
}

export function containerArgs(image, name) {
  validateImage(image);
  if (!/^private-validator-[a-f0-9-]+$/.test(name)) throw new Error('Invalid run name');
  return ['create', '--name', name, '--label', `private.validation=${POLICY.version}`,
    '--pull', 'never', '--interactive', '--network', POLICY.network,
    '--read-only', '--user', '1000:1000', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges:true', '--pids-limit', String(POLICY.pids),
    '--cpus', String(POLICY.cpus), '--memory', `${POLICY.memoryMiB}m`,
    '--memory-swap', `${POLICY.memoryMiB}m`, '--log-driver', 'none',
    '--restart', 'no', '--stop-timeout', '1', '--ulimit', 'nofile=128:128',
    '--tmpfs', `/tmp:rw,noexec,nosuid,nodev,size=${POLICY.scratchMiB}m,mode=1777`,
    '--env', 'HOME=/tmp', '--workdir', '/tmp', '--entrypoint', '/usr/bin/timeout',
    image, '--signal=KILL', `${POLICY.executionSeconds}s`,
    'node', '--input-type=module', '-'];
}

export function assertIsolation(config) {
  const h = config.HostConfig;
  if (h.NetworkMode !== 'none' || !h.ReadonlyRootfs || config.Config.User !== '1000:1000'
    || h.Privileged || h.Binds?.length || config.Mounts?.length
    || h.PortBindings && Object.keys(h.PortBindings).length
    || !h.CapDrop?.includes('ALL') || h.CapAdd?.length
    || !h.SecurityOpt?.includes('no-new-privileges:true')
    || h.Memory !== POLICY.memoryMiB * 1048576 || h.MemorySwap !== h.Memory
    || h.NanoCpus !== POLICY.cpus * 1e9 || h.PidsLimit !== POLICY.pids
    || h.LogConfig?.Type !== 'none'
    || h.RestartPolicy?.Name !== 'no'
    || h.Tmpfs?.['/tmp'] !== `rw,noexec,nosuid,nodev,size=${POLICY.scratchMiB}m,mode=1777`) {
    throw new Error('Docker isolation configuration does not match policy');
  }
}

export function classify({ exitCode, output, overflow, timedOut, cleanup, oomKilled }, fixture) {
  if (!cleanup) return 'cleanup-failed';
  if (fixture.expect === 'output-limit') return overflow ? 'passed' : 'failed';
  if (overflow) return 'output-limit';
  if (timedOut) return 'watchdog-expired';
  if (fixture.expect === 'timeout') return exitCode === 137 ? 'passed' : 'failed';
  if (fixture.expect === 'oom') return oomKilled && exitCode === 137 ? 'passed' : 'failed';
  return exitCode === 0 && output.trim() === fixture.expectedOutput ? 'passed' : 'failed';
}
