# Setting Up

Before you begin the Seeing curriculum, you need Gemini CLI installed and configured.

This guide walks you through the setup. If you're already set up, skip to [What Is Creation](/seeing/what-is-creation).

---

## Prerequisites

- **Node.js 20 or higher** — Check with `node -v`
- **A Google account** — For free tier access

If you need Node.js, download it from [nodejs.org](https://nodejs.org/) or use a version manager like [nvm](https://github.com/nvm-sh/nvm).

---

## Step 1: Install Gemini CLI

Choose one method:

### Option A: npm (Recommended)

```bash
npm install -g @google/gemini-cli
```

### Option B: Homebrew (macOS/Linux)

```bash
brew install gemini-cli
```

### Option C: Run without installing

```bash
npx @google/gemini-cli
```

**Verify installation:**

```bash
gemini --version
```

**Source**: [geminicli.com/docs/get-started/installation](https://geminicli.com/docs/get-started/installation/)

---

## Step 2: Authenticate

Start Gemini CLI:

```bash
gemini
```

On first run, you'll see an authentication menu. Choose **Login with Google** (recommended for individual users).

1. A browser window opens
2. Sign in with your Google account
3. Authorize Gemini CLI
4. Return to your terminal — you're authenticated

Your credentials are cached at `~/.gemini/` for future sessions.

### Free Tier Limits

With a personal Google account:
- **1,000 requests per day**
- **60 requests per minute**
- **1M token context window** (Gemini 2.5 Pro)

These limits are generous for learning. You won't hit them during normal use.

### Alternative: API Key Authentication

If you prefer API key authentication:

1. Get a key from [Google AI Studio](https://aistudio.google.com/)
2. Set the environment variable:

```bash
export GEMINI_API_KEY="your-api-key"
```

3. Run `gemini` and select "Use Gemini API key"

**Note**: API key authentication has lower free tier limits (250 requests/day, Gemini Flash only).

**Source**: [geminicli.com/docs/get-started/authentication](https://geminicli.com/docs/get-started/authentication/)

---

## Step 3: Install the Seeing Extension

With Gemini CLI running, install the Seeing extension:

### Method A: Command Line

```bash
gemini extensions install https://github.com/createsomethingtoday/create-something-monorepo
```

### Method B: Manual Configuration

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "seeing": {
      "command": "npx",
      "args": ["@createsomething/seeing"]
    }
  }
}
```

Create the directory if it doesn't exist:

```bash
mkdir -p ~/.gemini
```

Restart Gemini CLI after adding the configuration.

**Source**: [geminicli.com/docs/extensions](https://geminicli.com/docs/extensions/)

---

## Step 4: Verify Setup

Test that everything works:

```
/lesson what-is-creation
```

If you see the first lesson, you're ready.

You can also check extension status:

```
/mcp
```

This shows connected MCP servers and their tools.

---

## Troubleshooting

### "Command not found: gemini"

The npm global bin directory isn't in your PATH.

**Solutions:**
- Use `npx @google/gemini-cli` instead
- Or add npm's bin directory to your PATH:

```bash
export PATH="$PATH:$(npm config get prefix)/bin"
```

Add this line to `~/.bashrc` or `~/.zshrc` to make it permanent.

### "Failed to log in" or Google Cloud Project errors

For personal Google accounts, this usually isn't needed. If you see this error:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Set the environment variable:

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### Extension not loading

1. Check `~/.gemini/settings.json` syntax (must be valid JSON)
2. Restart Gemini CLI completely (exit and re-run `gemini`)
3. Check MCP server status with `/mcp`
4. Verify the extension is installed: `gemini extensions list`

### Node.js version too old

Gemini CLI requires Node.js 20+. Check your version:

```bash
node -v
```

If you have an older version, upgrade via [nodejs.org](https://nodejs.org/) or use nvm:

```bash
nvm install 20
nvm use 20
```

---

## Configuration Reference

### Settings File Locations

| Scope | Path | Purpose |
|-------|------|---------|
| User | `~/.gemini/settings.json` | Your personal settings |
| Project | `.gemini/settings.json` | Project-specific settings |

Project settings override user settings.

### MCP Server Configuration

```json
{
  "mcpServers": {
    "serverName": {
      "command": "path/to/server",
      "args": ["--arg1", "value1"],
      "env": {
        "API_KEY": "$MY_API_TOKEN"
      },
      "timeout": 30000
    }
  }
}
```

### Manage MCP Servers via CLI

```bash
gemini mcp add <name> <command> [args...]  # Add a server
gemini mcp list                            # List all servers
gemini mcp remove <name>                   # Remove a server
```

**Source**: [geminicli.com/docs/tools/mcp-server](https://geminicli.com/docs/tools/mcp-server/)

---

## What You'll Learn

The Seeing curriculum teaches you to perceive through the Subtractive Triad:

| Level | Question | Action |
|-------|----------|--------|
| **DRY** | "Have I built this before?" | Unify |
| **Rams** | "Does this earn its existence?" | Remove |
| **Heidegger** | "Does this serve the whole?" | Reconnect |

You'll progress through five lessons, then apply what you've learned in a capstone project where you build a Task Tracker MCP server.

---

## Ready?

Start your journey:

```
/lesson what-is-creation
```

---

## Resources

- [Gemini CLI Installation](https://geminicli.com/docs/get-started/installation/) — Official installation guide
- [Gemini CLI Authentication](https://geminicli.com/docs/get-started/authentication/) — All authentication methods
- [Gemini CLI Configuration](https://geminicli.com/docs/get-started/configuration/) — Settings and customization
- [MCP Server Configuration](https://geminicli.com/docs/tools/mcp-server/) — Model Context Protocol setup
- [Gemini CLI Extensions](https://geminicli.com/docs/extensions/) — Extension management
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli) — Source code and issues
- [Model Context Protocol](https://modelcontextprotocol.io) — MCP documentation
