# `@create-something/delivery-schema`

The root export remains the browser-safe, types-only delivery-surface contract shared by Agency Canon and Webflow Control components.

The `./build-release` subpath owns the executable Build release boundary:

```ts
import {
  inspectBuildReleasePackage,
  parseBuildReleaseManifest,
  parseMapBuildHandoffReceipt
} from '@create-something/delivery-schema/build-release';
```

- `parseBuildReleaseManifest` strictly validates the versioned manifest and rejects unknown or missing fields.
- `parseMapBuildHandoffReceipt` preserves prepared, accepted, and cancelled Map evidence without treating nonterminal evidence as approval.
- `inspectBuildReleasePackage` verifies the exact receipt and five canonical artifact hashes, identity/account binding, verifier decisions, rollback data, owners, and terminal acceptance.

`evidenceValid` means identities, schema, paths, and hashes are coherent. `releaseReady` additionally requires an accepted Map handoff, passed staging and UAT results, and an accepted terminal Build decision. Neither value performs a deployment or grants production approval.

From the repository root:

```bash
pnpm build:release:check -- <path/to/build-release.json>
```

See `config/delivery/build-releases/example-non-production` for the synthetic second-operator fixture.
