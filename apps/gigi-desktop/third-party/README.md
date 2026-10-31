# Bundled CTX

GiGi bundles the unmodified CTX 1.3.1 macOS CLI from the official [ctxrs/ctx release](https://github.com/ctxrs/ctx/releases/tag/v1.3.1). `scripts/ctx-companion.mjs` pins the architecture-specific SHA-256 from that release's SHA256SUMS and rejects any mismatch. The build downloads it into ignored resources; it never packages a developer's arbitrary PATH executable.

CTX is licensed under Apache-2.0. The exact release LICENSE is included as CTX-LICENSE.txt. GiGi keeps its own isolated CTX data directory, imports only its own SQLite history, and uses lexical search without model API credentials. It does not initialize discovery of the user's other agent histories.
