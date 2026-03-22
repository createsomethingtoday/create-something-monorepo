# Understanding: @create-something/dotfiles

> **The terminal environment—Being-as-Configuration that makes tools recede into use.**

## Ontological Position

**Mode of Being**: Dotfiles — Being-as-Configuration

This is where Zuhandenheit (ready-to-hand) manifests in terminal tooling. When configuration works, you don't think about it—the email client becomes communication, the task manager becomes work, the terminal becomes craft. The dotfiles exist to make themselves disappear.

## Depends On (Understanding-Critical)

| Dependency | Why It Matters |
|------------|----------------|
| **Pi / .pi** | Primary repo-owned agent workflow surface |
| **Beads** | Agent-native task management |
| **Neomutt** | Email as communication, not inbox management |
| **WezTerm** | Terminal emulator with Canon aesthetics |
| **Neovim** | Text editing aligned with Canon principles |
| **Claude Code** | Compatibility host for older agent workflows |

## Enables Understanding Of

| Consumer | What This Package Clarifies |
|----------|----------------------------|
| **Developers** | How to configure tools that recede |
| **AI agents** | How humans interact with terminal workflows |
| **The field** | Canon-compliant terminal aesthetics |
| **Practitioners** | Consistent keybinding grammar across tools |

## Internal Structure

```
packages/dotfiles/
├── ../.pi/                    → Canonical repo-owned Pi workflow resources
├── claude-code/
│   ├── settings.json           → MCP servers, permissions
│   ├── mcp-templates/          → Pre-configured MCP servers
│   └── harness-templates/      → Legacy Claude/Beads work templates
├── wezterm/
│   ├── wezterm.lua             → Main configuration
│   └── colors/                 → Canon color schemes
├── beads/
│   ├── config.yaml             → Beads configuration
│   └── README.md               → Usage patterns
├── neomutt/
│   ├── neomuttrc               → Entry point
│   ├── accounts/               → Per-account configs
│   ├── colors/                 → Canon color schemes
│   ├── bindings/               → Keybinding modules
│   └── hooks/                  → Folder/message hooks
├── nvim/
│   ├── init.lua                → Entry point
│   └── lua/                    → Modular config
└── scripts/
    └── install.sh              → Symlink installer
```

## Core Concepts

| Concept | Definition | Where to Find |
|---------|------------|---------------|
| **Zuhandenheit** | Ready-to-hand; tools recede into use | Philosophy |
| **Keybinding Grammar** | Consistent `j/k/h/l/gg/G` across tools | All configs |
| **Canon Colors** | Consistent palette across all tools | `*/colors/` |
| **Modular Config** | Composable, DRY configuration files | All configs |

## To Understand This Package, Read

**For repo agent workflow (primary)**:
1. **`../../AGENTS.md`** — repo operating model
2. **`../../docs/guides/PI_WORKFLOW.md`** — Pi-first workflow
3. **`../../.pi/`** — repo-local Pi settings, skills, prompts, and sessions

**For Claude Code compatibility**:
1. **`claude-code/settings.json`** — compatibility MCP servers and permissions
2. **`claude-code/mcp-templates/`** — pre-configured integrations
3. **`claude-code/harness-templates/`** — legacy multi-session workflows

**For Terminal (WezTerm)**:
1. **`wezterm/wezterm.lua`** — Main configuration
2. **`wezterm/colors/`** — Canon color schemes

**For Email (Neomutt)**:
1. **`neomutt/neomuttrc`** — Entry point
2. **`neomutt/bindings/core.muttrc`** — Vim keybindings
3. **`.claude/rules/neomutt-patterns.md`** — Compatibility and historical detailed reference

**For Tasks (Beads)**:
1. **`beads/config.yaml`** — Beads configuration
2. **`.claude/rules/beads-patterns.md`** — Compatibility and historical usage patterns

## Keybinding Grammar

The same grammar across all tools:

| Key | Action | Tools |
|-----|--------|-------|
| `j/k` | Navigate down/up | Neomutt, Nvim, WezTerm (copy mode) |
| `h/l` | Back/Forward (or collapse/expand) | Neomutt, Nvim |
| `gg/G` | First/Last | Neomutt, Nvim |
| `Ctrl-d/u` | Half-page down/up | Neomutt, Nvim |
| `/` | Search | Neomutt, Nvim |
| `g{letter}` | Goto operations | Neomutt (`gi` inbox, `gs` sent, etc.) |

