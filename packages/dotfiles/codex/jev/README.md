# Jev in Codex

This opt-in installation pairs Astra with the upstream
[typesafe-mcp](https://github.com/itsmostafa/typesafe-mcp) `evaluate` tool. The
`jev-coding-assist` skill limits the initial workflow to advisory context ranking
and skill selection. Astra still inspects source, writes code, and verifies it.

## Install

Requires Python 3.11+, an authenticated Infisical CLI, and access to the existing
CREATE SOMETHING development `TYPESAFE_API_KEY`. From the monorepo root:

```bash
python3 packages/dotfiles/codex/jev/install.py
```

The installer pins upstream **v0.4.3**, commit
`e5e7d69cf14912de3b789a2140e2becdaf056022`, and verifies the archive SHA-256 from
that release. It writes a versioned executable and credential launcher to
`~/.local/share/create-something/jev`, registers only `mcp_servers.jev` in
`${CODEX_HOME:-~/.codex}/config.toml`, and copies only `jev-coding-assist` into
that Codex home's skills directory. The installed copy survives worktree removal.
Existing conflicting MCP/skill configuration causes a stop rather than replacement.
Rerunning the installer refreshes its own managed skill and launcher.

The launcher fetches the key from Infisical project
`e1532079-2f2b-46b5-8972-cf7a025eb803`, environment `dev`, path `/`, unless a
`TYPESAFE_API_KEY` is already supplied in its process environment. It passes the
key only to the upstream process. No key is written to configuration, command
arguments, or receipts. Endpoint overrides and OpenRouter fallback are removed.
The upstream MCP sends supplied state to TypeSafe; use only task-relevant content
permitted for that provider, and keep secrets out of state.

The Codex caller has a five-second tool timeout and a twenty-second startup
timeout. Infisical lookup is bounded to twelve seconds. The upstream binary can
retry 429/529; the caller's deadline bounds the wait and cancellation, and the
skill asks Astra to fall back without repeating the advisory call. An optional
MCP startup failure does not prevent normal Codex work.

Restart Codex or reload MCP connections if the current task's tool catalog does
not expose `jev` / `evaluate`. A config readback alone is not proof that an
already-running task has refreshed its catalog. Invoke `$jev-coding-assist` for
an ambiguous shortlist; the skill also allows normal automatic discovery.

## Verify

```bash
python3 -m unittest discover -s packages/dotfiles/codex/jev -p 'test_*.py' -v
pnpm agent:skills:test
python3 packages/dotfiles/codex/jev/pilot.py --output /tmp/jev-codex-pilot.json
```

The live pilot costs TypeSafe API usage. It performs initialize, tool discovery,
an invalid-request check, and sixteen bounded calls over eight synthetic cases
in original/reversed candidate order. Expected answers stay outside model inputs.
It pins `jev-1.13.0`, checks the complete choice distribution, and records request
hashes, served model, usage, accuracy, failures, startup time, and call latency.
It exits nonzero for any wrong answer or failed call and retains the receipt.

These fixtures cover irrelevant candidates, missing deployment evidence, an
embedded instruction, and code/skill selection. They are integration diagnostics,
not independently labeled evidence of coding quality or speed. Do not tune to a
failure and report the same fixtures as a held-out success.

Before claiming improvement, freeze representative coding tasks and compare
Astra alone with Astra plus Jev at the same reasoning setting and source SHA.
Use clean, separate runs with counterbalanced ordering; count startup, timeouts,
retries, total verified-solution time, and reviewer rework. A reviewer should
assess final correctness without knowing which arm produced the patch. Keep
uncertain selections advisory and retain the full retrieved candidate set.

## Roll back

Set `enabled = false` inside `[mcp_servers.jev]` and reload Codex to stop its use.
Remove the `jev-coding-assist` installed copy only after confirming its
`.managed-jev` marker. The installer saves the original configuration privately
as `config.toml.before-jev`; use it for comparison, not blind restoration over
newer unrelated settings. Runtime files can remain inert for later reactivation.

The general `install-codex-skills` command may replace this managed copy with its
normal repo symlink. In that case use that installer to update the skill, or
inspect the symlink before rerunning this installer; it deliberately refuses to
overwrite unmanaged symlinks.
