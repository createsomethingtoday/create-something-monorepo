import { spawn } from 'node:child_process';

/** Own only the child we started. Never search or signal by app name/bundle ID. */
export function launchOwned(binary, env, args = [], capture = false) {
  const child = spawn(binary, args, { env, stdio: capture ? ['ignore', 'pipe', 'ignore'] : 'ignore' });
  return trackOwned(child);
}

/** Exit evidence is separate from signal errors; exported for lifecycle tests. */
export function trackOwned(child) {
  let settled = false;
  let stdout = '';
  child.stdout?.setEncoding('utf8');
  child.stdout?.on('data', chunk => { stdout = (stdout + chunk).slice(0, 65536); });
  const done = new Promise((resolve) => {
    child.on('error', () => {
      // Spawn failure has no process; a failed signal is not evidence of exit.
      if (child.pid === undefined) { settled = true; resolve({ code: null, stdout }); }
    });
    child.once('close', code => { settled = true; resolve({ code, stdout }); });
  });
  return {
    pid: child.pid,
    alive: () => !settled,
    async result(timeout = 5000) {
      let timer;
      try {
        return await Promise.race([done, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Owned process response timed out')), timeout); })]);
      } finally { clearTimeout(timer); }
    },
    async stop(timeout = 5000) {
      if (settled) return;
      child.kill('SIGTERM');
      let timer;
      try {
        await Promise.race([done, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Owned Draw process has not exited; preserve its profile.')), timeout); })]);
      } finally { clearTimeout(timer); }
    }
  };
}
