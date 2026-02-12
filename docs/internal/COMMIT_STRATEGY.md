# Commit strategy for current uncommitted work

Suggested order: land in small, coherent commits so each is reviewable and revertible. Run from repo root.

---

## 1. Already staged — commit as-is

Current index: composio-bridge (new package), halfdozen-zoom-sync changes, pnpm-lock.

```bash
git commit -m "feat(composio-bridge): add Composio bridge package and eval suite

- New package: auth-bridge, client, tool-factory, types
- Eval: auth-flow, latency-bench, tool-quality, workers-compat, report
- feat(halfdozen-zoom-sync): Zoom API auth tool, worker updates"
```

---

## 2. Space: workbench simplification (one commit)

Biggest change: remove experiments/auth/admin/webinar surface; keep workbench-focused layout and home.

```bash
git add packages/space/
git commit -m "refactor(space): simplify to workbench — remove experiments, auth, admin, webinars

- Trim PROPERTY_ECOSYSTEM.md, README; update layout and home page
- Remove: about, account, admin, analytics APIs, auth APIs/pages
- Remove: categories, contact, experiments/*, login, methodology
- Remove: privacy, terms, unsubscribe, webinars
- Keep praxis; new routes (data, motion, playground, terminal) in follow-up"
```

If you prefer to include the new routes (data, motion, playground, terminal) in this commit, add them before committing:

```bash
git add packages/space/src/routes/data/ packages/space/src/routes/motion/ packages/space/src/routes/playground/ packages/space/src/routes/terminal/
```

Then use message: `... simplify to workbench; add data, motion, playground, terminal routes`

---

## 3. Notion-sync-mcp and crypto

Substantial MCP changes plus new crypto service.

```bash
git add packages/notion-sync-mcp/
git add packages/notion-sync-mcp/src/services/crypto.ts
git commit -m "refactor(notion-sync-mcp): auth, D1/Notion/sync-engine and tool handlers

- Auth and server updates; new crypto service
- D1, Notion, sync-engine refactors; tool and resource handlers
- README, wrangler, worker index updates"
```

---

## 4. Playbook-mcp and create-something-mcp content

Playbooks and content types.

```bash
git add packages/playbook-mcp/
git add packages/playbook-mcp/README.md
git add packages/create-something-mcp/src/content/playbooks.ts packages/create-something-mcp/src/content/types.ts
git add packages/create-something-mcp/package.json packages/create-something-mcp/worker/wrangler.toml
git add packages/create-something-mcp/README.md
git commit -m "refactor(playbooks): playbook-mcp playbooks and create-something-mcp content

- playbook-mcp: expanded playbooks.ts, README, worker/wrangler
- create-something-mcp: trim playbooks, types updates, README"
```

(Omit `packages/create-something-mcp/package-lock.json` if you rely on root pnpm-lock only.)

---

## 5. Schedule-mcp and three-tier-framework-mcp

Small MCP config/docs/worker tweaks.

```bash
git add packages/schedule-mcp/
git add packages/three-tier-framework-mcp/
git commit -m "chore(mcp): schedule-mcp and three-tier-framework-mcp README, index, wrangler"
```

---

## 6. Agency: outerfields

MCP remote docs, server, watch page, and migration. Optionally leave package-lock untracked if not used at root.

```bash
git add packages/agency/clients/outerfields/
# Exclude package-lock if you don’t want it: git reset packages/agency/clients/outerfields/mcp-remote/package-lock.json
git add packages/agency/clients/the-stack/package.json
git commit -m "chore(agency): outerfields mcp-remote docs, mcp-server, watch page; migration 0009; the-stack package.json"
```

---

## 7. Config and docs (repo-wide)

Claude rules, MCP config, CLAUDE, thesis doc.

```bash
git add .claude/rules/cloudflare-patterns.md .mcp.json CLAUDE.md docs/MCP_FIRST_THESIS.md
git commit -m "docs: cloudflare patterns, MCP config, CLAUDE and MCP-first thesis updates"
```

---

## 8. Package.json bumps (monorepo-wide)

Version or name bumps across many packages. Single commit keeps lockfile and dependency story in one place.

```bash
git add packages/clearway/package.json packages/create-something-mcp/package.json \
  packages/dotfiles/README.md packages/half-dozen-youtube-sync/README.md \
  packages/half-dozen-youtube-sync/worker/wrangler.toml packages/halfdozen-gmail-sync/README.md \
  packages/halfdozen-gmail-sync/worker/wrangler.toml packages/identity-worker/package.json \
  packages/io/package.json packages/landing-page-filter/package.json packages/ltd/package.json \
  packages/maverick-admin/package.json packages/maverick/package.json packages/meetings/package.json \
  packages/notion-agent/package.json packages/relay/package.json packages/scanner-worker/package.json \
  packages/search/package.json packages/templates-platform/package.json packages/tend/package.json \
  packages/verticals/architecture-studio/package.json packages/verticals/creative-agency/package.json \
  packages/verticals/creative-portfolio/package.json packages/verticals/dental-practice/package.json \
  packages/verticals/law-firm/package.json packages/verticals/medical-practice/package.json \
  packages/verticals/personal-injury/package.json \
  packages/verticals/professional-services-philosophy/package.json \
  packages/verticals/professional-services/package.json packages/verticals/restaurant/package.json \
  packages/webflow-apps-admin/dashboard/package.json \
  packages/webflow-apps-admin/workers/audit-agent/package.json packages/wf-search-category/package.json
git commit -m "chore(deps): package.json and README/wrangler bumps across packages"
```

---

## 9. Webflow: GSAP validation

```bash
git add packages/webflow-dashboard/src/routes/api/validation/gsap/+server.ts
git commit -m "feat(webflow-dashboard): GSAP validation API updates"
```

---

## 10. Optional: new packages and papers

Only if you want these tracked:

- **gsap-validation-worker** (new package):
  `git add packages/gsap-validation-worker/`
- **io papers**: threshold-dwelling, wrap-pattern:
  `git add packages/io/src/routes/papers/threshold-dwelling/ packages/io/src/routes/papers/wrap-pattern/`
- **dotfiles zen**:
  `git add packages/dotfiles/zen/`
- **Internal doc**:
  `git add docs/internal/COMPOSIO_EVALUATION.md`

Then either one commit, e.g.:

```bash
git add packages/gsap-validation-worker/ packages/io/src/routes/papers/ packages/dotfiles/zen/ docs/internal/COMPOSIO_EVALUATION.md
git commit -m "chore: gsap-validation-worker, io papers (threshold-dwelling, wrap-pattern), dotfiles zen, Composio evaluation doc"
```

or separate commits per area.

---

## Ignore (no commit)

- **.codex/, .cursor/** — Added to `.gitignore` as local IDE/agent config.
- **package-lock.json** in nested packages (e.g. outerfields/mcp-remote, create-something-mcp) — Omit unless you standardize on per-package npm lockfiles.

---

## After all commits

```bash
git pull --rebase
pnpm install   # if lockfile changed
pnpm check     # typecheck
git push
```