**Why this matters**: Muscle memory transfers. You don't think about navigation—you just navigate.

## Color Conventions

All tools use the Canon palette:

| Semantic | Use | Color Code |
|----------|-----|------------|
| **Primary** | Active/selected | `color15` (white) |
| **Secondary** | Normal content | `color250` (80% white) |
| **Tertiary** | De-emphasized | `color245` (60% white) |
| **Muted** | Inactive/read | `color240` (40% white) |
| **Border** | Separators | `color236` (10% white) |
| **Success** | Completed/good | `color71` (#44aa44) |
| **Error** | Failed/urgent | `color167` (#cc4444) |
| **Warning** | Flagged/due | `color136` (#aa8844) |
| **Info** | Links/metadata | `color67` (#4477aa) |

## Legacy Claude Code Compatibility Configuration

### MCP Server Templates

Pre-configured integrations for common services:

| Template | Service | Use Case |
|----------|---------|----------|
| `slack.json` | Slack | Team communication, notifications |
| `linear.json` | Linear | Issue tracking integration |
| `stripe.json` | Stripe | Payment operations, webhooks |
| `cloudflare.json` | Cloudflare | Pages, Workers, D1, KV, R2 |
| `github.json` | GitHub | Repository operations |

**Usage**: Copy template → `settings.json` MCP servers → authenticate

### Harness Templates

Legacy multi-session autonomous work templates:

| Template | Use Case | Sessions |
|----------|----------|----------|
| `feature.md` | New feature implementation | 5-10 |
| `migration.md` | Database/API migration | 10-20 |
| `refactor.md` | Large-scale refactoring | 15-30 |

**Usage**: Copy one of the markdown templates into a working spec only when you intentionally use the older Claude plus Beads workflow. For current repo work, start with Loom and the Pi lane commands.

## WezTerm Configuration

Terminal emulator with Canon aesthetics:

**Features**:
- Canon color scheme (pure black background, semantic colors)
- Custom key bindings (Cmd+T new tab, Cmd+W close, etc.)
- Tab and pane management
- Font: JetBrains Mono (monospace with ligatures)

**Config**: `wezterm/wezterm.lua`

## Beads Configuration

Agent-native task management. Beads replaces Taskwarrior because the primary user changed from human to AI agent.

**Why Beads**:
- Cross-session memory for AI agents and legacy Claude-oriented harnesses
- Git-synced issue tracking (`.beads/issues.jsonl`)
- Robot-optimized output (`--robot-priority`, `--robot-insights`)
- Collision-resistant hash IDs (enables multi-agent work)

**Config**: `beads/config.yaml`

## Neomutt Configuration

Email client with modular, Canon-compliant configuration:

### Module Structure

```
neomutt/
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
│   └── signatures.muttrc   # Per-recipient signatures
└── signatures/             # Version-controlled signatures
```

**Accounts**:
- CREATE SOMETHING (micah@createsomething.io)
- HalfDozen (mj@halfdozen.io)
- Webflow (micah@webflow.com)

**Key bindings**:
- `F1/F2/F3`: Switch accounts
- `gi/gs/gd/ga/gt`: Go to Inbox/Sent/Drafts/Archive/Trash
- `e`: Archive message
- `l` then `u/f/a`: Filter unread/flagged/all

## Neovim Configuration

Text editor with Canon principles:

**Features**:
- Minimalist UI (no unnecessary decoration)
- Vim keybindings (standard navigation grammar)
- Canon color scheme
- Modular Lua configuration

**Config**: `nvim/init.lua`

## Installation Process

The `scripts/install.sh` script:

1. Creates `~/.config/` directories
2. Symlinks dotfiles → `~/.config/`
3. Prints the Pi/OpenAI verification path for repo work
4. Creates credential directories (gitignored)
5. Prompts for sensitive values (passwords, tokens)
6. Verifies installation

**Symlinks created**:
```
~/.config/wezterm/ → packages/dotfiles/wezterm/
~/.config/neomutt/ → packages/dotfiles/neomutt/
~/.config/nvim/ → packages/dotfiles/nvim/
~/.config/beads/ → packages/dotfiles/beads/
```

**Credentials** (local only, not in repo):
```
~/.config/neomutt/credentials/*.pass
~/.ssh/config (for GitHub multi-account)
```

## Git Multi-Account SSH Configuration

Multiple GitHub accounts via SSH host aliases:

| Host Alias | Account | SSH Key | Email |
|------------|---------|---------|-------|
| `github.com` | createsomethingtoday | `~/.ssh/id_ed25519_createsomething` | micah@createsomething.io |
| `github-halfdozen` | halfdozenco | `~/.ssh/id_ed25519` | mj@halfdozen.co |

**Switching**:
```bash
# Use SSH host aliases in remote URLs
git remote set-url origin git@github.com:createsomethingtoday/repo.git
git remote set-url origin git@github-halfdozen:halfdozenco/repo.git

# Or use gh CLI for HTTPS
gh auth switch --user createsomethingtoday
```

**Loading SSH keys**:
```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519_createsomething
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

## Stripe CLI Patterns

Local webhook development and testing:

| Command | Purpose |
|---------|---------|
| `stripe listen --forward-to localhost:5173/api/stripe/webhook` | Forward webhooks locally |
| `stripe logs tail` | Real-time API logs |
| `stripe events list` | Recent webhook events |
| `stripe trigger checkout.session.completed` | Test checkout event |

**Stripe MCP** (via an MCP-capable host such as Pi or a compatibility client):
- Query production data: "List active subscriptions"
- AI-assisted debugging: "Show failed webhook deliveries"
- Uses OAuth (authenticates via browser)

## Hermeneutic Function

```
.ltd (Canon) ──────────────────────────────────────┐
    │                                               │
    ▼                                               │
dotfiles (Configuration) ◄── "Do tools recede?"     │
    │                                               │
    ├──► Enables io research workflows              │
    ├──► Enables space experimentation              │
    ├──► Enables agency client work                 │
    ├──► Enables harness orchestration              │
    │                                               │
    └──► Discovers tool friction → returns to .ltd ─┘
```

**The loop**:
1. `.ltd` defines Zuhandenheit (tools should recede)
2. `dotfiles` implements configuration
3. Friction reveals when tools become present-at-hand
4. Friction feeds back to `.ltd` for principle refinement
5. Refined principles return as better configuration

## Common Tasks

| Task | Start Here |
|------|------------|
| Install dotfiles | `pnpm --filter=dotfiles install-dotfiles` |
| Verify Pi/OpenAI repo workflow | `../../docs/guides/PI_WORKFLOW.md` |
| Configure legacy Claude compatibility MCP | `claude-code/mcp-templates/` |
| Set up email account | `neomutt/accounts/` |
| Customize terminal colors | `wezterm/colors/` |
| Add keybinding | `neomutt/bindings/` or `wezterm/wezterm.lua` |
| Configure Beads | `beads/config.yaml` |

## Subtractive Triad Application

| Level | Question | Answer |
|-------|----------|--------|
| **DRY** | Have I configured this before? | Unified keybinding grammar, shared color palette |
| **Rams** | Does this configuration earn existence? | Only options that change defaults for good reason |
| **Heidegger** | Do tools recede? | Vim grammar transfers; Canon colors unify; friction is visible |

**Anti-pattern**: Configuration sprawl (100s of lines for minor tweaks). Each option must justify itself.

**Goal**: Minimal configuration, maximal tool transparency.

## When Tools Become Present-At-Hand

Signs that configuration needs attention:

- **You think about keybindings** → Grammar is inconsistent
- **Colors distract** → Palette is wrong
- **Switching contexts is jarring** → Lack of unification
- **You hesitate before acting** → Tool is visible instead of receding

These moments are valuable—they reveal where Zuhandenheit breaks down. Document and fix.

## Styling Philosophy

**Tailwind for structure, Canon for aesthetics** (from css-canon.md) applies to terminal configuration too:

- **Structure**: Keybindings, layout, navigation patterns
- **Aesthetics**: Colors, fonts, visual hierarchy

Don't configure structure that doesn't need configuring (default Vim navigation is good). Do configure aesthetics to align with Canon (pure black background, semantic colors).

## References

- **[PI Workflow](../../docs/guides/PI_WORKFLOW.md)** — Canonical Pi-first repo workflow
- **[Dotfiles Conventions](../../.claude/rules/dotfiles-conventions.md)** — Compatibility and historical conventions reference
- **[Neomutt Patterns](../../.claude/rules/neomutt-patterns.md)** — Compatibility and historical email configuration reference
- **[Beads Patterns](../../.claude/rules/beads-patterns.md)** — Compatibility and historical task management reference

---

*Last validated: 2025-12-29*

**This UNDERSTANDING.md follows the "Less, but better" principle—document what's critical to understand, not every detail. When you need deeper knowledge, follow the references to source files.**
