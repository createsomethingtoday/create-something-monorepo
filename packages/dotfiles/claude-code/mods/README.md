# Claude Code mods (cross-cutting)

Mods that apply to any session, not one product area. Template Review mods live beside their MCP in `packages/webflow-template-review-mcp/mods/`.

| Mod | What it does |
| --- | --- |
| `outbound-guard` | One **Send / Do not send** dialog for every call that leaves the company or changes a live system: Slack `slack_send_message` / `slack_schedule_message`, Gmail `send_message` / `reply` / `forward`, App Review Zendesk public follow-ups and new tickets, PartnerStack approve/decline, partner messages, rewards and transactions, every Statsig write (anything that is not a `Get_` / `Query_` / `Search_` read), Zapier write actions, Drive shares, and Calendar event changes. The dialog quotes the text going out and a pane titled "What goes out" shows it in full on a wide terminal. Slack sends get the checks that have each cost a message before: a `D…` DM channel id is refused (the connector reports success and delivers nothing; use the `U…` user id), a Markdown table is refused (silently dropped), every `<@U…>` mention is checked against the channel's member list and a non-member mention is refused, a bare URL ending a line gets a blank line after it so Slack does not swallow the next word, and HTML-looking tags or plain `@name` mentions are called out in the dialog. Template Review tools are left to `template-review-guard`, and `slack_send_message_draft` passes through untouched since nothing is sent. If the guard itself crashes on a guarded call, the call is refused. |

## Load

```bash
claude --plugin-dir packages/dotfiles/claude-code/mods/outbound-guard
```

Or for every session (also the desktop app), in `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "/abs/path/packages/dotfiles/claude-code/mods/outbound-guard" } }
```

Several folders are joined with `:`. The dialog is the engine's AskUserQuestion, so it shows under bypass-permissions mode too; in a headless `claude -p` run nobody can answer and every guarded call is refused.

## Check

```bash
claude plugin validate packages/dotfiles/claude-code/mods/outbound-guard
claude plugin test     packages/dotfiles/claude-code/mods/outbound-guard
```

In-place `tsc -p <mod>` declares every connected MCP tool and runs out of heap with hundreds of connectors attached; type-check against the `plugin-authoring` skill's `types/claude-code.d.ts` alone in that case.

## Known limits

- The member check reads up to 12 pages of 30 ids. A channel with more than 360 members may report a real member as missing; the deny message names the id so the fix is one look.
- Slack Connect channels are refused by the connector itself before this guard matters; draft and send by hand.
- The dialog cannot carry the approval buttons inside the pane: a hook has ten seconds of its own time per dispatch and only `$` calls pause that clock, so the pane is read-only and the answer lives on the dialog.
