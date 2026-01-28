# Pencil Integration

Shared visual canvas for human-agent pair engineering.

## Philosophy

> "Das Zeug ist wesenhaft 'etwas, um zu...'" — Heidegger
> (Equipment is essentially "something in order to...")

Components are **ready-to-hand** (Zuhandenheit) — tools that recede into use. You describe intent; agents see and iterate. When something breaks down, it becomes **present-at-hand** (Vorhandenheit) — visible for examination.

This design system provides the **Grund** (ground/foundation) for visual work.

## Quick Start

```
File: packages/components/pencil/canon.pen
```

## Canon Design System Components

**53 reusable components** organized by encounter:

### Grund (Ground) — Typography & Links

The foundation of meaning.

| Component | ID | Usage |
|-----------|-----|-------|
| Text/H1 | `iFhU5` | Page titles (42px) |
| Text/H2 | `u5jwq` | Section titles (26px) |
| Text/H3 | `wjZNk` | Subsection titles (20px) |
| Text/Body | `XOhxi` | Body text (16px) |
| Text/Caption | `rdjds` | Helper text (12px) |
| Link | `ADuNy` | Primary link |
| Link/Muted | `j8Fyb` | Secondary link |

### Handlung (Action) — Buttons

Primary engagement with the interface.

| Component | ID | Usage |
|-----------|-----|-------|
| Button/Primary | `8AbIc` | Main actions (white bg) |
| Button/Secondary | `FrU2g` | Secondary actions (gray bg) |
| Button/Outline | `o4SO7` | Tertiary actions (border only) |
| Button/Ghost | `HlEjd` | Subtle actions (no bg) |
| Button/Destructive | `Vnaih` | Delete/danger (red bg) |
| Button/Icon | `pLbe9` | Icon-only button |

### Eingabe (Input) — Forms

How we give data to the system.

| Component | ID | Usage |
|-----------|-----|-------|
| Input/Default | `6tmbG` | Standard text input |
| Input/Textarea | `Hf5P5` | Multi-line input |
| Input/Select | `BpcTY` | Dropdown select |
| Input/Error | `ldKhU` | Error state input |
| Checkbox | `XOojd` | Unchecked |
| Checkbox/Checked | `0U5cn` | Checked |
| Radio | `J3FZe` | Unselected |
| Radio/Selected | `5R7jw` | Selected |
| Switch | `lXrwm` | Off |
| Switch/On | `CBUAL` | On |

### Antwort (Response) — Feedback

How the system responds.

| Component | ID | Usage |
|-----------|-----|-------|
| Alert/Success | `plwU6` | Success message |
| Alert/Error | `fx88H` | Error message |
| Toast | `DHzOS` | Transient notification |
| Progress | `bhsXS` | Progress bar |
| Spinner | `j0lwB` | Loading spinner |
| Skeleton | `g1XFZ` | Loading placeholder |
| Badge/Default | `xBzri` | Neutral status |
| Badge/Success | `16inu` | Success status |
| Badge/Error | `ErMkA` | Error status |
| Tag | `C0Vtl` | Removable tag |
| Avatar | `ZMZdi` | User avatar (40px) |
| Avatar/Large | `cQuV1` | Large avatar (64px) |
| EmptyState | `67RlM` | No content placeholder |

### Behälter (Container) — Layout

How content is organized.

| Component | ID | Usage |
|-----------|-----|-------|
| Card | `MIygJ` | Content container |
| Table | `GJlVB` | Data table |
| Table/Row | `qqjR2` | Table row |
| Modal | `a3aVD` | Dialog |
| Drawer | `8n5uC` | Side panel |
| Divider | `hMklA` | Horizontal separator |
| Divider/Vertical | `Rw0cV` | Vertical separator |
| CodeBlock | `7qnJz` | Code display |
| QuoteBlock | `tH6vV` | Blockquote |

### Wegfindung (Wayfinding) — Navigation

How we move through the interface.

| Component | ID | Usage |
|-----------|-----|-------|
| Navbar | `U8Ru5` | Top navigation |
| Footer | `1FgSY` | Page footer |
| Tabs | `yfFjX` | Tab navigation |
| Breadcrumbs | `7lmXq` | Path navigation |
| Dropdown | `BMwVb` | Dropdown menu |
| Tooltip | `PuRyE` | Hover hint |
| Popover | `kNn0b` | Contextual content |
| Pagination | `VoCBW` | Page navigation |

## Canon Variables

### Colors

| Variable | Value | Canon Equivalent |
|----------|-------|------------------|
| `$fg-primary` | `#ffffff` | `--color-fg-primary` |
| `$fg-secondary` | `#cccccc` | `--color-fg-secondary` |
| `$fg-muted` | `#757575` | `--color-fg-muted` |
| `$bg-pure` | `#000000` | `--color-bg-pure` |
| `$bg-elevated` | `#0a0a0a` | `--color-bg-elevated` |
| `$bg-surface` | `#111111` | `--color-bg-surface` |
| `$bg-subtle` | `#1a1a1a` | `--color-bg-subtle` |
| `$border-default` | `#1a1a1a` | `--color-border-default` |
| `$color-success` | `#44aa44` | `--color-success` |
| `$color-error` | `#d44d4d` | `--color-error` |

### Typography

| Variable | Value |
|----------|-------|
| `$font-sans` | Stack Sans Notch |
| `$font-mono` | JetBrains Mono |

## MCP Tools

| Tool | Purpose |
|------|---------|
| `get_editor_state` | Current file & components |
| `batch_get` | Read node structure |
| `batch_design` | Modify nodes |
| `get_screenshot` | Visual verification |

### Verification Loop

```
batch_design → get_screenshot → evaluate → iterate
```

## Usage Examples

```javascript
// Button
btn=I(container, {type: "ref", ref: "8AbIc"})

// Card with content
card=I(container, {type: "ref", ref: "MIygJ"})

// Form input
input=I(form, {type: "ref", ref: "6tmbG"})

// Toast notification
toast=I(container, {type: "ref", ref: "DHzOS"})

// Empty state
empty=I(container, {type: "ref", ref: "67RlM"})
```

## Codebase Alignment

| Svelte Component | Pencil Component |
|------------------|------------------|
| `Button` | Button/* |
| `Card` | Card |
| `TextField` | Input/Default, Input/Error |
| `TextArea` | Input/Textarea |
| `Select` | Input/Select |
| `Checkbox` | Checkbox/* |
| `Radio` | Radio/* |
| `Switch` | Switch/* |
| `Alert` | Alert/* |
| `Toast` | Toast |
| `Dialog` | Modal |
| `Progress` | Progress |
| `Spinner` | Spinner |
| `Skeleton` | Skeleton |
| `Tabs` | Tabs |
| `Breadcrumbs` | Breadcrumbs |
| `DropdownMenu` | Dropdown |
| `Tooltip` | Tooltip |
| `Popover` | Popover |
| `Drawer` | Drawer |
| `Pagination` | Pagination |
| `Navigation` | Navbar |
| `Footer` | Footer |
| `QuoteBlock` | QuoteBlock |

## Source of Truth

`tokens.css` remains canonical. Pencil uses equivalent values.
