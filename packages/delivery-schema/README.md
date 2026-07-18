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
- `inspectBuildReleasePackage` verifies the exact Map handoff, staging, UAT, and Build acceptance receipts plus five canonical artifact hashes, identity/account binding, rollback data, and owners.
- Staging and UAT readiness comes from separately referenced SHA-256-bound verifier receipts; arbitrary inline evidence cannot assert a passing result.
- The manifest may summarize the acceptance decision, but readiness comes from the referenced SHA-256-bound receipt. Editing the manifest decision alone fails closed.

`evidenceValid` means identities, schema, paths, and hashes are coherent. `releaseReady` additionally requires an accepted Map handoff, passed staging and UAT results, and an accepted terminal Build decision. Neither value performs a deployment or grants production approval.

From the repository root:

```bash
pnpm build:release:check -- <path/to/build-release.json>
```

See `config/delivery/build-releases/example-non-production` for the synthetic second-operator fixture.
