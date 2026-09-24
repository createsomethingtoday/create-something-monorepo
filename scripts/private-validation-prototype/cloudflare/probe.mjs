// Owned provider probe only. No creator input or credentials.
import fs from 'node:fs';
import net from 'node:net';
import dns from 'node:dns/promises';
const results = { node: process.versions.node, platform: process.platform, arch: process.arch,
  uid: process.getuid(), fresh: !fs.existsSync('/tmp/private-owned-marker'), probes: [] };
fs.writeFileSync('/tmp/private-owned-marker', 'owned-fixture');
for (const [host, port] of [['1.1.1.1', 443], ['1.1.1.1', 53], ['169.254.169.254', 80], ['10.0.0.1', 80]]) {
  const result = await new Promise(resolve => {
    const socket = net.connect({ host, port });
    socket.setTimeout(600, () => { socket.destroy(); resolve('timeout-inconclusive'); });
    socket.on('connect', () => { socket.destroy(); resolve('connected'); });
    socket.on('error', error => resolve(error.code));
  });
  results.probes.push({ kind: 'tcp', host, port, result });
}
try {
  const response = await fetch('https://example.com', { redirect: 'error', signal: AbortSignal.timeout(1000) });
  results.probes.push({ kind: 'https', result: `http-${response.status}` });
} catch (error) { results.probes.push({ kind: 'https', result: error.cause?.code ?? error.name }); }
try {
  const value = await Promise.race([dns.lookup('example.com'), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout-inconclusive')), 1000))]);
  results.probes.push({ kind: 'dns', result: 'resolved', family: value.family });
} catch (error) { results.probes.push({ kind: 'dns', result: error.code ?? error.message }); }
console.log(JSON.stringify(results));
