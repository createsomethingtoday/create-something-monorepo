# Workflow Compiler threat model

## Boundary

The production v1 boundary is one local or CI process compiling JSON inputs into a filesystem bundle and, optionally, signing its manifest with a caller-owned Ed25519 private key. It does not execute workflows, grant approval, host tenants, contact a third party, or manage signing keys.

## Trust statements

- A matching SHA-256 digest proves content integrity against the manifest. It does not identify a signer.
- An Ed25519 signature proves that the holder of the corresponding private key signed the attestation statement, including the key ID, public-key fingerprint, and canonical manifest hash. It identifies a trusted signer only when the verifier independently pins the correct public key.
- `present_unverified` means a structurally valid attestation exists but no trust root was supplied. It is never equivalent to `verified`.
- The private key remains outside the bundle. The compiler reads caller-supplied key material for the signing operation and writes only the key ID, public-key fingerprint, manifest hash, and signature.

## Assets and controls

| Asset or threat                   | Control                                                                                                                                         | Residual boundary                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Workflow and replay input         | Exact versioned parsers, unknown-field and unknown-version rejection, bounded reference validation                                              | A semantically harmful but schema-valid policy still requires operator review            |
| Artifact integrity                | Sorted manifest, SHA-256 for every declared artifact, required base inventory, regular-file checks                                              | SHA-256 is integrity evidence, not signer identity                                       |
| Signer identity                   | Ed25519 signature over the canonical manifest, pinned public key, SHA-256 SPKI fingerprint                                                      | Key issuance, storage, rotation, and revocation remain caller-owned                      |
| Path escape                       | Normalized relative paths only; absolute, drive, backslash, dot-segment, empty-segment, NUL, and overlong paths fail closed                     | The caller must control the output parent against a privileged concurrent local attacker |
| Link or special-file substitution | The public bundle root is resolved once, required to be a directory, and pinned to one revision; internal links and special entries fail closed | Verification is a local point-in-time check, not an operating-system sandbox             |
| Undeclared content                | Public verification rejects undeclared files and directories; `manifest.json` and optional `attestation.json` are the only sidecars             | Compiler-owned hidden revision history is outside the public bundle root                 |
| Resource exhaustion               | 1 MiB manifest, 16 KiB attestation, 512 files, 4,096 streamed inventory entries, 25 MiB per artifact, and 100 MiB aggregate limits              | CPU and filesystem quotas remain the CI or host responsibility                           |
| Partial or concurrent publication | Private staging revision plus one atomic managed-pointer rename; published revisions are retained and verification pins one resolved revision   | Quiescent cleanup of retained revisions is an operator responsibility                    |
| Key disclosure                    | No generated, embedded, default, or persisted private key; package has zero runtime dependencies                                                | A compromised caller process can read any key supplied to that process                   |

## Verification outcomes

The deterministic receipt separates bundle integrity from attestation trust:

- `attestation.status = unsigned`: integrity passed and no attestation is present.
- `attestation.status = present_unverified`: integrity passed and the attestation is structurally valid, but no public key was supplied.
- `attestation.status = verified`: integrity passed, the manifest hash matches, the supplied Ed25519 public-key fingerprint matches, and the signature verifies.

The top-level receipt status is `integrity_verified` for the first two states and `verified` only for the trusted-key state.

Supplying a public key makes an attestation mandatory. Missing attestations, malformed attestations, wrong keys, changed manifests, invalid signatures, missing artifacts, hash mismatches, and undeclared content are verification stops.

## Non-goals

The compiler does not provide a certificate authority, transparency log, timestamp authority, remote signing service, revocation server, secret manager, hosted execution plane, or defense against an administrator modifying files inside the pinned revision during the verification system calls. Those capabilities require separate trust and operating boundaries.
