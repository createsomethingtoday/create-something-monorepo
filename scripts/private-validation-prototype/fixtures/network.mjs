import assert from 'node:assert/strict';
import net from 'node:net';
import { networkInterfaces } from 'node:os';
assert.equal(Object.values(networkInterfaces()).flat().some(n => !n.internal), false);
const code = await new Promise((resolve, reject) => {
  const socket = net.connect({ host: '1.1.1.1', port: 443 });
  socket.setTimeout(1000, () => { socket.destroy(); reject(new Error('Inconclusive network timeout')); });
  socket.on('connect', () => { socket.destroy(); reject(new Error('Unexpected outbound access')); });
  socket.on('error', error => resolve(error.code));
});
assert.match(code, /ENETUNREACH|EHOSTUNREACH|EACCES/);
console.log('network:blocked');
