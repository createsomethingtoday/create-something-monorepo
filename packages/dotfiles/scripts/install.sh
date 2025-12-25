#!/bin/bash
# CREATE SOMETHING Dotfiles Installer
# Philosophy: Installation should be transparent and reversible

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOTFILES_DIR="$(dirname "$SCRIPT_DIR")"

echo "CREATE SOMETHING Dotfiles Installer"
echo "──────────────────────────────────────"
echo ""

# ─────────────────────────────────────────────────────────────
# Neomutt
# ─────────────────────────────────────────────────────────────

echo "Installing Neomutt configuration..."

# Create config directory if needed
mkdir -p ~/.config

# Remove existing neomutt config (backup if exists)
if [ -d ~/.config/neomutt ] && [ ! -L ~/.config/neomutt ]; then
    echo "  Backing up existing neomutt config to ~/.config/neomutt.backup"
    mv ~/.config/neomutt ~/.config/neomutt.backup
elif [ -L ~/.config/neomutt ]; then
    rm ~/.config/neomutt
fi

# Symlink neomutt config
ln -sf "$DOTFILES_DIR/neomutt" ~/.config/neomutt
echo "  Symlinked neomutt → ~/.config/neomutt"

# Create credentials directory (local only, not symlinked)
mkdir -p ~/.config/neomutt/credentials
chmod 700 ~/.config/neomutt/credentials
echo "  Created credentials directory (mode 700)"

# ─────────────────────────────────────────────────────────────
# Beads (Agent-Native Task Management)
# ─────────────────────────────────────────────────────────────

echo ""
echo "Installing Beads configuration..."

# Create beads config directory
mkdir -p ~/.config/beads

# Backup existing beads config
if [ -f ~/.config/beads/config.yaml ] && [ ! -L ~/.config/beads/config.yaml ]; then
    echo "  Backing up existing beads config to ~/.config/beads/config.yaml.backup"
    mv ~/.config/beads/config.yaml ~/.config/beads/config.yaml.backup
elif [ -L ~/.config/beads/config.yaml ]; then
    rm ~/.config/beads/config.yaml
fi

# Symlink beads config
ln -sf "$DOTFILES_DIR/beads/config.yaml" ~/.config/beads/config.yaml
echo "  Symlinked beads config → ~/.config/beads/config.yaml"

# Check if bd is installed
if ! command -v bd &> /dev/null; then
    echo ""
    echo "  Beads CLI (bd) not found. Install with:"
    echo "    curl -sSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash"
    echo ""
fi

# ─────────────────────────────────────────────────────────────
# WezTerm
# ─────────────────────────────────────────────────────────────

echo ""
echo "Installing WezTerm configuration..."

# Backup existing wezterm config
if [ -d ~/.config/wezterm ] && [ ! -L ~/.config/wezterm ]; then
    echo "  Backing up existing wezterm config to ~/.config/wezterm.backup"
    mv ~/.config/wezterm ~/.config/wezterm.backup
elif [ -L ~/.config/wezterm ]; then
    rm ~/.config/wezterm
fi

# Symlink wezterm config
ln -sf "$DOTFILES_DIR/wezterm" ~/.config/wezterm
echo "  Symlinked wezterm → ~/.config/wezterm"

# Check if wezterm is installed
if ! command -v wezterm &> /dev/null; then
    echo ""
    echo "  WezTerm not found. Install with:"
    echo "    macOS: brew install --cask wezterm"
    echo "    Linux: https://wezfurlong.org/wezterm/install/linux.html"
    echo ""
fi

# ─────────────────────────────────────────────────────────────
# Neovim
# ─────────────────────────────────────────────────────────────

echo ""
echo "Installing Neovim configuration..."

# Backup existing nvim config
if [ -d ~/.config/nvim ] && [ ! -L ~/.config/nvim ]; then
    echo "  Backing up existing nvim config to ~/.config/nvim.backup"
    mv ~/.config/nvim ~/.config/nvim.backup
