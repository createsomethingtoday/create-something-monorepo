# OpenProse vendor pin

Vendored October 18, 2026. Owner: Micah Johnson.

OpenProse (https://prose.md, https://github.com/openprose/prose) is pinned and
vendored here so runbook contracts do not depend on a moving upstream. The
public package host (`pkg.prose.md/releases/0.3.0-rc.3/`) returned 404 on the
vendor date, so the Git repository is the pin source, not the release host.

## Pin

| Item | Value |
| --- | --- |
| Upstream | `github.com/openprose/prose` |
| Tag | `skill-v0.18.1` |
| Tag commit | `aa7f3859cd4ff310b09858dc94079d42e408943d` |
| Default branch at vendor time | `0ab7237ced4ac29ca002c94878e69c5cbf6b1ea6` (2026-10-01); `skills/open-prose/` and `spec/` are byte-identical to the tag |
| Skill version (frontmatter) | `0.18.1`, `runtime_contract: 2` |
| License | MIT |

## What is vendored

| Upstream path | Repo path | Why |
| --- | --- | --- |
| `skills/open-prose/` (whole directory, examples included) | `.claude/skills/open-prose/` | The runtime. The agent embodies the OpenProse VM from these files; there is no binary. Claude Code loads it as a project skill. |
| `spec/00..03-*.md` | `docs/openprose/spec/` | Harness and language spec the skill links to. Read `02-Harness.md` before claiming a runbook is "served". |

Not vendored: `packages/std` and `packages/co`. Contracts in this repo must not
`call std/...` or `use` remote dependencies until those are installed with
`prose install` and recorded in `.agents/prose/prose.lock`.

## OpenProse root in this repo

`.agents/prose/` is the attached-repository root the skill expects
(`repo/.agents/prose`). `src/` holds authored contracts and is committed.
`runs/`, `state/`, `dist/`, and `deps/` are generated and ignored.

## Resync

```sh
git clone --branch skill-v0.18.1 --depth 1 https://github.com/openprose/prose.git /tmp/openprose
rsync -a --delete /tmp/openprose/skills/open-prose/ .claude/skills/open-prose/
cp /tmp/openprose/spec/*.md docs/openprose/spec/
```

To move the pin, change the tag in the command above, update the table, and
re-run the pilot before relying on any new behavior. Upstream ships
`prose upgrade --dry-run` for source migrations between skill versions.

## Known gaps at this pin

- For semantic postconditions, the render self-attests. There is no separate
  evaluator in the runtime. Independent review must be composed in as a
  contract requirement or kept as a human reviewer role.
- `prose compile` fails closed on `### Tools` and `### Skills` declarations it
  cannot resolve on the host. Declared CLIs must be on PATH.
- Cron and HTTP trigger adapters exist only under `prose serve`; the pilot
  keeps its existing launchd schedule and treats the gateway as documentation
  of that trigger.
