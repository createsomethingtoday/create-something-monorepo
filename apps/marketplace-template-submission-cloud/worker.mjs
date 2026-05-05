let openNextWorkerPromise;

function installOpenNextChdirGuard() {
  if (typeof process === 'undefined' || typeof process.chdir !== 'function') return;
  if (process.__marketplaceOpenNextChdirGuardInstalled) return;

  const originalChdir = process.chdir.bind(process);
  Object.defineProperty(process, '__marketplaceOpenNextChdirGuardInstalled', {
    value: true,
    configurable: true,
  });
  Object.defineProperty(process, 'chdir', {
    value(directory) {
      if (!directory) return;
      return originalChdir(directory);
    },
    configurable: true,
  });
}

async function getOpenNextWorker() {
  installOpenNextChdirGuard();
  globalThis.__dirname ||= '.';
  openNextWorkerPromise ||= import('./.open-next/worker.js').then((module) => module.default);
  return openNextWorkerPromise;
}

export default {
  async fetch(request, env, ctx) {
    const worker = await getOpenNextWorker();
    return worker.fetch(request, env, ctx);
  },
};
