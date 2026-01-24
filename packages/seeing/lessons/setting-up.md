# Setting Up

Before you begin the Seeing curriculum, you need Gemini CLI installed and configured.

This guide walks you through the setup. If you're already set up, skip to [What Is Creation](/seeing/what-is-creation).

---

## Prerequisites

- **Node.js 18 or higher** — Check with `node -v`
- **A Google account** — For free tier access

If you need Node.js, download it from [nodejs.org](https://nodejs.org/).

---

## Install Gemini CLI

Choose one method:

### Option 1: npm (Recommended)

```bash
npm install -g @google/gemini-cli
```

### Option 2: Homebrew (macOS/Linux)

```bash
brew install gemini-cli
```

### Option 3: Run without installing

```bash
npx @google/gemini-cli
```

**Source**: [github.com/google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)

---

## First Run

Start Gemini CLI:

```bash
gemini
```

On first run, you'll:

1. **Choose a theme** — Pick your preferred color scheme
2. **Select authentication** — Choose "Login with Google"
3. **Authenticate** — A browser window opens; sign in with your Google account

### Free Tier Limits

With a personal Google account:
- **60 requests per minute**
- **1,000 requests per day**
- **1M token context window** (Gemini 2.5 Pro)

These limits are generous for learning. You won't hit them during normal use.

---

## Install the Seeing Extension

Once Gemini CLI is running, install the Seeing extension:

```bash
gemini extensions install @createsomething/seeing
```

Or add it manually to your MCP configuration at `~/.gemini/settings.json`:

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

Restart Gemini CLI after adding the configuration.

---

## Verify Setup

Test that everything works:

```
/lesson what-is-creation
```

If you see the first lesson, you're ready.

---

## Troubleshooting

### "Command not found: gemini"

The npm global bin directory isn't in your PATH. Either:
- Use `npx @google/gemini-cli` instead
- Add npm's bin directory to your PATH

### "Failed to log in"

If you see an error about Google Cloud Project:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Set the environment variable:

```bash
export GOOGLE_CLOUD_PROJECT="your-project-id"
```

### Extension not loading

1. Check `~/.gemini/settings.json` syntax
2. Restart Gemini CLI completely
3. Verify the extension is installed: `gemini extensions list`

---

## What You'll Learn

The Seeing curriculum teaches you to perceive through the Subtractive Triad:

| Level | Question | Action |
|-------|----------|--------|
| **DRY** | "Have I built this before?" | Unify |
| **Rams** | "Does this earn its existence?" | Remove |
| **Heidegger** | "Does this serve the whole?" | Reconnect |

You'll progress through five lessons, then apply what you've learned in a capstone project.

---

## Ready?

Start your journey:

```
/lesson what-is-creation
```

---

## Resources

- [Gemini CLI Documentation](https://geminicli.com/docs/get-started/installation/)
- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [MCP Protocol Documentation](https://modelcontextprotocol.io/docs)
- [CREATE SOMETHING — Seeing](https://learn.createsomething.space/seeing)
