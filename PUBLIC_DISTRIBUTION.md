# CREATE SOMETHING Public Distribution

The supported CREATE SOMETHING public source distribution is the deterministic,
allowlisted artifact generated from `config/public-distribution.v1.json`. It is
not an archive of the entire monorepo.

## Price and license

- **Public source:** $0 under the MIT License.
- **CREATE SOMETHING Control:** managed AI operations from $900 per month after
  launch. Control is a separate managed service; the public-source license does
  not include operation, hosting, support, or service-level commitments.

The GA source artifact contains only:

- `@createsomething/pi-three-tier-framework`;
- `@createsomething/pi-policy-os`;
- the MIT license; and
- this release contract and its machine-readable policy.

Client work, internal operating material, credentials, generated output, and
all other monorepo packages are outside the supported public distribution.

## Build the artifact

Run from a clean checkout of the reviewed release commit:

```bash
pnpm public:distribution -- \
  --ref HEAD \
  --output /path/to/create-something-public-source.tar.gz
```

The command reads the policy and every source file from the committed Git tree,
not from uncommitted working-tree state. It fails closed on paths outside the
allowlist, denied path segments, credential-like filenames, symlinks, binary
content, and common provider credential or private-key patterns.

It writes three files:

```text
create-something-public-source.tar.gz
create-something-public-source.tar.gz.manifest.json
create-something-public-source.tar.gz.sha256
```

At one commit, repeated builds produce the same archive bytes. The manifest
records the exact commit, source price, managed-service boundary, file hashes,
and archive checksum.

## Proof boundary

A passing artifact receipt proves only that the committed allowlist was packed
without a detected boundary violation. GA also requires reviewed promotion,
public npm provenance and clean installs for both Pi packages, repository
security and protected-review readbacks, deployed pricing verification, and the
declared production-health burn-in.

After promotion and the seven-day burn-in, run the live fail-closed verifier
from a clean checkout of the current `main` commit:

```bash
pnpm public:ga -- \
  --ref HEAD \
  --browser-evidence /path/to/browser-evidence.json \
  --output-dir /path/to/new-public-ga-receipt-directory
```

The GitHub CLI and npm CLI must be authenticated for readback. The verifier
rebuilds the allowlisted artifact, checks the protected-review and maintainer
path, reads open security findings, verifies both exact npm versions and their
trusted-publisher provenance through clean Pi installs, checks canonical
production pricing, validates fresh desktop/mobile browser evidence, and
computes the Map streak from production workflow runs. It writes a final
`public-ga-receipt.json` and exits nonzero unless every independent gate passes.
