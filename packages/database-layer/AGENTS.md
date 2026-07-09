# Agents: @create-something/database-layer

## Agent Entry

- Start with `README.md` for the package contract, refresh pipeline, and
  promotion boundaries.
- Primary entrypoint: `src/index.ts`.
- Treat `data/*.json` and `worker/generated-state.mjs` as generated proof
  artifacts unless the task explicitly asks for a refresh.
- Use `docs/agent-wiki/README.md` for Atlas/Substrate orientation before
  reading raw topology JSON. Verify all status, readiness, and approval claims
  against `data/*.json`; the wiki is a generated projection, not authority.

## Validation

- Boot: `pnpm build`
- Smoke: `pnpm typecheck && pnpm build`
- Use `pnpm test` or `pnpm refresh` when changing topology, management-surface,
  Worker state, or generated coverage artifacts.
- Use `pnpm agent-wiki:check` after changing the generated wiki or any artifact
  that should be reflected in it.
- Escalate before mutating Cloudflare, Atlas production, Dify Studio, Notion,
  client systems, or other third-party state.
