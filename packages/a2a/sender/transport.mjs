import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { checkServerIdentity } from 'node:tls';
import { Effect } from 'effect';
import { assertPublicAddress, CallbackTransportError, DEADLINE_MS, MAX_RESPONSE_BYTES, validatePayload } from './policy.mjs';

/**
 * One attempt only. A timeout after upload is an unknown outcome; the owning
 * delivery workflow reconciles/retries with the same event ID, never this layer.
 * Overrides are trusted test fixtures and cannot be selected by /send callers.
 */
export async function sendCallback(url, body, headers, overrides = {}) {
  const payload = validatePayload(url, body, headers);
  const resolve = overrides.resolve ?? (hostname => lookup(hostname, { all: true, verbatim: true }));
  const request = overrides.request ?? httpsRequest;
  const deadlineMs = Math.min(overrides.deadlineMs ?? DEADLINE_MS, DEADLINE_MS);
  let outbound;
  let incoming;
  let finished = false;
  const cleanup = () => { finished = true; incoming?.destroy(); outbound?.destroy(); };
  const operation = Effect.async((resume, signal) => {
    const fail = code => {
      if (finished) return;
      finished = true;
      resume(Effect.fail(new CallbackTransportError(code)));
    };
    // The resolver may not be cancellable. Interruption prevents late results
    // from opening a socket, and finalization always destroys any acquired I/O.
    void Promise.resolve().then(() => resolve(payload.endpoint.hostname)).then(records => {
      if (signal.aborted || finished) return;
      if (!Array.isArray(records) || records.length === 0 || records.length > 64) return fail('callback_dns_failed');
      let chosen;
      try {
        const checked = records.map(record => {
          const address = assertPublicAddress(record.address);
          if (address.family !== record.family) throw new CallbackTransportError('callback_address_denied');
          return address;
        });
        chosen = checked[0];
      } catch { return fail('callback_address_denied'); }
      try {
        outbound = request({
          protocol: 'https:', hostname: payload.endpoint.hostname, port: 443,
          path: payload.endpoint.pathname + payload.endpoint.search,
          method: 'POST', agent: false, family: chosen.family, autoSelectFamily: false,
          // Every connect uses the already validated address. No second lookup,
          // keepalive pool, proxy, redirect library, or HTTP/2 coalescing exists.
          lookup: (_hostname, options, callback) => {
            if (options.all) callback(null, [chosen]);
            else callback(null, chosen.address, chosen.family);
          },
          servername: payload.endpoint.hostname, rejectUnauthorized: true,
          checkServerIdentity: (_hostname, certificate) => checkServerIdentity(payload.endpoint.hostname, certificate),
          minVersion: 'TLSv1.2', maxHeaderSize: 16 * 1024,
          headers: { ...payload.headers, 'content-length': Buffer.byteLength(body), 'accept-encoding': 'identity', connection: 'close' },
        }, response => {
          incoming = response;
          const status = response.statusCode;
          if (!status || status < 200 || status > 599) return fail('callback_response_invalid');
          const declared = response.headers['content-length'];
          if (declared !== undefined && (!/^\d+$/u.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)) return fail('callback_response_too_large');
          // Reject encoding rather than inflating an untrusted compressed body.
          if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') return fail('callback_response_encoding');
          const chunks = [];
          let length = 0;
          response.on('data', chunk => {
            length += chunk.length;
            if (length > MAX_RESPONSE_BYTES) return fail('callback_response_too_large');
            if (!finished) chunks.push(chunk);
          });
          response.once('error', () => fail('callback_connection_failed'));
          response.once('aborted', () => fail('callback_connection_failed'));
          response.once('end', () => {
            if (finished || signal.aborted) return;
            finished = true;
            resume(Effect.succeed({ status, body: Buffer.concat(chunks, length).toString('utf8') }));
          });
        });
        outbound.once('error', () => fail('callback_connection_failed'));
        outbound.end(Buffer.from(body, 'utf8'));
      } catch { fail('callback_connection_failed'); }
    }, () => fail('callback_dns_failed'));
    return Effect.sync(cleanup);
  });
  const bounded = operation.pipe(
    Effect.timeoutFail({ duration: deadlineMs, onTimeout: () => new CallbackTransportError('callback_deadline_exceeded') }),
    Effect.ensuring(Effect.sync(cleanup)),
  );
  // runPromise wraps typed failures in FiberFailure; return only safe codes.
  let result;
  try { result = await Effect.runPromise(Effect.either(bounded), { signal: overrides.signal }); }
  catch { throw new CallbackTransportError('callback_cancelled'); }
  if (result._tag === 'Left') throw result.left;
  return result.right;
}
