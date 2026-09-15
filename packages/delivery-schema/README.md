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
- Every staging, UAT, and acceptance receipt binds the exact release environment, target, source SHA, and deploy ID; changing the deployed revision after verification fails closed.
- Verifier receipts also bind the accepted Map handoff hash and canonical five-artifact hash set. Terminal acceptance additionally binds both verifier receipt hashes, so replacing handoff, artifacts, or gate evidence requires a new acceptance decision.

`evidenceValid` means identities, schema, paths, and hashes are coherent. `releaseReady` additionally requires an accepted Map handoff, passed staging and UAT results, and an accepted terminal Build decision. Neither value performs a deployment or grants production approval.

From the repository root:

```bash
pnpm build:release:check -- <path/to/build-release.json>
```

See `config/delivery/build-releases/example-non-production` for the synthetic second-operator fixture.

Build release manifest `@2` requires a sixth artifact, `runtime_binding`, at
`runtime-binding.json`. Its digest participates in staging, UAT and acceptance
artifact-set hashes, and package inspection verifies its bytes. Manifest `@1`
retains its five-artifact digest unchanged and rejects the new field. This is
artifact integrity only; the runtime registration verifier must still parse the
binding and verify its compiler signature, policy and distinct manifest identity.

The `./build-runtime-binding` export parses the closed
`create-something/build-runtime-binding@1` artifact into an immutable value.
All digests use `sha256:` prefixes. The binding names the Build release but omits
the containing delivery manifest hash to avoid a circular dependency. Parsing
proves shape only; the owning verifier must match accepted binding bytes and
independently verify the named compiler inventory/signature before registration.
Build package inspection now parses the same binding bytes it hashes, limits the
binding to 16 KiB, and matches its Build release ID. Invalid or foreign-release
bindings invalidate package evidence. A parsed `runtimeBinding` is returned only
when all package integrity checks pass. Callers must still require `releaseReady`
and verify the compiler signature and host policy before registration.

Build inspection returns `manifestSha256` for the exact manifest bytes parsed.
Consumers freezing a release identity should use this digest instead of a second
filesystem read. Handoff, verification, and acceptance receipts are each hashed
and parsed from one byte buffer. The digest identifies inspected input; consumers
must still require `releaseReady`, accepted evidence, and independent runtime
signature and policy verification before registration.
