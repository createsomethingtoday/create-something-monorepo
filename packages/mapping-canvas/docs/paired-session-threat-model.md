# Draw paired-session threat model

The Mac is the only authority for a paired Draw session. An iPhone proposes
versioned operations and renders the committed document returned by the Mac.

## Trust boundaries

- Bonjour discovery identifies candidates, not trusted writers.
- Pairing requires an operator-visible confirmation and produces a random,
  session-scoped capability. Only a one-way digest is persisted by the host.
- The native transport must authenticate the host and encrypt application
  traffic. LAN proximity is not authorization.
- Every operation includes protocol and document versions, session/client ids,
  an idempotency key, the client's base revision, and a capability.

## Required rejection behavior

- Unknown, expired, revoked, or incorrectly authorized clients cannot write.
- Stale and future revisions are rejected with the current host revision so the
  client can fetch state and deliberately rebase.
- An exact retransmission receives its original receipt without incrementing the
  revision. Reusing an operation id for different content is rejected.
- Malformed objects, dangling connectors, unsupported versions, and operations
  that cannot change the current document are rejected before persistence.
- Revocation takes effect before duplicate/revision processing so an old paired
  device cannot use a previously accepted operation as an authorization oracle.

## Recovery

The iPhone keeps a bounded queue of unacknowledged operations. After reconnect,
it fetches the canonical revision, retransmits exact unacknowledged envelopes,
and surfaces stale operations for deterministic rebase. The host persists the
document, revision, and applied-operation receipts atomically. Receipts and logs
must omit raw pairing capabilities and document note content.

## Explicit non-goals

The v1 protocol is not multi-master collaboration, does not merge concurrent
undo histories, and does not expose a remote internet relay.
