# Neomutt Patterns

Configuration for the CREATE SOMETHING email environment. Lives at `packages/dotfiles/neomutt/`, symlinked to `~/.config/neomutt/`.

## Philosophy

Email is inherently interruptive. The config answers: how does email recede into communication rather than becoming its own activity?

Three principles:
1. **Email as capture** → tasks flow OUT (to Taskwarrior, not inbox folders)
2. **Email as reference** → searchable archive, not inbox management
3. **Email as communication** → reply and archive, minimal ceremony

## File Structure

```
packages/dotfiles/neomutt/
├── neomuttrc               # Entry point (sources everything)
├── accounts/               # Per-account IMAP/SMTP
│   ├── createsomething.muttrc
│   ├── halfdozen.muttrc
│   └── webflow.muttrc
├── colors/
│   └── canon.muttrc        # Canon palette mapping
├── bindings/
│   ├── core.muttrc         # Vim navigation grammar
│   ├── sidebar.muttrc      # Ctrl-prefixed sidebar
│   └── compose.muttrc      # Compose shortcuts
├── hooks/
│   ├── folder.muttrc       # Folder-switch hooks
│   ├── accounts.muttrc     # Account-switch hooks
│   ├── signatures.muttrc   # Per-recipient signatures
│   └── save.muttrc         # Default archive behavior
├── signatures/             # Version-controlled signatures
├── mailcap                 # MIME handlers (macOS)
└── .gitignore              # Excludes credentials/, cache/
```

## Installation

```bash
cd packages/dotfiles
./scripts/install.sh
```

The installer:
1. Symlinks `neomutt/` → `~/.config/neomutt/`
2. Creates `~/.config/neomutt/credentials/` locally (not in repo)
3. Prompts for Google Workspace app passwords
4. Symlinks Taskwarrior config

## Extension Points

### Adding an Account

1. Create `packages/dotfiles/neomutt/accounts/<name>.muttrc`:
   ```muttrc
   set realname = "Micah Johnson"
   set from = "email@domain.com"
   set imap_user = "email@domain.com"
   set imap_pass = "`cat ~/.config/neomutt/credentials/<name>.pass`"
   set folder = "imaps://imap.gmail.com:993"
   set spoolfile = "+INBOX"
   set postponed = "+[Gmail]/Drafts"
   set record = "+[Gmail]/Sent Mail"
   set trash = "+[Gmail]/Trash"
   set smtp_url = "smtps://email@domain.com@smtp.gmail.com:465"
   set smtp_pass = "`cat ~/.config/neomutt/credentials/<name>.pass`"
   set signature = "~/.config/neomutt/signatures/<name>.txt"
   mailboxes =INBOX "=[Gmail]/Sent Mail" "=[Gmail]/Drafts" "=[Gmail]/All Mail" "=[Gmail]/Trash"
   ```

2. Add folder-hook in `hooks/accounts.muttrc`
3. Add keybinding in `bindings/core.muttrc` (follow `<F#>` pattern)
4. Create signature in `signatures/<name>.txt`
5. Create credential: `echo "app-password" > ~/.config/neomutt/credentials/<name>.pass && chmod 600 ~/.config/neomutt/credentials/<name>.pass`

### Modifying Keybindings

Follow the grammar in `bindings/core.muttrc`:
- Navigation: `j/k/gg/G/^d/^u` (vim standard)
- Actions: single mnemonic key (`r`eply, `f`orward, `d`elete, `e` archive)
- Go-to: `g` prefix (`gi` inbox, `gs` sent, `gd` drafts)
- Account switch: `F#` keys
- Limit/filter: `l` prefix (`la` all, `lu` unread, `lf` flagged)

### Modifying Colors

The `colors/canon.muttrc` file maps to Canon tokens:
- `color0` = `--color-bg-pure`
- `color15` = `--color-fg-primary`
- `color240` = `--color-fg-muted`
- `color12` = `--color-data-1` (blue accent)
- `color10` = `--color-data-2` (green/success)
- `color13` = `--color-data-3` (magenta)
- `color11` = `--color-data-4` (yellow/warning)
- `color9` = `--color-error`

## Accounts Reference

| Account | Email | Provider | Status Color |
|---------|-------|----------|--------------|
| createsomething | micah@createsomething.io | Google Workspace | cyan |
| halfdozen | mj@halfdozen.io | Google Workspace | magenta |
| webflow | micah@webflow.com | Google Workspace | yellow |

All accounts use identical IMAP/SMTP settings (Gmail servers).

## Taskwarrior Integration

The `on-add-inbox.sh` hook enables email → task flow. When you create a task from an email (via macro), it gets tagged appropriately.

## Quick Reference

| Key | Action |
|-----|--------|
| `F1` | Switch to CREATE SOMETHING |
| `F2` | Switch to HalfDozen |
| `F3` | Switch to Webflow |
| `gi/gs/gd/ga/gt` | Go to Inbox/Sent/Drafts/Archive/Trash |
| `e` | Archive message |
| `l` then `u/f/a` | Filter: unread/flagged/all |
