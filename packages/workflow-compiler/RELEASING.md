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

## First package bootstrap

npm cannot configure a trusted publisher or staged publishing for a package
that does not exist yet. The initial `0.1.0-beta.0` package is therefore a
one-time interactive bootstrap publication under the non-default `bootstrap`
dist-tag. It must use the exact reviewed protected-main tarball and the
maintainer's 2FA/passkey. Because npm provenance is not available from the local
interactive bootstrap, explicitly override the manifest setting with
`--provenance=false`; this exception applies only to `0.1.0-beta.0`. After
registry readback, configure the GitHub trusted publisher for this repository,
this workflow file, and the `npm-public` environment with permission limited to
creating staged packages. Every stable release must then carry trusted
provenance.

```bash
npm publish ./create-something-workflow-compiler-0.1.0-beta.0.tgz \
  --access public \
  --tag bootstrap \
  --provenance=false
```

Read back the tags immediately. npm may assign `latest` to the first version of
a new package even when the bootstrap publish names another tag. If `latest`
points at `0.1.0-beta.0`, remove it before continuing; the beta must not remain
the default install:

```bash
npm dist-tag rm @create-something/workflow-compiler latest
```

If npm rejects removing its only `latest` tag, do not retry blindly or
unpublish the immutable bootstrap version. Keep public instructions pinned to
`@bootstrap` and proceed immediately through the reviewed stable path. The
release remains incomplete until `latest` points at provenance-backed stable
`0.1.0`.

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
