## Pi-Specific Operational Notes

### Tool Names

Pi's built-in tools are lowercase: `read`, `write`, `edit`, `bash`. When skills or rules reference Claude Code tools, use Pi equivalents:

| Claude Code | Pi Equivalent |
|-------------|---------------|
| `Read` | `read` |
| `Write` | `write` |
| `Edit` | `edit` |
| `Bash` | `bash` |
| `Grep` | `bash` with `grep` / `rg` |
| `Glob` | `bash` with `find` / `fd` |
| `WebFetch` | `bash` with `curl` |

### Custom Tools (registered by extension)

These tools are available and should be preferred over bash workarounds:

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `context7_resolve` | Resolve library name → Context7 ID | Before querying docs for a new library |
| `context7_query` | Fetch current docs from Context7 | Whenever you need up-to-date library docs/examples |
| `verify_exports` | Check @create-something package exports | Before writing any `@create-something/*` import |

**Common Context7 library IDs** (skip `context7_resolve` for these):
- SvelteKit: `/sveltejs/kit`
- Cloudflare Workers SDK: `/cloudflare/workers-sdk`
- Cloudflare Docs: `/cloudflare/cloudflare-docs`
- Hono: `/honojs/hono`
- Vitest: `/vitest-dev/vitest`
- TypeScript: `/microsoft/typescript`
- Zod: `/colinhacks/zod`

### Interactive Commands

| Command | What it does |
|---------|-------------|
| `/linear` | Browse ready Linear issues with interactive selector |
| `/linear claim` | Pick and claim a Linear issue, auto-names the session |
| `/linear open` | Browse open issues |
| `/check` | Run type checks on modified packages |
| `/test [pkg]` | Run tests on modified packages (or a specific package) |
| `/exports [pkg] [symbol]` | Verify package exports |
| `/done [CRE-NNN]` | Mark a Linear issue done with auto-gathered evidence |
| `/canon-check [pkg]` | Full Canon compliance audit on a package or all |
| `/pre-commit` | Pre-commit quality checks (Svelte 4 props, design drift, duplicates) |
| `/fleet status` | Scan MCP packages in the monorepo |
| `/fleet registry` | Load the MCP fleet registry |
| `/fleet deploy <pkg>` | Deploy an MCP server with confirmation |

### Prompt Templates

| Template | Usage |
|----------|-------|
| `/deploy <property>` | Generate deployment commands |
| `/audit-canon [path]` | Canon design compliance check |
| `/audit-voice [path]` | Voice/writing compliance check |
| `/paper <slug>` | Create/edit a paper |
| `/experiment <slug>` | Scaffold an experiment |
| `/review [path]` | Hermeneutic code review (DRY → Rams → Heidegger) |
| `/research <topic>` | Multi-turn research session for a paper |
| `/review [path]` | Hermeneutic code review (DRY → Rams → Heidegger) |
| `/new-mcp <name>` | Scaffold a new MCP server |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Shift+L` | Open Linear issue selector |
| `Ctrl+Shift+T` | Run tests on modified packages |

### Quality Gates (automatic)

The extension enforces these automatically — no manual invocation needed:

- **Before bash execution**: Blocks legacy `lm`/`pnpm loom:*` commands, enforces `[CRE-NNN]` in commit messages
- **After every write/edit**: Canon token compliance, import verification, paper structure, experiment structure
- **After agent completes**: TypeScript type checking, ESLint linting, uncommitted changes reminder

If quality gates fire, fix the issues before considering the task complete.

### Theme

The Glass theme (`glass`) is the default, aligned with the Canon Glass Design System colors: `--color-brand-primary: #315cff`, pure black backgrounds, and the standard Canon palette.

### MCP Replacement

Pi does not use MCP. The `context7_query` and `verify_exports` custom tools replace the MCP dependencies. For Ground analysis, use `bash` with the ground CLI or `pnpm exports`. For Linear, use the `/linear` command or `bash` with `pnpm linear:*`.

### Skills

25 skills are available (18 Claude + 3 project-local + 4 from packages). The `.claude/memory/` files are also surfaced via resource discovery.

Pi-native and package skills:
- `/skill:repo-navigator` — Monorepo conventions, project names, file structure
- `/skill:mcp-fleet` — MCP fleet registry, Three-Tier Framework
- `/skill:policy-os` — Policy OS product, contract artifacts, MCP-First Thesis
- `/skill:three-tier-framework` — Full framework reference, classification, debugging heuristic
- `/skill:policy-os-starter` — Governance patterns, Subtractive Triad, quality gate design
- `/skill:halfdozen-fleet` — Half Dozen client MCPs, sync patterns, telemetry
- `/skill:webflow-fleet` — Webflow MCPs, template review, app review, dashboard

Cross-loaded Claude skills (key ones):
- `/skill:css-canon` — Design tokens, Glass system, animation
- `/skill:subtractive-review` — Code review methodology
- `/skill:context7-docs` — External library docs (use `context7_query` tool directly)
- `/skill:ground-claims` — Code verification (use `bash` with ground CLI)

15 prompt templates available (8 project-local + 7 from packages). Notable additions from packages:
- `/classify <component>` — Three-Tier Framework classification
- `/debug-tier <failure>` — Causality heuristic debugging
- `/mcp-design <server>` — MCP server design template
- `/policy-audit [path]` — Governance gap assessment with score
- `/subtractive-review [path]` — DRY → Rams → Heidegger code review
- `/new-client <name>` — Add a Half Dozen client to the fleet
- `/review-template <url>` — Webflow template quality review