elif [ -L ~/.config/nvim ]; then
    rm ~/.config/nvim
fi

# Symlink nvim config
ln -sf "$DOTFILES_DIR/nvim" ~/.config/nvim
echo "  Symlinked nvim → ~/.config/nvim"

# ─────────────────────────────────────────────────────────────
# Claude Code
# ─────────────────────────────────────────────────────────────

echo ""
echo "Installing Claude Code configuration..."

# Create claude directory
mkdir -p ~/.claude
mkdir -p ~/.claude/skills

# Backup existing settings
if [ -f ~/.claude/settings.json ] && [ ! -L ~/.claude/settings.json ]; then
    echo "  Backing up existing settings to ~/.claude/settings.json.backup"
    mv ~/.claude/settings.json ~/.claude/settings.json.backup
elif [ -L ~/.claude/settings.json ]; then
    rm ~/.claude/settings.json
fi

# Copy settings (not symlink - user will customize)
cp "$DOTFILES_DIR/claude-code/settings.json" ~/.claude/settings.json
echo "  Copied settings.json → ~/.claude/settings.json"

# Copy MCP templates
mkdir -p ~/.claude/mcp-templates
cp -r "$DOTFILES_DIR/claude-code/mcp-templates/"* ~/.claude/mcp-templates/
echo "  Copied MCP templates → ~/.claude/mcp-templates/"

# Copy harness templates
mkdir -p ~/.claude/harness-templates
cp -r "$DOTFILES_DIR/claude-code/harness-templates/"* ~/.claude/harness-templates/
echo "  Copied harness templates → ~/.claude/harness-templates/"

# Check if claude is installed
if ! command -v claude &> /dev/null; then
    echo ""
    echo "  Claude Code CLI not found. Install with:"
    echo "    npm install -g @anthropic-ai/claude-code"
    echo ""
fi

# ─────────────────────────────────────────────────────────────
# Credentials Setup
# ─────────────────────────────────────────────────────────────

echo ""
echo "──────────────────────────────────────"
echo "Credential Setup"
echo ""
echo "Neomutt requires app passwords for each Google Workspace account."
echo "Generate app passwords at: https://myaccount.google.com/apppasswords"
echo ""

setup_credential() {
    local name="$1"
    local email="$2"
    local file="$3"

    if [ ! -f ~/.config/neomutt/credentials/"$file" ]; then
        echo ""
        echo "$name ($email)"
        read -sp "  Enter app password (or press Enter to skip): " password
        echo ""
        if [ -n "$password" ]; then
            echo "$password" > ~/.config/neomutt/credentials/"$file"
            chmod 600 ~/.config/neomutt/credentials/"$file"
            echo "  Saved to credentials/$file"
        else
            echo "  Skipped (configure later)"
        fi
    else
        echo "$name: credentials already configured"
    fi
}

read -p "Configure email credentials now? [y/N] " setup_creds

if [[ "$setup_creds" =~ ^[Yy]$ ]]; then
    setup_credential "CREATE SOMETHING" "micah@createsomething.io" "createsomething.pass"
    setup_credential "HALF DOZEN" "mj@halfdozen.co" "halfdozen.pass"
    setup_credential "WEBFLOW" "micah@webflow.com" "webflow.pass"
fi

echo ""
echo "──────────────────────────────────────"
echo "Installation complete!"
echo ""
echo "Signatures are version-controlled in the repo."
echo "Edit them at: packages/dotfiles/neomutt/signatures/"
echo ""
echo "Next steps:"
echo "  1. Configure email credentials if skipped: ~/.config/neomutt/credentials/"
echo "  2. Configure Claude Code MCP servers: ~/.claude/settings.json"
echo "     - Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for Cloudflare MCP"
echo "     - See ~/.claude/mcp-templates/ for additional server configs"
echo "  3. Launch tools to verify:"
echo "     - neomutt (email)"
echo "     - wezterm (terminal)"
echo "     - claude (AI development)"
echo ""
echo "Harness templates available at: ~/.claude/harness-templates/"
echo ""
