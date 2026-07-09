# Zen Browser Configuration

CREATE SOMETHING Canon configuration for [Zen Browser](https://zen-browser.app/).

## Philosophy

The browser is the chassis — the structural frame that connects everything. Like MCP, it recedes into transparent use. The cockpit is driver-centric: tachometer center-mounted, controls angled toward you, minimal decoration. You focus on your destination.

**Zuhandenheit**: When working, you shouldn't notice the browser — only the work.

## What's Included

| File | Purpose |
|------|---------|
| `user.js` | Performance, privacy, and memory tuning (based on [Better Zen](https://github.com/Codextor/better-zen)) |
| `chrome/userChrome.css` | Glass Design System applied to browser chrome |
| `chrome/userContent.css` | Dark treatment for internal browser pages |

### user.js Sections

1. **Fastback** — Speed & performance (rendering, networking, caching)
2. **Privacy** — Trust boundaries (tracking, prefetching, permissions)
3. **Interface** — Subtractive UI (cookie banners auto-rejected, theming enabled)
4. **Memory** — Long-session stability (tab unloading, GC tuning, cache limits)

### userChrome.css Sections

Glass Design System translated into Firefox CSS:

- **Root Chrome** — Pure black chassis
- **Tab Bar** — Muted inactive, elevated active (mirrors terminal pattern)
- **URL Bar** — Surface background, glass glow on focus
- **Zen Sidebar** — Workspace panel with Canon interactive states
- **Toolbar Buttons** — Muted until hovered (tool disappears)
- **Context Menus** — Glass-elevated panels
- **DevTools** — Canon-dark workshop
- **Scrollbars** — Thin, auto-hiding

## Installation

### 1. Create a fresh Zen profile

```
about:profiles → Create a New Profile → Name it "Canon"
```

### 2. Open the profile directory

Under the new profile, click **Show in Finder** (macOS) or **Open Directory** (Linux).

### 3. Copy configuration files

```bash
# From the monorepo root
PROFILE_DIR="$HOME/path/to/zen-profile-directory"

# Copy user.js to profile root
cp packages/dotfiles/zen/user.js "$PROFILE_DIR/"

# Copy chrome directory (userChrome.css + userContent.css)
cp -r packages/dotfiles/zen/chrome "$PROFILE_DIR/"
```

Or symlink for live updates:

```bash
PROFILE_DIR="$HOME/path/to/zen-profile-directory"

ln -sf "$(pwd)/packages/dotfiles/zen/user.js" "$PROFILE_DIR/user.js"
ln -sf "$(pwd)/packages/dotfiles/zen/chrome" "$PROFILE_DIR/chrome"
```

### 4. Launch the new profile

Back in `about:profiles`, click **Launch profile in new browser** under the Canon profile.

### 5. (Optional) Install JetBrains Mono

The URL bar and tabs use the system sans-serif. DevTools benefit from JetBrains Mono:

```bash
brew install --cask font-jetbrains-mono
```

## Live Editing

Zen supports live CSS editing for rapid iteration:

1. Press **Ctrl+Shift+Alt+I** to open Browser Toolbox
2. Navigate to **Style Editor** tab
3. Search for `userChrome` to find the CSS
4. Edit directly — changes apply on save
5. Use the **Inspect** button to identify elements

Add `!important` to rules if styles don't take effect (Zen's own styles may compete).

## Color Palette

Canon-compliant colors (aligned with Zellij and neomutt):

| Purpose | Token | Value |
|---------|-------|-------|
| Background | `--color-bg-pure` | `#000000` |
| Elevated | `--color-bg-elevated` | `#0a0a0a` |
| Surface | `--color-bg-surface` | `#111111` |
| Subtle | `--color-bg-subtle` | `#1a1a1a` |
| Foreground | `--color-fg-primary` | `#ffffff` |
| Secondary text | `--color-fg-secondary` | `rgba(255,255,255,0.8)` |
| Tertiary text | `--color-fg-tertiary` | `rgba(255,255,255,0.6)` |
| Muted text | `--color-fg-muted` | `rgba(255,255,255,0.46)` |
| Border | `--color-border-default` | `rgba(255,255,255,0.1)` |
| Error | `--color-error` | `#d44d4d` |
| Success | `--color-success` | `#ffffff` |
| Warning | `--color-warning` | `#aa8844` |
| Info | `--color-info` | `#5082b9` |

## Memory Management

Zen has known memory-leak issues in some versions. The `user.js` includes mitigations:

- **Tab unloading**: Background tabs are discarded when memory is low
- **Reduced caches**: Image and media caches are capped
- **More frequent GC**: JavaScript garbage collection runs in smaller increments

If RAM still creeps above 6GB with few tabs:

1. Restart Zen periodically (pragmatic workaround for known leaks)
2. Check extensions — disable one at a time to isolate leakers
3. Use `about:memory` to inspect per-tab usage
4. Consider a minimal secondary browser for media-heavy tabs (YouTube, Figma)

## Recommended Extensions

Keep minimal. Each must earn its existence:

| Extension | Purpose | Why |
|-----------|---------|-----|
| uBlock Origin | Content blocking | Strict mode + custom filters |
| Bitwarden | Password management | Replaces browser password manager |
| Vimium | Keyboard navigation | j/k/h/l grammar consistency |

## Files

```
zen/
├── user.js              # Performance, privacy, memory prefs
├── chrome/
│   ├── userChrome.css   # Glass Design System for browser chrome
│   └── userContent.css  # Dark treatment for internal pages
└── README.md            # This file
```

## Troubleshooting

### Styles not applying

Verify in `about:config`:
```
toolkit.legacyUserProfileCustomizations.stylesheets = true
```

### user.js not loading

user.js is read only on Zen startup. Changes require a full restart (not just reload).

### Memory still high

Check `about:memory` → "Measure" to see what's consuming RAM. Common culprits:
- Extensions with background processes
- Tabs with heavy JavaScript (web IDEs, Figma)
- Media playback in background tabs

### Theme conflicts with Zen updates

Zen may change internal class names between versions. If elements stop being styled:
1. Open Browser Toolbox (Ctrl+Shift+Alt+I)
2. Inspect the unstyled element
3. Update the selector in `userChrome.css`
