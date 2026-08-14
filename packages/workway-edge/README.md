# WorkWay Edge local evidence vault

`workway-edge` is the first private-intake implementation behind the WorkWay
evidence handoff. It is a deliberately narrow local service for the Threshold
Dwelling pilot, not a public upload system or a construction-document platform.

## What it does

- binds only to `127.0.0.1` or `::1` (a wildcard, LAN, or public bind is
  rejected in code);
- accepts one bounded `application/pdf` body with a PDF signature for an
  already registered opaque evidence ID;
- authenticates the caller with a local bearer token;
- encrypts each object with a distinct random 24-byte nonce using
  XChaCha20-Poly1305 and authenticates the schema, revision, project, evidence
  ID, and source class as associated data;
- persists objects under hash-derived names with private POSIX permissions
  (`0700` directories and `0600` files); and
- returns and audits only a source-free receipt: opaque project/evidence IDs,
  source class, SHA-256, byte length, timestamp, and `recorded` status.

It never accepts a filename or path, parses document content, exposes a read
endpoint, changes an evidence manifest, accepts a professional review, changes
the scene, or sets `constructionReady`.

## Local configuration

The service will not start until these values are provided by the local service
manager. They must not be committed, put in client-side code, or copied into a
browser session.

| Variable | Requirement |
| --- | --- |
| `WORKWAY_EDGE_VAULT_ROOT` | An explicit private directory outside the repository. |
| `WORKWAY_EDGE_MASTER_KEY_B64` | Exactly 32 decoded bytes, base64 encoded. The vault never generates or stores a key. |
| `WORKWAY_EDGE_INTAKE_TOKEN` | Non-empty local bearer secret. |
| `WORKWAY_EDGE_MAX_PDF_BYTES` | Optional positive maximum; defaults to 25 MiB. |
| `WORKWAY_EDGE_BIND_ADDR` | Optional loopback address; defaults to `127.0.0.1:9443`. Non-loopback values fail closed. |

For an actual pilot, run the vault from a Mac Studio service account, keep its
root on an encrypted local volume, and inject secrets from an OS-managed secret
mechanism. Environment variables are the initial process boundary, not a
substitute for key custody, account authorization, backups, or device security.

## HTTP contract

```text
POST /v1/projects/threshold-dwelling/evidence/{registered-evidence-id}
Authorization: Bearer <local intake token>
Content-Type: application/pdf
Body: PDF bytes
```

Only the evidence IDs in `workway-core`'s current Threshold Dwelling private
manifest are accepted. The response is `201 Created` with the source-free
receipt. No document bytes, title, source path, vault locator, reviewer identity,
or acceptance control is returned.

## Validation

```bash
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

The test suite uses an in-memory synthetic PDF fixture only. It proves encryption
at rest, context/key/tamper rejection, payload and identity failures, loopback
enforcement, restrictive file modes, and the HTTP receipt boundary. It does not
read the user's supplied project PDFs.

## Not yet authorized or implemented

- LAN/WAN or Vision Pro/iPad uploads, TLS, pairing, or MDM identity;
- cloud replication, remote support access, document retrieval, OCR, or AI
  extraction;
- retention/deletion, legal hold, backups, disaster recovery, or a customer
  access/role model;
- a licensed review/acceptance workflow, immutable project revision update, or
  construction, permit, code, survey, quantity, or field-layout authority.

Those controls must be explicitly designed and approved before the service can
hold an actual customer document or leave the local Mac Studio.
