---
title: Configure Neomutt
description: Terminal email via Claude Code.
duration: 25 min
praxis: neomutt-setup
---

# Configure Neomutt

Email is inherently interruptive. The question is: how does email recede into communication rather than becoming its own activity?

Neomutt answers this by putting email in the terminal, with vim keybindings, and minimal ceremony.

## Why Terminal Email?

Most email clients are designed to maximize engagement. Neomutt is designed to minimize time-in-app:

1. **Keyboard-driven**: No mouse required
2. **Vim keybindings**: Same grammar as your editor
3. **Plain text first**: Rich content on demand
4. **Fast search**: Notmuch/mu integration
5. **No distractions**: No avatars, no animations, no engagement tricks

Email as utility, not destination.

## The Workflow

Terminal email changes how you work:

1. **Batch processing**: Check email at defined times, not continuously
2. **Quick triage**: j/k to navigate, d to delete, e to archive
3. **Reply inline**: Quote and respond efficiently
4. **Exit fast**: Process inbox, then leave

The goal: inbox zero in minutes, not hours.

## Installation via Claude Code

Neomutt installation requires:
- Neomutt itself
- Google App Password (for Gmail/Google Workspace)
- Configuration files with Canon colors and keybindings

Claude Code will walk you through all of this.

Start Claude Code:

```bash
claude
```

Then use the praxis prompt for guided installation.

## Key Keybindings

After configuration, you'll have vim-native email:

### Navigation
| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous message |
| `gg` / `G` | First / last message |
| `Ctrl+d` / `Ctrl+u` | Half-page down / up |
| `/` | Search |

### Actions
| Key | Action |
|-----|--------|
| `Enter` | Open message |
| `r` | Reply |
| `f` | Forward |
| `d` | Delete |
| `e` | Archive |
| `s` | Save to folder |

### Go-to (g prefix)
| Key | Action |
|-----|--------|
| `gi` | Go to Inbox |
| `gs` | Go to Sent |
| `gd` | Go to Drafts |
| `ga` | Go to Archive |
| `gt` | Go to Trash |

### Filtering
| Key | Action |
|-----|--------|
| `lu` | Limit to unread |
| `lf` | Limit to flagged |
| `la` | Show all |

## Account Configuration

Neomutt supports multiple accounts. Switch between them with function keys:

| Key | Account |
|-----|---------|
| `F1` | Primary account |
| `F2` | Secondary account |
| `F3` | Tertiary account |

## Google App Passwords

Gmail/Google Workspace requires App Passwords (not your regular password):

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Generate a new app password for "Mail"
3. Save it securely (you'll enter it during configuration)

Claude Code will guide you through storing this safely.

## Philosophy Note

Email in the terminal is a statement: you control your attention. The inbox doesn't summon you; you visit it when ready.

This is Gelassenheit applied to communication. Full engagement when engaging. Complete freedom when not.

## The Bootstrap is Complete

With Neomutt configured, you have:

1. **WezTerm**: The foundation
2. **Claude Code**: The partner
3. **WezTerm Config**: The aesthetic
4. **Beads**: The memory
5. **Neomutt**: The communication

Your environment is ready. The tools recede. Only the work remains.

## Next Step

Continue to the Foundations path to learn the Subtractive Triad—the philosophical core of everything you'll build.

---

*Complete the praxis exercise to configure Neomutt with Canon colors.*
