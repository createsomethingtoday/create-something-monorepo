import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';
for (const mod of [http, https])
  for (const method of ['request', 'get']) {
    const original = mod[method];
    mod[method] = function (...args) {
      const a = args[0];
      const host =
        typeof a === 'string' || a instanceof URL
          ? new URL(a).hostname
          : a.hostname || a.host || 'localhost';
      if (!['localhost', '127.0.0.1', '[::1]', '::1'].includes(host))
        throw new Error('Synthetic test prohibits remote Node HTTP');
      return original.apply(this, args);
    };
  }
globalThis.fetch = () => {
  throw new Error('Synthetic test prohibits Node fetch');
};
syncBuiltinESMExports();
