# WorkWay Edge Local Vault v1 Determination

**Status:** local-only pilot boundary; validated with synthetic evidence only.

## Decision

The first WorkWay private-evidence service is a Rust process on the WorkWay
Edge Mac Studio. It admits a bounded PDF only after local bearer authentication,
stores it under a hash-derived object name, and encrypts it with a caller-supplied
32-byte key. It binds exclusively to loopback; the iPad, browser, Vision Pro,
and cloud receive no upload endpoint and no source document.

The authoritative building graph remains in `workway-core`. The vault uses that
graph's registered, revision-specific opaque evidence IDs as an allowlist. A
stored object yields a source-free receipt only. It cannot mark an evidence
record `submitted` or `accepted`, update geometry, issue an immutable spatial
package, or make a construction-readiness claim.

## Data classification and flow

```text
operator-approved PDF
    -> local loopback vault
    -> encrypted local object + source-free audit/receipt
    -> later private review workflow (not implemented)
    -> later immutable, source-free project-graph revision (not implemented)
    -> browser / iPad / Vision Pro readiness projection
```

The source-free output can contain only opaque project/evidence IDs, source
class, content SHA-256, byte length, and `recorded` intake status. It cannot
contain a filename, path, vault locator, document bytes, document text, page
image, prompt, reviewer identity, acceptance rationale, or construction status.

## Security properties validated now

| Concern | Local-vault v1 treatment |
| --- | --- |
| Network exposure | Loopback only; non-loopback bind configuration fails. |
| Request authentication | Constant-time comparison of a process-injected bearer token. |
| Storage confidentiality and integrity | XChaCha20-Poly1305 with a random 24-byte nonce per object and authenticated revision/project/evidence/source-class context. |
| Object paths | SHA-256-derived from the registered project/evidence identity, never from a filename or source path. |
| Local access modes | `0700` vault/object directories and `0600` object/audit files on Unix-like hosts. |
| Payload controls | Exact `application/pdf`, PDF signature, required opaque project/evidence IDs, one record per evidence gate, non-empty body, bounded size. |
| Audit surface | Timestamped source-free JSONL event; no document name, path, bytes, locator, reviewer, or acceptance result. |
| Project authority | Intake is always non-construction-ready and has no graph mutation API. |

## Required before real customer documents

1. Name the project and evidence IDs approved for intake; do not infer approval
   from a browser checklist.
2. Establish data controller/processor responsibility, retention and deletion
   rules, legal holds, encrypted backup/recovery, and per-project isolation.
3. Replace bootstrap environment-secret handling with audited OS/device secret
   custody and define Mac Studio service-account and physical-device controls.
4. Define participant identity, roles, and qualified professional acceptance
   rights, including review identity, source citation/location, document version,
   invalidation, and immutable project-revision creation.
5. For any iPad, Vision Pro, or LAN use, design explicit device pairing,
   mutually authenticated encrypted transport, network segmentation, session
   expiry/revocation, monitoring, and incident response.
6. Perform an independent security/privacy review before external users, remote
   access, cloud replication, OCR, AI extraction, or production customer data.

## Non-determinations

This boundary does not determine engineering adequacy, code compliance, permit
requirements, survey accuracy, safety, construction authorization, material
procurement, or field layout. Those facts continue to require their designated
qualified professional and jurisdictional processes.
