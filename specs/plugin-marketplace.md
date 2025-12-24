# CREATE SOMETHING Plugin Marketplace

## Overview

Create an external Claude Code plugin marketplace at `createsomethingtoday/claude-plugins` that distributes CREATE SOMETHING methodology to external projects like WORKWAY.

**Philosophy**: External-facing products warrant separate repos. The source of truth remains in the monorepo; plugins are extracted artifacts. The tool recedes; the methodology propagates.

**Architecture**:
```
createsomethingtoday/claude-plugins/
├── .claude-plugin/marketplace.json
├── plugins/
│   ├── canon/
│   ├── hermeneutic-review/
│   ├── voice-validator/
│   └── understanding-graphs/
└── README.md
```

**Source Files** (extract from monorepo):
- `.claude/commands/audit-canon.md`
- `.claude/commands/audit-voice.md`
- `.claude/agents/canon-auditor.md`
- `.claude/agents/hermeneutic-reviewer.md`
- `.claude/skills/voice-validator.md`
- `.claude/skills/subtractive-review.md`
- `.claude/skills/understanding-graphs.md`
- `.claude/scripts/canon-check.sh`
- `.claude/scripts/triad-audit-pr.sh`
- `.claude/hooks/hooks.json`
- `.claude/rules/css-canon.md`

## Features

### Create GitHub repository
Create a new public repository at `createsomethingtoday/claude-plugins` using the GitHub CLI.
- Run `gh repo create createsomethingtoday/claude-plugins --public --description "Claude Code plugins for CREATE SOMETHING methodology"`
- Clone to a temporary working directory
- Initialize with a basic README explaining the marketplace purpose and installation instructions

### Build Canon plugin
Extract and structure the Canon design system plugin in `plugins/canon/`.
- Create `plugins/canon/.claude-plugin/plugin.json` manifest with name, version, description
- Copy `.claude/commands/audit-canon.md` to `plugins/canon/commands/audit.md`
- Copy `.claude/agents/canon-auditor.md` to `plugins/canon/agents/canon-auditor.md`
- Extract PostToolUse hook section from `.claude/hooks/hooks.json` to `plugins/canon/hooks/hooks.json`
- Copy `.claude/scripts/canon-check.sh` to `plugins/canon/scripts/canon-check.sh`
- Copy `.claude/rules/css-canon.md` to `plugins/canon/docs/tokens-reference.md`
- Update any file path references to use `${CLAUDE_PLUGIN_ROOT}`

### Build Hermeneutic Review plugin
Extract and structure the Subtractive Triad review plugin in `plugins/hermeneutic-review/`.
- Create `plugins/hermeneutic-review/.claude-plugin/plugin.json` manifest
- Copy `.claude/agents/hermeneutic-reviewer.md` to `plugins/hermeneutic-review/agents/reviewer.md`
- Copy `.claude/skills/subtractive-review.md` to `plugins/hermeneutic-review/skills/subtractive-review/SKILL.md`
- Copy `.claude/scripts/triad-audit-pr.sh` to `plugins/hermeneutic-review/scripts/triad-audit-pr.sh`
- Update any file path references to use `${CLAUDE_PLUGIN_ROOT}`

### Build Voice Validator plugin
Extract and structure the Voice Validator plugin in `plugins/voice-validator/`.
- Create `plugins/voice-validator/.claude-plugin/plugin.json` manifest
- Copy `.claude/commands/audit-voice.md` to `plugins/voice-validator/commands/audit.md`
- Copy `.claude/skills/voice-validator.md` to `plugins/voice-validator/skills/voice-validator/SKILL.md`

### Build Understanding Graphs plugin
Extract and structure the Understanding Graphs plugin in `plugins/understanding-graphs/`.
- Create `plugins/understanding-graphs/.claude-plugin/plugin.json` manifest
- Copy `.claude/skills/understanding-graphs.md` to `plugins/understanding-graphs/skills/understanding-graphs/SKILL.md`

### Create marketplace manifest
Create the marketplace manifest at `.claude-plugin/marketplace.json`.
- Set name to `create-something`
- Set owner to CREATE SOMETHING with email hello@createsomething.io
- Add metadata with description "Subtractive design methodology: DRY → Rams → Heidegger"
- Set pluginRoot to `./plugins`
- Add entries for all 4 plugins with sources, descriptions, categories, and tags

### Push to GitHub
Commit and push all plugin files to the GitHub repository.
- Add all files with `git add .`
- Commit with message "feat: initial marketplace with 4 plugins"
- Push to origin main

### Update WORKWAY settings
Update WORKWAY's Claude Code settings to reference the new marketplace.
- Edit `/Users/micahjohnson/Documents/Github/WORKWAY/.claude/settings.json`
- Add `extraKnownMarketplaces` with source pointing to `createsomethingtoday/claude-plugins`
- Add `enabledPlugins` with `canon@create-something` and `hermeneutic-review@create-something`
- Merge with existing settings (preserve existing hooks)

### Verification
Validate the marketplace works correctly.
- Run `/plugin marketplace add createsomethingtoday/claude-plugins` in a test context
- Verify all 4 plugins appear in the marketplace
- Run `/plugin install canon@create-something` to test installation
- Confirm plugin files are correctly structured
