# Release runbook

Releases use reviewed protected `main`, an exact tarball inventory, clean
consumers, npm provenance, and a stage-only trusted publisher. CI may stage a
candidate; a maintainer must inspect and explicitly approve it with npm 2FA or
a passkey before it becomes public.

## Candidate gates

```bash
npm ci --ignore-scripts
npm run check
npm test
npm run test:acceptance
npm run release:consumer
```

The same clean-consumer proof runs on Node 22 and Node 24 in
`.github/workflows/workflow-compiler-public-release.yml`. `release:check`
requires exact equality with `package-files.json`; unexpected additions and
missing files both stop the release.

## First publication at the canonical scope

`@createsomething/workflow-compiler` is a new npm package identity. npm cannot
configure a trusted publisher for a package that does not exist, and it cannot
stage a brand-new package. The approved `0.4.0` scope migration therefore has
one tightly bounded bootstrap exception: after protected-main and exact-head
review/CI receipts, a maintainer must publish the exact reviewed tarball with
their npm 2FA/passkey. Do not use a long-lived local token, publish from a
different commit, or substitute the old-scope tarball.

```bash
npm publish ./createsomething-workflow-compiler-0.4.0.tgz \
  --access public \
  --provenance=false
```

Immediately read back the public `latest` tag, integrity, packed files, and a
clean consumer installation. The bootstrap cannot carry GitHub OIDC provenance:
after that readback, configure the GitHub trusted publisher for this repository,
this workflow file, and the `npm-public` environment with permission limited to
`npm stage publish`. The release remains incomplete until `latest` points at the
verified `0.4.0` migration release.

Only after the new package has registry-integrity and clean-consumer receipts,
a configured stage-only trusted publisher, and a later staged OIDC provenance
receipt may a maintainer deprecate the prior package through the governed npm
approval route:

```bash
npm deprecate @create-something/workflow-compiler@0.3.1 \
  "Moved to @createsomething/workflow-compiler. Install @createsomething/workflow-compiler@0.4.0."
```

The deprecation is a compatibility notice, not an unpublish or alias. Preserve
the old package and do not run the command before the replacement is verified.

## Stable publication

1. Change the version and changelog through a reviewed PR.
2. Update `package-files.json.packageVersion`; the file list must remain exact.
3. Merge only after the supported-node and clean-consumer gates pass.
4. Dispatch `Workflow Compiler Public Release` with the exact version on
   protected `main`.
5. Inspect the staged package name, version, integrity, files, provenance, and
   tag.
6. Approve the staged release with the maintainer's npm 2FA/passkey.
7. Read back registry metadata, dist-tags, provenance, trusted-publisher state,
   and clean installs independently.

The workflow never runs direct `npm publish`. Do not use a long-lived npm token
for the trusted-publication lane.

## Rollback

npm versions are immutable. Do not unpublish an established version as a
routine rollback. Move the default dist-tag back to the last accepted version,
deprecate the affected version with a precise message, and publish a corrected
version through the same gates. Record the registry commands and readbacks in
the owning release issue.
