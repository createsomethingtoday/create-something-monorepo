# CREATE SOMETHING Goose Bundle

This directory is the Goose-standard packaging surface for CREATE SOMETHING.

Layout:

- `extensions/` contains Goose-specific install notes for authenticated or local-command extensions.
- `policies/` contains policy-pack assets such as persistent instructions,
  prompt templates, and adversary rules.
- `recipes/` contains shareable Goose recipe YAML files.
- `distros/` contains starter distro assets such as `init-config.yaml`.

Design rule:

- MCP servers are packaged as Goose extensions.
- Authenticated hub lanes can be packaged as local Goose command-line bridges that resolve credentials through Infisical.
- Policies are packaged as Goose-compatible files and then bundled by recipes or distros.
- Workflows are packaged as Goose recipes.
- Audience- or org-specific installs are packaged as Goose distros.

Local desktop testing:

```bash
pnpm distribution:goose:export -- --artifact create-something-distro
```

That command materializes a repo-local Goose test bundle under `.goose-bundles/` with:

- `bundle-manifest.json` for the full artifact payload
- `README.md` with the ordered local Goose quickstart
- copied recipe, policy-pack, and distro files referenced by the artifact
