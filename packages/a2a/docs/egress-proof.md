# Callback egress evidence

CRE-2380 owns this transport. The caller signs the exact UTF-8 JSON string and
passes that string to `callbackPost(env, url, body, headers)`. The challenge and
normal event paths must both use this function. The transport makes one attempt;
the delivery workflow owns idempotency, unknown outcomes, retries, and receipts.

## Runtime choice and boundary

The Worker calls its private `CALLBACK_SENDER` Durable Object binding, which
forwards an authenticated `/send` envelope to a Node process on port 8080 in a
Cloudflare Container. Never add a public Worker route that forwards arbitrary
requests to this binding. The public application authenticates and authorizes
subscription creation and event delivery before reaching the sender.

Workers `fetch` does not expose the connection-level address pinning required for
an arbitrary callback hostname. `resolveOverride` is restricted to hostnames in
the same zone. Workers TCP sockets also block Cloudflare destination ranges,
which would exclude legitimate Cloudflare-hosted receivers. Those documented
limits motivate a Node sender. See [Worker Request options](https://developers.cloudflare.com/workers/runtime-apis/request/#the-cf-property-requestinitcfproperties)
and [TCP socket considerations](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/#considerations).

Container HTTPS interception stays disabled. Node resolves all addresses once per
attempt, rejects the complete answer set if any address is denied, selects one
validated address, then supplies only that address to `https.request` through its
`lookup` callback. The original URL hostname remains the HTTP Host and TLS SNI;
Node checks both the certificate chain and original hostname. Each attempt uses
`agent: false`, so no pooled connection skips fresh validation. There is no
redirect-following code. See [Node HTTPS request](https://nodejs.org/docs/latest-v24.x/api/https.html#httpsrequestoptions-callback),
[TLS hostname verification](https://nodejs.org/docs/latest-v24.x/api/tls.html#tlscheckserveridentityhostname-cert),
and [Container outbound traffic](https://developers.cloudflare.com/containers/configuration/outbound-traffic/).

URL validation requires explicit HTTPS, a DNS hostname, and absent/default or
exactly `443` port syntax. Credentials (including empty userinfo), fragments,
IP literals and alternate numeric IP spellings, trailing-dot names, whitespace,
backslashes, and known local suffixes are denied. DNS denies all `ipaddr.js`
special ranges. IPv6 additionally requires `2000::/3` and excludes `3fff::/20`,
which denies mapped, well-known/local NAT64, ULA, link-local, loopback, multicast,
documentation and transition ranges. This is conservative: special-purpose
globally reachable ranges can also be refused.

Callback bodies are at most 256 KiB of UTF-8. Callback response bodies are at most
64 KiB on the wire, with a separate 16 KiB response-header cap. Encoded responses
are refused; they are never decompressed. DNS, TCP, TLS, upload and response share
a ten-second transport deadline. The Worker binding call has its own ten-second
deadline, including cold startup; cold startup can therefore fail an attempt.
An absolute deadline travels on the private envelope header. Both the DO and
Node reject expired work, and Node uses only the remaining budget; delayed
startup cannot reset the clock or start a callback after the original deadline.
Effect finalizers destroy acquired requests/responses on completion, failure,
timeout and cancellation. A resolver result arriving after cancellation cannot
open a connection.

The only forwarded headers are `content-type`, `webhook-id`,
`webhook-timestamp`, `webhook-signature`, and `x-mcp-subscription-id`; all are
required. Content type is JSON. Token authentication is required at both the DO
and Node boundaries and uses SHA-256 plus constant-time digest comparison.
`CALLBACK_SENDER_TOKEN` is a runtime secret with 32–256 URL-safe ASCII characters.
The image receives it as `A2A_SENDER_TOKEN`, never as a build argument. Sender
errors contain only fixed safe codes. The sender does not log callback URLs,
headers, DNS addresses, signed bodies, response bodies, tokens, or provider
exception messages.

## Local evidence

From `packages/a2a`, run:

```sh
./node_modules/.bin/tsx --test test/egress*.test.ts
```

The regression suite was first run before `policy.mjs` existed and failed with
`ERR_MODULE_NOT_FOUND`. The completed suite covers URL/IP/header rejection,
mixed DNS answers, fresh validation on a later rebound address, byte caps,
redirect refusal, invalid certificate hostname, exact signed UTF-8 bytes,
Standard Webhooks signature verification, private ingress authentication,
envelope validation, safe errors, and cleanup after timeout/cancellation.
The stale-startup regression was also demonstrated failing (`200` instead of
`408`) before absolute-deadline enforcement and passing after the fix.

TLS fixtures use an ephemeral self-signed certificate generated by OpenSSL. A
trusted test-only request adapter asserts the production pinned address and
options, then maps the selected public address to a local TLS server and trusts
only the fixture certificate. Tests exercise real local TCP, TLS, HTTP, body
streaming and hostname verification. They do **not** establish actual public DNS,
Cloudflare Container egress routing, public receiver acceptance, or OpenAI
subscription activation.

The Docker image pins Node 24.22.2 bookworm-slim to the official registry index
digest `sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9`.
The tag/digest was verified against Docker Registry, and Node's latest v24
checksums identified 24.22.2 on 2026-11-09. The sender dependency lock is separate
from the monorepo lock and uses `npm ci --omit=dev --ignore-scripts`. Build with
the `sender` directory as context. Run as the unprivileged `node` user.

## Production proof still required

The deploying owner records these receipts against the deployed Worker version
and container image digest. Keep callback destinations and payloads private;
record opaque test IDs, hashes, status, counts and timing only.

1. Build and launch the exact Linux amd64 image. Confirm unauthenticated and
   wrong-token `/send` calls fail and the public Worker has no proxy route.
2. Use an authorized controlled public HTTPS receiver with a valid certificate.
   Submit an actual signed subscription challenge and an event through the
   application's normal authenticated path. Verify original Host/SNI, exact body
   hash and Standard Webhooks signature at the receiver, and the delivery receipt
   in the owning application. Repeat against a controlled Cloudflare-hosted
   receiver to cover the platform limit that motivated the Container.
3. Use a controlled DNS name whose answers change from public to private. The
   first attempt must use its originally validated public address; the later
   attempt must fail without reaching the private target. Use controlled names
   for loopback/private/mapped/NAT64 answer refusals. Verify no local service
   receives a callback. Do not probe unrelated internal services.
4. Exercise a controlled bad-hostname certificate, redirect to another controlled
   receiver, slow body, oversized/chunked response, and canceled caller. Confirm
   no redirected receipt, no oversized-body acceptance, deadline enforcement,
   and acquired socket termination. Confirm safe error codes and no secrets in
   Worker/container logs.
5. Verify real OpenAI subscription activation and delivery separately. A local
   fixture or generic HTTP 2xx is not an OpenAI receipt.

Functional correctness is passed for local fixtures only. Perceptual/product
quality is not applicable to this transport. Release readiness remains untested
until the owner supplies the exact-image build and authorized runtime receipts.
Rollback is the prior Worker/container release; disabling event delivery stops
new callbacks without weakening URL or TLS policy.
